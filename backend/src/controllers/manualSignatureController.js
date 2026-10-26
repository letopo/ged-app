// backend/src/controllers/manualSignatureController.js
// Signature manuscrite d'un document (patient au guichet) : le tracé fait au
// doigt / au stylet sur une tablette ou une tablette graphique est apposé dans
// le cadre choisi sur la visionneuse, avec « Lu et approuvé », le nom du
// signataire et la date/heure du serveur.
//
// Preuve : l'original est conservé tel quel, la version signée devient le
// fichier du document, et l'empreinte SHA-256 des deux est enregistrée dans
// documents.metadata.manualSignature (+ journal d'audit). Le document est
// ensuite verrouillé (plus de nouvelle signature, d'ajout de page ni de circuit).
import crypto from 'crypto';
import { resolveStoredFile } from '../utils/storedFiles.js';
import fs from 'fs/promises';
import path from 'path';
import {
  PDFDocument, StandardFonts, rgb,
  pushGraphicsState, popGraphicsState, concatTransformationMatrix,
} from 'pdf-lib';
import QRCode from 'qrcode';
import { Document, Workflow } from '../models/index.js';
import { hasDocumentReadAccess } from '../utils/documentVisibility.js';
import {
  createRequest, getRequest, cancelRequest, consumeRequest, sendToKiosk, listKiosks,
} from '../utils/signatureRequests.js';

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;
const INK = rgb(0.12, 0.16, 0.32);

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const isManuallySigned = (doc) => !!doc?.metadata?.manualSignature;

const isPdf = (doc) => doc.fileType === 'application/pdf' || /\.pdf$/i.test(doc.fileName || doc.filePath || '');
const isImage = (doc) => IMAGE_TYPES.includes(doc.fileType) || /\.(jpe?g|png)$/i.test(doc.fileName || doc.filePath || '');

// Le document peut-il être signé maintenant ? → null, ou { status, message }
async function signabilityError(document, user) {
  if (!document) return { status: 404, message: 'Document non trouvé.' };
  if (!(await hasDocumentReadAccess(document, user))) return { status: 403, message: 'Accès non autorisé.' };
  if (isManuallySigned(document)) return { status: 409, message: 'Ce document est déjà signé : il est verrouillé.' };
  if (!isPdf(document) && !isImage(document)) {
    return { status: 400, message: 'Seuls les PDF et les images (JPEG, PNG) peuvent être signés.' };
  }
  const inCircuit = ['pending_validation', 'in_progress'].includes(document.status)
    || await Workflow.count({ where: { documentId: document.id, status: ['pending', 'queued'] } });
  if (inCircuit) return { status: 409, message: 'Ce document est en cours de validation : il ne peut pas être signé maintenant.' };
  return null;
}

// Image de signature envoyée en data URL PNG → Buffer (null si invalide)
export function parseSignaturePng(signature) {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(signature || ''));
  const bytes = m ? Buffer.from(m[1], 'base64') : null;
  if (!bytes || bytes.length < 100 || bytes.length > MAX_SIGNATURE_BYTES || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  return bytes;
}

const cleanName = (v) => String(v || '').replace(/\s+/g, ' ').trim();

// Les polices standard du PDF ne connaissent que le jeu WinAnsi : on remplace
// ce qu'elles ne savent pas écrire (accents rares → lettre de base, sinon « ? »).
function winAnsiSafe(font, text) {
  let out = '';
  for (const ch of String(text || '')) {
    try { font.encodeText(ch); out += ch; continue; } catch { /* caractère inconnu */ }
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    try { font.encodeText(base); out += base; } catch { out += '?'; }
  }
  return out;
}

// Texte réduit si besoin pour tenir dans la largeur du cadre
function fitText(font, text, size, maxWidth, minSize = 4.5) {
  let s = size;
  while (s > minSize && font.widthOfTextAtSize(text, s) > maxWidth) s -= 0.25;
  return s;
}

// Matrice qui fait correspondre l'espace « page telle qu'affichée » (origine en
// bas à gauche, page tournée selon /Rotate) à l'espace du PDF.
function displayToPdfMatrix(rotation, box) {
  const { x: cx, y: cy, width: W, height: H } = box;
  switch (rotation) {
    case 90: return [0, 1, -1, 0, cx + W, cy];
    case 180: return [-1, 0, 0, -1, cx + W, cy + H];
    case 270: return [0, -1, 1, 0, cx, cy + H];
    default: return [1, 0, 0, 1, cx, cy];
  }
}

