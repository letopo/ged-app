// backend/src/utils/sageBl.js
// BL (Bons de Livraison) Sage des patients PHP pas encore transformés en facture,
// regroupés en BPC (Bon de Prise en Charge, 3 jours). LECTURE SEULE dans Sage.
//
// Sage 100 Gestion commerciale (DO_Domaine 0) : DO_Type 3 = BL, 6/7 = facture.
// Quand la facturation « arrête la facture », les BL du patient sont transformés :
// ils disparaissent en tant que BL et leurs lignes gardent leur numéro
// (F_DOCLIGNE.DL_PieceBL). Un BL encore en DO_Type 3 n'est donc pas facturé.
//
// BPC : il n'existe pas dans Sage. Le BPC en cours d'un patient part de la
// « Date Entrée du Malade » (champ personnalisé de la fiche client, mis à jour à
// chaque venue) et dure 3 jours (J, J+1, J+2). Les BL non facturés en dehors de
// cette période sont regroupés en BPC de 3 jours à partir de leur premier BL.
import sql from 'mssql';
import { PHP_COMPTES_COLLECTIFS, phpBeneficiaryType } from './integrations.js';

export const BPC_DAYS = 3;
export const LATE_DAYS = 30;          // BPC expiré depuis plus de 30 jours : « en retard »
const COLLECTIFS = Object.keys(PHP_COMPTES_COLLECTIFS);

const DAY = 86_400_000;
const dayOf = (d) => { const x = new Date(d); return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()); };
const iso = (t) => new Date(t).toISOString().slice(0, 10);

const collectifParams = (request) => {
  COLLECTIFS.forEach((c, i) => request.input(`coll${i}`, sql.VarChar, c));
  return COLLECTIFS.map((_, i) => `@coll${i}`).join(', ');
};

/** Entêtes des BL PHP non facturés, avec la fiche patient (champs personnalisés HSJM). */
export async function fetchPendingBl(pool) {
  const request = pool.request();
  const inList = collectifParams(request);
  const r = await request.query(`
    SELECT E.DO_Piece, E.DO_Date, E.DO_Ref, E.DO_TotalTTC, E.DO_Tiers,
           T.CT_Intitule, T.CG_NumPrinc, T.[MATRICULE] AS matricule, T.[NOM ASSURE] AS nomAssure,
           T.[SECTEUR] AS secteur, T.[PLAFOND] AS plafond, T.[Date Entrée du Malade] AS dateEntree
    FROM F_DOCENTETE E
    JOIN F_COMPTET T ON T.CT_Num = E.DO_Tiers
    WHERE E.DO_Domaine = 0 AND E.DO_Type = 3 AND T.CG_NumPrinc IN (${inList})
    ORDER BY E.DO_Tiers, E.DO_Date`);
  return r.recordset;
}

/** Lignes (actes) de BL non facturés. */
export async function fetchBlLines(pool, pieces) {
  const list = [...new Set(pieces)].filter(p => /^[A-Z0-9-]{3,20}$/i.test(p)).slice(0, 100);
  if (!list.length) return [];
  const request = pool.request();
  list.forEach((p, i) => request.input(`p${i}`, sql.VarChar, p));
  const r = await request.query(`
    SELECT DO_Piece, DL_Ligne, AR_Ref, DL_Design, DL_Qte, DL_PrixUnitaire, DL_MontantTTC
    FROM F_DOCLIGNE
    WHERE DO_Domaine = 0 AND DO_Type = 3 AND DO_Piece IN (${list.map((_, i) => `@p${i}`).join(', ')})
    ORDER BY DO_Piece, DL_Ligne`);
  return r.recordset.map(l => ({
    piece: l.DO_Piece, ref: l.AR_Ref, designation: l.DL_Design, quantite: Number(l.DL_Qte),
    prixUnitaire: Number(l.DL_PrixUnitaire), montant: Number(l.DL_MontantTTC),
  }));
}

