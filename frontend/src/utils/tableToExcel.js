// frontend/src/utils/tableToExcel.js
// Export Excel « comme à l'écran » : relit les <table> affichés (cellules
// fusionnées rowSpan/colSpan, couleurs de fond et de texte, gras, alignement,
// largeurs de colonnes) et produit un .xlsx mis en forme, une feuille par tableau.
// Les couleurs sont toujours celles du thème clair, même en mode nuit.
// exceljs n'est chargé qu'au moment de l'export.

const WHITE = [255, 255, 255];
const FONT = 'Calibri';

// « rgb(…) » / « rgba(…) » → [r, g, b] mélangé sur `under` selon l'opacité ; null si transparent
function parseColor(css, under = WHITE) {
  const m = css && css.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (a === 0) return null;
  return [r, g, b].map((c, i) => Math.round(c * a + under[i] * (1 - a)));
}
const argb = ([r, g, b]) => `FF${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

// Fond réellement visible : celui de la cellule, sinon de sa ligne / section / tableau
function backgroundOf(cell) {
  for (let el = cell; el && el.tagName !== 'BODY'; el = el.parentElement) {
    const c = parseColor(getComputedStyle(el).backgroundColor);
    if (c) return c;
    if (el.tagName === 'TABLE') break;
  }
  return WHITE;
}

// Valeur Excel : nombre, pourcentage (nombre formaté) ou texte tel qu'affiché
function valueOf(text) {
  const s = text.replace(/\s+/g, ' ').trim();
  if (/^-?\d[\d\s ]*([.,]\d+)?$/.test(s)) return { value: Number(s.replace(/[\s ]/g, '').replace(',', '.')) };
  const pct = s.match(/^(-?\d+(?:[.,]\d+)?)\s*%$/);
  if (pct) return { value: Number(pct[1].replace(',', '.')) / 100, numFmt: '0.0%' };
  return { value: s };
}

/** Grille du tableau : position (ligne, colonne) de chaque cellule, en tenant compte des fusions. */
function layout(table) {
  const taken = [];
  const cells = [];
  [...table.rows].forEach((tr, r) => {
    let c = 0;
    for (const td of tr.cells) {
      if (td.hasAttribute('data-export-skip')) continue; // boutons d'action : écran seulement (dernière colonne)
      while (taken[r]?.[c]) c++;
      const rs = Math.max(1, td.rowSpan || 1);
      const cs = Math.max(1, td.colSpan || 1);
      for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) (taken[r + i] ??= [])[c + j] = true;
      cells.push({ td, r, c, rs, cs });
      c += cs;
    }
  });
  return { cells, nCols: Math.max(0, ...taken.map(row => row?.length || 0)), nRows: taken.length };
}

// Nom de feuille Excel valide (31 caractères, sans \ / ? * [ ] :) et unique dans le classeur
function sheetName(wb, name) {
  const base = name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 28) || 'Tableau';
  let n = base, i = 2;
  while (wb.getWorksheet(n)) n = `${base} ${i++}`;
  return n;
}

function addTableSheet(wb, table, { name, title, kpis = [], notes = [] }) {
  const ws = wb.addWorksheet(sheetName(wb, name));
  const { cells, nCols } = layout(table);
  const kpiRows = kpis.length ? 3 : 0;
  const offset = (title ? 2 : 0) + kpiRows;
  const border = { style: 'thin', color: { argb: 'FFD1D5DB' } };

  if (title) {
    ws.mergeCells(1, 1, 1, Math.max(1, nCols));
    const t = ws.getCell(1, 1);
    t.value = title;
    t.font = { name: FONT, bold: true, size: 13 };
  }

  // Cartes de chiffres de l'onglet : libellé au-dessus, valeur en gras et en couleur
  if (kpis.length) {
    const top = title ? 2 : 1;
    const span = Math.max(1, Math.min(8, Math.floor(nCols / kpis.length) || 1));
    kpis.forEach((k, i) => {
      const col = 1 + i * span;
      if (span > 1) { ws.mergeCells(top, col, top, col + span - 1); ws.mergeCells(top + 1, col, top + 1, col + span - 1); }
      const label = ws.getCell(top, col);
      label.value = k.label;
      label.font = { name: FONT, size: 9, color: { argb: 'FF6B7280' } };
      label.alignment = { horizontal: 'center', wrapText: true };
      const v = ws.getCell(top + 1, col);
      const { value, numFmt } = valueOf(k.value);
      v.value = value;
      if (numFmt) v.numFmt = numFmt;
      v.font = { name: FONT, bold: true, size: 14, color: { argb: argb(k.color) } };
      v.alignment = { horizontal: 'center' };
    });
  }

  const widths = new Array(nCols).fill(0);
  for (const { td, r, c, rs, cs } of cells) {
    const style = getComputedStyle(td);
    const row = offset + r + 1, col = c + 1;
    if (rs > 1 || cs > 1) ws.mergeCells(row, col, row + rs - 1, col + cs - 1);
    const cell = ws.getCell(row, col);
    const { value, numFmt } = valueOf(td.innerText || td.textContent || '');
    cell.value = value === '' ? null : value;
    if (numFmt) cell.numFmt = numFmt;
    const bg = backgroundOf(td);
    if (bg.some(v => v !== 255)) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(bg) } };
    // Couleur du texte : celle du contenu s'il est mis en avant (badge, chiffre coloré)
    const inner = td.querySelector('span, p, div') || td;
    const fg = parseColor(getComputedStyle(inner).color, bg) || [17, 24, 39];
    const weight = Math.max(Number(style.fontWeight) || 400, Number(getComputedStyle(inner).fontWeight) || 400);
    cell.font = { name: FONT, bold: weight >= 600, color: { argb: argb(fg) }, size: 10 };
    const align = style.textAlign === 'center' ? 'center' : style.textAlign === 'right' || style.textAlign === 'end' ? 'right' : 'left';
    cell.alignment = { horizontal: typeof value === 'number' && align === 'left' ? 'right' : align, vertical: 'middle', wrapText: true };
    for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) {
      ws.getCell(row + i, col + j).border = { top: border, left: border, bottom: border, right: border };
    }
    // Largeur : celle de l'écran, ou d'après le texte pour un tableau non affiché
    if (cs === 1) widths[c] = Math.max(widths[c], td.getBoundingClientRect().width || String(value ?? '').length * 7 + 14);
  }
  widths.forEach((px, i) => { ws.getColumn(i + 1).width = Math.min(60, Math.max(5, Math.round((px || 60) / 7))); });

  // Légende sous le tableau
  let row = offset + Math.max(...cells.map(x => x.r + x.rs), 0) + 2;
  for (const text of notes) {
    ws.mergeCells(row, 1, row, Math.max(1, nCols));
    const n = ws.getCell(row, 1);
    n.value = text;
    n.font = { name: FONT, italic: true, size: 9, color: { argb: 'FF6B7280' } };
    row++;
  }

  // En-têtes figés : lignes du <thead> et première colonne
  const headRows = table.tHead ? table.tHead.rows.length : 0;
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: offset + headRows }];
  ws.pageSetup = { orientation: nCols > 10 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  return ws;
}

/**
 * Exporte les tableaux visibles de `container` vers un .xlsx.
 * @param {HTMLElement} container zone qui contient les tableaux (un onglet)
 * @param {{ fileName: string, sheetName: string, title?: string }} options
 * @returns {Promise<number>} nombre de tableaux exportés
 */
export async function exportTablesToExcel(container, { fileName, sheetName, title }) {
  // Tableaux affichés, plus ceux préparés pour l'export seulement (data-export-only, masqués à l'écran)
  const tables = [...container.querySelectorAll('table')]
    .filter(t => t.rows.length && (t.offsetParent !== null || t.closest('[data-export-only]')));
  if (!tables.length) return 0;
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GED HSJM';
  wb.created = new Date();

  // Couleurs du thème clair, même si l'interface est en mode nuit
  const root = document.documentElement;
  const wasDark = root.classList.contains('dark');
  if (wasDark) root.classList.remove('dark');
  try {
    // Cartes de chiffres et légendes de l'onglet : reprises sur la première feuille
    const visible = (el) => el.offsetParent !== null;
    const kpis = [...container.querySelectorAll('[data-export-kpi]')].filter(visible).map(el => {
      const v = el.querySelector('[data-kpi-value]') || el;
      return { label: el.dataset.exportKpi, value: v.innerText || '', color: parseColor(getComputedStyle(v).color) || [17, 24, 39] };
    });
    const notes = [...container.querySelectorAll('[data-export-note]')].filter(visible)
      .map(el => (el.innerText || '').replace(/\s*\n\s*/g, '   ·   ').trim()).filter(Boolean);
    tables.forEach((table, i) => {
      const caption = table.closest('[data-export-title]')?.dataset.exportTitle;
      const name = tables.length > 1 ? `${caption || sheetName} ${caption ? '' : i + 1}`.trim() : sheetName;
      addTableSheet(wb, table, {
        name: name || `Tableau ${i + 1}`,
        title: [title, caption].filter(Boolean).join(' — '),
        ...(i === 0 ? { kpis, notes } : {}),
      });
    });
  } finally {
    if (wasDark) root.classList.add('dark');
  }

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return tables.length;
}
