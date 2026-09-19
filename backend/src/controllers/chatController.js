// backend/src/controllers/chatController.js
import { QueryTypes } from 'sequelize';
import { sequelize } from '../models/index.js';
import Conversation from '../models/Conversation.js';
import ChatMessage from '../models/ChatMessage.js';
import ChatMember from '../models/ChatMember.js';
import { getIO, isUserConnected } from '../utils/socketManager.js';
import { sendNotificationEmail } from '../utils/mailer.js';

// ─── Conversations ────────────────────────────────────────────────────────────

export const listConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversations = await sequelize.query(`
      SELECT
        c.id, c.type, c.name, c.description, c.document_id, c.is_archived,
        c.last_message_at, c.created_at,
        cm.last_read_at, cm.role as member_role,
        lm.content       as last_content,
        lm.created_at    as last_at,
        lm.is_deleted    as last_deleted,
        la.first_name || ' ' || la.last_name as last_author_name,
        CAST(COALESCE(unread.cnt, 0) AS INTEGER) as unread_count,
        ou.id            as other_user_id,
        ou.first_name    as other_first_name,
        ou.last_name     as other_last_name,
        ou.username      as other_username,
        ou.role          as other_role
      FROM chat_conversations c
      JOIN chat_conversation_members cm
        ON c.id = cm.conversation_id AND cm.user_id = :userId
      LEFT JOIN LATERAL (
        SELECT content, created_at, is_deleted, author_id
        FROM chat_messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC LIMIT 1
      ) lm ON true
      LEFT JOIN users la ON lm.author_id = la.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as cnt
        FROM chat_messages
        WHERE conversation_id = c.id
          AND author_id != :userId
          AND is_deleted = false
          AND (cm.last_read_at IS NULL OR created_at > cm.last_read_at)
      ) unread ON true
      LEFT JOIN LATERAL (
        SELECT u.id, u.first_name, u.last_name, u.username, u.role
        FROM chat_conversation_members ocm
        JOIN users u ON ocm.user_id = u.id
        WHERE ocm.conversation_id = c.id AND ocm.user_id != :userId
        LIMIT 1
      ) ou ON c.type = 'direct'
      WHERE c.is_archived = false
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    `, { replacements: { userId }, type: QueryTypes.SELECT });

    res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const member = await ChatMember.findOne({ where: { conversationId: id, userId } });
    if (!member) return res.status(403).json({ success: false, error: 'Accès non autorisé' });

    const [conv] = await sequelize.query(`
      SELECT c.*, CAST(COUNT(cm.user_id) AS INTEGER) as members_count
      FROM chat_conversations c
      JOIN chat_conversation_members cm ON c.id = cm.conversation_id
      WHERE c.id = :id
      GROUP BY c.id
    `, { replacements: { id }, type: QueryTypes.SELECT });

    if (!conv) return res.status(404).json({ success: false, error: 'Conversation introuvable' });
    res.json({ success: true, data: conv });
  } catch (error) {
    next(error);
  }
};