/**
 * Regroupe les BL en patients et BPC, avec l'état de chaque BPC à la date `now` :
 *  - in_progress : BPC encore ouvert (J1, J2 ou J3)
 *  - to_invoice  : BPC terminé, à facturer
 *  - late        : BPC terminé depuis plus de 30 jours
 */
export function groupIntoBpc(rows, now = new Date()) {
  const today = dayOf(now);
  const patients = new Map();
  for (const r of rows) {
    if (!patients.has(r.DO_Tiers)) {
      patients.set(r.DO_Tiers, {
        compteTiers: r.DO_Tiers, nom: r.CT_Intitule, compteCollectif: r.CG_NumPrinc,
        type: phpBeneficiaryType(r.CG_NumPrinc), matricule: r.matricule || null, nomAssure: r.nomAssure || null,
        secteur: r.secteur || null, plafond: Number(r.plafond) > 0 ? Number(r.plafond) : null,
        dateEntree: r.dateEntree && new Date(r.dateEntree).getUTCFullYear() > 1900 ? iso(dayOf(r.dateEntree)) : null,
        bl: [],
      });
    }
    patients.get(r.DO_Tiers).bl.push({ piece: r.DO_Piece, date: iso(dayOf(r.DO_Date)), service: (r.DO_Ref || '').trim() || null, montant: Number(r.DO_TotalTTC) || 0 });
  }

  const out = [];
  for (const p of patients.values()) {
    const bpcs = [];
    const entree = p.dateEntree ? dayOf(p.dateEntree) : null;
    const inCurrent = (t) => entree != null && t >= entree && t < entree + BPC_DAYS * DAY;
    // BPC en cours : à partir de la date d'entrée
    const current = p.bl.filter(b => inCurrent(dayOf(b.date)));
    if (current.length) bpcs.push({ start: entree, bl: current });
    // Autres BL : périodes de 3 jours à partir du premier BL de chaque période
    let open = null;
    for (const b of p.bl.filter(x => !inCurrent(dayOf(x.date))).sort((a, c) => a.date.localeCompare(c.date))) {
      const t = dayOf(b.date);
      if (!open || t >= open.start + BPC_DAYS * DAY) { open = { start: t, bl: [] }; bpcs.push(open); }
      open.bl.push(b);
    }
    for (const g of bpcs) {
      const end = g.start + (BPC_DAYS - 1) * DAY;
      const total = g.bl.reduce((s, b) => s + b.montant, 0);
      const daysSinceEnd = Math.round((today - end) / DAY);
      const status = today <= end ? 'in_progress' : daysSinceEnd > LATE_DAYS ? 'late' : 'to_invoice';
      out.push({
        id: `${p.compteTiers}:${iso(g.start)}`,
        patient: { compteTiers: p.compteTiers, nom: p.nom, type: p.type, compteCollectif: p.compteCollectif, matricule: p.matricule, nomAssure: p.nomAssure, secteur: p.secteur, plafond: p.plafond, dateEntree: p.dateEntree },
        start: iso(g.start), end: iso(end), status,
        jour: status === 'in_progress' ? Math.round((today - g.start) / DAY) + 1 : null,   // J1, J2, J3
        joursDepuisFin: status === 'in_progress' ? 0 : daysSinceEnd,
        services: [...new Set(g.bl.map(b => b.service).filter(Boolean))],
        bl: g.bl.sort((a, c) => a.date.localeCompare(c.date) || a.piece.localeCompare(c.piece)),
        total, depassePlafond: p.plafond != null && total > p.plafond,
      });
    }
  }
  return out;
}

