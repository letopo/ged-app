// backend/src/controllers/phpPharmacieController.js - Module PHP
// Registre de pharmacie (feuille PHARMACIE de l'Excel du Point Focal) :
// produits prescrits à chaque patient, par source (pharmacie HSJM, hôpital
// extérieur, médecin du travail), quantité prescrite et servie ; reste à
// servir, consommation par produit.
import { QueryTypes } from 'sequelize';
import { sequelize, PatientPHP, ConsultationPHP, PharmacieLignePHP } from '../models/index.js';
import { PHARMACIE_SOURCES } from '../models/PharmacieLignePHP.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QTE = 9999;

const handle = (fn) => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    console.error('Pharmacie PHP :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

const today = () => new Date().toISOString().slice(0, 10);
const period = (req) => {
  const au = DAY.test(String(req.query.au || '')) ? req.query.au : today();
  const du = DAY.test(String(req.query.du || '')) ? req.query.du : `${au.slice(0, 7)}-01`;
  return du <= au ? { du, au } : { du: au, au: du };
};

export const normProduit = (s) => String(s || '').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, 255);
const qte = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= MAX_QTE ? n : null;
};

const LIGNE_SELECT = `
  SELECT l.id, l.date_prescription AS "datePrescription", l.source, l.produit,
         l.quantite_prescrite AS "quantitePrescrite", l.quantite_servie AS "quantiteServie",
         GREATEST(l.quantite_prescrite - l.quantite_servie, 0) AS reste,
         l.servi_le AS "serviLe", l.consultation_id AS "consultationId",
         c.service_name AS "consultationService",
         p.id AS "patientId", p.matricule, p.nom, p.prenom,
         COALESCE(sc.nom, sp.nom) AS secteur
  FROM php_pharmacie_lignes l
  JOIN php_patients p ON p.id = l.patient_id
  LEFT JOIN php_consultations c ON c.id = l.consultation_id
  LEFT JOIN php_secteurs sc ON sc.id = c.secteur_id
  LEFT JOIN php_secteurs sp ON sp.id = p.secteur_id
`;

// GET /api/php/pharmacie?du=&au=&source=&reste=1&q=
export const listLignes = handle(async (req, res) => {
  const { du, au } = period(req);
  const where = ['l.tenant_id = :tenantId', 'l.date_prescription BETWEEN :du AND :au'];
  const rep = { tenantId: req.tenantId, du, au };
  if (PHARMACIE_SOURCES.includes(req.query.source)) { where.push('l.source = :source'); rep.source = req.query.source; }
  if (req.query.reste === '1') where.push('l.quantite_servie < l.quantite_prescrite');
  const q = String(req.query.q || '').trim();
  if (q) {
    where.push(`(p.matricule ILIKE :q ESCAPE '\\' OR (p.nom || ' ' || COALESCE(p.prenom, '')) ILIKE :q ESCAPE '\\' OR l.produit ILIKE :q ESCAPE '\\')`);
    rep.q = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
  }
  const rows = await sequelize.query(`
    ${LIGNE_SELECT}
    WHERE ${where.join(' AND ')}
    ORDER BY l.date_prescription DESC, p.nom, p.prenom, p.id, l.created_at, l.produit
    LIMIT 3000
  `, { replacements: rep, type: QueryTypes.SELECT });
  // Dernier jour saisi : l'écran s'y place quand la période par défaut est vide
  const [{ last }] = await sequelize.query('SELECT max(date_prescription) AS last FROM php_pharmacie_lignes WHERE tenant_id = :tenantId',
    { replacements: { tenantId: req.tenantId }, type: QueryTypes.SELECT });
  res.json({ success: true, data: { du, au, rows, last, limited: rows.length === 3000 } });
});

// GET /api/php/pharmacie/stats?du=&au= — consommation par produit et totaux par source
export const getStats = handle(async (req, res) => {
  const { du, au } = period(req);
  const rep = { tenantId: req.tenantId, du, au };
  const base = 'FROM php_pharmacie_lignes l WHERE l.tenant_id = :tenantId AND l.date_prescription BETWEEN :du AND :au';
  const sums = `
    count(DISTINCT l.patient_id)::int AS patients,
    COALESCE(sum(l.quantite_prescrite), 0)::int AS prescrit,
    COALESCE(sum(l.quantite_servie), 0)::int AS servi,
    COALESCE(sum(GREATEST(l.quantite_prescrite - l.quantite_servie, 0)), 0)::int AS reste`;
  const produits = await sequelize.query(`
    SELECT l.produit, ${sums},
      ${PHARMACIE_SOURCES.map(s => `COALESCE(sum(l.quantite_prescrite) FILTER (WHERE l.source = '${s}'), 0)::int AS "${s}"`).join(',\n      ')}
    ${base}
    GROUP BY l.produit
    ORDER BY prescrit DESC, l.produit
  `, { replacements: rep, type: QueryTypes.SELECT });
  const sources = await sequelize.query(`
    SELECT l.source, count(*)::int AS lignes, ${sums} ${base} GROUP BY l.source
  `, { replacements: rep, type: QueryTypes.SELECT });
  const [total] = await sequelize.query(`
    SELECT count(*)::int AS lignes, count(DISTINCT (l.patient_id, l.date_prescription))::int AS ordonnances, ${sums} ${base}
  `, { replacements: rep, type: QueryTypes.SELECT });
  res.json({ success: true, data: { du, au, produits, sources, total } });
});

