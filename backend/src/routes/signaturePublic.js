// backend/src/routes/signaturePublic.js
// Pages de la tablette du guichet (/signer/:jeton) : sans connexion, mais le
// jeton (aléatoire, 15 min, usage unique) ne donne accès qu'au document à
// signer et à l'envoi d'une signature. Le PC de l'agent appose ensuite la
// signature (POST /api/documents/:id/manual-signature avec requestToken).
import express from 'express';
import { resolveStoredFile } from '../utils/storedFiles.js';
import path from 'path';
import { Document } from '../models/index.js';
import { getRequest, markOpened, storeSignature } from '../utils/signatureRequests.js';
import { parseSignaturePng } from '../controllers/manualSignatureController.js';

const router = express.Router();

const findRequest = (req, res) => {
  const r = getRequest(req.params.token, req.tenantId);
  if (!r || r.status === 'cancelled') {
    res.status(404).json({ success: false, message: 'Cette demande de signature a expiré ou a été annulée.' });
    return null;
  }
  return r;
};

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Informations à afficher sur la tablette
router.get('/:token', async (req, res) => {
  const r = findRequest(req, res);
  if (!r) return;
  const doc = await Document.findByPk(r.documentId, { attributes: ['id', 'fileType', 'fileName'] });
  if (!doc) return res.status(404).json({ success: false, message: 'Document introuvable.' });
  markOpened(r);
  res.json({
    success: true,
    data: {
      title: r.title,
      signerName: r.signerName,
      placement: r.placement,
      fileType: doc.fileType,
      status: r.status,
      expiresAt: new Date(r.expiresAt).toISOString(),
    },
  });
});

// Le document à signer (lecture seule)
router.get('/:token/file', async (req, res) => {
  const r = findRequest(req, res);
  if (!r) return;
  const doc = await Document.findByPk(r.documentId, { attributes: ['filePath', 'fileType'] });
  if (!doc) return res.status(404).end();
  if (doc.fileType) res.type(doc.fileType);
  res.sendFile(resolveStoredFile(doc.filePath), (err) => {
    if (err && !res.headersSent) res.status(404).end();
  });
});

// La signature du patient → transmise en direct au PC de l'agent
router.post('/:token', (req, res) => {
  const r = findRequest(req, res);
  if (!r) return;
  if (r.status === 'signed') return res.status(409).json({ success: false, message: 'Ce document a déjà été signé.' });
  const signature = String(req.body?.signature || '');
  if (!parseSignaturePng(signature)) return res.status(400).json({ success: false, message: 'Signature invalide.' });
  const pointerType = ['touch', 'pen', 'mouse'].includes(req.body?.pointerType) ? req.body.pointerType : null;
  r.device = { ip: req.ip || null, userAgent: String(req.headers['user-agent'] || '').slice(0, 300) };
  storeSignature(r, signature, pointerType);
  res.json({ success: true });
});

export default router;
