// backend/src/utils/caissePermanencePdf.js
// Fiche PDF d'une séance de la caisse de permanence (12/11/2026), même présentation
// que l'état de caisse Sage (caissePharmaciePdf.js) : en-tête HSJM, passation,
// tableau des mouvements (colonnes du classeur : Heure, Nom, Cautions, Autres,
// Sorties, Solde), totaux, clôture (comptage, billetage, écart) et cadres de
// signature du circuit : Caissière pharmacie → Caissière.
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { montantEnLettres } from './montantEnLettres.js';
import { COUPURES } from './caissePermanence.js';

const W = 595.28, H = 841.89, M = 36;
const INK = rgb(0.11, 0.13, 0.17);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.82, 0.84, 0.88);
const BRAND = rgb(0.106, 0.227, 0.42);
const SOFT = rgb(0.95, 0.96, 0.98);
const RED = rgb(0.75, 0.15, 0.15);
const GREEN = rgb(0.1, 0.5, 0.25);

/** Cadres : la caissière de la pharmacie qui a tenu la séance (son nom), puis la caissière. */
export const permanenceSignatureLabels = (caissierePharmacie, destinataire = 'Caissière') => [
  caissierePharmacie ? `Caissière pharmacie : ${caissierePharmacie}` : 'Caissière pharmacie',
  destinataire,
];
const PERIODES = { jour: 'Jour (7 h - 16 h 30)', nuit: 'Nuit (16 h 30 - 7 h)' };
const fmtLong = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }).replace(/[\u202f\u00a0]/g, ' '));
const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('fr-FR', { timeZone: 'Africa/Douala', hour: '2-digit', minute: '2-digit' }) : '');
const fmtStamp = (d) => (d ? new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const safe = (s) => String(s ?? '').normalize('NFC').replace(/[^\x20-\x7e\xa0-\xff’…–—]/g, '');
const signed = (n) => (n == null ? '—' : n === 0 ? 'aucun' : `${n > 0 ? '+' : ''}${fmtNum(n)} FCFA`);

export const seanceTitre = (s) => `Caisse de permanence ${s.periode === 'nuit' ? 'nuit' : 'jour'} du ${fmtLong(s.date)}`;

/**
 * @param {object} seance  séance au format seanceJson (mouvements + totaux)
 * @param {string[]} labels cadres de signature
 * @returns {Promise<{ buffer, signatureZones, signaturePage }>}
 */
export async function buildCaissePermanencePdf(seance, labels = permanenceSignatureLabels(seance.caissiereNom)) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(seanceTitre(seance));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const t = seance.totaux;
  let page; let y; const pages = [];
  const text = (s, x, yy, { size = 9, b = false, color = INK, align = 'left', maxW } = {}) => {
    const fnt = b ? bold : font;
    let str = safe(s);
    if (maxW) while (str.length > 1 && fnt.widthOfTextAtSize(str, size) > maxW) str = `${str.slice(0, -2)}…`;
    const w = fnt.widthOfTextAtSize(str, size);
    page.drawText(str, { x: align === 'right' ? x - w : align === 'center' ? x - w / 2 : x, y: yy, size, font: fnt, color });
  };
  const box = (x, yy, w, h, { fill, border = LINE, bw = 0.8 } = {}) => page.drawRectangle({ x, y: yy, width: w, height: h, color: fill, borderColor: border, borderWidth: bw });
  const hline = (yy, color = LINE, th = 0.6) => page.drawLine({ start: { x: M, y: yy }, end: { x: W - M, y: yy }, thickness: th, color });

  const cols = [
    { t: 'Heure', w: 40 }, { t: 'Nom / libellé', w: 0 }, { t: 'Mode', w: 50 },
    { t: 'Cautions', w: 62, right: true }, { t: 'Autres', w: 62, right: true }, { t: 'Sorties', w: 62, right: true }, { t: 'Solde', w: 68, right: true },
  ];
  cols[1].w = W - 2 * M - cols.reduce((s, c) => s + c.w, 0);
  const xs = cols.reduce((acc, c, i) => { acc.push(i ? acc[i - 1] + cols[i - 1].w : M); return acc; }, []);
  const tableHead = () => {
    box(M, y - 16, W - 2 * M, 16, { fill: BRAND, border: BRAND });
    cols.forEach((c, i) => text(c.t, c.right ? xs[i] + c.w - 5 : xs[i] + 5, y - 11, { size: 8, b: true, color: rgb(1, 1, 1), align: c.right ? 'right' : 'left' }));
    y -= 16;
  };
  const header = (cont) => {
    page = pdf.addPage([W, H]); pages.push(page); y = H - M;
    text('HÔPITAL SAINT JEAN DE MALTE', M, y - 12, { size: 12, b: true, color: BRAND });
    text('Soins hospitaliers  ·  B.P. 56 Njombé', M, y - 25, { size: 8.5, color: MUTED });
    text('Pharmacie', W - M, y - 12, { size: 10, b: true, align: 'right' });
    text(`Caissière : ${seance.caissiereNom || '—'}`, W - M, y - 25, { size: 8.5, color: MUTED, align: 'right' });
    y -= 50;
    text(cont ? 'Caisse de permanence (suite)' : 'Caisse de permanence', M, y, { size: 20, b: true });
    text(`${PERIODES[seance.periode] || seance.periode}  ·  ${fmtLong(seance.date)}`, M, y - 18, { size: 10, color: MUTED });
    y -= 34; hline(y, BRAND, 1.2); y -= 8;
  };
  const RH = 14, FOOT = 26;

  header(false);
  // Passation
  const info = [
    ['Ouverte le', fmtStamp(seance.ouverteAt)],
    ['Solde transmis', `${fmtNum(seance.soldeOuverture)} FCFA`],
    ['Montant reçu (compté)', `${fmtNum(seance.montantRecu)} FCFA`],
    ['Écart à la prise de service', signed(seance.ecartReception)],
  ];
  const colW = (W - 2 * M) / 4;
  info.forEach(([k, v], i) => {
    text(k, M + i * colW, y - 8, { size: 7.5, color: MUTED });
    text(v, M + i * colW, y - 20, { size: 9.5, b: true, color: i === 3 && seance.ecartReception ? RED : INK, maxW: colW - 6 });
  });
  y -= 28;
  if (seance.noteOuverture) { text(`Explication : ${seance.noteOuverture}`, M, y - 8, { size: 8, color: MUTED, maxW: W - 2 * M }); y -= 14; }
  y -= 8;

  // Mouvements
  tableHead();
  const row = (vals, { fill, b, strike, colors = [] } = {}) => {
    if (y - RH < M + FOOT) { header(true); tableHead(); }
    if (fill) box(M, y - RH, W - 2 * M, RH, { fill, border: fill, bw: 0 });
    cols.forEach((c, j) => {
      if (vals[j] == null || vals[j] === '') return;
      text(vals[j], c.right ? xs[j] + c.w - 5 : xs[j] + 5, y - 10, { size: 8, b, color: colors[j] || (strike ? MUTED : INK), align: c.right ? 'right' : 'left', maxW: c.w - 8 });
    });
    if (strike) page.drawLine({ start: { x: xs[1] + 5, y: y - 7 }, end: { x: xs[6] + cols[6].w - 70, y: y - 7 }, thickness: 0.5, color: MUTED });
    y -= RH;
  };
  row(['', 'Solde d’ouverture', '', '', '', '', fmtNum(seance.soldeOuverture)], { b: true });
  seance.mouvements.forEach((m, i) => {
    const nom = [m.patientNom || m.libelle, m.patientNom && m.libelle].filter(Boolean).join(' · ');
    const v = fmtNum(m.montant);
    row([
      fmtTime(m.heure), m.annule ? `${nom} (annulé : ${m.motifAnnulation || ''})` : nom,
      m.type === 'sortie' ? '' : (m.mode === 'orange_money' ? 'OM' : 'Espèces'),
      m.type === 'caution' ? v : '', m.type === 'recette' ? v : '', m.type === 'sortie' ? v : '', fmtNum(m.solde),
    ], { fill: i % 2 ? SOFT : null, strike: m.annule, colors: { 5: RED } });
  });
  if (!seance.mouvements.length) row(['', 'Aucun mouvement pendant la séance.', '', '', '', '', '']);
  hline(y, LINE, 0.8);
  // Ligne de totaux
  if (y - 20 < M + FOOT) header(true);
  y -= 4;
  box(M, y - 20, W - 2 * M, 20, { fill: SOFT, border: LINE });
  text(`TOTAUX  ·  ${t.nbMouvements} mouvement(s)`, M + 5, y - 14, { size: 9, b: true });
  text(fmtNum(t.cautions), xs[3] + cols[3].w - 5, y - 14, { size: 9, b: true, align: 'right' });
  text(fmtNum(t.recettes), xs[4] + cols[4].w - 5, y - 14, { size: 9, b: true, align: 'right' });
  text(fmtNum(t.sorties), xs[5] + cols[5].w - 5, y - 14, { size: 9, b: true, align: 'right', color: RED });
  y -= 34;

  // Récapitulatif + clôture (bloc insécable, puis les cadres de signature)
  const billets = seance.billetage ? COUPURES.filter((c) => Number(seance.billetage[c] ?? seance.billetage[String(c)]) > 0) : [];
  const recapH = 120 + (billets.length ? 16 + Math.ceil(billets.length / 4) * 12 : 0) + (seance.noteCloture ? 14 : 0) + 150;
  if (y - recapH < M + FOOT) header(true);
  const recap = [
    ['Solde d’ouverture', fmtNum(t.soldeOuverture)],
    ['+ Entrées en espèces', fmtNum(t.entreesEspeces)],
    ['- Sorties', fmtNum(t.sorties)],
    ['= Espèces attendues', fmtNum(t.especesTheoriques), true],
    ['Espèces comptées à la clôture', fmtNum(seance.especesComptees), true],
  ];
  const half = (W - 2 * M - 16) / 2;
  text('Récapitulatif des espèces', M, y, { size: 10, b: true });
  text('Clôture', M + half + 16, y, { size: 10, b: true });
  y -= 6;
  recap.forEach(([k, v, b], i) => {
    const yy = y - 14 - i * 15;
    text(k, M, yy, { size: 9, b, color: b ? INK : MUTED });
    text(`${v} FCFA`, M + half, yy, { size: 9, b, align: 'right' });
  });
  const ecartColor = seance.ecartCloture ? RED : GREEN;
  const right = [
    ['Clôturée le', fmtStamp(seance.clotureeAt)],
    ['Écart de caisse', signed(seance.ecartCloture), ecartColor],
    ['Orange Money (hors tiroir)', `${fmtNum(t.orangeMoney)} FCFA`],
    ['Total des entrées (espèces + OM)', `${fmtNum(t.totalEntrees)} FCFA`],
    ['Solde remis à la séance suivante', `${fmtNum(seance.especesComptees)} FCFA`],
  ];
  right.forEach(([k, v, c], i) => {
    const yy = y - 14 - i * 15;
    text(k, M + half + 16, yy, { size: 9, color: MUTED });
    text(v, W - M, yy, { size: 9, b: true, align: 'right', color: c || INK });
  });
  y -= 14 + recap.length * 15 + 4;
  if (seance.noteCloture) { text(`Explication de l’écart : ${seance.noteCloture}`, M, y, { size: 8.5, color: RED, maxW: W - 2 * M }); y -= 14; }
  if (billets.length) {
    text('Billetage', M, y - 4, { size: 8.5, b: true }); y -= 16;
    billets.forEach((c, i) => {
      const n = Number(seance.billetage[c] ?? seance.billetage[String(c)]);
      text(`${fmtNum(c)} x ${n} = ${fmtNum(c * n)}`, M + (i % 4) * ((W - 2 * M) / 4), y - Math.floor(i / 4) * 12, { size: 8, color: MUTED });
    });
    y -= Math.ceil(billets.length / 4) * 12;
  }
  y -= 8;
  text('Arrêtée la présente caisse (espèces comptées) à la somme de :', M, y, { size: 9, color: MUTED });
  text(`${montantEnLettres(Number(seance.especesComptees) || 0)} (${fmtNum(seance.especesComptees)} FCFA)`, M, y - 14, { size: 10, b: true, maxW: W - 2 * M });
  y -= 34;

  // Cadres de signature
  const n = labels.length, gap = 16;
  const zw = Math.min(220, (W - 2 * M - gap * (n - 1)) / n), zh = 100;
  const startX = W - M - (n * zw + (n - 1) * gap);
  const signaturePage = pages.length - 1;
  const signatureZones = labels.map((label, i) => {
    const x = startX + i * (zw + gap);
    text(label, x + zw / 2, y - 10, { size: 8.5, b: true, align: 'center', maxW: zw - 4 });
    box(x, y - 16 - zh, zw, zh);
    return { index: i + 1, label, x, y: y - 16 - zh, width: zw, height: zh };
  });

  const stamp = fmtStamp(new Date());
  pages.forEach((pg, i) => {
    page = pg;
    page.drawLine({ start: { x: M, y: M + 12 }, end: { x: W - M, y: M + 12 }, thickness: 0.5, color: LINE });
    text(`Généré par la GED le ${stamp}`, M, M + 2, { size: 7.5, color: MUTED });
    text(`Page ${i + 1} / ${pages.length}`, W - M, M + 2, { size: 7.5, color: MUTED, align: 'right' });
  });
  const bytes = await pdf.save({ useObjectStreams: false });
  return { buffer: Buffer.from(bytes), signatureZones, signaturePage };
}