// GET /api/php/pharmacie/produits?q= — noms déjà saisis (saisie assistée)
export const listProduits = handle(async (req, res) => {
  const q = normProduit(req.query.q);
  const rows = await sequelize.query(`
    SELECT produit, count(*)::int AS n FROM php_pharmacie_lignes
    WHERE tenant_id = :tenantId ${q ? `AND produit LIKE :q ESCAPE '\\'` : ''}
    GROUP BY produit ORDER BY n DESC, produit LIMIT 30
  `, { replacements: { tenantId: req.tenantId, q: `%${q.replace(/[\\%_]/g, '\\$&')}%` }, type: QueryTypes.SELECT });
  res.json({ success: true, data: rows.map(r => r.produit) });
});

// GET /api/php/pharmacie/consultations?patientId=&date= — consultations du patient ce jour-là
export const listConsultationsDuJour = handle(async (req, res) => {
  const { patientId, date } = req.query;
  if (!UUID.test(String(patientId || '')) || !DAY.test(String(date || ''))) return res.json({ success: true, data: [] });
  const patient = await PatientPHP.findByPk(patientId, { attributes: ['id'] });
  if (!patient) return res.json({ success: true, data: [] });
  const rows = await ConsultationPHP.findAll({
    where: { patientId, dateConsultation: date },
    attributes: ['id', 'serviceName', 'typeVisite', 'numeroOrdre', 'diagnostic'],
    order: [['numeroOrdre', 'ASC NULLS LAST'], ['createdAt', 'ASC']],
  });
  res.json({ success: true, data: rows });
});

// Patient et consultation de l'établissement (la consultation doit être celle du patient)
async function checkPatient(patientId, consultationId) {
  if (!UUID.test(String(patientId || ''))) return { error: 'Patient manquant.' };
  const patient = await PatientPHP.findByPk(patientId, { attributes: ['id'] });
  if (!patient) return { error: 'Patient introuvable.' };
  if (consultationId) {
    if (!UUID.test(String(consultationId))) return { error: 'Consultation invalide.' };
    const c = await ConsultationPHP.findOne({ where: { id: consultationId, patientId }, attributes: ['id'] });
    if (!c) return { error: 'Cette consultation n\'est pas celle du patient.' };
  }
  return { patient };
}

function cleanLigne(it, i) {
  const produit = normProduit(it?.produit);
  const source = it?.source || 'hsjm';
  const prescrite = qte(it?.quantitePrescrite ?? 1);
  const servie = qte(it?.quantiteServie ?? 0);
  const n = `Ligne ${i + 1}`;
  if (!produit) return { error: `${n} : produit manquant.` };
  if (!PHARMACIE_SOURCES.includes(source)) return { error: `${n} : source inconnue.` };
  if (!prescrite) return { error: `${n} : quantité prescrite invalide.` };
  if (servie === null || servie > prescrite) return { error: `${n} : la quantité servie doit être entre 0 et ${prescrite}.` };
  return { ligne: { produit, source, quantitePrescrite: prescrite, quantiteServie: servie } };
}

// POST /api/php/pharmacie { patientId, consultationId?, datePrescription, lignes: [...] }
export const createLignes = handle(async (req, res) => {
  const { patientId, consultationId, datePrescription } = req.body || {};
  const input = Array.isArray(req.body?.lignes) ? req.body.lignes : [];
  if (!input.length || input.length > 30) return res.status(400).json({ success: false, message: 'Une ordonnance compte de 1 à 30 produits.' });
  if (!DAY.test(String(datePrescription || '')) || datePrescription > today()) return res.status(400).json({ success: false, message: 'Date invalide (pas dans le futur).' });
  const check = await checkPatient(patientId, consultationId);
  if (check.error) return res.status(400).json({ success: false, message: check.error });
  const lignes = [];
  for (const [i, it] of input.entries()) {
    const r = cleanLigne(it, i);
    if (r.error) return res.status(400).json({ success: false, message: r.error });
    lignes.push(r.ligne);
  }
  const now = new Date();
  const created = await sequelize.transaction(async (transaction) => {
    const out = [];
    for (const l of lignes) {
      out.push(await PharmacieLignePHP.create({
        ...l, patientId, consultationId: consultationId || null, datePrescription,
        createdByUserId: req.user.id,
        ...(l.quantiteServie ? { serviLe: now, serviParId: req.user.id } : {}),
      }, { transaction }));
    }
    return out;
  });
  res.status(201).json({ success: true, data: created, message: `${created.length} produit(s) enregistré(s).` });
});

// PUT /api/php/pharmacie/:id { produit?, source?, quantitePrescrite?, quantiteServie? }
export const updateLigne = handle(async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).json({ success: false, message: 'Ligne introuvable.' });
  const ligne = await PharmacieLignePHP.findByPk(req.params.id);
  if (!ligne) return res.status(404).json({ success: false, message: 'Ligne introuvable.' });
  const r = cleanLigne({
    produit: req.body?.produit ?? ligne.produit,
    source: req.body?.source ?? ligne.source,
    quantitePrescrite: req.body?.quantitePrescrite ?? ligne.quantitePrescrite,
    quantiteServie: req.body?.quantiteServie ?? ligne.quantiteServie,
  }, 0);
  if (r.error) return res.status(400).json({ success: false, message: r.error.replace(/^Ligne 1 : /, '') });
  const served = r.ligne.quantiteServie !== ligne.quantiteServie;
  await ligne.update({ ...r.ligne, ...(served ? { serviLe: new Date(), serviParId: req.user.id } : {}) });
  res.json({ success: true, data: ligne });
});

// DELETE /api/php/pharmacie/:id
export const deleteLigne = handle(async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).json({ success: false, message: 'Ligne introuvable.' });
  const n = await PharmacieLignePHP.destroy({ where: { id: req.params.id } });
  if (!n) return res.status(404).json({ success: false, message: 'Ligne introuvable.' });
  res.json({ success: true });
});
