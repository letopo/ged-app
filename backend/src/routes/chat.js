// backend/src/routes/chat.js
import { Router } from 'express';
import { protect as authenticate } from '../middleware/auth.js';
import {
  listConversations,
  getConversation,
  createConversation,
  getOrCreateDocumentThread,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  getMembers,
  addMember,
  removeMember,
  markAsRead,
  getUnreadCount,
  toggleReaction,
  getMessage,
  uploadAttachment,
  downloadAttachment,
  requireConversationMember,
  getMentionCandidates,
  getConversationDocument,
} from '../controllers/chatController.js';
import { chatUpload } from '../utils/chatAttachments.js';
import { fixUploadEncoding } from '../middleware/upload.js';

const router = Router();

// Avant `authenticate` : accepte aussi le cookie de fichiers (<img>, liens directs)
router.get('/messages/:id/attachment',              downloadAttachment);

router.use(authenticate);

router.get('/unread-count',                         getUnreadCount);
router.get('/conversations',                        listConversations);
router.post('/conversations',                       createConversation);
router.get('/conversations/document/:documentId',   getOrCreateDocumentThread);
router.get('/conversations/:id',                    getConversation);
router.get('/conversations/:id/messages',           getMessages);
router.post('/conversations/:id/messages',          sendMessage);
router.post('/conversations/:id/attachments',      requireConversationMember, chatUpload.single('file'), fixUploadEncoding, uploadAttachment);
router.post('/conversations/:id/read',              markAsRead);
router.get('/conversations/:id/mention-candidates', getMentionCandidates);
router.get('/conversations/:id/document',           getConversationDocument);
router.get('/conversations/:id/members',            getMembers);
router.post('/conversations/:id/members',           addMember);
router.delete('/conversations/:id/members/:userId', removeMember);
router.get('/messages/:id',                                        getMessage);
router.put('/messages/:id',                                        editMessage);
router.delete('/messages/:id',                                     deleteMessage);
router.post('/conversations/:id/messages/:messageId/reactions',    toggleReaction);

export default router;
