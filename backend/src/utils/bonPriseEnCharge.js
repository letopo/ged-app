// backend/src/utils/bonPriseEnCharge.js
// Bon de prise en charge (BPC) du personnel, format A5 paysage, reproduit du
// modèle papier de l'hôpital (sans la date de naissance).
//
// Circuit : Médecin du travail (vise) → RH (complète l'assuré, sans signer) →
// DG (vise) → envoi à l'accueil, qui ouvre le BPC dans Sage.
//  - Le PDF est dessiné par le serveur : la position de chaque rubrique est
//    connue, ce qui permet au RH de compléter le bon APRÈS la signature du
//    médecin (on écrit sur le PDF signé, on ne le régénère pas).
//  - Cadres : 1 = VISA MÉDECIN (à droite, étape 1), 2 = VISA DG (à gauche, étape 3).
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const BPC_CATEGORY = 'Bon de prise en charge';

export const BPC_FILIATIONS = { salarie: 'Salarié', conjoint: 'Conjoint', enfants: 'Enfants', parents: 'Parents' };
export const BPC_TYPES = { consultation: 'Consultation externe et soins externes', hospitalisation: 'Hospitalisation' };

// Étape du circuit → cadre de signature (l'étape 2, le RH, ne signe pas)
export const BPC_STEP_ZONES = { 1: 1, 3: 2 };
export const BPC_RH_STEP = 2;

// ── Mise en page (points ; A5 paysage) ───────────────────────────────────────
const W = 595.28;
const H = 419.53;
const M = 30;            // marge
const LINE0 = 132;       // première ligne (distance depuis le haut)
const GAP = 24;          // interligne
const top = (d) => H - d; // pdf-lib : origine en bas à gauche

const ROWS = {
  assure: LINE0,
  entreprise: LINE0 + GAP,
  malade: LINE0 + 2 * GAP,
  filiation: LINE0 + 3 * GAP,
  consultation: LINE0 + 4 * GAP,
  hospitalisation: LINE0 + 5 * GAP,
  diagnostic: LINE0 + 6 * GAP,
  lieuDate: LINE0 + 7 * GAP,
};
const VISA_LABEL_Y = LINE0 + 7 * GAP + 26;
const ZONE = { width: 190, height: 72 };
// Le coin bas droit reste libre pour le QR code de vérification (posé à la fin du circuit)
const QR_SPACE = 60;
export const BPC_SIGNATURE_ZONES = [
  // Cadre 1 : VISA MÉDECIN (à droite)
  { index: 1, x: W - M - QR_SPACE - ZONE.width, y: top(VISA_LABEL_Y + 6 + ZONE.height), width: ZONE.width, height: ZONE.height },
  // Cadre 2 : VISA DG (à gauche)
  { index: 2, x: M + QR_SPACE / 2, y: top(VISA_LABEL_Y + 6 + ZONE.height), width: ZONE.width, height: ZONE.height },
];

// Les polices standard PDF ne couvrent que le jeu WinAnsi : on retire le reste
const safe = (s) => String(s ?? '').normalize('NFC').replace(/[^ -~ -ÿ’…–—]/g, '').trim();
const INK = rgb(0.05, 0.15, 0.55); // rubriques remplies : bleu « stylo »

// ── Validation des saisies ───────────────────────────────────────────────────
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isoDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : '');

/** Rubriques du médecin (création). */
export function sanitizeMedecinFields(body = {}) {
  const fields = {
    nomMalade: text(body.nomMalade, 120),
    typeSoins: Object.hasOwn(BPC_TYPES, body.typeSoins) ? body.typeSoins : '',
    dateSoins: isoDate(body.dateSoins),
    diagnostic: text(body.diagnostic, 200),
  };
  if (!fields.nomMalade) return { error: 'Le nom du malade est obligatoire.' };
  if (!fields.typeSoins) return { error: 'Choisissez « Consultation externe » ou « Hospitalisation ».' };
  if (!fields.dateSoins) return { error: 'La date de la consultation ou de l’hospitalisation est obligatoire.' };
  if (!fields.diagnostic) return { error: 'Le diagnostic d’entrée est obligatoire.' };
  return { fields };
}

