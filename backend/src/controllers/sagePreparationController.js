// backend/src/controllers/sagePreparationController.js
// Facturation assistée d'un BPC (10/11/2026), en attendant le module Objets
// Métiers de Sage. La GED n'écrit JAMAIS dans Sage :
//  1. Préparer : on coche les BL du BPC → la GED garde la liste exacte
//  2. La facturation transforme ces BL en UNE facture dans Sage (comme avant)
//  3. Vérifier : la GED retrouve la facture (lecture seule) et contrôle qu'elle
//     reprend tous les BL préparés, pas plus, en une seule facture
//  4. Envoyer en signature : liasse PDF + circuit « Circuit Facture PHP »
// Accès : celui du tableau « BL PHP en attente » (Finances, facturation, DG, CCG).
import { Op } from 'sequelize';
import { SagePreparationFacture, SageFactureImport, TenantIntegration, WorkflowTemplate, AuditLog } from '../models/index.js';
import { canAccessSageBl, clearBlCache } from './sageBlController.js';
import { decryptSecret } from '../utils/secretBox.js';
import { SAGE_DEFAULTS, phpBeneficiaryType } from '../utils/integrations.js';
import { openSagePool, importSageFacture } from '../utils/sageFactureSync.js';
import { fetchFacturedBlForBpc } from '../utils/sageBl.js';
import { fetchPendingBlForTiers, evaluatePreparation } from '../utils/sagePreparation.js';

