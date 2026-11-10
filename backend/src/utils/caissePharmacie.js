// backend/src/utils/caissePharmacie.js
// État de la caisse de vente de la pharmacie (demande du 10/11/2026) : la GED
// produit le même « Relevé de factures » que Sage (payeur 4199996 « CLIENT
// COMPTANT PHARMACIE », factures du jour), en LECTURE SEULE dans Sage.
import sql from 'mssql';

export const CAISSE_PHARMACIE_PAYEUR = '4199996';

const iso = (d) => new Date(d).toISOString().slice(0, 10);

/**
 * Factures de vente (DO_Type 6 et 7) dont le tiers payeur est la caisse de la
 * pharmacie, entre deux dates incluses. Colonnes du relevé Sage :
 * Total HT, Acomptes (= TTC − net à payer), Net à payer.
 */
export async function fetchCaisseFactures(pool, payeur, from, to) {
  const r = await pool.request()
    .input('p', sql.VarChar, payeur).input('from', sql.Date, from).input('to', sql.Date, to)
    .query(`
      SELECT E.DO_Piece, E.DO_Type, E.DO_Date, E.DO_Tiers, T.CT_Intitule,
             E.DO_TotalHT, E.DO_TotalTTC, E.DO_NetAPayer
      FROM F_DOCENTETE E
      LEFT JOIN F_COMPTET T ON T.CT_Num = E.DO_Tiers
      WHERE E.DO_Domaine = 0 AND E.DO_Type IN (6, 7) AND E.CT_NumPayeur = @p
        AND E.DO_Date >= @from AND E.DO_Date <= @to
      ORDER BY E.DO_Date, E.DO_Piece`);
  return r.recordset.map(toLigne);
}

/** Ligne du relevé à partir d'une entête Sage. */
export function toLigne(x) {
  const ht = Number(x.DO_TotalHT) || 0;
  const ttc = Number(x.DO_TotalTTC) || ht;
  const net = x.DO_NetAPayer === null || x.DO_NetAPayer === undefined ? ttc : Number(x.DO_NetAPayer) || 0;
  return {
    date: iso(x.DO_Date), piece: String(x.DO_Piece || '').trim(), comptabilisee: Number(x.DO_Type) === 7,
    client: String(x.DO_Tiers || '').trim(), intitule: String(x.CT_Intitule || '').trim(),
    totalHT: ht, acomptes: Math.max(0, Math.round((ttc - net) * 100) / 100), net,
  };
}

/** Totaux du relevé (TOTAL GENERAL). */
export function totauxCaisse(lignes) {
  return lignes.reduce((t, l) => ({ totalHT: t.totalHT + l.totalHT, acomptes: t.acomptes + l.acomptes, net: t.net + l.net, count: t.count + 1 }),
    { totalHT: 0, acomptes: 0, net: 0, count: 0 });
}
