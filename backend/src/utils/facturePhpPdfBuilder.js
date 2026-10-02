// backend/src/utils/facturePhpPdfBuilder.js
// Liasse PDF d'une facture patient PHP, générée 100 % côté serveur à partir de
// Sage (utils/sageFactureData.js) :
//   1. la facture (même contenu que la facture Sage : date et n° de BL,
//      référence, désignation, quantité, prix, montant), totaux, montant en
//      lettres, contrôle du BPC et cadres de signature du circuit ;
//   2. en annexe, le bordereau de cession de chaque BL (pièces justificatives).
//
// Les cadres de signature sont sur la dernière page de la FACTURE (pas des
// annexes) : `signaturePage` est enregistré dans document.metadata et lu par
// validateWorkflowStep. Ils sont assez grands pour un cachet à taille réelle
// (58 mm = 164 pt).
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { montantEnLettres } from './montantEnLettres.js';

const W = 595.28, H = 841.89, M = 36;              // A4 portrait, marge
const INK = rgb(0.11, 0.13, 0.17);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.82, 0.84, 0.88);
const BRAND = rgb(0.106, 0.227, 0.42);              // bleu GED
const SOFT = rgb(0.95, 0.96, 0.98);
const WARN = rgb(0.72, 0.33, 0.04);

export const DEFAULT_SIGNATURE_LABELS = ['Service Facturation', 'Directeur Général', 'CCG'];
const BPC_DAYS = 3;

