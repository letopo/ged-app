// backend/src/utils/vehicleShiftPdf.js
// Fiche PDF « Prise de poste » RO SAU : comme la fiche papier — une ligne par
// point de contrôle, une colonne par ambulance — puis les bouteilles d'oxygène
// (dans chaque ambulance, pleines / vides en réserve), le niveau d'alerte et la
// signature. Archivée dans la GED et transmise au Chef de pôle RO SAU.
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { safe, wrap } from './vehicleCheckPdf.js';

const A4 = [595.28, 841.89];
const M = 42;
const INK = rgb(0.07, 0.09, 0.15);
const MUTED = rgb(0.42, 0.45, 0.5);
const RED = rgb(0.75, 0.11, 0.11);
const GREEN = rgb(0.09, 0.5, 0.25);
const ORANGE = rgb(0.75, 0.42, 0.04);
const LINE = rgb(0.85, 0.87, 0.9);

const fmt = (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const OXYGEN_TEXT = {
  ok: 'Stock d\'oxygène normal',
  commander: 'Passer commande d\'oxygène : plus aucune bouteille pleine en réserve',
  urgent: 'URGENT : plus de bouteille pleine en réserve et une ambulance n\'a pas ses 2 bouteilles',
};

/** @returns {Promise<Buffer>} */
export async function buildVehicleShiftPdf({ tenantName, shift, oxygen }) {
  const pdf = await PDFDocument.create();
  const [reg, bold, ital] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold), pdf.embedFont(StandardFonts.HelveticaOblique),
  ]);
  pdf.setTitle(`Prise de poste - ${shift.shiftDate}`);
  let page = pdf.addPage(A4);
  let y = A4[1] - M;
  const W = A4[0] - 2 * M;
  const text = (str, x, yy, { font = reg, size = 10, color = INK } = {}) => page.drawText(safe(font, str), { x, y: yy, size, font, color });
  const newPage = () => { page = pdf.addPage(A4); y = A4[1] - M; };
  const ensure = (h) => { if (y - h < M + 20) newPage(); };

  text(tenantName || 'Hôpital', M, y, { font: bold, size: 11, color: MUTED });
  y -= 22;
  text('Fiche de PRISE DE POSTE — Ambulances', M, y, { font: bold, size: 16 });
  y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 1.5, color: rgb(0.86, 0.15, 0.15) });
  y -= 20;

  const vehicles = shift.vehicles || [];
  const info = [
    ['Ambulances', vehicles.map((v) => `${v.label} (${v.immatriculation})`).join(' · ') || '—'],
    ['Contrôlé par', shift.performedByName || '—'],
    ['Date et heure', `${fmt(shift.performedAt)} (heure du serveur)`],
  ];
  for (const [k, v] of info) {
    text(k, M, y, { font: bold, size: 9, color: MUTED });
    const lines = wrap(reg, v, 10, W - 110);
    lines.forEach((l, i) => text(l, M + 110, y - i * 13, { size: 10 }));
    y -= 13 * lines.length + 3;
  }
  y -= 6;

  // Résumé
  const summary = shift.anomalies ? `${shift.anomalies} anomalie(s)${shift.criticalAnomaly ? ' dont critique(s)' : ''}` : 'Aucune anomalie';
  page.drawRectangle({ x: M, y: y - 8, width: W, height: 22, color: shift.anomalies ? rgb(1, 0.95, 0.93) : rgb(0.93, 0.98, 0.94) });
  text(summary, M + 8, y, { font: bold, size: 10, color: shift.anomalies ? RED : GREEN });
  y -= 30;

  // Tableau : une colonne par ambulance
  const n = Math.max(1, vehicles.length);
  const colW = Math.min(110, (W - 200) / n);
  const colX = (i) => M + W - colW * (n - i);
  const labelW = colX(0) - M - 8;
  const header = () => {
    text('Point de contrôle', M, y, { font: bold, size: 8.5, color: MUTED });
    vehicles.forEach((v, i) => text(v.label, colX(i), y, { font: bold, size: 8.5, color: MUTED }));
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.6, color: LINE });
    y -= 12;
  };
  header();
  // Lignes : union des points (dans l'ordre de la première ambulance)
  const rows = [];
  const seen = new Set();
  for (const v of vehicles) for (const it of v.items || []) if (!seen.has(it.id)) { seen.add(it.id); rows.push(it); }
  const cell = (v, it) => {
    const a = (v.answers || []).find((x) => x.itemId === it.id);
    if (!(v.items || []).some((x) => x.id === it.id)) return { txt: '—', color: MUTED };
    if (!a?.status) return { txt: 'Non vérifié', color: ORANGE };
    if (it.kind === 'level' && a.value !== null && a.value !== undefined) {
      const u = it.unit === 'bar' ? 'bar' : '%';
      return { txt: `${a.value} ${u}`, color: a.status === 'ok' ? GREEN : RED };
    }
    return { txt: a.status === 'ok' ? 'OK' : a.status === 'absent' ? 'Absent' : 'Pas OK', color: a.status === 'ok' ? GREEN : RED };
  };
  for (const it of rows) {
    const lines = wrap(reg, `${it.label}${it.critical ? ' *' : ''}`, 9.5, labelW);
    const h = lines.length * 12 + 4;
    if (y - h < M + 20) { newPage(); header(); }
    lines.forEach((l, i) => text(l, M, y - i * 12, { size: 9.5 }));
    vehicles.forEach((v, i) => { const c = cell(v, it); text(c.txt, colX(i), y, { font: bold, size: 9.5, color: c.color }); });
    y -= h;
    page.drawLine({ start: { x: M, y: y + 10 }, end: { x: M + W, y: y + 10 }, thickness: 0.3, color: LINE });
  }
  // Bouteilles à bord
  ensure(20);
  text("Bouteilles d'oxygène dans l'ambulance", M, y, { font: bold, size: 9.5 });
  vehicles.forEach((v, i) => text(v.bottles === null || v.bottles === undefined ? '—' : String(v.bottles), colX(i), y, { font: bold, size: 9.5, color: (v.bottles ?? 0) < 2 ? RED : GREEN }));
  y -= 16;
  text('* point critique : en anomalie, l\'ambulance est déclarée indisponible.', M, y, { font: ital, size: 7.5, color: MUTED });
  y -= 24;

  // Réserve d'oxygène
  ensure(70);
  text('Réserve d\'oxygène', M, y, { font: bold, size: 11 });
  y -= 16;
  text(`Bouteilles pleines : ${shift.reserveFull ?? '—'}      Bouteilles vides : ${shift.reserveEmpty ?? '—'}${oxygen?.total ? `      Total compté : ${oxygen.total}` : ''}`, M, y, { size: 10 });
  y -= 18;
  if (shift.oxygenLevel) {
    const tone = shift.oxygenLevel === 'ok' ? GREEN : shift.oxygenLevel === 'commander' ? ORANGE : RED;
    page.drawRectangle({ x: M, y: y - 8, width: W, height: 22, color: shift.oxygenLevel === 'ok' ? rgb(0.93, 0.98, 0.94) : shift.oxygenLevel === 'commander' ? rgb(1, 0.96, 0.9) : rgb(1, 0.93, 0.93) });
    text(OXYGEN_TEXT[shift.oxygenLevel] || '', M + 8, y, { font: bold, size: 10, color: tone });
    y -= 30;
  }

  if (shift.comment) {
    const lines = wrap(reg, shift.comment, 9.5, W);
    ensure(20 + lines.length * 12);
    text('Observations', M, y, { font: bold, size: 9, color: MUTED });
    y -= 13;
    lines.forEach((l) => { text(l, M, y, { size: 9.5 }); y -= 12; });
    y -= 8;
  }

  ensure(110);
  text('Signature', M, y, { font: bold, size: 9, color: MUTED });
  y -= 8;
  if (shift.signaturePath) {
    try {
      const png = await pdf.embedPng(await fs.readFile(path.resolve(process.cwd(), shift.signaturePath)));
      const h = 60;
      page.drawImage(png, { x: M, y: y - h, width: Math.min(220, (png.width / png.height) * h), height: h });
    } catch { /* signature illisible */ }
  }
  y -= 66;
  text(`${shift.performedByName || ''} — ${fmt(shift.performedAt)}`, M, y, { size: 9 });

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(safe(reg, `Réf. prise de poste ${shift.id} · page ${i + 1}/${pages.length} · généré par la GED`), { x: M, y: 22, size: 7, font: reg, color: MUTED });
  });
  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}