export const createConversation = async (req, res, next) => {
  try {
    const { type, name, description, memberIds = [], documentId } = req.body;
    const userId = req.user.id;

    if (!type || !['channel', 'direct', 'document'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Type invalide (channel | direct | document)' });
    }
    if (type === 'channel' && !name?.trim()) {
      return res.status(400).json({ success: false, error: 'Nom requis pour un canal' });
    }

    if (type === 'direct') {
      const targetId = memberIds[0];
      if (!targetId) return res.status(400).json({ success: false, error: 'Destinataire requis' });
      const existing = await sequelize.query(`
        SELECT c.id FROM chat_conversations c
        JOIN chat_conversation_members m1 ON c.id = m1.conversation_id AND m1.user_id = :userId
        JOIN chat_conversation_members m2 ON c.id = m2.conversation_id AND m2.user_id = :targetId
        WHERE c.type = 'direct'
        LIMIT 1
      `, { replacements: { userId, targetId }, type: QueryTypes.SELECT });
      if (existing.length > 0) {
        return res.json({ success: true, data: existing[0], existing: true });
      }
    }

    const conv = await Conversation.create({
      type,
      name: name?.trim() || null,
      description: description?.trim() || null,
      documentId: documentId || null,
      createdBy: userId,
      tenantId: req.tenantId,
    });

    const allMemberIds = [...new Set([userId, ...memberIds])];
    await ChatMember.bulkCreate(
      allMemberIds.map(mid => ({
        conversationId: conv.id,
        userId: mid,
        role: mid === userId ? 'owner' : 'member',
        lastReadAt: new Date(),
        joinedAt: new Date(),
      })),
      { ignoreDuplicates: true }
    );

    res.status(201).json({ success: true, data: conv });
  } catch (error) {
    next(error);
  }
};

export const getOrCreateDocumentThread = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    let conv = await Conversation.findOne({ where: { type: 'document', documentId } });

    if (!conv) {
      const [doc] = await sequelize.query(
        'SELECT title FROM documents WHERE id = :id',
        { replacements: { id: documentId }, type: QueryTypes.SELECT }
      );
      conv = await Conversation.create({
        type: 'document',
        name: doc?.title || 'Discussion document',
        documentId,
        createdBy: userId,
        tenantId: req.tenantId,
      });
    }

    await ChatMember.findOrCreate({
      where: { conversationId: conv.id, userId },
      defaults: { conversationId: conv.id, userId, role: 'member', lastReadAt: new Date(), joinedAt: new Date() },
    });

    res.json({ success: true, data: conv });
  } catch (error) {
    next(error);
  }
};

// ─── Messages ─────────────────────────────────────────────────────────────────