const OPEN = ['a_transformer', 'incomplete'];
const isoDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !Number.isNaN(Date.parse(v));
const userName = (u) => `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.email || '';

const guard = (fn) => async (req, res) => {
  try {
    if (!(await canAccessSageBl(req.user, req.tenantId))) {
      return res.status(403).json({ success: false, message: 'Accès réservé (facturation PHP) : demandez au superadmin.' });
    }
    await fn(req, res);
  } catch (err) {
    console.error('Facturation assistée :', err);
    res.status(err.status || 502).json({ success: false, message: err.message || 'Sage injoignable.' });
  }
};

async function withSage(tenantId, fn) {
  const row = await TenantIntegration.findOne({ where: { tenantId, kind: 'sage' } });
  if (!row) { const e = new Error('Connexion Sage non réglée (Paramètres › Intégrations).'); e.status = 400; throw e; }
  const config = { ...SAGE_DEFAULTS, ...row.config };
  const pool = await openSagePool(config, decryptSecret(row.secretEncrypted));
  try { return await fn(pool, config); } finally { await pool.close().catch(() => {}); }
}

const serialize = (p, ged = {}) => ({
  id: p.id, compteTiers: p.compteTiers, patientNom: p.patientNom, patientType: p.patientType,
  start: p.bpcStart, end: p.bpcEnd, bl: p.bl, montant: Number(p.montant) || 0, status: p.status,
  factures: (p.factures || []).map((f) => ({ ...f, ged: ged[f.piece] || null })),
  manquants: p.manquants || [], oublies: p.oublies || [], note: p.note,
  checkedAt: p.checkedAt, invoicedAt: p.invoicedAt, preparedByName: p.preparedByName, createdAt: p.createdAt,
});

// Factures déjà dans la GED (importées par la synchro ou envoyées d'ici)
async function gedOf(tenantId, pieces) {
  if (!pieces.length) return {};
  const rows = await SageFactureImport.findAll({ where: { tenantId, sageDocPiece: pieces }, attributes: ['sageDocPiece', 'documentId', 'importedAt'] });
  return Object.fromEntries(rows.map((r) => [r.sageDocPiece, { documentId: r.documentId, importedAt: r.importedAt }]));
}

/** Rapproche une préparation de Sage et l'enregistre. */
async function check(pool, prep) {
  const pieces = prep.bl.map((b) => b.piece);
  const [factured, pending] = await Promise.all([
    fetchFacturedBlForBpc(pool, prep.compteTiers, prep.bpcStart, prep.bpcEnd),
    fetchPendingBlForTiers(pool, prep.compteTiers, prep.bpcStart, prep.bpcEnd),
  ]);
  const r = evaluatePreparation(pieces, factured, pending);
  await prep.update({
    status: r.status, factures: r.factures, manquants: r.manquants, oublies: r.oublies, checkedAt: new Date(),
    invoicedAt: r.status === 'facturee' ? (prep.invoicedAt || new Date()) : prep.invoicedAt,
  });
  return prep;
}

// GET /api/sage-bl/preparations?status=ouvertes|facturee|annulee|toutes
export const listPreparations = guard(async (req, res) => {
  const f = String(req.query.status || 'toutes');
  const where = { tenantId: req.tenantId };
  if (f === 'ouvertes') where.status = { [Op.in]: OPEN };
  else if (['facturee', 'annulee', 'a_transformer', 'incomplete'].includes(f)) where.status = f;
  const rows = await SagePreparationFacture.findAll({ where, order: [['createdAt', 'DESC']], limit: 300 });
  const ged = await gedOf(req.tenantId, [...new Set(rows.flatMap((p) => (p.factures || []).map((x) => x.piece)))]);
  const counts = {};
  for (const r of await SagePreparationFacture.findAll({ where: { tenantId: req.tenantId }, attributes: ['status'] })) counts[r.status] = (counts[r.status] || 0) + 1;
  res.json({ success: true, preparations: rows.map((p) => serialize(p, ged)), counts });
});

// POST /api/sage-bl/preparations { tiers, start, end, pieces: [...], note }
export const createPreparation = guard(async (req, res) => {
  const tiers = String(req.body?.tiers || '').trim();
  const { start, end } = req.body || {};
  const pieces = [...new Set((Array.isArray(req.body?.pieces) ? req.body.pieces : []).map((p) => String(p).trim()).filter(Boolean))];
  if (!/^[A-Z0-9]{1,17}$/i.test(tiers) || !isoDate(start) || !isoDate(end) || !pieces.length) {
    return res.status(400).json({ success: false, message: 'Cochez au moins un BL du BPC.' });
  }
  const existing = await SagePreparationFacture.findOne({ where: { tenantId: req.tenantId, compteTiers: tiers, bpcStart: start, status: { [Op.in]: OPEN } } });
  if (existing) return res.status(409).json({ success: false, message: 'Ce BPC est déjà préparé : voyez l’onglet « Facturation assistée ».', preparation: serialize(existing) });

  const result = await withSage(req.tenantId, async (pool) => {
    // Les BL doivent être des BL de ce patient, encore non facturés dans Sage
    const pending = await fetchPendingBlForTiers(pool, tiers, start, end);
    const byPiece = new Map(pending.map((b) => [b.piece, b]));
    const unknown = pieces.filter((p) => !byPiece.has(p));
    if (unknown.length) {
      const e = new Error(`Ces BL ne sont plus en attente dans Sage (déjà facturés ?) : ${unknown.join(', ')}. Actualisez la page.`);
      e.status = 409; throw e;
    }
    const bl = pieces.map((p) => byPiece.get(p)).sort((a, b) => a.date.localeCompare(b.date) || a.piece.localeCompare(b.piece));
    const prep = await SagePreparationFacture.create({
      compteTiers: tiers, patientNom: String(req.body?.patientNom || '').slice(0, 255) || null,
      patientType: phpBeneficiaryType(req.body?.compteCollectif) || String(req.body?.patientType || '').slice(0, 40) || null,
      bpcStart: start, bpcEnd: end, bl, montant: bl.reduce((s, b) => s + b.montant, 0),
      note: String(req.body?.note || '').trim().slice(0, 500) || null,
      preparedBy: req.user.id, preparedByName: userName(req.user), tenantId: req.tenantId,
    });
    return check(pool, prep);
  });
  clearBlCache(req.tenantId);
  await AuditLog.log(req, 'SAGE_PREPARATION', 'sage', result.id, { tiers, start, bl: pieces.length });
  res.status(201).json({ success: true, preparation: serialize(result) });
});

// POST /api/sage-bl/preparations/verifier { ids? } — rapproche les préparations ouvertes de Sage
export const checkPreparations = guard(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 200) : null;
  const where = { tenantId: req.tenantId, ...(ids ? { id: ids } : { status: { [Op.in]: OPEN } }) };
  const rows = await SagePreparationFacture.findAll({ where, limit: 200 });
  if (!rows.length) return res.json({ success: true, checked: 0, facturees: 0 });
  let facturees = 0;
  await withSage(req.tenantId, async (pool) => {
    for (const p of rows) {
      if (p.status === 'annulee') continue;
      await check(pool, p);
      if (p.status === 'facturee') facturees++;
    }
  });
  res.json({ success: true, checked: rows.length, facturees });
});

// POST /api/sage-bl/preparations/:id/signature — liasse + circuit de chaque facture trouvée
export const sendToSignature = guard(async (req, res) => {
  const prep = await SagePreparationFacture.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!prep) return res.status(404).json({ success: false, message: 'Préparation introuvable.' });
  const out = await withSage(req.tenantId, async (pool, config) => {
    await check(pool, prep);
    if (prep.status === 'a_transformer') { const e = new Error('Aucune facture trouvée dans Sage pour ces BL : transformez-les d’abord.'); e.status = 409; throw e; }
    if (prep.status === 'incomplete' && !req.body?.force) {
      const e = new Error(prep.manquants.length
        ? `Facture incomplète : ${prep.manquants.length} BL préparé(s) ne sont pas facturés (${prep.manquants.join(', ')}).`
        : 'Les BL sont répartis sur plusieurs factures.');
      e.status = 409; e.incomplete = true; throw e;
    }
    const template = await WorkflowTemplate.findOne({ where: { name: config.workflowTemplateName, tenantId: req.tenantId } });
    if (!template) { const e = new Error(`Modèle de circuit « ${config.workflowTemplateName} » introuvable : créez-le dans Modèles de workflow.`); e.status = 400; throw e; }
    const sent = [];
    for (const f of prep.factures) {
      const already = await SageFactureImport.findOne({ where: { tenantId: req.tenantId, sageDocPiece: f.piece } });
      if (already) { sent.push({ piece: f.piece, documentId: already.documentId, deja: true }); continue; }
      const doc = await importSageFacture(pool, config, { tenantId: req.tenantId, docPiece: f.piece, template, uploaderId: req.user.id });
      if (doc) sent.push({ piece: f.piece, documentId: doc.id, deja: false });
    }
    return sent;
  });
  await AuditLog.log(req, 'SAGE_PREPARATION_SIGNATURE', 'sage', prep.id, { factures: out.map((x) => x.piece) });
  const nouvelles = out.filter((x) => !x.deja).length;
  res.json({
    success: true, sent: out,
    message: nouvelles
      ? `${nouvelles} facture(s) envoyée(s) dans le circuit de signature.`
      : 'Cette facture est déjà dans le circuit de signature.',
  });
});

// POST /api/sage-bl/preparations/:id/annuler { note }
export const cancelPreparation = guard(async (req, res) => {
  const prep = await SagePreparationFacture.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!prep) return res.status(404).json({ success: false, message: 'Préparation introuvable.' });
  if (prep.status === 'facturee') return res.status(409).json({ success: false, message: 'Déjà facturée : rien à annuler.' });
  await prep.update({ status: 'annulee', note: String(req.body?.note || prep.note || '').slice(0, 500) || null });
  clearBlCache(req.tenantId);
  await AuditLog.log(req, 'SAGE_PREPARATION_ANNULEE', 'sage', prep.id, {});
  res.json({ success: true, preparation: serialize(prep) });
});

/** Préparations ouvertes, par BPC (« compteTiers:début »), pour le tableau des BPC. */
export async function openPreparationsByBpc(tenantId) {
  const rows = await SagePreparationFacture.findAll({
    where: { tenantId, status: { [Op.in]: OPEN } },
    attributes: ['id', 'compteTiers', 'bpcStart', 'status', 'preparedByName', 'createdAt', 'bl'],
  });
  return new Map(rows.map((p) => [`${p.compteTiers}:${p.bpcStart}`, {
    id: p.id, status: p.status, preparedByName: p.preparedByName, createdAt: p.createdAt, bl: (p.bl || []).map((b) => b.piece),
  }]));
}