/** Rubriques du RH (étape 2). */
export function sanitizeRhFields(body = {}) {
  const fields = {
    nomAssure: text(body.nomAssure, 120),
    entreprise: text(body.entreprise, 80),
    secteur: text(body.secteur, 60),
    matricule: text(body.matricule, 40),
    filiation: Object.hasOwn(BPC_FILIATIONS, body.filiation) ? body.filiation : '',
    assureId: typeof body.assureId === 'string' ? body.assureId.slice(0, 64) : null,
    assureSource: ['employee', 'user'].includes(body.assureSource) ? body.assureSource : null,
  };
  if (!fields.nomAssure) return { error: 'Le nom de l’assuré est obligatoire.' };
  if (!fields.entreprise) return { error: 'L’entreprise est obligatoire.' };
  if (!fields.filiation) return { error: 'Choisissez le lien de filiation.' };
  return { fields };
}

const frDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// ── Dessin ───────────────────────────────────────────────────────────────────
async function fonts(pdfDoc) {
  return {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    ink: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    title: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
  };
}

// Libellé + pointillés jusqu'à `end` ; renvoie le début de la zone à remplir
function labelLine(page, f, label, x, rowTop, end) {
  const size = 12.5;
  page.drawText(label, { x, y: top(rowTop), size, font: f.regular, color: rgb(0, 0, 0) });
  const start = x + f.regular.widthOfTextAtSize(label, size) + 2;
  const dots = '.'.repeat(Math.max(0, Math.floor((end - start) / f.regular.widthOfTextAtSize('.', 9))));
  page.drawText(dots, { x: start, y: top(rowTop), size: 9, font: f.regular, color: rgb(0.35, 0.35, 0.35) });
  return { x: start + 3, width: end - start - 6 };
}

function box(page, x, rowTop, size = 12) {
  page.drawRectangle({ x, y: top(rowTop) - 2, width: size, height: size, borderColor: rgb(0, 0, 0), borderWidth: 0.9 });
}

function tick(page, f, x, rowTop, size = 12) {
  page.drawText('X', { x: x + 2.2, y: top(rowTop) + 0.2, size: size - 1, font: f.ink, color: INK });
}

// Valeur écrite au-dessus des pointillés, réduite si trop longue
function fill(page, f, value, at, rowTop) {
  let v = safe(value);
  if (!v) return;
  let size = 11;
  while (size > 7 && f.ink.widthOfTextAtSize(v, size) > at.width) size -= 0.5;
  while (v.length > 3 && f.ink.widthOfTextAtSize(v, size) > at.width) v = `${v.slice(0, -2)}…`;
  page.drawText(v, { x: at.x, y: top(rowTop) + 2.5, size, font: f.ink, color: INK });
}

// Emplacements des rubriques (identiques à la création et à la complétion)
function slots(f) {
  const scratch = { drawText() {}, drawRectangle() {} };
  const right = W - M;
  const third = (right - M) / 3;
  return {
    assure: labelLine(scratch, f, "Nom de l'assuré", M, ROWS.assure, right),
    entreprise: labelLine(scratch, f, 'Entreprise', M, ROWS.entreprise, M + third + 20),
    secteur: labelLine(scratch, f, 'Secteur', M + third + 24, ROWS.entreprise, M + 2 * third + 20),
    matricule: labelLine(scratch, f, 'Matricule', M + 2 * third + 24, ROWS.entreprise, right),
    malade: labelLine(scratch, f, 'Nom du malade', M, ROWS.malade, right),
    consultation: labelLine(scratch, f, `${BPC_TYPES.consultation} Date`, M + 20, ROWS.consultation, right),
    hospitalisation: labelLine(scratch, f, `${BPC_TYPES.hospitalisation} Date`, M + 20, ROWS.hospitalisation, right),
    diagnostic: labelLine(scratch, f, "Diagnostic d'entrée", M, ROWS.diagnostic, right),
    lieuDate: labelLine(scratch, f, 'Njombé le', W / 2, ROWS.lieuDate, right),
  };
}

const FILIATION_X = { salarie: 150, conjoint: 255, enfants: 370, parents: 475 };

/**
 * PDF du bon, rubriques du médecin remplies, celles du RH vides.
 * @returns {{ bytes: Uint8Array, signatureZones: object[] }}
 */
