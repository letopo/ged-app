// backend/src/utils/certificatAptitudeSign.js
// Certificat d'aptitude signé dès l'enregistrement : le médecin qui le crée en
// est le seul signataire, il n'a plus à se l'envoyer en signature.
//
// Même rendu qu'une validation « Signer et cacheter » du circuit
// (workflowController) : signature dans la moitié basse du cadre « Le Médecin »,
// cachet centré sur le cadre (taille réelle si l'organisation l'a activée), puis
// QR de vérification en bas à droite. Une étape de circuit approuvée est
// enregistrée au nom du médecin : historique et page /verify restent cohérents.
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { User, Workflow } from '../models/index.js';
import { resolveStoredFile } from './storedFiles.js';
import { centeredStampRect } from './stampSize.js';
import { getTenantSettings } from './tenantSettings.js';
import { generateVerificationHash, generateQRCodeBuffer, buildVerificationUrl, resolveAppUrl } from './qrVerification.js';

export const CERTIFICAT_CATEGORY = "Certificat d'aptitude";

async function embedImage(pdfDoc, bytes) {
  try { return await pdfDoc.embedJpg(bytes); } catch { return pdfDoc.embedPng(bytes); }
}

async function readImage(pdfDoc, rel) {
  if (!rel) return null;
  try {
    return await embedImage(pdfDoc, await fs.readFile(path.resolve(process.cwd(), rel)));
  } catch (err) {
    console.warn(`⚠️ Certificat : image ${rel} illisible :`, err.message);
    return null;
  }
}

/**
 * Pose la signature et le cachet du créateur sur le certificat, ajoute le QR et
 * passe le document à « approuvé ».
 * @returns {Promise<{ signed: boolean, reason?: string }>}
 *   signed=false (document laissé en brouillon, ancien circuit possible) quand le
 *   compte n'a ni signature ni cachet enregistrés dans son profil.
 */
export async function autoSignCertificatAptitude(document, userId) {
  if (document.category !== CERTIFICAT_CATEGORY || document.fileType !== 'application/pdf') {
    return { signed: false, reason: 'not_applicable' };
  }
  const signer = await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName', 'signaturePath', 'stampPath', 'stampWidthMm'] });
  if (!signer?.signaturePath && !signer?.stampPath) return { signed: false, reason: 'no_signature' };

  const pdfPath = resolveStoredFile(document.filePath);
  const pdfDoc = await PDFDocument.load(await fs.readFile(pdfPath));
  const page = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
  const { width: pageW } = page.getSize();
  const zone = (Array.isArray(document.metadata?.signatureZones) && document.metadata.signatureZones[0])
    || { x: pageW - 30 - 60 - 190, y: 100, width: 190, height: 72 };
  const halfH = zone.height / 2;

  const signature = await readImage(pdfDoc, signer.signaturePath);
  if (signature) {
    const dims = signature.scaleToFit(zone.width * 0.9, halfH * 0.85);
    page.drawImage(signature, {
      x: zone.x + zone.width / 2 - dims.width / 2,
      y: zone.y + (halfH - dims.height) / 2,
      width: dims.width,
      height: dims.height,
    });
  }

  const stamp = await readImage(pdfDoc, signer.stampPath);
  if (stamp) {
    const dims = stamp.scaleToFit(zone.width * 0.9, halfH * 0.85);
    let rect = { x: zone.x + zone.width / 2 - dims.width / 2, y: zone.y + halfH + (halfH - dims.height) / 2, width: dims.width, height: dims.height };
    if ((await getTenantSettings()).stampRealSize) {
      rect = centeredStampRect(stamp, signer.stampWidthMm, zone.x + zone.width / 2, zone.y + zone.height / 2);
    }
    page.drawImage(stamp, rect);
  }
  if (!signature && !stamp) return { signed: false, reason: 'no_signature' };

  // QR de vérification, comme à la fin d'un circuit
  const verificationHash = generateVerificationHash(document.id, 1, signer.id);
  const verificationUrl = buildVerificationUrl(verificationHash, await resolveAppUrl(document.tenantId));
  try {
    const qr = await pdfDoc.embedPng(await generateQRCodeBuffer(verificationUrl));
    const size = 55;
    const margin = 15;
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawImage(qr, { x: pageW - size - margin, y: margin, width: size, height: size });
    page.drawText('Verifier:', { x: pageW - size - margin, y: margin + size + 3, size: 5, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(verificationHash, { x: pageW - size - margin, y: margin - 7, size: 4.5, font, color: rgb(0.5, 0.5, 0.5) });
  } catch (err) {
    console.warn('⚠️ Certificat : QR non ajouté (non bloquant) :', err.message);
  }

  const base = path.basename(document.fileName, path.extname(document.fileName)).replace(/_v\d+$/, '');
  const newFileName = `${base}_v${Date.now()}.pdf`;
  await fs.writeFile(path.resolve(process.cwd(), `uploads/${newFileName}`), await pdfDoc.save({ useObjectStreams: false }));

  const now = new Date();
  await Workflow.create({
    documentId: document.id,
    tenantId: document.tenantId,
    validatorId: signer.id,
    step: 1,
    status: 'approved',
    comment: 'Signé et cacheté à la création',
    assignedAt: now,
    validatedAt: now,
  });

  await document.update({
    status: 'approved',
    filePath: `uploads/${newFileName}`,
    fileName: newFileName,
    metadata: {
      ...document.metadata,
      has_signature: !!signature,
      has_stamp: !!stamp,
      autoSigned: true,
      verification_hash: verificationHash,
      verification_url: verificationUrl,
      verified_at: now.toISOString(),
    },
  });
  return { signed: true };
}