const DAY = 86_400_000;
const fmtDate = (d) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '—');
const fmtShort = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}` : '');   // 25/09/26
// toLocaleString('fr-FR') utilise une espace fine insécable que la police standard ne sait pas encoder
const fmtNum = (n, dec = 0) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/[  ]/g, ' ');
const fmtMoney = (n) => `${fmtNum(n)} FCFA`;
const safe = (s) => String(s ?? '').normalize('NFC').replace(/[^\x20-\x7e\xa0-\xff’…–—]/g, '');

/**
 * @param {object} f — facture chargée par loadSageFacture()
 * @param {{ signatureLabels?: string[], generatedAt?: Date }} options
 * @returns {Promise<{ buffer: Buffer, signatureZones: object[], signaturePage: number, pageCount: number }>}
 */
export async function buildFacturePhpPdf(f, options = {}) {
  const labels = options.signatureLabels?.length ? options.signatureLabels : DEFAULT_SIGNATURE_LABELS;
  const generatedAt = options.generatedAt || new Date();
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Facture ${f.piece} — ${f.patient?.nom || ''}`);
  pdf.setAuthor('GED HSJM (Sage)');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page; let y;
  const pages = [];
  const newPage = () => { page = pdf.addPage([W, H]); pages.push(page); y = H - M; return page; };
  const text = (s, x, yy, { size = 9, b = false, color = INK, align = 'left', maxW } = {}) => {
    const fnt = b ? bold : font;
    let str = safe(s);
    if (maxW) while (str.length > 1 && fnt.widthOfTextAtSize(str, size) > maxW) str = `${str.slice(0, -2)}…`;
    const w = fnt.widthOfTextAtSize(str, size);
    const xx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    page.drawText(str, { x: xx, y: yy, size, font: fnt, color });
    return w;
  };
  const hline = (yy, x1 = M, x2 = W - M, color = LINE, t = 0.6) => page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness: t, color });
  const box = (x, yy, w, h, { fill, border = LINE, bw = 0.8 } = {}) => page.drawRectangle({ x, y: yy, width: w, height: h, color: fill, borderColor: border, borderWidth: bw });

  // ── En-tête de la facture ────────────────────────────────────────────────
  const header = (continued) => {
    text('HÔPITAL SAINT-JEAN DE MALTE', M, y - 12, { size: 14, b: true, color: BRAND });
    text('Ordre de Malte  ·  B.P. 56 Njombé  ·  Cameroun', M, y - 26, { size: 8.5, color: MUTED });
    text('hopital.cameroun@ordredemaltefrance.org  ·  N° contribuable M090000010545P', M, y - 37, { size: 8.5, color: MUTED });
    const bx = W - M - 205;
    box(bx, y - 52, 205, 52, { fill: SOFT, border: BRAND, bw: 1 });
    text(continued ? 'FACTURE (suite)' : 'FACTURE PATIENT', bx + 10, y - 15, { size: 8, b: true, color: MUTED });
    text(`N° ${f.piece}`, bx + 10, y - 31, { size: 13, b: true, color: INK });
    text(`du ${fmtDate(f.dateFacture)}  ·  ${f.comptabilisee ? 'Comptabilisée' : 'Non comptabilisée'}`, bx + 10, y - 44, { size: 8, color: MUTED });
    y -= 64;
    hline(y, M, W - M, BRAND, 1.2);
    y -= 12;
  };

  newPage();
  header(false);

  // ── Patient | séjour et prise en charge ──────────────────────────────────
  const p = f.patient || {};
  const colW = (W - 2 * M - 12) / 2;
  const infoH = 112;
  const row = (x, yy, label, value, opts = {}) => {
    text(label, x, yy, { size: 8, color: MUTED });
    text(value || '—', x + 82, yy, { size: 9, b: opts.b, color: opts.color || INK, maxW: colW - 92 });
  };
  box(M, y - infoH, colW, infoH, { fill: SOFT });
  text('PATIENT', M + 10, y - 14, { size: 7.5, b: true, color: MUTED });
  text(p.nom, M + 10, y - 28, { size: 11, b: true, maxW: colW - 20 });
  row(M + 10, y - 44, 'Compte tiers', p.compteTiers);
  row(M + 10, y - 57, 'Matricule', p.matricule);
  row(M + 10, y - 70, 'Secteur', p.secteur);
  row(M + 10, y - 83, p.type === 'Famille PHP' ? 'Assuré' : 'Qualité', p.type === 'Famille PHP' ? p.nomAssure : p.type, { b: true });

  // Contrôle BPC : tous les BL dans les 3 jours à partir de la date d'entrée ?
  const blDates = (f.bl || []).map(b => b.date).filter(Boolean).sort();
  const spanDays = blDates.length ? Math.round((Date.parse(blDates[blDates.length - 1]) - Date.parse(blDates[0])) / DAY) : 0;
  const bpcEnd = p.dateEntree ? new Date(Date.parse(p.dateEntree) + (BPC_DAYS - 1) * DAY).toISOString().slice(0, 10) : null;
  const horsBpc = p.dateEntree ? blDates.filter(d => d < p.dateEntree || d > bpcEnd).length : 0;
  const bpcOk = spanDays < BPC_DAYS && !horsBpc;

  const rx = M + colW + 12;
  box(rx, y - infoH, colW, infoH, { fill: SOFT });
  text('SÉJOUR ET PRISE EN CHARGE', rx + 10, y - 14, { size: 7.5, b: true, color: MUTED });
  row(rx + 10, y - 30, 'Date d’entrée', fmtDate(p.dateEntree));
  row(rx + 10, y - 43, 'Date de sortie', fmtDate(p.dateSortie));
  row(rx + 10, y - 56, 'Tiers payant', `PHP / MUTUELLE  ·  compte ${p.compteCollectif || '—'}`);
  row(rx + 10, y - 69, 'Tarif', p.tarif);
  row(rx + 10, y - 82, 'BPC (3 jours)', p.dateEntree ? `du ${fmtDate(p.dateEntree)} au ${fmtDate(bpcEnd)}` : 'date d’entrée non renseignée', { b: true });
  text(bpcOk
    ? 'Contrôle : tous les BL sont dans la période du BPC.'
    : horsBpc ? `Contrôle : ${horsBpc} BL hors période du BPC (${(f.bl || []).length} BL au total).` : `Contrôle : BL étalés sur ${spanDays} jours (BPC = ${BPC_DAYS} jours).`,
  rx + 10, y - 98, { size: 8, b: true, color: bpcOk ? rgb(0.09, 0.5, 0.27) : WARN, maxW: colW - 20 });
  y -= infoH + 16;

  // ── Tableau des lignes ───────────────────────────────────────────────────
  const cols = [
    { k: 'dateBl', t: 'Date BL', w: 50 },
    { k: 'pieceBl', t: 'N° BL', w: 72 },
    { k: 'reference', t: 'Réf.', w: 52 },
    { k: 'designation', t: 'Désignation', w: 0 },
    { k: 'quantite', t: 'Qté', w: 38, right: true },
    { k: 'prixUnitaire', t: 'P.U.', w: 56, right: true },
    { k: 'montant', t: 'Montant', w: 62, right: true },
  ];
  const fixed = cols.reduce((s, c) => s + c.w, 0);
  cols.find(c => c.k === 'designation').w = W - 2 * M - fixed;
  const ROW_H = 15;
  const tableHeader = () => {
    box(M, y - 17, W - 2 * M, 17, { fill: BRAND, border: BRAND });
    let x = M;
    for (const c of cols) {
      text(c.t, c.right ? x + c.w - 5 : x + 5, y - 12, { size: 8, b: true, color: rgb(1, 1, 1), align: c.right ? 'right' : 'left' });
      x += c.w;
    }
    y -= 17;
  };
  const cell = (l, c) => {
    switch (c.k) {
      case 'dateBl': return fmtShort(l.dateBl);
      case 'quantite': return l.quantite ? fmtNum(l.quantite, l.quantite % 1 ? 2 : 0) : '';
      case 'prixUnitaire': return l.prixUnitaire ? fmtNum(l.prixUnitaire) : '';
      case 'montant': return (l.montantTTC || l.montantHT) ? fmtNum(l.montantTTC || l.montantHT) : '';
      default: return l[c.k] || '';
    }
  };
  // Hauteur à garder libre sur la dernière page de la facture : totaux + signatures
  const FOOTER_H = 30;
  // Cadres : une ligne jusqu'à 3 signataires, sinon 2 par ligne (cachet de 58 mm = 164 pt)
  const perRow = labels.length <= 3 ? labels.length : 2;
  const signRows = Math.ceil(labels.length / perRow);
  const SIGN_BLOCK = signRows * 132 + 18;
  const TOTALS_BLOCK = 92;
  tableHeader();
  const lignes = (f.lignes || []).filter(l => l.designation || l.quantite || l.montantHT);
  lignes.forEach((l, i) => {
    if (y - ROW_H < M + FOOTER_H) { newPage(); header(true); tableHeader(); }
    if (i % 2) box(M, y - ROW_H, W - 2 * M, ROW_H, { fill: SOFT, border: SOFT, bw: 0 });
    let x = M;
    for (const c of cols) {
      text(cell(l, c), c.right ? x + c.w - 5 : x + 5, y - 10.5, { size: 8, align: c.right ? 'right' : 'left', maxW: c.w - 8, color: c.k === 'pieceBl' || c.k === 'reference' ? MUTED : INK });
      x += c.w;
    }
    y -= ROW_H;
  });
  hline(y, M, W - M, LINE, 0.8);

  // Totaux et signatures toujours ensemble, sur la page de la facture
  if (y - TOTALS_BLOCK - SIGN_BLOCK < M + FOOTER_H) { newPage(); header(true); }
  y -= 12;
  const tw = 210, tx = W - M - tw;
  const totals = [['Total HT', f.totalHT], ['Total TTC', f.totalTTC], ['Acompte', f.acompte]];
  totals.forEach(([lab, v], i) => {
    text(lab, tx + 8, y - 11 - i * 14, { size: 9, color: MUTED });
    text(fmtMoney(v), W - M - 8, y - 11 - i * 14, { size: 9, align: 'right' });
  });
  box(tx, y - 66, tw, 20, { fill: BRAND, border: BRAND });
  text('NET À PAYER', tx + 8, y - 59, { size: 9.5, b: true, color: rgb(1, 1, 1) });
  text(fmtMoney(f.netAPayer), W - M - 8, y - 59, { size: 10.5, b: true, color: rgb(1, 1, 1), align: 'right' });
  text('Arrêtée la présente facture à la somme de :', M, y - 14, { size: 8.5, color: MUTED });
  text(montantEnLettres(f.netAPayer), M, y - 28, { size: 9.5, b: true, maxW: tx - M - 14 });
  text(`${(f.bl || []).length} bordereau(x) de cession (BL) joint(s) en annexe  ·  ${lignes.length} ligne(s)`, M, y - 44, { size: 8.5, color: MUTED });
  if (f.reference) text(`Référence Sage : ${f.reference}`, M, y - 57, { size: 8.5, color: MUTED });
  y -= TOTALS_BLOCK;

  // ── Cadres de signature (circuit de validation) ──────────────────────────
  const gap = 12;
  const zw = (W - 2 * M - gap * (perRow - 1)) / perRow;
  const zh = 104;
  const signaturePage = pages.length - 1;
  const signatureZones = labels.map((label, i) => {
    const r = Math.floor(i / perRow), c = i % perRow;
    const x = M + c * (zw + gap);
    const top = y - r * 132;
    const zy = top - 16 - zh;
    text(label, x + zw / 2, top - 10, { size: 8.5, b: true, align: 'center' });
    box(x, zy, zw, zh, { border: LINE, bw: 0.8 });
    return { index: i + 1, label, x, y: zy, width: zw, height: zh };
  });
  y -= signRows * 132;

  // ── Annexes : bordereaux de cession des BL ───────────────────────────────
  if ((f.bl || []).length) {
    newPage();
    const annexHeader = () => {
      text('ANNEXE  ·  BORDEREAUX DE CESSION (BL)', M, y - 12, { size: 12, b: true, color: BRAND });
      text(`Pièces justificatives de la facture N° ${f.piece}  ·  ${p.nom || ''}  ·  compte ${p.compteTiers || ''}`, M, y - 26, { size: 8.5, color: MUTED, maxW: W - 2 * M });
      y -= 36;
      hline(y, M, W - M, BRAND, 1.2);
      y -= 12;
    };
    annexHeader();
    for (const b of f.bl) {
      const need = 46 + b.lignes.length * 13;
      if (y - Math.min(need, 120) < M + FOOTER_H) { newPage(); annexHeader(); }
      box(M, y - 20, W - 2 * M, 20, { fill: SOFT, border: LINE });
      text(`Bordereau de cession N° ${b.piece}`, M + 8, y - 13.5, { size: 9.5, b: true });
      text(`${fmtDate(b.date)}${b.service ? `  ·  ${b.service}` : ''}`, W - M - 8, y - 13.5, { size: 9, align: 'right', color: MUTED });
      y -= 26;
      for (const l of b.lignes) {
        if (y - 13 < M + FOOTER_H) { newPage(); annexHeader(); }
        text(l.designation, M + 8, y - 9, { size: 8.5, maxW: W - 2 * M - 210 });
        text(fmtNum(l.quantite, l.quantite % 1 ? 2 : 0), W - M - 150, y - 9, { size: 8.5, align: 'right' });
        text(fmtNum(l.prixUnitaire), W - M - 82, y - 9, { size: 8.5, align: 'right', color: MUTED });
        text(fmtNum(l.montantTTC || l.montantHT), W - M - 8, y - 9, { size: 8.5, align: 'right' });
        y -= 13;
      }
      hline(y - 2, M + 8, W - M - 8);
      text(`Montant total : ${fmtMoney(b.total)}`, W - M - 8, y - 14, { size: 9, b: true, align: 'right' });
      text(montantEnLettres(b.total), M + 8, y - 14, { size: 8, color: MUTED, maxW: W - 2 * M - 200 });
      y -= 30;
    }
  }

  // ── Pied de page de toutes les pages ─────────────────────────────────────
  const stamp = generatedAt.toLocaleString('fr-FR', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  pages.forEach((pg, i) => {
    page = pg;
    hline(M + 14, M, W - M, LINE, 0.5);
    text(`Généré par la GED à partir de Sage le ${stamp}${f.emetteur ? `  ·  Émetteur Sage : ${f.emetteur}` : ''}`, M, M + 3, { size: 7.5, color: MUTED });
    text(`Facture N° ${f.piece}  ·  page ${i + 1} / ${pages.length}`, W - M, M + 3, { size: 7.5, color: MUTED, align: 'right' });
  });

  const bytes = await pdf.save({ useObjectStreams: false });
  return { buffer: Buffer.from(bytes), signatureZones, signaturePage, pageCount: pages.length };
}
