// backend/src/controllers/chatController.js
import { QueryTypes } from 'sequelize';
import { sequelize } from '../models/index.js';
import Conversation from '../models/Conversation.js';
import ChatMessage from '../models/ChatMessage.js';
import ChatMember from '../models/ChatMember.js';
import { User, Document, Workflow } from '../models/index.js';
import { hasDocumentReadAccess } from '../utils/documentVisibility.js';
import { getIO, isUserConnected, chatPresence } from '../utils/socketManager.js';
import { sendPushNotification } from '../services/pushNotificationService.js';
import { NotificationPreference } from '../models/index.js';
import { sendNotificationEmail } from '../utils/mailer.js';
import fs from 'fs';
import path from 'path';
import { chatFilePath, INLINE_EXT } from '../utils/chatAttachments.js';
import { fileSessionUser } from '../utils/fileAccess.js';
import { tenantNamespace } from '../config/database.js';
import { transmitToRecipients } from './documentTransmissionController.js';
import { Op } from 'sequelize';

// @identifiant dans un message (les identifiants HSJM contiennent des tirets : F-YANKEU)
const MENTION_RE = /@([A-Za-z0-9_.-]*[A-Za-z0-9_])/g;
const mentionHandles = (text) => [...String(text || '').matchAll(MENTION_RE)].map((m) => m[1].toLowerCase());
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Discussion d'un document : mentionner (@) quelqu'un l'ajoute à la discussion
// et, s'il ne peut pas encore lire le document, le lui transmet (mêmes règles
// que « Transmettre » : il suffit de pouvoir lire le document soi-même).
// Seules comptent les personnes choisies dans la liste ET dont l'@identifiant
// figure dans le message.
async function addMentionedToDocumentThread(req, conversationId, content, mentionUserIds) {
  const ids = [...new Set((Array.isArray(mentionUserIds) ? mentionUserIds : []).filter((x) => typeof x === 'string' && UUID_RE.test(x)))]
    .filter((x) => x !== req.user.id).slice(0, 20);
  if (!ids.length) return [];
  const conv = await Conversation.findByPk(conversationId);
  if (conv?.type !== 'document' || !conv.documentId) return [];
  const doc = await Document.findByPk(conv.documentId, { attributes: { exclude: ['extractedText'] } });
  if (!doc || !(await hasDocumentReadAccess(doc, req.user))) return [];

  const handles = new Set(mentionHandles(content));
  const users = await User.findAll({ where: { id: ids, isActive: true } }); // établissement courant
  const excerpt = content.length > 200 ? `${content.slice(0, 200)}…` : content;
  const added = [];
  for (const target of users) {
    if (!handles.has(String(target.username || '').toLowerCase())) continue;
    const [, joined] = await ChatMember.findOrCreate({
      where: { conversationId, userId: target.id },
      defaults: { conversationId, userId: target.id, role: 'member', lastReadAt: new Date(0), joinedAt: new Date() },
    });
    const transmitted = !(await hasDocumentReadAccess(doc, target));
    if (transmitted) await transmitToRecipients(doc, req.user.id, [target], `Mentionné(e) dans la discussion du document : « ${excerpt} »`);
    added.push({ id: target.id, name: `${target.firstName || ''} ${target.lastName || ''}`.trim(), joined, transmitted });
  }
  return added;
}

// ─── Conversations ────────────────────────────────────────────────────────────