export const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { before, limit = 50 } = req.query;

    const member = await ChatMember.findOne({ where: { conversationId: id, userId } });
    if (!member) return res.status(403).json({ success: false, error: 'Accès non autorisé' });

    const beforeClause = before
      ? `AND m.created_at < (SELECT created_at FROM chat_messages WHERE id = :before)`
      : '';

    const messages = await sequelize.query(`
      SELECT
        m.id, m.conversation_id, m.author_id,
        CASE WHEN m.is_deleted THEN '[Message supprimé]' ELSE m.content END as content,
        m.attachment_path, m.attachment_name,
        m.is_deleted, m.edited_at, m.created_at, m.updated_at,
        u.first_name  as author_first_name,
        u.last_name   as author_last_name,
        u.username    as author_username,
        u.role        as author_role
      FROM chat_messages m
      LEFT JOIN users u ON m.author_id = u.id
      WHERE m.conversation_id = :id ${beforeClause}
      ORDER BY m.created_at DESC
      LIMIT :limit
    `, {
      replacements: { id, before: before || '00000000-0000-0000-0000-000000000000', limit: parseInt(limit) },
      type: QueryTypes.SELECT,
    });

    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content, attachmentPath, attachmentName } = req.body;

    if (!content?.trim() && !attachmentPath) {
      return res.status(400).json({ success: false, error: 'Contenu ou pièce jointe requis' });
    }

    const member = await ChatMember.findOne({ where: { conversationId: id, userId } });
    if (!member) return res.status(403).json({ success: false, error: 'Accès non autorisé' });

    const message = await ChatMessage.create({
      conversationId: id,
      authorId: userId,
      content: content?.trim() || '',
      attachmentPath: attachmentPath || null,
      attachmentName: attachmentName || null,
    });

    await Conversation.update({ lastMessageAt: new Date() }, { where: { id } });

    const u = req.user;
    const messageData = {
      id: message.id,
      conversationId: id,
      authorId: userId,
      content: message.content,
      attachmentPath: message.attachmentPath,
      attachmentName: message.attachmentName,
      isDeleted: false,
      editedAt: null,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      authorFirstName: u.firstName,
      authorLastName: u.lastName,
      authorUsername: u.username,
      authorRole: u.role,
    };

    const io = getIO();
    if (io) io.to(`conv:${id}`).emit('chat:message', messageData);

    const senderName = `${u.firstName} ${u.lastName}`;
    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    const chatLink = `${appUrl}/chat/${id}`;
    const excerpt = message.content.length > 200
      ? message.content.slice(0, 200) + '…'
      : message.content;

    // Notifications asynchrones (ne bloquent pas la réponse)
    setImmediate(async () => {
      try {
        const conv = await Conversation.findByPk(id, { attributes: ['name', 'type'] });
        const convName = conv?.name || 'Discussion';

        // ── 1. Message direct → email au destinataire si hors-ligne ──────────
        if (conv?.type === 'direct') {
          const otherMembers = await sequelize.query(`
            SELECT u.id, u.email, u.first_name, u.last_name
            FROM chat_conversation_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.conversation_id = :convId AND cm.user_id != :senderId
          `, { replacements: { convId: id, senderId: userId }, type: QueryTypes.SELECT });

          for (const recipient of otherMembers) {
            if (!isUserConnected(recipient.id)) {
              await sendNotificationEmail(
                recipient.email,
                `💬 Nouveau message de ${senderName}`,
                `${senderName} vous a envoyé un message privé :\n\n"${excerpt}"\n\nConnectez-vous à la GED pour répondre.`,
                'chat',
                chatLink
              ).catch(() => {});
            }
          }
        }

        // ── 2. @mentions → socket + email si hors-ligne ──────────────────────
        const mentionPattern = /@(\w+)/g;
        const mentionedUsernames = [];
        let mm;
        while ((mm = mentionPattern.exec(message.content)) !== null) mentionedUsernames.push(mm[1]);

        if (mentionedUsernames.length > 0) {
          const mentioned = await sequelize.query(`
            SELECT u.id, u.email, u.first_name, u.last_name
            FROM users u
            JOIN chat_conversation_members cm ON u.id = cm.user_id AND cm.conversation_id = :convId
            WHERE LOWER(u.username) = ANY(ARRAY[${mentionedUsernames.map((_, i) => `:u${i}`).join(',')}]::text[])
              AND u.id != :senderId
          `, {
            replacements: {
              convId: id,
              senderId: userId,
              ...Object.fromEntries(mentionedUsernames.map((uname, i) => [`u${i}`, uname.toLowerCase()])),
            },
            type: QueryTypes.SELECT,
          });

          for (const target of mentioned) {
            if (io) {
              io.to(`user:${target.id}`).emit('chat:mention', {
                conversationId: id, conversationName: convName,
                fromName: senderName, excerpt, timestamp: message.createdAt,
              });
            }
            if (!isUserConnected(target.id)) {
              await sendNotificationEmail(
                target.email,
                `@ ${senderName} vous a mentionné dans « ${convName} »`,
                `${senderName} vous a mentionné dans la discussion « ${convName} » :\n\n"${excerpt}"\n\nConnectez-vous à la GED pour répondre.`,
                'mention',
                chatLink
              ).catch(() => {});
            }
          }
        }
      } catch (_) {}
    });

    res.status(201).json({ success: true, data: messageData });
  } catch (error) {
    next(error);
  }
};

