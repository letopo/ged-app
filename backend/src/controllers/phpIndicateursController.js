// backend/src/controllers/phpIndicateursController.js - Module PHP
// Tableaux croisés de l'Excel du Point Focal (HSJM_Gestion_v3.xlsm) :
//  - tableau du jour (Feuil8 / Feuil10) : infirmerie × type de visite × service ;
//  - indicateurs (Feuil1) : visites par spécialité, par secteur (« évacuations »),
//    indicateurs par mots-clés du diagnostic (paludisme, IST…) par secteur,
//    repos par spécialité.
// L'infirmerie et le secteur sont ceux de la consultation (lieu de la visite),
// comme sur la ligne de l'Excel, et non ceux de la fiche actuelle du patient.
import { QueryTypes } from 'sequelize';
import { sequelize, Infirmerie, PhpIndicateur } from '../models/index.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = ['CS', 'RDV', 'AUTRE'];

const handle = (fn) => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    console.error('Indicateurs PHP :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// Diagnostic comparé sans accents ni casse (les mots-clés aussi)
const NORM_SQL = (expr) => `translate(upper(coalesce(${expr}, '')), 'ÀÂÄÁÉÈÊËÎÏÍÔÖÓÙÛÜÚÇ', 'AAAAEEEEIIIOOOUUUUC')`;
export const normKeyword = (k) => String(k || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Expression régulière PostgreSQL : un mot du diagnostic commence par l'un des mots-clés. */
export const keywordsPattern = (keywords) => {
  const list = [...new Set((keywords || []).map(normKeyword).filter(Boolean))];
  return list.length ? `\\m(${list.map(escapeRegex).join('|')})` : null;
};

// Consultations et repos n'ont pas de colonne d'établissement : celui du patient fait foi
const OWN_PATIENT = `JOIN php_patients p ON p.id = c.patient_id AND p.tenant_id = :tenantId`;

const typeExpr = `COALESCE(c.type_visite, 'NP')`;
const serviceExpr = `COALESCE(NULLIF(TRIM(c.service_name), ''), 'NON PRÉCISÉ')`;

// GET /api/php/stats/tableau-jour?date=AAAA-MM-JJ
export const getTableauDuJour = handle(async (req, res) => {
  const date = DAY.test(String(req.query.date || '')) ? req.query.date : new Date().toISOString().slice(0, 10);
  const rows = await sequelize.query(`
    SELECT c.infirmerie_id AS "infirmerieId", ${typeExpr} AS type, ${serviceExpr} AS service, count(*)::int AS n
    FROM php_consultations c ${OWN_PATIENT}
    WHERE c.date_consultation = :date
    GROUP BY 1, 2, 3
  `, { replacements: { date, tenantId: req.tenantId }, type: QueryTypes.SELECT });
  const infirmeries = await Infirmerie.findAll({ where: { isActive: true }, attributes: ['id', 'code', 'nom'], order: [['code', 'ASC']] });

  // Jours voisins ayant des consultations (navigation ← →)
  const [around] = await sequelize.query(`
    SELECT max(c.date_consultation) FILTER (WHERE c.date_consultation < :date) AS prev,
           min(c.date_consultation) FILTER (WHERE c.date_consultation > :date) AS next,
           max(c.date_consultation) AS last
    FROM php_consultations c ${OWN_PATIENT}
  `, { replacements: { date, tenantId: req.tenantId }, type: QueryTypes.SELECT });

  res.json({
    success: true,
    data: {
      date, rows,
      infirmeries: infirmeries.map((i) => ({ id: i.id, code: i.code, nom: i.nom })),
      types: TYPES,
      navigation: around,
    },
  });
});

const period = (req) => {
  const today = new Date().toISOString().slice(0, 10);
  const au = DAY.test(String(req.query.au || '')) ? req.query.au : today;
  const du = DAY.test(String(req.query.du || '')) ? req.query.du : `${au.slice(0, 4)}-01-01`;
  return du <= au ? { du, au } : { du: au, au: du };
};

const secteurPivot = (where, replacements) => sequelize.query(`
  SELECT COALESCE(s.nom, 'SECTEUR NON PRÉCISÉ') AS libelle, ${typeExpr} AS type, count(*)::int AS n
  FROM php_consultations c ${OWN_PATIENT}
  LEFT JOIN php_secteurs s ON s.id = c.secteur_id
  WHERE c.date_consultation BETWEEN :du AND :au ${where}
  GROUP BY 1, 2
`, { replacements, type: QueryTypes.SELECT });

// GET /api/php/stats/indicateurs?du=&au=
export const getIndicateurs = handle(async (req, res) => {
  const { du, au } = period(req);
  const rep = { du, au, tenantId: req.tenantId };

  const parService = await sequelize.query(`
    SELECT ${serviceExpr} AS libelle, ${typeExpr} AS type, count(*)::int AS n
    FROM php_consultations c ${OWN_PATIENT}
    WHERE c.date_consultation BETWEEN :du AND :au
    GROUP BY 1, 2
  `, { replacements: rep, type: QueryTypes.SELECT });

  const parSecteur = await secteurPivot('', rep);

  const indicateurs = [];
  for (const ind of await PhpIndicateur.findAll({ order: [['ordre', 'ASC'], ['libelle', 'ASC']] })) {
    const pattern = keywordsPattern(ind.motsCles);
    const rows = pattern ? await secteurPivot(`AND ${NORM_SQL('c.diagnostic')} ~ :pattern`, { ...rep, pattern }) : [];
    indicateurs.push({ id: ind.id, libelle: ind.libelle, motsCles: ind.motsCles, rows });
  }

  // Repos : par spécialité de la consultation qui les a prescrits
  const repos = await sequelize.query(`
    SELECT COALESCE(NULLIF(TRIM(c.service_name), ''), 'NON PRÉCISÉ') AS libelle,
           count(*)::int AS n, COALESCE(sum(r.duree_jours), 0)::int AS jours
    FROM php_repos r
    JOIN php_patients p ON p.id = r.patient_id AND p.tenant_id = :tenantId
    LEFT JOIN php_consultations c ON c.id = r.consultation_id
    WHERE r.date_debut BETWEEN :du AND :au
    GROUP BY 1
    ORDER BY 2 DESC, 1
  `, { replacements: rep, type: QueryTypes.SELECT });

  res.json({ success: true, data: { du, au, types: TYPES, parService, parSecteur, indicateurs, repos } });
});

// GET /api/php/indicateurs — liste des indicateurs par mots-clés
export const listIndicateurs = handle(async (req, res) => {
  const rows = await PhpIndicateur.findAll({ order: [['ordre', 'ASC'], ['libelle', 'ASC']] });
  res.json({ success: true, data: rows.map((r) => ({ id: r.id, libelle: r.libelle, motsCles: r.motsCles, ordre: r.ordre })) });
});

// PUT /api/php/indicateurs { indicateurs: [{ libelle, motsCles: [] }] } — remplace la liste
export const saveIndicateurs = handle(async (req, res) => {
  const input = Array.isArray(req.body?.indicateurs) ? req.body.indicateurs : null;
  if (!input || input.length > 30) return res.status(400).json({ success: false, message: 'Liste d\'indicateurs invalide (30 au plus).' });
  const clean = [];
  for (const [i, it] of input.entries()) {
    const libelle = String(it?.libelle || '').trim().slice(0, 100);
    const motsCles = [...new Set((Array.isArray(it?.motsCles) ? it.motsCles : []).map(normKeyword).filter((k) => k.length >= 2))].slice(0, 40);
    if (!libelle) return res.status(400).json({ success: false, message: `Indicateur n° ${i + 1} : nom manquant.` });
    if (!motsCles.length) return res.status(400).json({ success: false, message: `« ${libelle} » : au moins un mot-clé (2 lettres ou plus).` });
    clean.push({ libelle, motsCles, ordre: i + 1 });
  }
  await sequelize.transaction(async (transaction) => {
    await PhpIndicateur.destroy({ where: {}, transaction });
    for (const row of clean) await PhpIndicateur.create(row, { transaction });
  });
  res.json({ success: true, data: clean, message: 'Indicateurs enregistrés.' });
});