export const listConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversations = await sequelize.query(`
      SELECT
        c.id, c.type, c.name, c.description, c.document_id, c.is_archived,
        c.last_message_at, c.created_at,
        cm.last_read_at, cm.role as member_role, cm.muted,
        CASE WHEN lm.content = '' AND lm.attachment_name IS NOT NULL AND NOT lm.is_deleted
             THEN '📎 ' || lm.attachment_name ELSE lm.content END as last_content,
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
        SELECT content, created_at, is_deleted, author_id, attachment_name
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

// Utilisateurs actifs de l'établissement courant parmi `ids` (requête filtrée
// par établissement) ; renvoie null si l'un d'eux n'en fait pas partie.
async function tenantUsers(ids) {
  const unique = [...new Set((ids || []).filter(Boolean).map(String))];
  if (!unique.length) return [];
  const rows = await User.findAll({ where: { id: unique, isActive: true }, attributes: ['id'] });
  return rows.length === unique.length ? rows.map((u) => u.id) : null;
}

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

    if (!Array.isArray(memberIds) || (await tenantUsers(memberIds)) === null) {
      return res.status(400).json({ success: false, error: 'Participant inconnu dans cet établissement.' });
    }
    if (documentId) {
      const doc = await Document.findByPk(documentId);
      if (!doc) return res.status(404).json({ success: false, error: 'Document introuvable.' });
      if (!(await hasDocumentReadAccess(doc, req.user))) return res.status(403).json({ success: false, error: 'Accès non autorisé au document.' });
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

    // Le fil d'un document est réservé à qui peut lire ce document
    // (recherche filtrée par établissement : un document d'ailleurs est introuvable)
    const doc = await Document.findByPk(documentId, { attributes: ['id', 'title', 'userId', 'visibility', 'serviceId', 'category', 'tenantId'] });
    if (!doc) return res.status(404).json({ success: false, error: 'Document introuvable.' });
    if (!(await hasDocumentReadAccess(doc, req.user))) return res.status(403).json({ success: false, error: 'Accès non autorisé au document.' });

    let conv = await Conversation.findOne({ where: { type: 'document', documentId } });

    if (!conv) {
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

const MESSAGE_SELECT = `
      SELECT
        m.id, m.conversation_id, m.author_id,
        CASE WHEN m.is_deleted THEN '[Message supprimé]' ELSE m.content END as content,
        CASE WHEN m.is_deleted THEN NULL ELSE m.attachment_name END as attachment_name,
        CASE WHEN m.is_deleted OR m.attachment_path IS NULL THEN false ELSE true END as has_file,
        CASE WHEN m.is_deleted THEN NULL ELSE m.attachment_size END as attachment_size,
        CASE WHEN m.is_deleted THEN NULL ELSE m.attachment_document_id END as attachment_document_id,
        m.is_deleted, m.is_system, m.edited_at, m.created_at, m.updated_at,
        u.first_name  as author_first_name,
        u.last_name   as author_last_name,
        u.username    as author_username,
        u.role        as author_role,
        (SELECT json_agg(x ORDER BY x.first_at) FROM (
           SELECT r.emoji, MIN(r.created_at) AS first_at,
                  json_agg(json_build_object('id', ru.id, 'username', ru.username, 'firstName', ru.first_name, 'lastName', ru.last_name)) AS users
           FROM chat_reactions r JOIN users ru ON r.user_id = ru.id
           WHERE r.message_id = m.id
           GROUP BY r.emoji
         ) x) as reactions
      FROM chat_messages m
      LEFT JOIN users u ON m.author_id = u.id`;

// Documents de la GED partagés dans les messages : ouverts seulement par qui a
// déjà le droit de les lire (sinon « Accès réservé », sans titre ni contenu).
async function withDocumentAccess(messages, user) {
  const ids = [...new Set(messages.map(m => m.attachment_document_id).filter(Boolean))];
  if (!ids.length) return messages;
  const docs = await Document.findAll({ where: { id: ids }, attributes: { exclude: ['extractedText'] } });
  const allowed = new Map();
  for (const d of docs) allowed.set(d.id, await hasDocumentReadAccess(d, user));
  return messages.map(m => {
    if (!m.attachment_document_id) return m;
    const ok = allowed.get(m.attachment_document_id) === true;
    return { ...m, document_accessible: ok, attachment_name: ok ? m.attachment_name : null };
  });
}

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

    const messages = await sequelize.query(`${MESSAGE_SELECT}
      WHERE m.conversation_id = :id ${beforeClause}
      ORDER BY m.created_at DESC
      LIMIT :limit
    `, {
      replacements: { id, before: before || '00000000-0000-0000-0000-000000000000', limit: parseInt(limit) },
      type: QueryTypes.SELECT,
    });

    res.json({ success: true, data: await withDocumentAccess(messages.reverse(), req.user) });
  } catch (error) {
    next(error);
  }
};

// Un message tel que le voit l'utilisateur (ex. reçu en temps réel avec un
// document partagé : le droit de l'ouvrir dépend de chaque destinataire)
export const getMessage = async (req, res, next) => {
  try {
    const [msg] = await sequelize.query(`${MESSAGE_SELECT} WHERE m.id = :id`, { replacements: { id: req.params.id }, type: QueryTypes.SELECT });
    if (!msg) return res.status(404).json({ success: false, error: 'Message introuvable' });
    const member = await ChatMember.findOne({ where: { conversationId: msg.conversation_id, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, error: 'Accès non autorisé' });
    const [data] = await withDocumentAccess([msg], req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Enregistre le message, le diffuse aux membres et prévient les destinataires
async function publishMessage(req, res, conversationId, fields) {
  const userId = req.user.id;
  const id = conversationId;
  const message = await ChatMessage.create({ conversationId: id, authorId: userId, ...fields });
  await Conversation.update({ lastMessageAt: new Date() }, { where: { id } });
  let mentionIds = req.body?.mentionUserIds;
  if (typeof mentionIds === 'string') { try { mentionIds = JSON.parse(mentionIds); } catch { mentionIds = []; } }
  const added = await addMentionedToDocumentThread(req, id, message.content, mentionIds);
  // Le document vient de leur être transmis : pas d'e-mail de mention en plus
  const alreadyNotified = new Set(added.filter((a) => a.transmitted).map((a) => a.id));

  const u = req.user;
  const messageData = {
    id: message.id,
    conversationId: id,
    authorId: userId,
    content: message.content,
    attachmentName: message.attachmentName,
    hasFile: !!message.attachmentPath,
    attachmentSize: message.attachmentSize,
    attachmentDocumentId: message.attachmentDocumentId,
    isDeleted: false,
    editedAt: null,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    authorFirstName: u.firstName,
    authorLastName: u.lastName,
    authorUsername: u.username,
    authorRole: u.role,
  };

  // Document de la GED : le titre n'est pas diffusé, chaque membre redemande le
  // message (GET /messages/:id) pour savoir s'il peut l'ouvrir
  const io = getIO();
  if (io) io.to(`conv:${id}`).emit('chat:message', message.attachmentDocumentId ? { ...messageData, attachmentName: null } : messageData);

  const senderName = `${u.firstName} ${u.lastName}`;
  const appUrl = process.env.APP_URL || 'http://localhost:3001';
  const chatLink = `${appUrl}/chat/${id}`;
  const text = message.content || (message.attachmentName ? `📎 ${message.attachmentDocumentId ? 'Document partagé' : message.attachmentName}` : '');
  const excerpt = text.length > 200 ? text.slice(0, 200) + '…' : text;

  // Notifications asynchrones (ne bloquent pas la réponse)
  setImmediate(async () => {
    try {
      const conv = await Conversation.findByPk(id, { attributes: ['name', 'type'] });
      const convName = conv?.name || 'Discussion';

      // ── 0. Nouveau message → chaque participant qui ne lit pas déjà la
      // conversation : alerte dans l'application si elle est à l'écran,
      // sinon notification sur l'appareil (push). Sauf conversation en sourdine
      // ou notifications push désactivées dans ses préférences.
      const others = await ChatMember.findAll({ where: { conversationId: id, userId: { [Op.ne]: userId } }, attributes: ['userId', 'muted'] });
      const title = conv?.type === 'direct' ? senderName : `${senderName} · ${conv?.type === 'document' ? '📄 ' : '#'}${convName}`;
      for (const m of others) {
        if (m.muted) continue;
        const { active, viewing } = chatPresence(m.userId, id);
        if (viewing) continue;
        if (active) {
          io?.to(`user:${m.userId}`).emit('chat:notify', { conversationId: id, title, body: excerpt, messageId: message.id });
          continue;
        }
        const prefs = await NotificationPreference.findOne({ where: { userId: m.userId }, attributes: ['pushEnabled'] });
        if (prefs?.pushEnabled === false) continue;
        sendPushNotification(m.userId, {
          type: 'chat_message',
          title: `💬 ${title}`,
          body: excerpt || 'Nouveau message',
          icon: '/icons/icon-192.png',
          badge: '/favicon.ico',
          tag: `chat-${id}`,
          renotify: true,
          data: { url: `/chat/${id}`, conversationId: id },
        }).catch(() => {});
      }

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
      const mentionedUsernames = [...new Set(mentionHandles(message.content))];

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
          if (!isUserConnected(target.id) && !alreadyNotified.has(target.id)) {
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

  res.status(201).json({ success: true, data: messageData, added });
}

// PUT /api/chat/conversations/:id/mute { muted } — mettre une conversation en
// sourdine (plus de notifications ; les non-lus restent comptés)
export const setMuted = async (req, res, next) => {
  try {
    const [count] = await ChatMember.update({ muted: req.body?.muted === true }, { where: { conversationId: req.params.id, userId: req.user.id } });
    if (!count) return res.status(403).json({ success: false, error: 'Accès non autorisé' });
    res.json({ success: true, muted: req.body?.muted === true });
  } catch (error) {
    next(error);
  }
};

// GET /api/chat/conversations/:id/document — bandeau épinglé de la discussion
// d'un document : titre, type, statut, étape de validation en cours. Réservé à
// qui peut lire le document (sinon { accessible: false }, sans le titre).
export const getConversationDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const member = await ChatMember.findOne({ where: { conversationId: id, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, error: 'Accès non autorisé' });
    const conv = await Conversation.findByPk(id);
    if (conv?.type !== 'document' || !conv.documentId) return res.status(404).json({ success: false, error: 'Pas de document lié.' });
    const doc = await Document.findByPk(conv.documentId, { attributes: { exclude: ['extractedText'] } });
    if (!doc || !(await hasDocumentReadAccess(doc, req.user))) return res.json({ success: true, data: { accessible: false } });

    const steps = await Workflow.findAll({
      where: { documentId: doc.id }, attributes: ['step', 'status', 'validatorId'], order: [['step', 'ASC']],
      include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName'] }],
    });
    const current = steps.find((w) => w.status === 'pending');
    res.json({
      success: true,
      data: {
        accessible: true,
        id: doc.id, title: doc.title, category: doc.category, status: doc.status, fileType: doc.fileType,
        updatedAt: doc.updatedAt,
        workflow: steps.length ? {
          total: steps.length,
          done: steps.filter((w) => w.status === 'approved').length,
          current: current ? {
            step: current.step,
            validator: current.validator ? `${current.validator.firstName || ''} ${current.validator.lastName || ''}`.trim() : null,
            isMe: current.validatorId === req.user.id,
          } : null,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/chat/conversations/:id/mention-candidates?q= — qui mentionner (@).
// Discussion d'un document : tout collègue actif de l'établissement, avec
// « est membre » et « peut déjà lire le document » ; ailleurs : les membres.
export const getMentionCandidates = async (req, res, next) => {
  try {
    const { id } = req.params;
    const q = String(req.query.q || '').trim().slice(0, 50);
    const member = await ChatMember.findOne({ where: { conversationId: id, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, error: 'Accès non autorisé' });
    const conv = await Conversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, error: 'Conversation introuvable.' });

    const memberIds = new Set((await ChatMember.findAll({ where: { conversationId: id }, attributes: ['userId'] })).map((m) => m.userId));
    const where = { isActive: true, id: { [Op.ne]: req.user.id } };
    if (q) where[Op.or] = ['firstName', 'lastName', 'username'].map((f) => ({ [f]: { [Op.iLike]: `${q}%` } }));
    if (conv.type !== 'document') where.id = { [Op.in]: [...memberIds].filter((x) => x !== req.user.id) };
    const users = await User.findAll({ where, attributes: { exclude: ['password'] }, order: [['firstName', 'ASC'], ['lastName', 'ASC']], limit: 8 });

    let doc = null;
    if (conv.type === 'document' && conv.documentId) doc = await Document.findByPk(conv.documentId, { attributes: { exclude: ['extractedText'] } });
    const data = [];
    for (const u of users) {
      data.push({
        id: u.id, username: u.username, first_name: u.firstName, last_name: u.lastName,
        is_member: memberIds.has(u.id),
        has_access: doc ? await hasDocumentReadAccess(doc, u) : true,
      });
    }
    res.json({ success: true, data, documentThread: conv.type === 'document' });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    // Le chemin d'un fichier n'est jamais fourni par le client : les fichiers
    // passent par POST /conversations/:id/attachments
    const { content, documentId } = req.body;

    if (!content?.trim() && !documentId) {
      return res.status(400).json({ success: false, error: 'Contenu ou pièce jointe requis' });
    }

    const member = await ChatMember.findOne({ where: { conversationId: id, userId } });
    if (!member) return res.status(403).json({ success: false, error: 'Accès non autorisé' });

    const fields = { content: content?.trim() || '' };
    if (documentId) {
      // On ne partage qu'un document que l'on peut soi-même lire (même établissement)
      const doc = await Document.findByPk(documentId, { attributes: { exclude: ['extractedText'] } });
      if (!doc || !(await hasDocumentReadAccess(doc, req.user))) {
        return res.status(403).json({ success: false, error: 'Document introuvable ou accès non autorisé.' });
      }
      fields.attachmentDocumentId = doc.id;
      fields.attachmentName = (doc.title || doc.originalName || 'Document').slice(0, 255);
    }
    await publishMessage(req, res, id, fields);
  } catch (error) {
    next(error);
  }
};

// Fichier envoyé depuis l'ordinateur ou le téléphone (champ « file », légende « content »)
export const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Aucun fichier reçu' });
    await publishMessage(req, res, req.params.id, {
      content: String(req.body?.content || '').trim(),
      attachmentPath: `${req.params.id}/${req.file.filename}`,
      attachmentName: req.file.originalname.slice(0, 255),
      attachmentSize: req.file.size,
    });
  } catch (error) {
    if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
    next(error);
  }
};

// Seuls les membres de la conversation envoient un fichier : vérifié avant de
// l'écrire sur le disque
export const requireConversationMember = async (req, res, next) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ success: false, error: 'Conversation invalide' });
    const member = await ChatMember.findOne({ where: { conversationId: req.params.id, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, error: 'Accès non autorisé' });
    next();
  } catch (error) {
    next(error);
  }
};

// Téléchargement : session par en-tête ou cookie de fichiers (images affichées
// et fichiers ouverts directement par le navigateur), membres seulement
export const downloadAttachment = async (req, res, next) => {
  try {
    const { user, error } = await fileSessionUser(req);
    if (error) return res.status(401).json({ success: false, error });
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.sendStatus(404);
    const message = await tenantNamespace.runPromise(async () => {
      tenantNamespace.set('tenantId', user.tenantId);
      const m = await ChatMessage.findByPk(req.params.id);
      if (!m) return null;
      const member = await ChatMember.findOne({ where: { conversationId: m.conversationId, userId: user.id } });
      return member ? m : false;
    });
    if (message === false) return res.status(403).json({ success: false, error: 'Accès non autorisé' });
    const abs = message && !message.isDeleted && chatFilePath(message.attachmentPath);
    if (!abs || !fs.existsSync(abs)) return res.status(404).json({ success: false, error: 'Fichier introuvable' });

    const inline = INLINE_EXT.has(path.extname(abs).toLowerCase()) && req.query.download !== '1';
    const name = message.attachmentName || path.basename(abs);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${name.replace(/[^\x20-\x7e]|"/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`);
    if (!inline) res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    res.sendFile(abs);
  } catch (error) {
    next(error);
  }
};

