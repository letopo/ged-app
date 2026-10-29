// backend/src/utils/qrRestamp.js
// Remplace le QR de vérification des documents déjà signés dont l'adresse est
// fausse (ex. http://localhost:3001/verify/… faute d'APP_URL en production).
//  - même code de vérification (imprimé sous le QR, inchangé) : seule l'adresse change ;
//  - nouveau QR posé exactement sur l'ancien (repéré à sa taille, 80 × 80 px),
//    sur fond blanc ;
//  - nouvelle version du fichier : l'ancien PDF reste sur le disque et son
//    chemin est noté dans metadata.qr_previous_file.
// Lancé une fois par scripts/restamp-qr.mjs (--apply ; sans lui, simulation).
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, PDFName, rgb } from 'pdf-lib';
import sequelize from '../config/database.js';
import { Document } from '../models/index.js';
import { resolveStoredFileOrNull } from './storedFiles.js';
import { buildVerificationUrl, generateQRCodeBuffer, resolveAppUrl } from './qrVerification.js';

const QR_PX = 80;        // largeur du PNG produit par generateQRCodeBuffer
const QR_SIZE = 55;      // taille du QR sur la page (points)
const QR_MARGIN = 15;

// Page qui porte l'ancien QR : celle dont les images comptent un PNG 80 × 80 (la dernière en priorité)
function findQrPage(pdfDoc) {
  const pages = pdfDoc.getPages();
  for (let i = pages.length - 1; i >= 0; i--) {
    const xobjects = pages[i].node.Resources()?.lookup(PDFName.of('XObject'));
    if (!xobjects?.entries) continue;
    for (const [, ref] of xobjects.entries()) {
      const obj = pdfDoc.context.lookup(ref);
      const dict = obj?.dict;
      if (!dict || dict.get(PDFName.of('Subtype'))?.toString() !== '/Image') continue;
      if (Number(dict.get(PDFName.of('Width'))?.toString()) === QR_PX && Number(dict.get(PDFName.of('Height'))?.toString()) === QR_PX) {
        return pages[i];
      }
    }
  }
  return null;
}

/** Nouveau PDF avec le QR remplacé, ou null si l'ancien QR est introuvable. */
export async function restampPdf(bytes, url) {
  const pdfDoc = await PDFDocument.load(bytes);
  const page = findQrPage(pdfDoc);
  if (!page) return null;
  const { width } = page.getSize();
  const x = width - QR_SIZE - QR_MARGIN;
  page.drawRectangle({ x: x - 1, y: QR_MARGIN - 1, width: QR_SIZE + 2, height: QR_SIZE + 2, color: rgb(1, 1, 1) });
  page.drawImage(await pdfDoc.embedPng(await generateQRCodeBuffer(url)), { x, y: QR_MARGIN, width: QR_SIZE, height: QR_SIZE });
  return pdfDoc.save({ useObjectStreams: false });
}

/**
 * @param {{ apply?: boolean, log?: Function }} options apply=false : simulation (rien n'est écrit)
 * @returns {Promise<{ total: number, ok: number, updated: number, missingFile: number, noQr: number, failed: number }>}
 */
export async function restampVerificationQrs({ apply = false, log = console.log } = {}) {
  const docs = await Document.findAll({
    where: sequelize.literal("metadata->>'verification_hash' IS NOT NULL"),
    attributes: ['id', 'title', 'tenantId', 'filePath', 'fileName', 'metadata'],
  });
  const stats = { total: docs.length, ok: 0, updated: 0, missingFile: 0, noQr: 0, failed: 0 };
  const bases = new Map();

  for (const doc of docs) {
    const meta = doc.metadata || {};
    if (!bases.has(doc.tenantId)) bases.set(doc.tenantId, await resolveAppUrl(doc.tenantId));
    const base = bases.get(doc.tenantId);
    if (/\/\/(localhost|127\.)/.test(base)) {
      throw new Error('Adresse de la GED inconnue (APP_URL non défini) : rien n\'est modifié.');
    }
    const url = buildVerificationUrl(meta.verification_hash, base);
    if (meta.verification_url === url) { stats.ok++; continue; }

    const file = resolveStoredFileOrNull(doc.filePath);
    let bytes;
    try { bytes = file && await fs.readFile(file); } catch { bytes = null; }
    if (!bytes) { stats.missingFile++; log(`  fichier absent : ${doc.title} (${doc.filePath})`); continue; }

    try {
      const out = await restampPdf(bytes, url);
      if (!out) { stats.noQr++; log(`  QR introuvable dans le PDF : ${doc.title}`); continue; }
      log(`  ${apply ? 'mis à jour' : 'à mettre à jour'} : ${doc.title} → ${url}`);
      if (apply) {
        const ext = path.extname(doc.fileName) || '.pdf';
        const name = `${path.basename(doc.fileName, ext).replace(/_v\d+$/, '')}_v${Date.now()}${ext}`;
        await fs.writeFile(path.resolve(process.cwd(), 'uploads', name), out);
        await doc.update({
          filePath: `uploads/${name}`,
          fileName: name,
          fileSize: out.length,
          metadata: {
            ...meta,
            verification_url: url,
            qr_previous_file: doc.filePath,
            qr_previous_url: meta.verification_url || null,
            qr_restamped_at: new Date().toISOString(),
          },
        });
      }
      stats.updated++;
    } catch (err) {
      stats.failed++;
      log(`  échec : ${doc.title} — ${err.message}`);
    }
  }
  return stats;
}