export const editMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content?.trim()) return res.status(400).json({ success: false, error: 'Contenu requis' });

    const message = await ChatMessage.findByPk(id);
    if (!message) return res.status(404).json({ success: false, error: 'Message introuvable' });
    if (message.authorId !== userId) return res.status(403).json({ success: false, error: 'Non autorisé' });

    await message.update({ content: content.trim(), editedAt: new Date() });

    const io = getIO();
    if (io) io.to(`conv:${message.conversationId}`).emit('chat:message_edited', {
      id, conversationId: message.conversationId, content: message.content, editedAt: message.editedAt,
    });

    res.json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await ChatMessage.findByPk(id);
    if (!message) return res.status(404).json({ success: false, error: 'Message introuvable' });
    if (message.authorId !== userId && !['admin','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Non autorisé' });
    }

    await message.update({ isDeleted: true, content: '' });

    const io = getIO();
    if (io) io.to(`conv:${message.conversationId}`).emit('chat:message_deleted', {
      id, conversationId: message.conversationId,
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── Membres ──────────────────────────────────────────────────────────────────

export const getMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const member = await ChatMember.findOne({ where: { conversationId: id, userId } });
    if (!member) return res.status(403).json({ success: false, error: 'Accès non autorisé' });

    const members = await sequelize.query(`
      SELECT cm.user_id, cm.role, cm.joined_at, cm.last_read_at,
        u.first_name, u.last_name, u.username, u.email, u.role as user_role, u.is_active
      FROM chat_conversation_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.conversation_id = :id
      ORDER BY cm.joined_at ASC
    `, { replacements: { id }, type: QueryTypes.SELECT });

    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
};

export const addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId: targetId } = req.body;

    await ChatMember.findOrCreate({
      where: { conversationId: id, userId: targetId },
      defaults: { conversationId: id, userId: targetId, role: 'member', lastReadAt: new Date(), joinedAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { id, userId: targetId } = req.params;
    const userId = req.user.id;

    if (targetId !== userId && !['admin','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Non autorisé' });
    }

    await ChatMember.destroy({ where: { conversationId: id, userId: targetId } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── Lecture / non-lu ─────────────────────────────────────────────────────────

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await ChatMember.update({ lastReadAt: new Date() }, { where: { conversationId: id, userId } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [result] = await sequelize.query(`
      SELECT CAST(COUNT(m.id) AS INTEGER) as total
      FROM chat_messages m
      JOIN chat_conversation_members cm
        ON m.conversation_id = cm.conversation_id AND cm.user_id = :userId
      WHERE m.author_id != :userId
        AND m.is_deleted = false
        AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)
    `, { replacements: { userId }, type: QueryTypes.SELECT });

    res.json({ success: true, count: result?.total || 0 });
  } catch (error) {
    next(error);
  }
};

// ─── Réactions emoji ──────────────────────────────────────────────────────────

export const toggleReaction = async (req, res, next) => {
  try {
    const { id: conversationId, messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji || typeof emoji !== 'string' || emoji.length > 10) {
      return res.status(400).json({ success: false, error: 'Emoji invalide' });
    }

    // Vérifier que l'utilisateur est membre
    const member = await ChatMember.findOne({ where: { conversationId, userId } });
    if (!member) return res.status(403).json({ success: false, error: 'Accès non autorisé' });

    // Vérifier que le message existe dans la conv
    const message = await ChatMessage.findOne({ where: { id: messageId, conversationId } });
    if (!message) return res.status(404).json({ success: false, error: 'Message introuvable' });

    // Toggle
    const existing = await sequelize.query(
      `SELECT id FROM chat_reactions WHERE message_id = :messageId AND user_id = :userId AND emoji = :emoji`,
      { replacements: { messageId, userId, emoji }, type: QueryTypes.SELECT }
    );

    if (existing.length > 0) {
      await sequelize.query(
        `DELETE FROM chat_reactions WHERE message_id = :messageId AND user_id = :userId AND emoji = :emoji`,
        { replacements: { messageId, userId, emoji }, type: QueryTypes.SELECT }
      );
    } else {
      await sequelize.query(
        `INSERT INTO chat_reactions (message_id, user_id, emoji) VALUES (:messageId, :userId, :emoji) ON CONFLICT DO NOTHING`,
        { replacements: { messageId, userId, emoji }, type: QueryTypes.SELECT }
      );
    }

    // Récupérer toutes les réactions du message
    const reactions = await sequelize.query(`
      SELECT emoji, json_agg(json_build_object('id', u.id, 'username', u.username, 'firstName', u.first_name, 'lastName', u.last_name)) as users
      FROM chat_reactions r
      JOIN users u ON r.user_id = u.id
      WHERE r.message_id = :messageId
      GROUP BY emoji
    `, { replacements: { messageId }, type: QueryTypes.SELECT });

    const io = getIO();
    if (io) io.to(`conv:${conversationId}`).emit('chat:reaction', { messageId, reactions });

    res.json({ success: true, reactions });
  } catch (error) {
    next(error);
  }
};

export const getOnlineUsers = async (req, res, next) => {
  try {
    const { isUserConnected } = await import('../utils/socketManager.js');
    // retourne simplement la liste des userId connectés via le socket manager
    const { getIO } = await import('../utils/socketManager.js');
    res.json({ success: true, userIds: [] }); // le client se fie aux events socket
  } catch (error) {
    next(error);
  }
};