/** Indicateurs du tableau de bord. */
export function summarize(bpcs) {
  const by = (status) => bpcs.filter(b => b.status === status);
  const sum = (list) => list.reduce((s, b) => s + b.total, 0);
  const count = (list) => list.reduce((s, b) => s + b.bl.length, 0);
  const buckets = [['0-3 j', 0, 3], ['4-30 j', 4, 30], ['1-6 mois', 31, 182], ['> 6 mois', 183, Infinity]].map(([label, min, max]) => {
    const list = bpcs.filter(b => { const age = b.joursDepuisFin + BPC_DAYS - 1; return age >= min && age <= max; });
    return { label, bpc: list.length, bl: count(list), montant: sum(list) };
  });
  return {
    patients: new Set(bpcs.map(b => b.patient.compteTiers)).size,
    bpc: bpcs.length, bl: count(bpcs), montant: sum(bpcs),
    enCours: { bpc: by('in_progress').length, montant: sum(by('in_progress')) },
    aFacturer: { bpc: by('to_invoice').length, montant: sum(by('to_invoice')) },
    enRetard: { bpc: by('late').length, montant: sum(by('late')) },
    parType: Object.values(PHP_COMPTES_COLLECTIFS).map(type => {
      const list = bpcs.filter(b => b.patient.type === type);
      return { type, bpc: list.length, bl: count(list), montant: sum(list) };
    }),
    anciennete: buckets,
  };
}

/** Contrôle de la règle des 3 jours sur les factures PHP récentes : BL regroupés sur plus de 3 jours. */
export async function fetchInvoiceSpanControl(pool, days = 30) {
  const request = pool.request();
  const inList = collectifParams(request);
  request.input('days', sql.Int, Math.min(365, Math.max(1, Number(days) || 30)));
  const r = await request.query(`
    SELECT L.DO_Piece, MIN(L.DO_Type) AS DO_Type, MIN(L.DO_Date) AS dateFacture, MIN(L.CT_Num) AS compteTiers,
           MIN(T.CT_Intitule) AS nom, MIN(T.CG_NumPrinc) AS compteCollectif,
           COUNT(DISTINCT L.DL_PieceBL) AS nbBl, MIN(L.DL_DateBL) AS premierBl, MAX(L.DL_DateBL) AS dernierBl,
           SUM(L.DL_MontantTTC) AS total
    FROM F_DOCLIGNE L JOIN F_COMPTET T ON T.CT_Num = L.CT_Num
    WHERE L.DO_Domaine = 0 AND L.DO_Type IN (6, 7) AND T.CG_NumPrinc IN (${inList})
      AND L.DO_Date >= DATEADD(day, -@days, CAST(GETDATE() AS date)) AND L.DL_DateBL > '1901-01-01'
    GROUP BY L.DO_Piece
    HAVING DATEDIFF(day, MIN(L.DL_DateBL), MAX(L.DL_DateBL)) >= ${BPC_DAYS}
    ORDER BY DATEDIFF(day, MIN(L.DL_DateBL), MAX(L.DL_DateBL)) DESC`);
  const stats = await pool.request().input('days2', sql.Int, Math.min(365, Math.max(1, Number(days) || 30))).query(`
    SELECT COUNT(DISTINCT L.DO_Piece) AS factures
    FROM F_DOCLIGNE L JOIN F_COMPTET T ON T.CT_Num = L.CT_Num
    WHERE L.DO_Domaine = 0 AND L.DO_Type IN (6, 7) AND T.CG_NumPrinc IN ('${COLLECTIFS.join("','")}')
      AND L.DO_Date >= DATEADD(day, -@days2, CAST(GETDATE() AS date))`);
  return {
    factures: Number(stats.recordset[0]?.factures || 0),
    horsDelai: r.recordset.map(x => ({
      piece: x.DO_Piece, comptabilisee: x.DO_Type === 7, date: iso(dayOf(x.dateFacture)),
      patient: { compteTiers: x.compteTiers, nom: x.nom, type: phpBeneficiaryType(x.compteCollectif) },
      nbBl: x.nbBl, premierBl: iso(dayOf(x.premierBl)), dernierBl: iso(dayOf(x.dernierBl)),
      ecartJours: Math.round((dayOf(x.dernierBl) - dayOf(x.premierBl)) / DAY), total: Number(x.total) || 0,
    })),
  };
}
