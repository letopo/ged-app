// backend/src/utils/facturePhpPdfBuilder.js — Génère le PDF d'une facture
// patient PHP importée depuis Sage. Contrairement aux templates existants
// (Ordre de mission, Pièce de caisse) qui sont remplis par un utilisateur et
// rendus côté navigateur, ce document est produit 100% côté serveur à partir
// des données Sage — pas de formulaire, pas de DOM à mesurer.
//
// Réserve 4 zones de signature (Représentante PHP, Facturation, DG, CCG) via
// `signatureZones`, au même format que celui déjà lu par validateTask dans
// workflowController.js (document.metadata.signatureZones).

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const PAGE_WIDTH = 595.28;  // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;

const SIGNATURE_LABELS = ['Représentante PHP', 'Service Facturation', 'Directeur Général', 'CCG'];

function fmtMontant(n) {
  const v = Number(n) || 0;
  // toLocaleString('fr-FR') insère une espace insécable étroite (U+202F) comme
  // séparateur de milliers — WinAnsi (police standard pdf-lib) ne sait pas
  // l'encoder. On la remplace par une espace normale.
  const formatted = v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/ /g, ' ');
  return `${formatted} FCFA`;
}

/**
 * @param {object} facture
 * @param {string} facture.docPiece - N° de pièce Sage (ex: "FA00000311670")
 * @param {string} facture.patientNom
 * @param {string} facture.dateFacture - ISO date
 * @param {Array<{designation:string, quantite:number, prixUnitaire:number, montant:number}>} facture.lignes
 * @param {number} facture.totalHT
 * @param {number} facture.totalTTC
 * @returns {Promise<{buffer: Buffer, signatureZones: Array<{index:number,label:string,x:number,y:number,width:number,height:number}>}>}
 */
export async function buildFacturePhpPdf(facture) {
  const { docPiece, patientNom, dateFacture, lignes = [], totalHT, totalTTC } = facture;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_HEIGHT - MARGIN;

  const drawText = (text, x, yy, opts = {}) => {
    page.drawText(String(text ?? ''), {
      x, y: yy,
      size: opts.size || 10,
      font: opts.bold ? fontBold : font,
      color: opts.color || rgb(0, 0, 0),
    });
  };

  // ── En-tête ──────────────────────────────────────────────────────────────
  drawText('HÔPITAL SAINT-JEAN DE MALTE (HSJM)', MARGIN, y, { size: 14, bold: true });
  y -= 20;
  drawText('FACTURE PATIENT — MUTUELLE PHP', MARGIN, y, { size: 12, bold: true });
  y -= 30;

  drawText(`Pièce Sage : ${docPiece}`, MARGIN, y, { size: 10 });
  drawText(`Date : ${dateFacture || ''}`, PAGE_WIDTH - MARGIN - 150, y, { size: 10 });
  y -= 16;
  drawText(`Patient : ${patientNom || ''}`, MARGIN, y, { size: 10, bold: true });
  y -= 30;

  // ── Tableau des lignes ───────────────────────────────────────────────────
  const colX = { design: MARGIN, qte: 340, pu: 400, montant: 480 };
  drawText('Désignation', colX.design, y, { bold: true });
  drawText('Qté', colX.qte, y, { bold: true });
  drawText('P.U.', colX.pu, y, { bold: true });
  drawText('Montant', colX.montant, y, { bold: true });
  y -= 4;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: rgb(0, 0, 0) });
  y -= 16;

  for (const ligne of lignes) {
    if (y < 160) break; // sécurité anti-débordement (peu probable en usage réel)
    drawText((ligne.designation || '').slice(0, 55), colX.design, y);
    drawText(String(ligne.quantite ?? ''), colX.qte, y);
    drawText(fmtMontant(ligne.prixUnitaire), colX.pu, y, { size: 9 });
    drawText(fmtMontant(ligne.montant), colX.montant, y, { size: 9 });
    y -= 16;
  }

  y -= 8;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: rgb(0, 0, 0) });
  y -= 20;

  drawText('Total HT :', 380, y, { bold: true });
  drawText(fmtMontant(totalHT), 480, y);
  y -= 16;
  drawText('Total TTC :', 380, y, { bold: true });
  drawText(fmtMontant(totalTTC), 480, y, { bold: true });

  // ── Zones de signature (bas de page, 4 colonnes) ────────────────────────
  const sigWidth = 120;
  const sigHeight = 55;
  const sigY = 60;
  const gap = (PAGE_WIDTH - 2 * MARGIN - 4 * sigWidth) / 3;

  const signatureZones = SIGNATURE_LABELS.map((label, index) => {
    const x = MARGIN + index * (sigWidth + gap);
    drawText(label, x, sigY + sigHeight + 6, { size: 8, bold: true });
    page.drawRectangle({
      x, y: sigY, width: sigWidth, height: sigHeight,
      borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1,
    });
    return { index, label, x, y: sigY, width: sigWidth, height: sigHeight };
  });

  const bytes = await pdfDoc.save();
  return { buffer: Buffer.from(bytes), signatureZones };
}