export async function buildBpcPdf(medecin, { dateDocument = new Date() } = {}) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(BPC_CATEGORY);
  const page = pdfDoc.addPage([W, H]);
  const f = await fonts(pdfDoc);
  const black = rgb(0, 0, 0);

  // En-tête : logo (écusson + « Ordre de Malte / Hôpital Saint Jean de Malte ») et adresse
  try {
    const logo = await pdfDoc.embedPng(await fs.readFile(path.resolve(process.cwd(), 'assets/logo-ordre-malte.png')));
    const lw = 205;
    page.drawImage(logo, { x: M, y: top(22 + lw / (logo.width / logo.height)), width: lw, height: lw / (logo.width / logo.height) });
  } catch { /* logo absent : en-tête texte seul */ }
  const address = ['HÔPITAL SAINT-JEAN DE MALTE', 'BP.: 56 NJOMBE - CAMEROUN', 'Tél.: (237) 697 09 29 92', '233 21 10 22'];
  address.forEach((l, i) => {
    const size = 8.5;
    page.drawText(l, { x: W - M - f.bold.widthOfTextAtSize(l, size), y: top(30 + i * 11), size, font: f.bold, color: rgb(0.2, 0.2, 0.2) });
  });
  const title = 'BON DE PRISE EN CHARGE';
  page.drawText(title, { x: (W - f.title.widthOfTextAtSize(title, 24)) / 2, y: top(104), size: 24, font: f.title, color: black });

  // Rubriques
  const right = W - M;
  const third = (right - M) / 3;
  labelLine(page, f, "Nom de l'assuré", M, ROWS.assure, right);
  labelLine(page, f, 'Entreprise', M, ROWS.entreprise, M + third + 20);
  labelLine(page, f, 'Secteur', M + third + 24, ROWS.entreprise, M + 2 * third + 20);
  labelLine(page, f, 'Matricule', M + 2 * third + 24, ROWS.entreprise, right);
  labelLine(page, f, 'Nom du malade', M, ROWS.malade, right);
  page.drawText('Lien de filiation :', { x: M, y: top(ROWS.filiation), size: 12.5, font: f.regular, color: black });
  for (const [key, label] of Object.entries(BPC_FILIATIONS)) {
    box(page, FILIATION_X[key], ROWS.filiation);
    page.drawText(label, { x: FILIATION_X[key] + 17, y: top(ROWS.filiation), size: 12.5, font: f.regular, color: black });
  }
  box(page, M, ROWS.consultation);
  labelLine(page, f, `${BPC_TYPES.consultation} Date`, M + 20, ROWS.consultation, right);
  box(page, M, ROWS.hospitalisation);
  labelLine(page, f, `${BPC_TYPES.hospitalisation} Date`, M + 20, ROWS.hospitalisation, right);
  labelLine(page, f, "Diagnostic d'entrée", M, ROWS.diagnostic, right);
  labelLine(page, f, 'Njombé le', W / 2, ROWS.lieuDate, right);

  // Cadres de signature : VISA DG à gauche, VISA MÉDECIN à droite
  const [zMed, zDg] = BPC_SIGNATURE_ZONES;
  page.drawText('VISA DG', { x: zDg.x + (zDg.width - f.regular.widthOfTextAtSize('VISA DG', 12.5)) / 2, y: top(VISA_LABEL_Y), size: 12.5, font: f.regular, color: black });
  page.drawText('VISA MÉDECIN', { x: zMed.x + (zMed.width - f.regular.widthOfTextAtSize('VISA MÉDECIN', 12.5)) / 2, y: top(VISA_LABEL_Y), size: 12.5, font: f.regular, color: black });

  // Rubriques du médecin
  const s = slots(f);
  fill(page, f, medecin.nomMalade, s.malade, ROWS.malade);
  const typeRow = medecin.typeSoins === 'hospitalisation' ? ROWS.hospitalisation : ROWS.consultation;
  tick(page, f, M, typeRow);
  fill(page, f, frDate(medecin.dateSoins), medecin.typeSoins === 'hospitalisation' ? s.hospitalisation : s.consultation, typeRow);
  fill(page, f, medecin.diagnostic, s.diagnostic, ROWS.diagnostic);
  fill(page, f, dateDocument.toLocaleDateString('fr-FR', { timeZone: 'Africa/Douala' }), s.lieuDate, ROWS.lieuDate);

  return { bytes: await pdfDoc.save({ useObjectStreams: false }), signatureZones: BPC_SIGNATURE_ZONES.map(z => ({ ...z })) };
}

/** Écrit les rubriques du RH sur le PDF existant (déjà visé par le médecin). */
export async function drawRhFields(pdfBytes, rh) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPage(0);
  const f = await fonts(pdfDoc);
  const s = slots(f);
  fill(page, f, rh.nomAssure, s.assure, ROWS.assure);
  fill(page, f, rh.entreprise, s.entreprise, ROWS.entreprise);
  fill(page, f, rh.secteur, s.secteur, ROWS.entreprise);
  fill(page, f, rh.matricule, s.matricule, ROWS.entreprise);
  tick(page, f, FILIATION_X[rh.filiation], ROWS.filiation);
  return pdfDoc.save({ useObjectStreams: false });
}
