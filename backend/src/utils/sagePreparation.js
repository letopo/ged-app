// backend/src/utils/sagePreparation.js
// Facturation assistée d'un BPC (10/11/2026), en attendant le module Objets
// Métiers : la GED prépare la liste des BL, la facturation transforme ces BL en
// facture dans Sage comme aujourd'hui, puis la GED retrouve la facture (LECTURE
// SEULE) et contrôle qu'elle reprend exactement les BL préparés.
import sql from 'mssql';

const iso = (d) => new Date(d).toISOString().slice(0, 10);

/** BL encore non facturés (DO_Type 3) d'un patient sur une période. */
export async function fetchPendingBlForTiers(pool, compteTiers, start, end) {
  const r = await pool.request()
    .input('t', sql.VarChar, compteTiers).input('s', sql.Date, start).input('e', sql.Date, end)
    .query(`
      SELECT DO_Piece, DO_Date, DO_Ref, DO_TotalTTC FROM F_DOCENTETE
      WHERE DO_Domaine = 0 AND DO_Type = 3 AND DO_Tiers = @t AND DO_Date >= @s AND DO_Date <= @e
      ORDER BY DO_Date, DO_Piece`);
  return r.recordset.map((x) => ({
    piece: x.DO_Piece.trim(), date: iso(x.DO_Date), service: (x.DO_Ref || '').trim() || null, montant: Number(x.DO_TotalTTC) || 0,
  }));
}

/**
 * Compare une préparation à Sage.
 *  - prepared : numéros de BL préparés
 *  - factured : lignes des factures du patient sur la période
 *               [{ facture, comptabilisee, dateFacture, bl, montant }]
 *  - pending  : BL du patient encore non facturés sur la période [{ piece, date, service, montant }]
 * Retourne { status, factures, manquants, oublies } :
 *  - a_transformer : aucun BL préparé n'est encore facturé
 *  - incomplete    : une partie seulement, ou répartis sur plusieurs factures
 *  - facturee      : tous les BL préparés sont dans une seule facture
 */
export function evaluatePreparation(prepared, factured, pending) {
  const wanted = new Set(prepared);
  const byInvoice = new Map();
  for (const row of factured || []) {
    if (!row.bl) continue;
    if (!byInvoice.has(row.facture)) {
      byInvoice.set(row.facture, { piece: row.facture, date: row.dateFacture, comptabilisee: !!row.comptabilisee, bl: [], autresBl: [], montant: 0 });
    }
    const f = byInvoice.get(row.facture);
    if (wanted.has(row.bl)) { if (!f.bl.includes(row.bl)) f.bl.push(row.bl); f.montant += Number(row.montant) || 0; }
    else if (!f.autresBl.includes(row.bl)) f.autresBl.push(row.bl);
  }
  // Seules comptent les factures qui reprennent au moins un BL préparé
  const factures = [...byInvoice.values()].filter((f) => f.bl.length).sort((a, b) => a.piece.localeCompare(b.piece));
  const invoiced = new Set(factures.flatMap((f) => f.bl));
  const manquants = prepared.filter((p) => !invoiced.has(p));
  const oublies = (pending || []).filter((b) => !wanted.has(b.piece) && !invoiced.has(b.piece));
  let status = 'facturee';
  if (!invoiced.size) status = 'a_transformer';
  else if (manquants.length || factures.length > 1) status = 'incomplete';
  return { status, factures, manquants, oublies };
}

/** Lignes à copier dans Sage : un numéro de BL par ligne. */
export const blListText = (pieces) => pieces.join('\n');
