// backend/scripts/etude-sage-bl.mjs
// Étude des Bons de Livraison (BL) Sage des patients PHP — LECTURE SEULE.
// Uniquement des SELECT ; ne remonte que des comptages, la structure des
// tables et un exemple de ligne (sans nom de patient).
// Utilise la connexion Sage enregistrée dans Paramètres › Intégrations.
//   docker exec ged-backend node scripts/etude-sage-bl.mjs
import sql from 'mssql';
import { TenantIntegration } from '../src/models/index.js';
import { decryptSecret } from '../src/utils/secretBox.js';
import { SAGE_DEFAULTS, sageConnectionConfig } from '../src/utils/integrations.js';

const COLLECTIFS = "('4127000', '4122000')";
const row = await TenantIntegration.findOne({ where: { kind: 'sage' } });
if (!row) { console.log('Aucune connexion Sage enregistrée (Paramètres › Intégrations).'); process.exit(1); }
const config = { ...SAGE_DEFAULTS, ...row.config };
const pool = await sql.connect(sageConnectionConfig(config, decryptSecret(row.secretEncrypted)));
const q = async (title, query) => {
  try {
    const r = await pool.request().query(query);
    console.log(`\n── ${title}`);
    console.table(r.recordset);
  } catch (e) { console.log(`\n── ${title} : ERREUR ${e.message}`); }
};

// 1. Types de documents de vente des patients PHP (6 derniers mois)
await q('Documents de vente PHP par type (6 derniers mois) — 1 Devis? 2 BC 3 BL 6 Facture 7 Facture comptabilisée', `
  SELECT E.DO_Type, COUNT(*) AS documents, MIN(E.DO_Date) AS du, MAX(E.DO_Date) AS au
  FROM F_DOCENTETE E JOIN F_COMPTET C ON C.CT_Num = E.DO_Tiers
  WHERE E.DO_Domaine = 0 AND C.CG_NumPrinc IN ${COLLECTIFS} AND E.DO_Date >= DATEADD(month, -6, GETDATE())
  GROUP BY E.DO_Type ORDER BY E.DO_Type`);

// 2. BL non facturés : volume, ancienneté, patients, montants
await q('BL PHP non facturés (DO_Type 3) — volume et ancienneté', `
  SELECT C.CG_NumPrinc AS collectif, COUNT(*) AS bl, COUNT(DISTINCT E.DO_Tiers) AS patients,
         SUM(E.DO_TotalTTC) AS total_ttc, MIN(E.DO_Date) AS plus_ancien, MAX(E.DO_Date) AS plus_recent,
         SUM(CASE WHEN E.DO_Date < DATEADD(day, -3, CAST(GETDATE() AS date)) THEN 1 ELSE 0 END) AS plus_de_3_jours
  FROM F_DOCENTETE E JOIN F_COMPTET C ON C.CT_Num = E.DO_Tiers
  WHERE E.DO_Domaine = 0 AND E.DO_Type = 3 AND C.CG_NumPrinc IN ${COLLECTIFS}
  GROUP BY C.CG_NumPrinc`);

// 3. Nombre de BL par patient (distribution)
await q('BL non facturés par patient (distribution)', `
  SELECT nb_bl, COUNT(*) AS patients FROM (
    SELECT E.DO_Tiers, COUNT(*) AS nb_bl
    FROM F_DOCENTETE E JOIN F_COMPTET C ON C.CT_Num = E.DO_Tiers
    WHERE E.DO_Domaine = 0 AND E.DO_Type = 3 AND C.CG_NumPrinc IN ${COLLECTIFS}
    GROUP BY E.DO_Tiers) x
  GROUP BY nb_bl ORDER BY nb_bl`);

// 4. Lien BL → facture : les lignes de facture gardent-elles la référence du BL ?
await q('Lignes de factures PHP récentes : référence du BL d’origine (DL_PieceBL)', `
  SELECT TOP 1 COUNT(*) AS lignes,
         SUM(CASE WHEN ISNULL(L.DL_PieceBL, '') <> '' THEN 1 ELSE 0 END) AS avec_piece_bl,
         COUNT(DISTINCT L.DL_PieceBL) AS bl_distincts, COUNT(DISTINCT L.DO_Piece) AS factures
  FROM F_DOCLIGNE L JOIN F_COMPTET C ON C.CT_Num = L.CT_Num
  WHERE L.DO_Domaine = 0 AND L.DO_Type IN (6, 7) AND C.CG_NumPrinc IN ${COLLECTIFS}
    AND L.DO_Date >= DATEADD(day, -30, GETDATE())`);

// 5. Nombre de BL par facture (combien de passages sont regroupés)
await q('BL regroupés par facture PHP (30 derniers jours)', `
  SELECT nb_bl, COUNT(*) AS factures FROM (
    SELECT L.DO_Piece, COUNT(DISTINCT L.DL_PieceBL) AS nb_bl
    FROM F_DOCLIGNE L JOIN F_COMPTET C ON C.CT_Num = L.CT_Num
    WHERE L.DO_Domaine = 0 AND L.DO_Type IN (6, 7) AND C.CG_NumPrinc IN ${COLLECTIFS}
      AND L.DO_Date >= DATEADD(day, -30, GETDATE())
    GROUP BY L.DO_Piece) x
  GROUP BY nb_bl ORDER BY nb_bl`);

// 6. Structure : colonnes disponibles (noms seulement)
for (const table of ['F_DOCENTETE', 'F_DOCLIGNE']) {
  const r = await pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' ORDER BY ORDINAL_POSITION`);
  console.log(`\n── Colonnes de ${table} (${r.recordset.length}) :\n${r.recordset.map(c => c.COLUMN_NAME).join(', ')}`);
}

// 7. Exemple anonyme d'un BL non facturé (lignes : acte, quantité, prix — sans nom)
await q('Exemple de BL non facturé (lignes, sans nom de patient)', `
  SELECT TOP 8 L.DO_Piece, L.DO_Date, L.AR_Ref, L.DL_Design, L.DL_Qte, L.DL_PrixUnitaire, L.DL_MontantTTC, L.DL_PieceBL, L.DL_DateBL
  FROM F_DOCLIGNE L
  WHERE L.DO_Domaine = 0 AND L.DO_Type = 3 AND L.DO_Piece = (
    SELECT TOP 1 E.DO_Piece FROM F_DOCENTETE E JOIN F_COMPTET C ON C.CT_Num = E.DO_Tiers
    WHERE E.DO_Domaine = 0 AND E.DO_Type = 3 AND C.CG_NumPrinc IN ${COLLECTIFS} ORDER BY E.DO_Date DESC)`);

await pool.close();
process.exit(0);
