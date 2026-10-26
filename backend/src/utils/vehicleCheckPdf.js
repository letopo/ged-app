// backend/src/utils/vehicleCheckPdf.js
// Fiche PDF d'un contrôle de véhicule (départ / retour, une section) :
// en-tête, véhicule et mission, résultat point par point, anomalies,
// signature du contrôleur et photos en annexe. Archivée dans la GED.
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { ANSWER_LABELS } from './vehicleChecklist.js';

const A4 = [595.28, 841.89];
const M = 42;
const INK = rgb(0.07, 0.09, 0.15);
const MUTED = rgb(0.42, 0.45, 0.5);
const RED = rgb(0.75, 0.11, 0.11);
const GREEN = rgb(0.09, 0.5, 0.25);
const ORANGE = rgb(0.75, 0.42, 0.04);
const LINE = rgb(0.85, 0.87, 0.9);

const fmt = (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function safe(font, text) {
  let out = '';
  for (const ch of String(text ?? '')) {
    try { font.encodeText(ch); out += ch; continue; } catch { /* hors WinAnsi */ }
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    try { font.encodeText(base); out += base; } catch { out += '?'; }
  }
  return out;
}

// Découpe un texte en lignes tenant dans `width`
export function wrap(font, text, size, width) {
  const words = safe(font, text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= width) line = test;
    else { if (line) lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/**
 * @returns {Promise<Buffer>}
 */
export async function buildVehicleCheckPdf({ tenantName, vehicle, mission, missionLabel, check, items }) {
  const pdf = await PDFDocument.create();
  const [reg, bold, ital] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold), pdf.embedFont(StandardFonts.HelveticaOblique),
  ]);
  pdf.setTitle(`Contrôle ${check.phase === 'depart' ? 'départ' : 'retour'} - ${vehicle.label}`);
  let page = pdf.addPage(A4);
  let y = A4[1] - M;
  const W = A4[0] - 2 * M;

  const text = (str, x, yy, { font = reg, size = 10, color = INK } = {}) => page.drawText(safe(font, str), { x, y: yy, size, font, color });
  const newPage = () => { page = pdf.addPage(A4); y = A4[1] - M; };
  const ensure = (h) => { if (y - h < M + 20) newPage(); };

  // En-tête
  text(tenantName || 'Hôpital', M, y, { font: bold, size: 11, color: MUTED });
  y -= 22;
  text(`Fiche de contrôle ${check.phase === 'depart' ? 'DÉPART' : 'RETOUR'} — ${check.sectionLabel}`, M, y, { font: bold, size: 16 });
  y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 1.5, color: rgb(0.86, 0.15, 0.15) });
  y -= 20;

  // Informations
  const info = [
    ['Véhicule', `${vehicle.label} — ${vehicle.immatriculation}`],
    ['Mission', missionLabel],
    ['Contrôlé par', check.performedByName || '—'],
    ['Date et heure', `${fmt(check.performedAt)} (heure du serveur)`],
  ];
  if (check.mileage !== null && check.mileage !== undefined) info.push(['Kilométrage', `${Number(check.mileage).toLocaleString('fr-FR')} km`]);
  if (mission?.omAfterDeparture) info.push(['Remarque', 'Ordre de mission créé après le départ (sortie urgente)']);
  for (const [k, v] of info) {
    text(k, M, y, { font: bold, size: 9, color: MUTED });
    const lines = wrap(reg, v, 10, W - 110);
    lines.forEach((l, i) => text(l, M + 110, y - i * 13, { size: 10 }));
    y -= 13 * lines.length + 3;
  }
  y -= 6;

  // Résumé
  const pct = check.totalItems ? Math.round((check.answeredItems / check.totalItems) * 100) : 0;
  const summary = `${check.answeredItems}/${check.totalItems} points vérifiés (${pct} %) · ${check.anomalies} anomalie(s)${check.criticalAnomaly ? ' dont critique(s)' : ''}`;
  page.drawRectangle({ x: M, y: y - 8, width: W, height: 22, color: check.anomalies ? rgb(1, 0.95, 0.93) : rgb(0.93, 0.98, 0.94) });
  text(summary, M + 8, y, { font: bold, size: 10, color: check.anomalies ? RED : GREEN });
  y -= 30;

  // Tableau des points
  const colRes = M + W - 190;
  const colCom = M + W - 120;
  const header = () => {
    text('Point de contrôle', M, y, { font: bold, size: 8.5, color: MUTED });
    text('Résultat', colRes, y, { font: bold, size: 8.5, color: MUTED });
    text('Commentaire', colCom, y, { font: bold, size: 8.5, color: MUTED });
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.6, color: LINE });
    y -= 12;
  };
  header();
  const answers = new Map((check.answers || []).map((a) => [a.itemId, a]));
  for (const it of items) {
    const a = answers.get(it.id) || {};
    const labelLines = wrap(reg, `${it.label}${it.critical ? ' *' : ''}`, 9.5, colRes - M - 8);
    const comLines = a.comment ? wrap(ital, a.comment, 8, M + W - colCom) : [];
    const h = Math.max(labelLines.length, comLines.length, 1) * 12 + 4;
    if (y - h < M + 20) { newPage(); header(); }
    labelLines.forEach((l, i) => text(l, M, y - i * 12, { size: 9.5 }));
    let res = a.status ? ANSWER_LABELS[a.status] : 'Non vérifié';
    if (it.kind === 'level' && a.value !== null && a.value !== undefined) { const u = it.unit === 'bar' ? 'bar' : '%'; res = `${a.value} ${u}${a.status === 'ko' ? ` (< ${it.min} ${u})` : ''}${a.status === 'absent' ? ' — Absent' : ''}`; }
    const color = !a.status ? ORANGE : a.status === 'ok' ? GREEN : RED;
    text(res, colRes, y, { font: bold, size: 9.5, color });
    comLines.forEach((l, i) => text(l, colCom, y - i * 12, { font: ital, size: 8, color: MUTED }));
    y -= h;
    page.drawLine({ start: { x: M, y: y + 10 }, end: { x: M + W, y: y + 10 }, thickness: 0.3, color: LINE });
  }
  text('* point critique : en anomalie, le véhicule est déclaré indisponible au retour.', M, y - 4, { font: ital, size: 7.5, color: MUTED });
  y -= 22;

  if (check.comment) {
    const lines = wrap(reg, check.comment, 9.5, W);
    ensure(20 + lines.length * 12);
    text('Observations', M, y, { font: bold, size: 9, color: MUTED });
    y -= 13;
    lines.forEach((l) => { text(l, M, y, { size: 9.5 }); y -= 12; });
    y -= 8;
  }

  // Signature
  ensure(110);
  text('Signature du contrôleur', M, y, { font: bold, size: 9, color: MUTED });
  y -= 8;
  if (check.signaturePath) {
    try {
      const png = await pdf.embedPng(await fs.readFile(path.resolve(process.cwd(), check.signaturePath)));
      const h = 60;
      const w = Math.min(220, (png.width / png.height) * h);
      page.drawImage(png, { x: M, y: y - h, width: w, height: h });
    } catch { /* signature illisible */ }
  }
  y -= 66;
  text(`${check.performedByName || ''} — ${fmt(check.performedAt)}`, M, y, { size: 9 });
  y -= 24;

  // Photos des anomalies
  const photos = (check.answers || []).filter((a) => a.photoPath);
  for (const a of photos) {
    const it = items.find((x) => x.id === a.itemId);
    try {
      const bytes = await fs.readFile(path.resolve(process.cwd(), a.photoPath));
      const img = /\.png$/i.test(a.photoPath) ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const w = Math.min(260, img.width);
      const h = (img.height / img.width) * w;
      ensure(h + 28);
      text(`Photo : ${it?.label || a.itemId}`, M, y, { font: bold, size: 9 });
      y -= 6;
      page.drawImage(img, { x: M, y: y - h, width: w, height: h });
      y -= h + 18;
    } catch { /* photo illisible */ }
  }

  // Pied de page
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(safe(reg, `Réf. contrôle ${check.id} · page ${i + 1}/${pages.length} · généré par la GED`), { x: M, y: 22, size: 7, font: reg, color: MUTED });
  });

  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}
