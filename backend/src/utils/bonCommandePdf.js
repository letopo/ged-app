// backend/src/utils/bonCommandePdf.js
// Bon de commande fournisseur au format de l'impression Sage (modèle de la
// pharmacie, 12/11/2026) : HSJM en haut à gauche, adresse de livraison (dépôt),
// numéro / date / livraison attendue, fournisseur, tableau Référence ·
// Désignation · Qté · Condition. · P.U. H.T. · Rem. · Montant TTC, Total remise
// et NET A PAYER ; en plus : montant en lettres et cadres de signature du circuit
// GED (Émetteur → Direction générale → Comptabilité).
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { montantEnLettres } from './montantEnLettres.js';

const W = 595.28, H = 841.89, M = 22;
const INK = rgb(0.05, 0.05, 0.05);
const MUTED = rgb(0.4, 0.4, 0.42);
const LINE = rgb(0.75, 0.75, 0.78);

export const bonCommandeSignatureLabels = (emetteur) => [
  emetteur ? `Émetteur : ${emetteur}` : 'Émetteur',
  'Direction générale',
  'Comptabilité',
];
const fmtDate = (d) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: '2-digit' }) : '');
const fmtNum = (n, dec = 0) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/[  ]/g, ' ');
const fmtQte = (n) => fmtNum(n, 2);
const safe = (s) => String(s ?? '').normalize('NFC').replace(/[^\x20-\x7e\xa0-\xff’…–—]/g, '');

export const bonCommandeTitre = (bc) => `${bc.typeLabel || 'Bon de commande'} ${bc.piece} · ${bc.fournisseur?.intitule || bc.fournisseur?.numero || ''}`.trim();

/**
 * @param {object} bc  résultat de fetchBonCommande
 * @param {{ labels?: string[], courriel?: string }} opts
 */
