// backend/src/utils/caissePharmaciePdf.js
// « Relevé de factures » de la caisse de vente de la pharmacie, comme celui que
// Sage imprime (payeur CLIENT COMPTANT PHARMACIE) : Date, N° facture, Client,
// Total HT, Acomptes, Net à payer, TOTAL GÉNÉRAL — plus le montant en lettres et
// les cadres de signature (Pharmacie, Caissière, Comptable) pour le circuit de la GED.
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { montantEnLettres } from './montantEnLettres.js';
import { totauxCaisse } from './caissePharmacie.js';

const W = 595.28, H = 841.89, M = 36;
const INK = rgb(0.11, 0.13, 0.17);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.82, 0.84, 0.88);
const BRAND = rgb(0.106, 0.227, 0.42);
const SOFT = rgb(0.95, 0.96, 0.98);

export const CAISSE_SIGNATURE_LABELS = ['Pharmacie', 'Caissière', 'Comptable'];
/** Cadres : la personne de la pharmacie qui envoie l'état (son nom), la caissière, la comptable. */
export const caisseSignatureLabels = (pharmacien) => [pharmacien ? `Pharmacie : ${pharmacien}` : 'Pharmacie', 'Caissière', 'Comptable'];
const fmtDate = (d) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '—');
const fmtLong = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtNum = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }).replace(/[  ]/g, ' ');
const safe = (s) => String(s ?? '').normalize('NFC').replace(/[^\x20-\x7e\xa0-\xff’…–—]/g, '');

export const periodeLabel = (from, to) => (from === to ? `du ${fmtLong(from)}` : `du ${fmtDate(from)} au ${fmtDate(to)}`);

/**
 * @param {{ from, to, payeur, payeurNom, lignes, labels? }} p
 * @returns {Promise<{ buffer, signatureZones, signaturePage, totaux }>}
 */
export async function buildCaissePharmaciePdf({ from, to, payeur, payeurNom, lignes, labels = CAISSE_SIGNATURE_LABELS }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Caisse pharmacie ${periodeLabel(from, to)}`);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const totaux = totauxCaisse(lignes);
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

  const cols = [
    { t: 'Date', w: 58 }, { t: 'N° facture', w: 92 }, { t: 'Client', w: 58 }, { t: 'Intitulé', w: 0 },
    { t: 'Total HT', w: 70, right: true }, { t: 'Acomptes', w: 60, right: true }, { t: 'Net à payer', w: 74, right: true },
  ];
  cols[3].w = W - 2 * M - cols.reduce((s, c) => s + c.w, 0);
  const header = (cont) => {
    page = pdf.addPage([W, H]); pages.push(page); y = H - M;
    text('HÔPITAL SAINT JEAN DE MALTE', M, y - 12, { size: 12, b: true, color: BRAND });
    text('Soins hospitaliers  ·  B.P. 56 Njombé', M, y - 25, { size: 8.5, color: MUTED });
    text(payeurNom || 'CLIENT COMPTANT PHARMACIE', W - M, y - 12, { size: 10, b: true, align: 'right' });
    text(`Payeur ${payeur}`, W - M, y - 25, { size: 8.5, color: MUTED, align: 'right' });
    y -= 50;
    text(cont ? 'Relevé de factures (suite)' : 'Relevé de factures', M, y, { size: 20, b: true });
    text(`Caisse de vente pharmacie  ·  ${periodeLabel(from, to)}`, M, y - 18, { size: 10, color: MUTED });
    y -= 34; hline(y, BRAND, 1.2); y -= 8;
    box(M, y - 16, W - 2 * M, 16, { fill: BRAND, border: BRAND });
    let x = M;
    for (const c of cols) { text(c.t, c.right ? x + c.w - 5 : x + 5, y - 11, { size: 8, b: true, color: rgb(1, 1, 1), align: c.right ? 'right' : 'left' }); x += c.w; }
    y -= 16;
  };
  const RH = 14, FOOT = 26, END = 210;
  header(false);
  lignes.forEach((l, i) => {
    if (y - RH < M + FOOT) header(true);
    if (i % 2) box(M, y - RH, W - 2 * M, RH, { fill: SOFT, border: SOFT, bw: 0 });
    const vals = [fmtDate(l.date), l.piece, l.client, l.intitule || '—', fmtNum(l.totalHT), fmtNum(l.acomptes), fmtNum(l.net)];
    let x = M;
    cols.forEach((c, j) => { text(vals[j], c.right ? x + c.w - 5 : x + 5, y - 10, { size: 8, align: c.right ? 'right' : 'left', maxW: c.w - 8 }); x += c.w; });
    y -= RH;
  });
  if (!lignes.length) { text('Aucune facture sur la période.', M + 5, y - 14, { size: 9, color: MUTED }); y -= 20; }
  hline(y, LINE, 0.8);
  // TOTAL GÉNÉRAL
  if (y - END < M + FOOT) header(true);
  y -= 4;
  box(M, y - 20, W - 2 * M, 20, { fill: SOFT, border: LINE });
  const xs = cols.reduce((acc, c, i) => { acc.push((acc[i - 1] ?? M) + (i ? cols[i - 1].w : 0)); return acc; }, []);
  text(`TOTAL GÉNÉRAL  ·  ${totaux.count} facture(s)`, M + 5, y - 14, { size: 9, b: true });
  text(fmtNum(totaux.totalHT), xs[4] + cols[4].w - 5, y - 14, { size: 9, b: true, align: 'right' });
  text(fmtNum(totaux.acomptes), xs[5] + cols[5].w - 5, y - 14, { size: 9, b: true, align: 'right' });
  text(fmtNum(totaux.net), xs[6] + cols[6].w - 5, y - 14, { size: 9, b: true, align: 'right' });
  y -= 36;
  text('Arrêté le présent relevé à la somme de :', M, y, { size: 9, color: MUTED });
  text(`${montantEnLettres(totaux.net)} (${fmtNum(totaux.net)} FCFA)`, M, y - 14, { size: 10, b: true, maxW: W - 2 * M });
  y -= 36;
  // Cadres de signature (dans l'ordre du circuit)
  const n = labels.length, gap = 12;
  const zw = Math.min(220, (W - 2 * M - gap * (n - 1)) / n), zh = 100;
  const startX = W - M - (n * zw + (n - 1) * gap);
  const signaturePage = pages.length - 1;
  const signatureZones = labels.map((label, i) => {
    const x = startX + i * (zw + gap);
    text(label, x + zw / 2, y - 10, { size: 8.5, b: true, align: 'center', maxW: zw - 4 });
    box(x, y - 16 - zh, zw, zh);
    return { index: i + 1, label, x, y: y - 16 - zh, width: zw, height: zh };
  });
  const stamp = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  pages.forEach((pg, i) => {
    page = pg;
    page.drawLine({ start: { x: M, y: M + 12 }, end: { x: W - M, y: M + 12 }, thickness: 0.5, color: LINE });
    text(`Généré par la GED à partir de Sage le ${stamp}`, M, M + 2, { size: 7.5, color: MUTED });
    text(`Page ${i + 1} / ${pages.length}`, W - M, M + 2, { size: 7.5, color: MUTED, align: 'right' });
  });
  const bytes = await pdf.save({ useObjectStreams: false });
  return { buffer: Buffer.from(bytes), signatureZones, signaturePage, totaux };
}
