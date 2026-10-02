// backend/src/utils/relevePhpPdfBuilder.js
// Relevé journalier des factures PHP arrêtées (Sage) — signé par le DG en fin
// de journée, en plus de chaque facture. Liste des factures du jour, sous-totaux
// employés / familles, total en lettres, cadres de signature (cachet 58 mm).
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { montantEnLettres } from './montantEnLettres.js';

const W = 841.89, H = 595.28, M = 32;                // A4 paysage : plus de colonnes lisibles
const INK = rgb(0.11, 0.13, 0.17);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.82, 0.84, 0.88);
const BRAND = rgb(0.106, 0.227, 0.42);
const SOFT = rgb(0.95, 0.96, 0.98);
const WARN = rgb(0.72, 0.33, 0.04);

export const DEFAULT_RELEVE_LABELS = ['Service Facturation', 'Directeur Général'];
const fmtDate = (d) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '—');
const fmtLong = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtNum = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }).replace(/[  ]/g, ' ');
const safe = (s) => String(s ?? '').normalize('NFC').replace(/[^\x20-\x7e\xa0-\xff’…–—]/g, '');

/**
 * @param {string} date AAAA-MM-JJ
 * @param {Array} factures — fetchFacturesPhp() du jour
 * @returns {Promise<{ buffer, signatureZones, signaturePage, pageCount, total, count }>}
 */
