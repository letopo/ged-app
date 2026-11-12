// backend/src/utils/sageBonCommande.js
// Bons de commande fournisseurs préparés dans Sage (demande du 12/11/2026, Major
// de la pharmacie, étendu à tous les services) : la GED lit la pièce d'achat par
// son numéro et produit le même document que Sage pour l'envoyer en signature.
// LECTURE SEULE dans Sage (pas d'Objets Métiers).
//  - Domaine achats (DO_Domaine 1) : 12 = bon de commande (BCF…), 13 = bon de
//    livraison / réception (BLF…) ; le BLF est souvent imprimé avec le modèle
//    « Bon de commande » à la pharmacie.
import sql from 'mssql';

export const TYPES_ACHAT = { 12: 'Bon de commande', 13: 'Bon de réception' };
const SAGE_NULL_DATE = 1900; // Sage met 1753-01-01 quand une date est vide

const iso = (d) => (d && new Date(d).getUTCFullYear() > SAGE_NULL_DATE ? new Date(d).toISOString().slice(0, 10) : null);
const str = (v) => String(v ?? '').trim();
const num = (v) => Number(v) || 0;

/** Numéro saisi → numéro Sage (majuscules, sans espaces). */
export const normPiece = (v) => str(v).toUpperCase().replace(/\s+/g, '');
export const isPieceValide = (p) => /^[A-Z0-9-]{3,13}$/.test(p);

/** Une ligne Sage → ligne du bon (remise en % ou en montant, comme Sage). */
export function toLigneBc(l) {
  const remType = Number(l.DL_Remise01REM_Type); // 0 = montant, 1 = %, 2 = quantité
  const rem = num(l.DL_Remise01REM_Valeur);
  return {
    reference: str(l.AR_Ref), designation: str(l.DL_Design), quantite: num(l.DL_Qte),
    conditionnement: str(l.EU_Enumere), prixUnitaire: num(l.DL_PrixUnitaire),
    remise: rem ? (remType === 1 ? `${rem} %` : String(rem)) : '',
    montantHT: num(l.DL_MontantHT), montantTTC: num(l.DL_MontantTTC),
    pieceBC: str(l.DL_PieceBC) || null,
  };
}

/** Totaux du bon (lignes de texte sans montant ignorées). */
export function totauxBc(lignes, entete = {}) {
  const ht = lignes.reduce((s, l) => s + l.montantHT, 0);
  const ttc = lignes.reduce((s, l) => s + l.montantTTC, 0);
  // Remise : seulement sur les lignes qui en ont une (évite les écarts d'arrondi des P.U.)
  const remise = lignes.filter((l) => l.remise).reduce((s, l) => s + (l.quantite * l.prixUnitaire - l.montantHT), 0);
  return {
    totalHT: entete.totalHT ?? ht, totalTTC: entete.totalTTC ?? ttc,
    netAPayer: entete.netAPayer ?? ttc,
    totalRemise: Math.max(0, Math.round(remise)),
    nbLignes: lignes.filter((l) => l.reference || l.quantite).length,
  };
}

async function queryEntete(pool, piece, withEmetteur) {
  return pool.request().input('p', sql.VarChar(13), piece).query(`
    SELECT TOP 1 E.DO_Type, E.DO_Piece, E.DO_Date, E.DO_DateLivr, E.DO_Ref, E.DO_Tiers, E.DE_No,
           E.DO_TotalHT, E.DO_TotalTTC, E.DO_NetAPayer, E.cbModification${withEmetteur ? ', E.Emetteur' : ''},
           T.CT_Intitule, T.CT_Contact, T.CT_Adresse, T.CT_Complement, T.CT_CodePostal, T.CT_Ville, T.CT_Telephone,
           D.DE_Intitule
    FROM F_DOCENTETE E
    LEFT JOIN F_COMPTET T ON T.CT_Num = E.DO_Tiers
    LEFT JOIN F_DEPOT D ON D.DE_No = E.DE_No
    WHERE E.cbDO_Piece = CONVERT(varbinary(13), @p) AND E.DO_Domaine = 1 AND E.DO_Type IN (12, 13)`);
}

/**
 * Pièce d'achat (BCF / BLF) avec ses lignes, ou null si elle n'existe pas
 * (pièce pas encore enregistrée dans Sage, ou d'un autre type).
 */