export async function buildBonCommandePdf(bc, { labels = bonCommandeSignatureLabels(bc.emetteur), courriel = 'hospital.cameroun@ordredemaltefrance' } = {}) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(bonCommandeTitre(bc));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page; let y; const pages = [];
  const text = (s, x, yy, { size = 8, b = false, color = INK, align = 'left', maxW } = {}) => {
    const fnt = b ? bold : font;
    let str = safe(s);
    if (maxW) while (str.length > 1 && fnt.widthOfTextAtSize(str, size) > maxW) str = `${str.slice(0, -2)}…`;
    const w = fnt.widthOfTextAtSize(str, size);
    page.drawText(str, { x: align === 'right' ? x - w : align === 'center' ? x - w / 2 : x, y: yy, size, font: fnt, color });
  };
  const titre = bc.typeLabel || 'Bon de commande';
  const cols = [
    { t: 'Référence', x: M + 6, w: 70 }, { t: 'Désignation', x: M + 80, w: 240 },
    { t: 'Qté', x: 352, w: 40, right: true }, { t: 'Condition.', x: 412, w: 40, center: true },
    { t: 'P.U. H.T.', x: 482, w: 52, right: true }, { t: 'Rem.', x: 500, w: 22, center: true },
    { t: 'Montant TTC', x: W - M - 4, w: 62, right: true },
  ];
  cols[4].x = 470; cols[5].x = 497;
  const head = (cont) => {
    page = pdf.addPage([W, H]); pages.push(page); y = H - 40;
    text('Adresse de livraison', 330, y, { size: 7.5, b: true });
    text('HOPITAL ST JEAN DE MALTE', M + 5, y - 22, { size: 8, b: true });
    text('SOINS HOSPITALIER', M + 5, y - 33, { size: 8 });
    text('B.P 56 NJOMBE', M + 5, y - 56, { size: 7.5 });
    text(bc.depot?.intitule || '', 330, y - 27, { size: 8.5, b: true, maxW: 240 });
    y -= 108;
    text('Numéro', M + 10, y, { size: 7.5, b: true });
    text('Livraison attendue le', 160, y, { size: 7.5, b: true });
    text(bc.piece, M + 5, y - 17, { size: 9 });
    text(fmtDate(bc.dateLivraison), 160, y - 17, { size: 9 });
    const f = bc.fournisseur || {};
    let fy = y - 8;
    text(f.intitule || f.numero || '', 330, fy, { size: 8.5, b: true, maxW: 240 }); fy -= 12;
    for (const l of [f.contact, ...(f.adresse || []), f.telephone && `Tél. ${f.telephone}`].filter(Boolean)) { text(l, 330, fy, { size: 8.5, maxW: 240 }); fy -= 11; }
    text('Date', M + 8, y - 40, { size: 7.5, b: true });
    text(fmtDate(bc.date), M + 5, y - 57, { size: 9 });
    if (bc.reference) { text('Référence', 160, y - 40, { size: 7.5, b: true }); text(bc.reference, 160, y - 57, { size: 9, maxW: 150 }); }
    y -= 96;
    text(cont ? `${titre} (suite)` : titre, M + 5, y, { size: 22 });
    y -= 30;
    cols.forEach((c) => text(c.t, c.right ? c.x : c.center ? c.x : c.x, y, { size: 7.5, b: true, align: c.right ? 'right' : c.center ? 'center' : 'left' }));
    y -= 15;
  };
  const RH = 13, FOOT = 40;
  head(false);
  for (const l of bc.lignes) {
    if (y - RH < M + FOOT) head(true);
    const isText = !l.quantite && !l.prixUnitaire;
    text(l.reference, cols[0].x, y, { size: 7.5, maxW: cols[0].w });
    text(l.designation, cols[1].x, y, { size: 7.5, maxW: isText ? 400 : 255 });
    if (!isText) {
      text(fmtQte(l.quantite), cols[2].x, y, { size: 7.5, align: 'right' });
      text(l.conditionnement, cols[3].x, y, { size: 7.5, align: 'center', maxW: 50 });
      text(fmtNum(l.prixUnitaire, 2), cols[4].x, y, { size: 8.5, align: 'right' });
      text(l.remise, cols[5].x, y, { size: 7.5, align: 'center', maxW: 26 });
      text(fmtNum(l.montantTTC), cols[6].x, y, { size: 7.5, align: 'right' });
    }
    y -= RH;
  }
  // Totaux (comme Sage) + montant en lettres + cadres de signature : bloc insécable
  const zh = 90;
  if (y - (2 + 52 + 34 + 16 + zh) < 44) head(true); // bas des cadres au-dessus du pied de page
  y -= 2;
  text('Total remise', 432, y, { size: 8.5, b: true, align: 'center' });
  text('NET A PAYER', 527, y, { size: 8.5, b: true, align: 'center' });
  text(fmtNum(bc.totaux.totalRemise), 432, y - 24, { size: 8.5, b: true, align: 'center' });
  text(fmtNum(bc.totaux.netAPayer), W - M - 4, y - 24, { size: 9, b: true, align: 'right' });
  y -= 52;
  text('Arrêté le présent bon à la somme de :', M + 5, y, { size: 8, color: MUTED });
  text(`${montantEnLettres(bc.totaux.netAPayer)} (${fmtNum(bc.totaux.netAPayer)} FCFA)`, M + 5, y - 13, { size: 9, b: true, maxW: W - 2 * M - 10 });
  y -= 34;
  const n = labels.length, gap = 12;
  const zw = (W - 2 * M - 10 - gap * (n - 1)) / n;
  const signaturePage = pages.length - 1;
  const signatureZones = labels.map((label, i) => {
    const x = M + 5 + i * (zw + gap);
    text(label, x + zw / 2, y - 10, { size: 8, b: true, align: 'center', maxW: zw - 4 });
    page.drawRectangle({ x, y: y - 16 - zh, width: zw, height: zh, borderColor: LINE, borderWidth: 0.8 });
    return { index: i + 1, label, x, y: y - 16 - zh, width: zw, height: zh };
  });
  pages.forEach((pg, i) => {
    page = pg;
    text('Téléphone :', M + 5, 30, { size: 7.5 });
    text('Courriel :', 228, 31, { size: 7.5 });
    text(courriel, 262, 28, { size: 7.5 });
    text(String(i + 1), W - M - 4, 28, { size: 7.5, align: 'right' });
    text(`Généré par la GED depuis Sage · pièce ${bc.piece}`, M + 5, 14, { size: 6.5, color: MUTED });
  });
  const bytes = await pdf.save({ useObjectStreams: false });
  return { buffer: Buffer.from(bytes), signatureZones, signaturePage };
}
