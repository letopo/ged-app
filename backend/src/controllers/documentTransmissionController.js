// backend/src/controllers/documentTransmissionController.js
// Transmettre un document validé à d'autres utilisateurs (ex. demande d'achat
// signée → acheteur, qui prépare ensuite le bon de commande à partir d'elle).
// Le destinataire obtient le droit de lecture (cf. utils/documentVisibility.js)
// et retrouve le document dans l'onglet « Reçus » de la page Documents.
import { Op } from 'sequelize';
import { Document, User, DocumentTransmission } from '../models/index.js';
import { hasDocumentReadAccess } from '../utils/documentVisibility.js';
import { sendPushNotification } from '../services/pushNotificationService.js';
import { sendNotificationEmail } from '../utils/mailer.js';
import { getIO } from '../utils/socketManager.js';

const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : null);

// Prévenir le destinataire : temps réel si connecté, push et e-mail sinon.
// Ne bloque jamais la transmission (une notification ratée n'annule rien).
async function notifyRecipient(recipient, document, sender, message) {
  const senderName = fullName(sender);
  const text = `${senderName} vous a transmis le document « ${document.title} »${message ? ` : ${message}` : '.'}`;
  try {
    getIO()?.to(`user:${recipient.id}`).emit('document_transmitted', {
      documentId: document.id, documentTitle: document.title, from: senderName, message, timestamp: new Date().toISOString(),
    });
  } catch (e) { /* socket indisponible */ }
  sendPushNotification(recipient.id, {
    type: 'document_transmitted',
    title: '📨 Document reçu',
    body: `${document.title}\nDe : ${senderName}`,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `transmission-${document.id}`,
    data: { documentId: document.id, url: '/documents?tab=recus', timestamp: Date.now() },
  }).catch(() => {});
  if (recipient.email) {
    sendNotificationEmail(recipient.email, `Document reçu : ${document.title}`, text).catch(() => {});
  }
}

// GET /api/documents/transmission-recipients?q= — utilisateurs actifs à qui transmettre
export const listRecipients = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const where = { isActive: true, id: { [Op.ne]: req.user.id } };
    if (q) {
      where[Op.or] = ['firstName', 'lastName', 'email'].map(f => ({ [f]: { [Op.iLike]: `%${q}%` } }));
    }
    const users = await User.findAll({ where, attributes: ['id', 'firstName', 'lastName', 'email', 'role'], order: [['firstName', 'ASC']], limit: 30 });
    res.json({ success: true, users: users.map(u => ({ id: u.id, name: fullName(u), email: u.email, role: u.role })) });
  } catch (error) {
    console.error('Erreur liste destinataires:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/documents/:id/transmit  { userIds: [...], message }
export const transmitDocument = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document introuvable.' });
    if (!(await hasDocumentReadAccess(document, req.user))) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }
    if (document.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Seul un document validé peut être transmis.' });
    }

    const userIds = [...new Set((Array.isArray(req.body?.userIds) ? req.body.userIds : []).filter(id => typeof id === 'string'))]
      .filter(id => id !== req.user.id);
    if (userIds.length === 0) return res.status(400).json({ success: false, message: 'Choisissez au moins un destinataire.' });
    if (userIds.length > 20) return res.status(400).json({ success: false, message: '20 destinataires maximum.' });
    const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 1000) || null : null;

    const recipients = await User.findAll({ where: { id: { [Op.in]: userIds }, isActive: true }, attributes: ['id', 'firstName', 'lastName', 'email'] });
    if (recipients.length !== userIds.length) {
      return res.status(400).json({ success: false, message: 'Destinataire inconnu ou désactivé.' });
    }

    const sender = await User.findByPk(req.user.id, { attributes: ['id', 'firstName', 'lastName', 'email'] });
    for (const recipient of recipients) {
      // Retransmettre au même destinataire : on actualise (nouveau message, à relire)
      const existing = await DocumentTransmission.findOne({ where: { documentId: document.id, toUserId: recipient.id } });
      if (existing) await existing.update({ fromUserId: req.user.id, message, readAt: null });
      else await DocumentTransmission.create({ documentId: document.id, fromUserId: req.user.id, toUserId: recipient.id, message });
      notifyRecipient(recipient, document, sender, message);
    }
    res.json({ success: true, message: `Document transmis à ${recipients.length} personne(s).`, recipients: recipients.map(fullName) });
  } catch (error) {
    console.error('Erreur transmission document:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/documents/transmissions/received — documents qu'on m'a transmis
export const listReceived = async (req, res) => {
  try {
    const rows = await DocumentTransmission.findAll({
      where: { toUserId: req.user.id },
      include: [
        { model: Document, as: 'document', required: true },
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['updatedAt', 'DESC']],
    });
    res.json({
      success: true,
      unread: rows.filter(r => !r.readAt).length,
      transmissions: rows.map(r => ({
        id: r.id, message: r.message, readAt: r.readAt, sentAt: r.updatedAt,
        from: fullName(r.sender), document: r.document,
      })),
    });
  } catch (error) {
    console.error('Erreur documents reçus:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/documents/transmissions/:tid/read
export const markTransmissionRead = async (req, res) => {
  try {
    const row = await DocumentTransmission.findOne({ where: { id: req.params.tid, toUserId: req.user.id } });
    if (!row) return res.status(404).json({ success: false, message: 'Transmission introuvable.' });
    if (!row.readAt) await row.update({ readAt: new Date() });
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lecture transmission:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/documents/:id/transmissions — à qui ce document a été transmis
export const listDocumentTransmissions = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document introuvable.' });
    if (!(await hasDocumentReadAccess(document, req.user))) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }
    const rows = await DocumentTransmission.findAll({
      where: { documentId: document.id },
      include: [
        { model: User, as: 'sender', attributes: ['firstName', 'lastName', 'email'] },
        { model: User, as: 'recipient', attributes: ['firstName', 'lastName', 'email'] },
      ],
      order: [['updatedAt', 'DESC']],
    });
    res.json({ success: true, transmissions: rows.map(r => ({ id: r.id, from: fullName(r.sender), to: fullName(r.recipient), message: r.message, readAt: r.readAt, sentAt: r.updatedAt })) });
  } catch (error) {
    console.error('Erreur liste transmissions:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};