function formatNow(date) {
  const d = date.toLocaleDateString('fr-FR', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', year: 'numeric' });
  const t = date.toLocaleTimeString('fr-FR', { timeZone: 'Africa/Douala', hour: '2-digit', minute: '2-digit' });
  return `Le ${d} à ${t}`;
}

// Document d'origine → PDF (une image devient une page au format de l'image)
async function loadAsPdf(doc, bytes) {
  if (isPdf(doc)) return PDFDocument.load(bytes);
  const pdf = await PDFDocument.create();
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  // Largeur A4 (595 pt), hauteur selon le ratio de l'image
  const width = 595.28;
  const height = width * (img.height / img.width);
  const page = pdf.addPage([width, height]);
  page.drawImage(img, { x: 0, y: 0, width, height });
  return pdf;
}

/**
 * POST /api/documents/:id/manual-signature
 * body : { signature: 'data:image/png;base64,…', signerName, placement: { page, x, y, w, h }, autoPlaced, pointerType }
 * placement : page (1…n) et cadre en fractions (0…1) de la page affichée, origine en haut à gauche.
 */
export const signDocumentManually = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    const blocked = await signabilityError(document, req.user);
    if (blocked) return res.status(blocked.status).json({ success: false, message: blocked.message });

    const { signature, placement, autoPlaced, pointerType, requestToken } = req.body || {};
    const signerName = cleanName(req.body?.signerName);
    if (signerName.length < 2 || signerName.length > 120) {
      return res.status(400).json({ success: false, message: 'Indiquez le nom du signataire.' });
    }
    // Signature faite sur une tablette du guichet : on reprend la demande pour la preuve
    const remote = requestToken ? getRequest(requestToken, req.tenantId) : null;
    if (requestToken && (!remote || remote.requesterId !== req.user.id || remote.documentId !== document.id || remote.status !== 'signed')) {
      return res.status(400).json({ success: false, message: 'Demande de signature expirée : recommencez.' });
    }
    const sigBytes = parseSignaturePng(remote ? remote.signature : signature);
    if (!sigBytes) {
      return res.status(400).json({ success: false, message: 'Signature invalide.' });
    }
    const p = placement || {};
    const nums = ['x', 'y', 'w', 'h'].map((k) => Number(p[k]));
    if (nums.some((n) => !Number.isFinite(n)) || nums[2] < 0.03 || nums[3] < 0.015) {
      return res.status(400).json({ success: false, message: 'Emplacement de signature invalide.' });
    }
    // Le cadre doit rester dans la page
    const w = clamp(nums[2], 0.03, 1);
    const h = clamp(nums[3], 0.015, 1);
    const x = clamp(nums[0], 0, 1 - w);
    const y = clamp(nums[1], 0, 1 - h);

    const originalAbs = resolveStoredFile(document.filePath);
    let originalBytes;
    try { originalBytes = await fs.readFile(originalAbs); } catch {
      return res.status(404).json({ success: false, message: 'Fichier introuvable sur le serveur.' });
    }

    let pdf;
    try { pdf = await loadAsPdf(document, originalBytes); } catch (err) {
      console.warn('[signature manuscrite] PDF illisible :', err.message);
      return res.status(400).json({ success: false, message: 'Ce fichier ne peut pas être modifié (PDF protégé ou endommagé).' });
    }
    const pages = pdf.getPages();
    const pageNumber = Math.round(Number(p.page) || 1);
    if (pageNumber < 1 || pageNumber > pages.length) {
      return res.status(400).json({ success: false, message: 'Page invalide.' });
    }
    const page = pages[pageNumber - 1];
    const rotation = (((page.getRotation()?.angle || 0) % 360) + 360) % 360;
    const box = page.getCropBox();
    const turned = rotation === 90 || rotation === 270;
    const Wd = turned ? box.height : box.width;
    const Hd = turned ? box.width : box.height;

    // Cadre en points, dans l'espace de la page affichée (origine en bas à gauche)
    const rw = w * Wd;
    const rh = h * Hd;
    const rx = x * Wd;
    const ry = Hd - (y + h) * Hd;

    const signedAt = new Date();
    const [regular, bold, italic] = await Promise.all([
      pdf.embedFont(StandardFonts.Helvetica),
      pdf.embedFont(StandardFonts.HelveticaBold),
      pdf.embedFont(StandardFonts.HelveticaOblique),
    ]);
    const sigImage = await pdf.embedPng(sigBytes);

    const pad = Math.min(rw, rh) * 0.04;
    const innerW = rw - 2 * pad;
    const mention = winAnsiSafe(italic, 'Lu et approuvé');
    const nameLine = winAnsiSafe(bold, signerName);
    const dateLine = winAnsiSafe(regular, formatNow(signedAt));
    const mentionSize = fitText(italic, mention, clamp(rh * 0.12, 6, 11), innerW);
    const nameSize = fitText(bold, nameLine, clamp(rh * 0.1, 5.5, 9.5), innerW);
    const dateSize = fitText(regular, dateLine, clamp(rh * 0.09, 5, 8.5), innerW);

    const topY = ry + rh - pad - mentionSize;
    const dateY = ry + pad + dateSize * 0.2;
    const nameY = dateY + dateSize * 1.25;
    const sigTop = topY - mentionSize * 0.3;
    const sigBottom = nameY + nameSize * 1.1;
    const sigBoxH = Math.max(sigTop - sigBottom, rh * 0.25);
    const ratio = sigImage.width / sigImage.height;
    let sw = innerW;
    let sh = sw / ratio;
    if (sh > sigBoxH) { sh = sigBoxH; sw = sh * ratio; }

    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...displayToPdfMatrix(rotation, box)));
    page.drawText(mention, { x: rx + pad, y: topY, size: mentionSize, font: italic, color: INK });
    page.drawImage(sigImage, { x: rx + (rw - sw) / 2, y: sigBottom + (sigBoxH - sh) / 2, width: sw, height: sh });
    page.drawText(nameLine, { x: rx + pad, y: nameY, size: nameSize, font: bold, color: INK });
    page.drawText(dateLine, { x: rx + pad, y: dateY, size: dateSize, font: regular, color: rgb(0.3, 0.3, 0.35) });
    page.pushOperators(popGraphicsState());

    pdf.setModificationDate(signedAt);
    const signedBytes = Buffer.from(await pdf.save({ useObjectStreams: false }));

    const base = path.basename(document.fileName || 'document', path.extname(document.fileName || '')).replace(/_v\d+$/, '');
    const newFileName = `${base}_signe_${signedAt.getTime()}.pdf`;
    await fs.writeFile(path.resolve(process.cwd(), `uploads/${newFileName}`), signedBytes);

    const record = {
      signerName,
      signedAt: signedAt.toISOString(),
      requestedBy: { id: req.user.id, name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email },
      page: pageNumber,
      placement: { x, y, w, h },
      autoPlaced: !!autoPlaced,
      pointerType: ['touch', 'pen', 'mouse'].includes(remote ? remote.pointerType : pointerType) ? (remote ? remote.pointerType : pointerType) : null,
      ip: req.ip || null,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
      // Signée sur une tablette (lien / QR code ou borne) : appareil du signataire
      remote: remote ? { kioskName: remote.kioskName || null, ip: remote.device?.ip || null, userAgent: remote.device?.userAgent || null } : null,
      sha256: sha256(signedBytes),
      original: {
        filePath: document.filePath,
        fileName: document.fileName,
        fileType: document.fileType,
        sha256: sha256(originalBytes),
      },
    };

    await document.update({
      filePath: `uploads/${newFileName}`,
      fileName: newFileName,
      fileType: 'application/pdf',
      fileSize: signedBytes.length,
      metadata: { ...(document.metadata || {}), manualSignature: record, pageCount: pages.length },
    });

    if (remote) consumeRequest(remote);
    const { AuditLog } = await import('../models/index.js');
    AuditLog.log(req, 'SIGN_MANUAL', 'document', document.id, { title: document.title, signerName, sha256: record.sha256, remote: !!remote });

    res.json({ success: true, data: document, message: 'Document signé.' });
  } catch (error) {
    console.error('❌ Erreur signature manuscrite :', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la signature du document.' });
  }
};