export async function fetchBonCommande(pool, pieceInput) {
  const piece = normPiece(pieceInput);
  let r;
  try { r = await queryEntete(pool, piece, true); } catch { r = await queryEntete(pool, piece, false); } // champ libre « Emetteur » absent
  const e = r.recordset[0];
  if (!e) return null;
  const lr = await pool.request().input('p', sql.VarChar(13), piece).input('t', sql.Int, e.DO_Type).query(`
    SELECT AR_Ref, DL_Design, DL_Qte, EU_Enumere, DL_PrixUnitaire, DL_Remise01REM_Valeur, DL_Remise01REM_Type,
           DL_MontantHT, DL_MontantTTC, DL_PieceBC
    FROM F_DOCLIGNE
    WHERE cbDO_Piece = CONVERT(varbinary(13), @p) AND DO_Domaine = 1 AND DO_Type = @t
    ORDER BY DL_Ligne`);
  const lignes = lr.recordset.map(toLigneBc);
  const entete = {
    type: Number(e.DO_Type), typeLabel: TYPES_ACHAT[e.DO_Type], piece: str(e.DO_Piece),
    date: iso(e.DO_Date), dateLivraison: iso(e.DO_DateLivr), reference: str(e.DO_Ref),
    emetteur: str(e.Emetteur) || null, modifieLe: e.cbModification || null,
    depot: { numero: e.DE_No, intitule: str(e.DE_Intitule) },
    fournisseur: {
      numero: str(e.DO_Tiers), intitule: str(e.CT_Intitule), contact: str(e.CT_Contact),
      adresse: [str(e.CT_Adresse), str(e.CT_Complement), [str(e.CT_CodePostal), str(e.CT_Ville)].filter(Boolean).join(' ')].filter(Boolean),
      telephone: str(e.CT_Telephone),
    },
    totalHT: num(e.DO_TotalHT), totalTTC: num(e.DO_TotalTTC), netAPayer: e.DO_NetAPayer == null ? null : num(e.DO_NetAPayer),
  };
  return { ...entete, lignes, totaux: totauxBc(lignes, entete) };
}

/** Pièces d'achat récentes (liste à choisir), sans les lignes. */
export async function listBonsCommande(pool, { from, to, depot = null, q = '' }) {
  const req = pool.request().input('from', sql.Date, from).input('to', sql.Date, to);
  let where = 'E.DO_Domaine = 1 AND E.DO_Type IN (12, 13) AND E.DO_Date >= @from AND E.DO_Date <= @to';
  if (depot) { req.input('d', sql.Int, Number(depot)); where += ' AND E.DE_No = @d'; }
  const s = str(q);
  if (s) { req.input('q', sql.VarChar(80), `%${s}%`); where += ' AND (E.DO_Piece LIKE @q OR T.CT_Intitule LIKE @q)'; }
  const r = await req.query(`
    SELECT TOP 300 E.DO_Type, E.DO_Piece, E.DO_Date, E.DO_Tiers, E.DE_No, E.DO_TotalTTC, E.DO_NetAPayer, T.CT_Intitule, D.DE_Intitule
    FROM F_DOCENTETE E
    LEFT JOIN F_COMPTET T ON T.CT_Num = E.DO_Tiers
    LEFT JOIN F_DEPOT D ON D.DE_No = E.DE_No
    WHERE ${where}
    ORDER BY E.DO_Date DESC, E.DO_Piece DESC`);
  return r.recordset.map((e) => ({
    type: Number(e.DO_Type), typeLabel: TYPES_ACHAT[e.DO_Type], piece: str(e.DO_Piece), date: iso(e.DO_Date),
    fournisseur: str(e.CT_Intitule) || str(e.DO_Tiers), depot: { numero: e.DE_No, intitule: str(e.DE_Intitule) },
    montant: e.DO_NetAPayer == null ? num(e.DO_TotalTTC) : num(e.DO_NetAPayer),
  }));
}

export async function listDepots(pool) {
  const r = await pool.request().query('SELECT DE_No, DE_Intitule FROM F_DEPOT ORDER BY DE_Intitule');
  return r.recordset.map((d) => ({ numero: d.DE_No, intitule: str(d.DE_Intitule) }));
}
