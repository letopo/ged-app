// backend/src/utils/sageFactureData.js
// Chargement complet d'une facture PHP depuis Sage (LECTURE SEULE) : entête,
// fiche du patient (champs personnalisés HSJM), lignes avec le BL d'origine de
// chacune (DL_PieceBL / DL_DateBL, service = référence du BL). Sert à générer la
// liasse PDF (facture + bordereaux de cession des BL) et l'aperçu.
import sql from 'mssql';
import { phpBeneficiaryType } from './integrations.js';

const validDate = (d) => (d && new Date(d).getUTCFullYear() > 1900 ? new Date(d) : null);
const iso = (d) => { const v = validDate(d); return v ? v.toISOString().slice(0, 10) : null; };

/**
 * @returns {Promise<null | {
 *   piece, comptabilisee, dateFacture, reference, emetteur, totalHT, totalTTC, acompte, netAPayer,
 *   patient: { compteTiers, nom, compteCollectif, type, matricule, nomAssure, secteur, dateEntree, dateSortie, tarif },
 *   lignes: [{ dateBl, pieceBl, service, reference, designation, quantite, prixUnitaire, montantHT, montantTTC }],
 *   bl: [{ piece, date, service, lignes, total }]
 * }>}
 */
export async function loadSageFacture(pool, piece) {
  const head = await pool.request().input('piece', sql.VarChar, piece).query(`
    SELECT TOP 1 E.DO_Piece, E.DO_Type, E.DO_Date, E.DO_Ref, E.DO_Tiers, E.DO_TotalHT, E.DO_TotalTTC,
           E.DO_NetAPayer, E.DO_MontantRegle, E.Emetteur,
           T.CT_Intitule, T.CG_NumPrinc, T.N_CatTarif, T.[MATRICULE] AS matricule, T.[NOM ASSURE] AS nomAssure,
           T.[SECTEUR] AS secteur, T.[Date Entrée du Malade] AS dateEntree, T.[Date de Sortie du Malade] AS dateSortie
    FROM F_DOCENTETE E
    LEFT JOIN F_COMPTET T ON T.CT_Num = E.DO_Tiers
    WHERE E.DO_Domaine = 0 AND E.DO_Type IN (6, 7) AND E.cbDO_Piece = CONVERT(varbinary(13), @piece)
    ORDER BY E.DO_Type DESC`);
  const h = head.recordset[0];
  if (!h) return null;

  // Intitulé de la catégorie tarifaire (ex. « Tarif2 (PHP) ») — facultatif
  let tarif = h.N_CatTarif ? `Catégorie tarifaire ${h.N_CatTarif}` : null;
  try {
    const t = await pool.request().input('cat', sql.Int, h.N_CatTarif).query('SELECT TOP 1 CT_Intitule FROM P_CATTARIF WHERE cbIndice = @cat');
    if (t.recordset[0]?.CT_Intitule) tarif = t.recordset[0].CT_Intitule.trim();
  } catch { /* table absente ou autre version de Sage : on garde le numéro */ }

  const lines = await pool.request().input('piece', sql.VarChar, piece).input('type', sql.Int, h.DO_Type).query(`
    SELECT DL_Ligne, DL_DateBL, DL_PieceBL, DO_Ref, AR_Ref, DL_Design, DL_Qte, DL_PrixUnitaire, DL_MontantHT, DL_MontantTTC
    FROM F_DOCLIGNE
    WHERE DO_Domaine = 0 AND DO_Type = @type AND cbDO_Piece = CONVERT(varbinary(13), @piece)   -- index Sage IDL_LIGNE
    ORDER BY DL_Ligne`);

  const lignes = lines.recordset.map(l => ({
    dateBl: iso(l.DL_DateBL), pieceBl: (l.DL_PieceBL || '').trim() || null, service: (l.DO_Ref || '').trim() || null,
    reference: (l.AR_Ref || '').trim() || null, designation: (l.DL_Design || '').trim(),
    quantite: Number(l.DL_Qte) || 0, prixUnitaire: Number(l.DL_PrixUnitaire) || 0,
    montantHT: Number(l.DL_MontantHT) || 0, montantTTC: Number(l.DL_MontantTTC) || 0,
  }));

  // BL d'origine, dans l'ordre d'apparition (annexes : bordereaux de cession)
  const byBl = new Map();
  for (const l of lignes) {
    if (!l.pieceBl) continue;
    if (!byBl.has(l.pieceBl)) byBl.set(l.pieceBl, { piece: l.pieceBl, date: l.dateBl, service: l.service, lignes: [], total: 0 });
    const b = byBl.get(l.pieceBl);
    if (!l.designation && !l.quantite) continue;     // lignes de commentaire vides
    b.lignes.push(l);
    b.total += l.montantTTC || l.montantHT;
  }

  return {
    piece: h.DO_Piece.trim(), comptabilisee: h.DO_Type === 7, dateFacture: iso(h.DO_Date),
    reference: (h.DO_Ref || '').trim() || null, emetteur: (h.Emetteur || '').trim() || null,
    totalHT: Number(h.DO_TotalHT) || 0, totalTTC: Number(h.DO_TotalTTC) || 0,
    acompte: Number(h.DO_MontantRegle) || 0, netAPayer: Number(h.DO_NetAPayer ?? h.DO_TotalTTC) || 0,
    patient: {
      compteTiers: (h.DO_Tiers || '').trim(), nom: (h.CT_Intitule || '').trim(), compteCollectif: h.CG_NumPrinc,
      type: phpBeneficiaryType(h.CG_NumPrinc), matricule: (h.matricule || '').trim() || null,
      nomAssure: (h.nomAssure || '').trim() || null, secteur: (h.secteur || '').trim() || null,
      dateEntree: iso(h.dateEntree), dateSortie: iso(h.dateSortie), tarif,
    },
    lignes,
    bl: [...byBl.values()],
  };
}