/**
 * GET /api/documents/:id/manual-signature
 * Détails de la signature + contrôle d'intégrité (le fichier actuel a-t-il
 * toujours l'empreinte enregistrée au moment de la signature ?).
 */
export const getManualSignature = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    if (!(await hasDocumentReadAccess(document, req.user))) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }
    const record = document.metadata?.manualSignature;
    if (!record) return res.json({ success: true, data: null });
    let intact = false;
    try {
      intact = sha256(await fs.readFile(resolveStoredFile(document.filePath))) === record.sha256;
    } catch { intact = false; }
    const { ip, userAgent, remote, ...publicRecord } = record;
    if (remote) publicRecord.remote = { kioskName: remote.kioskName || null };
    res.json({ success: true, data: { ...publicRecord, intact } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── Signature sur une tablette du guichet ────────────────────────────────────

const validPlacement = (p) => {
  const n = ['x', 'y', 'w', 'h'].map((k) => Number(p?.[k]));
  if (n.some((v) => !Number.isFinite(v) || v < 0 || v > 1)) return null;
  return { page: Math.max(1, Math.round(Number(p.page) || 1)), x: n[0], y: n[1], w: n[2], h: n[3] };
};

// Adresse de la GED vue par l'agent (celle que la tablette doit ouvrir)
function publicOrigin(req) {
  const asked = String(req.body?.origin || '');
  try {
    const u = new URL(asked);
    if (u.hostname === req.hostname && /^https?:$/.test(u.protocol)) return u.origin;
  } catch { /* adresse absente ou invalide */ }
  return `${req.protocol}://${req.get('host')}`;
}

/**
 * POST /api/documents/:id/signature-requests  { signerName, placement, origin }
 * → { token, expiresAt, url, qr } : lien (et QR code) à ouvrir sur la tablette.
 */
export const createSignatureRequest = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    const blocked = await signabilityError(document, req.user);
    if (blocked) return res.status(blocked.status).json({ success: false, message: blocked.message });
    const signerName = cleanName(req.body?.signerName);
    if (signerName.length < 2 || signerName.length > 120) {
      return res.status(400).json({ success: false, message: 'Indiquez le nom du signataire.' });
    }
    const placement = validPlacement(req.body?.placement);
    if (!placement) return res.status(400).json({ success: false, message: 'Emplacement de signature invalide.' });

    const r = createRequest({
      tenantId: req.tenantId, documentId: document.id, requesterId: req.user.id,
      signerName, placement, title: document.title,
    });
    const url = `${publicOrigin(req)}/signer/${r.token}`;
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: 'M' });
    res.json({ success: true, data: { token: r.token, expiresAt: new Date(r.expiresAt).toISOString(), url, qr } });
  } catch (error) {
    console.error('❌ Demande de signature :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

const ownRequest = (req) => {
  const r = getRequest(req.params.token, req.tenantId);
  return r && r.requesterId === req.user.id ? r : null;
};

// GET /api/documents/signature-requests/:token — état (secours si Socket.IO coupé)
export const getSignatureRequestStatus = (req, res) => {
  const r = ownRequest(req);
  if (!r) return res.status(404).json({ success: false, message: 'Demande expirée.' });
  res.json({ success: true, data: { status: r.status, signature: r.status === 'signed' ? r.signature : null, pointerType: r.pointerType } });
};

// POST /api/documents/signature-requests/:token/send  { kioskId } — envoi à une borne
export const sendSignatureRequest = (req, res) => {
  const r = ownRequest(req);
  if (!r || r.status === 'signed' || r.status === 'cancelled') {
    return res.status(404).json({ success: false, message: 'Demande expirée.' });
  }
  const kiosk = listKiosks(req.tenantId).find((k) => k.id === req.body?.kioskId);
  if (!kiosk || !sendToKiosk(r, kiosk.id)) {
    return res.status(404).json({ success: false, message: 'Cette tablette n\'est plus connectée.' });
  }
  r.kioskName = kiosk.name;
  res.json({ success: true });
};

// DELETE /api/documents/signature-requests/:token — l'agent annule
export const cancelSignatureRequest = (req, res) => {
  const r = ownRequest(req);
  if (r) cancelRequest(r);
  res.json({ success: true });
};

// GET /api/documents/signature-kiosks — tablettes de guichet connectées
export const listSignatureKiosks = (req, res) => {
  res.json({ success: true, data: listKiosks(req.tenantId) });
};
