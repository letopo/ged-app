// backend/src/utils/documentChatEvents.js
// Messages automatiques dans la discussion d'un document : « X a validé le
// document (étape 2/4) », « Document approuvé », « X a transmis le document à Y »…
// Publiés seulement si la discussion du document existe déjà (on n'en crée pas
// une par document) ; sans auteur (author_id NULL, is_system) : ils ne comptent
// pas comme non lus. Ne fait jamais échouer l'action qui les déclenche.
import Conversation from '../models/Conversation.js';
import ChatMessage from '../models/ChatMessage.js';
import { getIO } from './socketManager.js';

export const personName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || u.email || 'Quelqu\'un' : 'Quelqu\'un');

/**
 * Publie un ou plusieurs messages automatiques pour un document.
 * @param {string} documentId
 * @param {string|string[]} texts
 */
export async function postDocumentEvent(documentId, texts) {
  try {
    const lines = (Array.isArray(texts) ? texts : [texts]).filter(Boolean);
    if (!documentId || !lines.length) return;
    const conv = await Conversation.findOne({ where: { type: 'document', documentId } });
    if (!conv) return;
    const io = getIO();
    for (const text of lines) {
      const message = await ChatMessage.create({ conversationId: conv.id, authorId: null, content: String(text).slice(0, 2000), isSystem: true });
      io?.to(`conv:${conv.id}`).emit('chat:message', {
        id: message.id, conversationId: conv.id, authorId: null, content: message.content,
        isSystem: true, isDeleted: false, editedAt: null, createdAt: message.createdAt, updatedAt: message.updatedAt,
      });
    }
    await conv.update({ lastMessageAt: new Date() });
    // Le bandeau du document (statut, étape) se met à jour chez les participants
    io?.to(`conv:${conv.id}`).emit('chat:document_updated', { conversationId: conv.id, documentId });
  } catch (err) {
    console.warn('Discussion du document (message automatique) :', err.message);
  }
}