export const editMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content } = req.body;

    const message = await ChatMessage.findByPk(id);
    if (!message) return res.status(404).json({ success: false, error: 'Message introuvable' });
    if (!content?.trim() && !message.attachmentName) return res.status(400).json({ success: false, error: 'Contenu requis' });
    if (message.authorId !== userId) return res.status(403).json({ success: false, error: 'Non autorisé' });

    await message.update({ content: String(content || '').trim(), editedAt: new Date() });

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

    const file = chatFilePath(message.attachmentPath);
    await message.update({ isDeleted: true, content: '' });
    if (file) fs.promises.unlink(file).catch(() => {});

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

    // Conversation de l'établissement courant (sinon introuvable)
    const conv = await Conversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, error: 'Conversation introuvable.' });
    // Seul un membre (ou un administrateur) ajoute quelqu'un ; jamais un tiers dans une conversation privée
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const callerMember = await ChatMember.findOne({ where: { conversationId: id, userId: req.user.id } });
    if (!callerMember && !isAdmin) return res.status(403).json({ success: false, error: 'Non autorisé' });
    if (conv.type === 'direct') return res.status(403).json({ success: false, error: 'Une conversation privée ne reçoit pas de nouveau participant.' });
    if ((await tenantUsers([targetId])) === null) return res.status(400).json({ success: false, error: 'Participant inconnu dans cet établissement.' });
    if (conv.type === 'document' && conv.documentId) {
      const doc = await Document.findByPk(conv.documentId);
      const target = await User.findByPk(targetId);
      if (!doc || !(await hasDocumentReadAccess(doc, target))) return res.status(403).json({ success: false, error: 'Cette personne ne peut pas lire le document.' });
    }

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
    // Ses connexions temps réel quittent la conversation
    getIO()?.in(`user:${targetId}`).socketsLeave(`conv:${id}`);
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

    const readAt = new Date();
    const [count] = await ChatMember.update({ lastReadAt: readAt }, { where: { conversationId: id, userId } });
    // Accusés de lecture : les autres participants voient ✓✓ en direct
    if (count) getIO()?.to(`conv:${id}`).emit('chat:read', { conversationId: id, userId, readAt });
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