export async function buildRelevePhpPdf(date, factures, options = {}) {
  const labels = options.signatureLabels?.length ? options.signatureLabels : DEFAULT_RELEVE_LABELS;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Relevé des factures PHP du ${fmtDate(date)}`);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page; let y; const pages = [];
  const text = (s, x, yy, { size = 9, b = false, color = INK, align = 'left', maxW } = {}) => {
    const fnt = b ? bold : font;
    let str = safe(s);
    if (maxW) while (str.length > 1 && fnt.widthOfTextAtSize(str, size) > maxW) str = `${str.slice(0, -2)}…`;
    const w = fnt.widthOfTextAtSize(str, size);
    page.drawText(str, { x: align === 'right' ? x - w : align === 'center' ? x - w / 2 : x, y: yy, size, font: fnt, color });
  };
  const box = (x, yy, w, h, { fill, border = LINE, bw = 0.8 } = {}) => page.drawRectangle({ x, y: yy, width: w, height: h, color: fill, borderColor: border, borderWidth: bw });
  const hline = (yy, color = LINE, t = 0.6) => page.drawLine({ start: { x: M, y: yy }, end: { x: W - M, y: yy }, thickness: t, color });

  const total = factures.reduce((s, f) => s + f.total, 0);
  const sub = (type) => factures.filter(f => f.patient.type === type);
  const header = (cont) => {
    page = pdf.addPage([W, H]); pages.push(page); y = H - M;
    text('HÔPITAL SAINT-JEAN DE MALTE', M, y - 12, { size: 13, b: true, color: BRAND });
    text('Ordre de Malte  ·  B.P. 56 Njombé  ·  Cameroun', M, y - 25, { size: 8.5, color: MUTED });
    text(cont ? 'RELEVÉ DES FACTURES PHP (suite)' : 'RELEVÉ DES FACTURES PHP ARRÊTÉES', W - M, y - 12, { size: 12, b: true, align: 'right' });
    text(`Journée du ${fmtLong(date)}  ·  Mutuelle de santé PHP`, W - M, y - 25, { size: 9, color: MUTED, align: 'right' });
    y -= 36; hline(y, BRAND, 1.2); y -= 10;
  };
  const cols = [
    { t: 'N°', w: 26 }, { t: 'Facture', w: 92 }, { t: 'Patient', w: 0 }, { t: 'Type', w: 72 }, { t: 'Matricule', w: 62 },
    { t: 'Secteur', w: 84 }, { t: 'BL', w: 30, right: true }, { t: 'Période des BL', w: 112 }, { t: 'État Sage', w: 82 }, { t: 'Montant', w: 76, right: true },
  ];
  cols[2].w = W - 2 * M - cols.reduce((s, c) => s + c.w, 0);
  const tableHeader = () => {
    box(M, y - 16, W - 2 * M, 16, { fill: BRAND, border: BRAND });
    let x = M;
    for (const c of cols) { text(c.t, c.right ? x + c.w - 5 : x + 5, y - 11, { size: 8, b: true, color: rgb(1, 1, 1), align: c.right ? 'right' : 'left' }); x += c.w; }
    y -= 16;
  };
  const RH = 14, FOOT = 26, SIGN = 150;
  header(false);
  // Synthèse
  const synth = [
    ['Factures', String(factures.length)], ['Montant total', `${fmtNum(total)} FCFA`],
    ['Employés PHP', `${sub('Employé PHP').length}  ·  ${fmtNum(sub('Employé PHP').reduce((s, f) => s + f.total, 0))} FCFA`],
    ['Familles PHP', `${sub('Famille PHP').length}  ·  ${fmtNum(sub('Famille PHP').reduce((s, f) => s + f.total, 0))} FCFA`],
    ['BL hors période BPC', String(factures.filter(f => f.horsBpc).length)],
  ];
  const sw = (W - 2 * M - 4 * 8) / 5;
  synth.forEach(([l, v], i) => {
    const x = M + i * (sw + 8);
    box(x, y - 34, sw, 34, { fill: SOFT });
    text(l, x + 8, y - 12, { size: 7.5, color: MUTED });
    text(v, x + 8, y - 26, { size: 10, b: true, color: i === 4 && v !== '0' ? WARN : INK, maxW: sw - 14 });
  });
  y -= 46;
  tableHeader();
  factures.forEach((f, i) => {
    if (y - RH < M + FOOT) { header(true); tableHeader(); }
    if (i % 2) box(M, y - RH, W - 2 * M, RH, { fill: SOFT, border: SOFT, bw: 0 });
    const vals = [String(i + 1), f.piece, f.patient.nom, f.patient.type || '—', f.patient.matricule || '—', f.patient.secteur || '—', String(f.nbBl),
      f.premierBl ? `${fmtDate(f.premierBl)} au ${fmtDate(f.dernierBl)}` : '—', f.comptabilisee ? 'Comptabilisée' : 'Non comptabilisée', fmtNum(f.total)];
    let x = M;
    cols.forEach((c, j) => {
      const color = j === 7 && f.horsBpc ? WARN : j === 0 ? MUTED : INK;
      text(vals[j], c.right ? x + c.w - 5 : x + 5, y - 10, { size: 7.8, align: c.right ? 'right' : 'left', maxW: c.w - 8, color });
      x += c.w;
    });
    y -= RH;
  });
  hline(y, LINE, 0.8);
  if (y - 60 - SIGN < M + FOOT) header(true);
  y -= 14;
  text(`Arrêté le présent relevé à ${factures.length} facture(s) pour un montant total de :`, M, y - 4, { size: 9, color: MUTED });
  text(montantEnLettres(total), M, y - 18, { size: 10, b: true, maxW: W - 2 * M - 220 });
  box(W - M - 210, y - 24, 210, 24, { fill: BRAND, border: BRAND });
  text('TOTAL', W - M - 200, y - 16, { size: 10, b: true, color: rgb(1, 1, 1) });
  text(`${fmtNum(total)} FCFA`, W - M - 10, y - 16, { size: 11, b: true, color: rgb(1, 1, 1), align: 'right' });
  y -= 40;
  // Signatures
  const n = labels.length, gap = 14;
  const zw = Math.min(220, (W - 2 * M - gap * (n - 1)) / n), zh = 100;
  const startX = W - M - (n * zw + (n - 1) * gap);
  const signaturePage = pages.length - 1;
  const signatureZones = labels.map((label, i) => {
    const x = startX + i * (zw + gap);
    text(label, x + zw / 2, y - 10, { size: 8.5, b: true, align: 'center' });
    box(x, y - 16 - zh, zw, zh);
    return { index: i + 1, label, x, y: y - 16 - zh, width: zw, height: zh };
  });
  const stamp = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  pages.forEach((pg, i) => {
    page = pg;
    page.drawLine({ start: { x: M, y: M + 12 }, end: { x: W - M, y: M + 12 }, thickness: 0.5, color: LINE });
    text(`Généré par la GED à partir de Sage le ${stamp}`, M, M + 2, { size: 7.5, color: MUTED });
    text(`Relevé du ${fmtDate(date)}  ·  page ${i + 1} / ${pages.length}`, W - M, M + 2, { size: 7.5, color: MUTED, align: 'right' });
  });
  const bytes = await pdf.save({ useObjectStreams: false });
  return { buffer: Buffer.from(bytes), signatureZones, signaturePage, pageCount: pages.length, total, count: factures.length };
}
