// backend/src/utils/vehicleInventoryPdf.js
// Fiche PDF d'un inventaire d'ambulance (fiche RO SAU) : par section,
// désignation / quantité requise / présente / manque / péremption, puis la
// liste « À réapprovisionner », les observations et la signature. Archivée
// dans la GED.
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { safe, wrap } from './vehicleCheckPdf.js';

const A4 = [595.28, 841.89];
const M = 40;
const INK = rgb(0.07, 0.09, 0.15);
const MUTED = rgb(0.42, 0.45, 0.5);
const RED = rgb(0.75, 0.11, 0.11);
const GREEN = rgb(0.09, 0.5, 0.25);
const ORANGE = rgb(0.75, 0.42, 0.04);
const LINE = rgb(0.85, 0.87, 0.9);
const BAND = rgb(0.95, 0.96, 0.98);

const fmt = (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Douala', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const qtyText = (n, unit) => `${n}${unit ? ` ${unit}` : ''}`;

/**
 * @returns {Promise<Buffer>}
 */
export async function buildVehicleInventoryPdf({ tenantName, vehicle, inventory }) {
  const pdf = await PDFDocument.create();
  const [reg, bold, ital] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold), pdf.embedFont(StandardFonts.HelveticaOblique),
  ]);
  pdf.setTitle(`Inventaire ambulance - ${vehicle.label}`);
  let page = pdf.addPage(A4);
  let y = A4[1] - M;
  const W = A4[0] - 2 * M;
  const text = (str, x, yy, { font = reg, size = 10, color = INK } = {}) => page.drawText(safe(font, str), { x, y: yy, size, font, color });
  const textRight = (str, xr, yy, opts = {}) => {
    const font = opts.font || reg;
    const size = opts.size || 10;
    text(str, xr - font.widthOfTextAtSize(safe(font, str), size), yy, opts);
  };
  const newPage = () => { page = pdf.addPage(A4); y = A4[1] - M; };

  // En-tête
  text(tenantName || 'Hôpital', M, y, { font: bold, size: 11, color: MUTED });
  y -= 22;
  text("Inventaire de l'ambulance", M, y, { font: bold, size: 16 });
  y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 1.5, color: rgb(0.86, 0.15, 0.15) });
  y -= 18;
  const info = [
    ['Ambulance', `${vehicle.label} — ${vehicle.immatriculation}`],
    ['Inventaire du', `${fmt(inventory.performedAt)} (heure du serveur)`],
    ['Fait par', inventory.performedByName || '—'],
  ];
  for (const [k, v] of info) {
    text(k, M, y, { font: bold, size: 9, color: MUTED });
    text(v, M + 100, y, { size: 10 });
    y -= 14;
  }
  y -= 4;
  const bad = inventory.shortages + inventory.expiring;
  const summary = `${inventory.answeredItems}/${inventory.totalItems} lignes relevées · ${inventory.shortages} manque(s)${inventory.expiring ? ` · ${inventory.expiring} péremption(s) dans le mois` : ''}${inventory.criticalAnomaly ? ' · POINT CRITIQUE' : ''}`;
  page.drawRectangle({ x: M, y: y - 8, width: W, height: 22, color: bad ? rgb(1, 0.95, 0.93) : rgb(0.93, 0.98, 0.94) });
  text(summary, M + 8, y, { font: bold, size: 10, color: bad ? RED : GREEN });
  y -= 30;

  // Colonnes
  const cReq = M + W - 215;
  const cPres = M + W - 150;
  const cMiss = M + W - 90;
  const cExp = M + W - 4;
  const header = () => {
    page.drawRectangle({ x: M, y: y - 5, width: W, height: 16, color: BAND });
    text('Désignation', M + 4, y, { font: bold, size: 8.5, color: MUTED });
    textRight('Requis', cReq + 40, y, { font: bold, size: 8.5, color: MUTED });
    textRight('Présent', cPres + 40, y, { font: bold, size: 8.5, color: MUTED });
    textRight('Manque', cMiss + 34, y, { font: bold, size: 8.5, color: MUTED });
    textRight('Péremption', cExp, y, { font: bold, size: 8.5, color: MUTED });
    y -= 18;
  };
  const answers = new Map((inventory.answers || []).map((a) => [a.itemId, a]));
  for (const s of inventory.sections || []) {
    if (y < M + 90) newPage();
    text(s.label, M, y, { font: bold, size: 11.5 });
    y -= 16;
    header();
    for (const it of s.items || []) {
      const a = answers.get(it.id) || {};
      const lines = wrap(reg, `${it.label}${it.critical ? ' *' : ''}`, 9, cReq - M - 30);
      const comLines = a.comment ? wrap(ital, a.comment, 7.5, W - 20) : [];
      const h = lines.length * 10.5 + comLines.length * 9 + 2;
      if (y - h < M + 24) { newPage(); header(); }
      lines.forEach((l, i) => text(l, M + 4, y - i * 10.5, { size: 9 }));
      if (it.kind === 'qty') {
        textRight(qtyText(it.required, it.unit), cReq + 40, y, { size: 9, color: MUTED });
        const missing = a.present === null || a.present === undefined ? null : Math.max(0, it.required - a.present);
        textRight(a.present === null || a.present === undefined ? '—' : String(a.present), cPres + 40, y, { font: bold, size: 9, color: a.present === null || a.present === undefined ? ORANGE : missing ? RED : GREEN });
        if (missing) textRight(`-${missing}`, cMiss + 34, y, { font: bold, size: 9, color: RED });
        if (it.expiry) textRight(a.expiring ? 'Ce mois-ci' : 'OK', cExp, y, { font: a.expiring ? bold : reg, size: 9, color: a.expiring ? RED : MUTED });
      } else if (it.kind === 'level') {
        textRight(`min. ${it.min} ${it.unit || '%'}`, cReq + 40, y, { size: 9, color: MUTED });
        const low = a.value !== null && a.value !== undefined && a.value < (it.min || 0);
        textRight(a.value === null || a.value === undefined ? '—' : `${a.value} ${it.unit || '%'}`, cPres + 40, y, { font: bold, size: 9, color: a.value === null || a.value === undefined ? ORANGE : low ? RED : GREEN });
        if (low) textRight('Bas', cMiss + 34, y, { font: bold, size: 9, color: RED });
      } else if (it.kind === 'check') {
        textRight(a.status === 'ok' ? 'OK' : a.status === 'ko' ? 'Pas OK' : '—', cPres + 40, y, { font: bold, size: 9, color: a.status === 'ok' ? GREEN : a.status === 'ko' ? RED : ORANGE });
      } else {
        textRight(a.value === true ? 'Oui' : a.value === false ? 'Non' : '—', cPres + 40, y, { font: bold, size: 9 });
      }
      comLines.forEach((l, i) => text(l, M + 14, y - lines.length * 10.5 - i * 9 + 2, { font: ital, size: 7.5, color: MUTED }));
      y -= h;
      page.drawLine({ start: { x: M, y: y + 8 }, end: { x: M + W, y: y + 8 }, thickness: 0.3, color: LINE });
    }
    y -= 10;
  }
  text('* point critique : en défaut, l\'ambulance est déclarée indisponible.', M, y, { font: ital, size: 7.5, color: MUTED });
  y -= 20;

  // À réapprovisionner
  const restock = inventory.restock || [];
  if (restock.length) {
    if (y < M + 80) newPage();
    text('À réapprovisionner / à remplacer', M, y, { font: bold, size: 11.5, color: RED });
    y -= 15;
    for (const r of restock) {
      if (y < M + 24) newPage();
      const what = r.low ? `${r.value} ${r.unit} (minimum ${r.min} ${r.unit})`
        : r.ko ? 'hors service'
        : [r.missing ? `manque ${qtyText(r.missing, r.unit)} (présent ${r.present ?? 0} / ${r.required})` : null, r.expiring ? 'périme ce mois-ci' : null].filter(Boolean).join(' · ');
      const lines = wrap(reg, `• ${r.label} — ${what}`, 9.5, W - 10);
      lines.forEach((l) => { text(l, M + 6, y, { size: 9.5 }); y -= 12; });
    }
    y -= 8;
  }

  if (inventory.comment) {
    const lines = wrap(reg, inventory.comment, 9.5, W);
    if (y - 20 - lines.length * 12 < M) newPage();
    text('Observations', M, y, { font: bold, size: 9, color: MUTED });
    y -= 13;
    lines.forEach((l) => { text(l, M, y, { size: 9.5 }); y -= 12; });
    y -= 8;
  }

  // Signature
  if (y < M + 96) newPage();
  text('Signature', M, y, { font: bold, size: 9, color: MUTED });
  y -= 8;
  if (inventory.signaturePath) {
    try {
      const png = await pdf.embedPng(await fs.readFile(path.resolve(process.cwd(), inventory.signaturePath)));
      const h = 50;
      const w = Math.min(200, (png.width / png.height) * h);
      page.drawImage(png, { x: M, y: y - h, width: w, height: h });
    } catch { /* signature illisible */ }
  }
  y -= 56;
  text(`${inventory.performedByName || ''} — ${fmt(inventory.performedAt)}`, M, y, { size: 9 });

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(safe(reg, `Réf. inventaire ${inventory.id} · page ${i + 1}/${pages.length} · généré par la GED`), { x: M, y: 22, size: 7, font: reg, color: MUTED });
  });
  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}
