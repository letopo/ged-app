// backend/src/controllers/sageBlController.js
// « BL PHP en attente de facturation » : lecture directe de Sage (rien n'est importé).
// Accès : superadmin + titulaires des postes autorisés (liste réglable par le
// superadmin, défaut : Service Facturation, DG, CCG).
import fs from 'fs/promises';
import path from 'path';
import { TenantIntegration, TenantSettings, Poste, AuditLog, SageFactureImport, Document, Workflow, User, WorkflowTemplate } from '../models/index.js';
import { decryptSecret } from '../utils/secretBox.js';
import { SAGE_DEFAULTS } from '../utils/integrations.js';
import { openSagePool } from '../utils/sageFactureSync.js';
import { fetchPendingBl, fetchBlLines, groupIntoBpc, summarize, fetchInvoiceSpanControl, fetchFacturesPhp } from '../utils/sageBl.js';
import { loadSageFacture } from '../utils/sageFactureData.js';
import { buildFacturePhpPdf } from '../utils/facturePhpPdfBuilder.js';
import { buildRelevePhpPdf, DEFAULT_RELEVE_LABELS } from '../utils/relevePhpPdfBuilder.js';
import { signatureLabelsFor } from '../utils/sageFactureSync.js';
import { createWorkflowFromTemplate } from '../utils/workflowEngine.js';
import { getUserPosteCodes } from '../utils/posteResolver.js';

export const DEFAULT_BL_ACCESS_POSTES = ['facturation', 'dg', 'ccg'];
const CACHE_MS = 60_000;
const cache = new Map(); // tenantId → { at, data }

export async function getBlAccessPostes(tenantId) {
  const row = await TenantSettings.findOne({ where: { tenantId }, attributes: ['sageBlAccessPostes'] });
  return Array.isArray(row?.sageBlAccessPostes) ? row.sageBlAccessPostes : DEFAULT_BL_ACCESS_POSTES;
}

export async function canAccessSageBl(user, tenantId) {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  const allowed = await getBlAccessPostes(tenantId);
  const mine = await getUserPosteCodes(user.id);
  return mine.some(c => allowed.includes(c));
}

const guard = (fn) => async (req, res) => {
  try {
    if (!(await canAccessSageBl(req.user, req.tenantId))) {
      return res.status(403).json({ success: false, message: 'Accès réservé (BL PHP) : demandez au superadmin.' });
    }
    await fn(req, res);
  } catch (err) {
    console.error('BL PHP Sage :', err);
    res.status(502).json({ success: false, message: err.message || 'Sage injoignable.' });
  }
};

async function sageConfig(tenantId) {
  const row = await TenantIntegration.findOne({ where: { tenantId, kind: 'sage' } });
  if (!row) { const e = new Error('Connexion Sage non réglée (Paramètres › Intégrations).'); e.status = 400; throw e; }
  return { row, config: { ...SAGE_DEFAULTS, ...row.config } };
}

async function withSage(tenantId, fn) {
  const { row, config } = await sageConfig(tenantId);
  const pool = await openSagePool(config, decryptSecret(row.secretEncrypted));
  try { return await fn(pool, config); } finally { await pool.close().catch(() => {}); }
}

const isoDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !Number.isNaN(Date.parse(v));
const today = () => new Date().toISOString().slice(0, 10);

// État des factures dans la GED (importées ? circuit ? chez qui ?)
async function gedStatus(tenantId, pieces) {
  if (!pieces.length) return {};
  const imports = await SageFactureImport.findAll({
    where: { tenantId, sageDocPiece: pieces },
    attributes: ['sageDocPiece', 'documentId', 'importedAt'],
    include: [{ model: Document, as: 'document', attributes: ['id', 'status'], include: [{
      model: Workflow, as: 'workflows', attributes: ['step', 'status', 'validatorId', 'createdAt'],
      include: [{ model: User, as: 'validator', attributes: ['firstName', 'lastName'] }],
    }] }],
  });
  return Object.fromEntries(imports.map(imp => {
    const wfs = [...(imp.document?.workflows || [])].sort((a, b) => a.step - b.step);
    const current = wfs.find(w => ['pending', 'en_pause'].includes(w.status));
    const state = !imp.document ? 'imported'
      : wfs.some(w => w.status === 'rejected') ? 'rejected'
        : wfs.length && wfs.every(w => w.status === 'approved') ? 'approved'
          : wfs.some(w => w.status === 'expired') ? 'expired' : 'in_progress';
    return [imp.sageDocPiece, {
      documentId: imp.documentId, importedAt: imp.importedAt, state,
      step: current ? current.step : null, steps: wfs.length,
      chez: current?.validator ? `${current.validator.firstName || ''} ${current.validator.lastName || ''}`.trim() : null,
    }];
  }));
}

// GET /api/sage-bl/summary?refresh=1 — BPC en attente + indicateurs (cache 60 s)
export const getSummary = guard(async (req, res) => {
  const hit = cache.get(req.tenantId);
  if (hit && !req.query.refresh && Date.now() - hit.at < CACHE_MS) return res.json({ success: true, ...hit.data, cached: true });
  const rows = await withSage(req.tenantId, fetchPendingBl);
  const bpcs = groupIntoBpc(rows);
  const data = { generatedAt: new Date().toISOString(), kpis: summarize(bpcs), bpcs };
  cache.set(req.tenantId, { at: Date.now(), data });
  res.json({ success: true, ...data });
});

// GET /api/sage-bl/lines?pieces=BL1,BL2 — actes des BL d'un BPC
export const getLines = guard(async (req, res) => {
  const pieces = String(req.query.pieces || '').split(',').map(s => s.trim()).filter(Boolean);
  const lines = await withSage(req.tenantId, pool => fetchBlLines(pool, pieces));
  res.json({ success: true, lines });
});

// GET /api/sage-bl/controle?days=30 — factures regroupant des BL sur plus de 3 jours
export const getControl = guard(async (req, res) => {
  const data = await withSage(req.tenantId, pool => fetchInvoiceSpanControl(pool, req.query.days));
  res.json({ success: true, ...data });
});

// GET /api/sage-bl/access — postes autorisés (+ catalogue des postes pour le superadmin)
export const getAccess = async (req, res) => {
  const allowed = await getBlAccessPostes(req.tenantId);
  const canEdit = req.user.role === 'superadmin';
  const postes = canEdit ? await Poste.findAll({ attributes: ['code', 'label'], order: [['label', 'ASC']] }) : [];
  res.json({ success: true, allowed, canEdit, canAccess: await canAccessSageBl(req.user, req.tenantId), postes });
};

// PUT /api/sage-bl/access { postes: [...] } — superadmin
export const updateAccess = async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Réservé au superadmin.' });
  const known = (await Poste.findAll({ attributes: ['code'] })).map(p => p.code);
  const postes = [...new Set((Array.isArray(req.body?.postes) ? req.body.postes : []).filter(c => known.includes(c)))];
  const before = await getBlAccessPostes(req.tenantId);
  const [row] = await TenantSettings.findOrCreate({ where: { tenantId: req.tenantId }, defaults: { tenantId: req.tenantId } });
  await row.update({ sageBlAccessPostes: postes, updatedBy: req.user.id });
  await AuditLog.log(req, 'TENANT_SETTINGS_UPDATED', 'tenant', req.tenantId, { sageBlAccessPostes: { avant: before, après: postes } });
  res.json({ success: true, allowed: postes, message: 'Accès mis à jour.' });
};


// GET /api/sage-bl/factures?from=&to= — factures PHP de la période + état dans la GED
export const getFactures = guard(async (req, res) => {
  const to = isoDate(req.query.to) ? req.query.to : today();
  const from = isoDate(req.query.from) ? req.query.from : `${to.slice(0, 8)}01`;
  const factures = await withSage(req.tenantId, pool => fetchFacturesPhp(pool, from, to));
  const ged = await gedStatus(req.tenantId, factures.map(f => f.piece));
  const list = factures.map(f => ({ ...f, ged: ged[f.piece] || null }));
  const sum = (l) => l.reduce((s, f) => s + f.total, 0);
  const by = (fn) => list.filter(fn);
  res.json({
    success: true, from, to, factures: list,
    kpis: {
      factures: list.length, montant: sum(list),
      nonComptabilisees: by(f => !f.comptabilisee).length,
      horsBpc: by(f => f.horsBpc).length,
      employes: { n: by(f => f.patient.type === 'Employé PHP').length, montant: sum(by(f => f.patient.type === 'Employé PHP')) },
      familles: { n: by(f => f.patient.type === 'Famille PHP').length, montant: sum(by(f => f.patient.type === 'Famille PHP')) },
      ged: {
        nonImportees: by(f => !f.ged).length,
        enCircuit: by(f => f.ged?.state === 'in_progress').length,
        validees: by(f => f.ged?.state === 'approved').length,
        rejetees: by(f => ['rejected', 'expired'].includes(f.ged?.state)).length,
      },
    },
  });
});

// GET /api/sage-bl/factures/:piece/pdf — liasse PDF d'une facture (aperçu, rien n'est importé)
export const getFacturePdf = guard(async (req, res) => {
  const piece = String(req.params.piece || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,20}$/.test(piece)) return res.status(400).json({ success: false, message: 'Numéro de facture invalide.' });
  const buffer = await withSage(req.tenantId, async (pool, config) => {
    const facture = await loadSageFacture(pool, piece);
    if (!facture) return null;
    const template = await WorkflowTemplate.findOne({ where: { name: config.workflowTemplateName, tenantId: req.tenantId } });
    return (await buildFacturePhpPdf(facture, { signatureLabels: signatureLabelsFor(template, config) })).buffer;
  });
  if (!buffer) return res.status(404).json({ success: false, message: `Facture ${piece} introuvable dans Sage.` });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="facture-${piece}.pdf"`);
  res.send(buffer);
});

// Relevé journalier : factures PHP arrêtées le jour donné
const RELEVE_CATEGORY = 'Relevé Factures PHP';
async function buildReleve(tenantId, date) {
  return withSage(tenantId, async (pool, config) => {
    const factures = (await fetchFacturesPhp(pool, date, date)).sort((a, b) => a.piece.localeCompare(b.piece));
    const templateName = config.releveWorkflowTemplateName || 'Circuit Relevé Factures PHP';
    const template = await WorkflowTemplate.findOne({ where: { name: templateName, tenantId } });
    const labels = signatureLabelsFor(template, { signatureLabels: DEFAULT_RELEVE_LABELS });
    return { ...(await buildRelevePhpPdf(date, factures, { signatureLabels: labels })), template, templateName, factures };
  });
}

// GET /api/sage-bl/releve/:date/pdf — aperçu du relevé
export const getRelevePdf = guard(async (req, res) => {
  const date = req.params.date;
  if (!isoDate(date)) return res.status(400).json({ success: false, message: 'Date invalide.' });
  const { buffer } = await buildReleve(req.tenantId, date);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="releve-factures-php-${date}.pdf"`);
  res.send(buffer);
});

// POST /api/sage-bl/releve { date } — crée le relevé dans la GED et lance son circuit
export const createReleve = guard(async (req, res) => {
  const date = req.body?.date;
  if (!isoDate(date)) return res.status(400).json({ success: false, message: 'Date invalide.' });
  const existing = await Document.findOne({ where: { tenantId: req.tenantId, category: RELEVE_CATEGORY, title: `Relevé des factures PHP du ${date.split('-').reverse().join('/')}` } });
  if (existing && !req.body?.force) {
    return res.status(409).json({ success: false, message: 'Un relevé existe déjà pour cette journée.', documentId: existing.id });
  }
  const r = await buildReleve(req.tenantId, date);
  if (!r.count) return res.status(400).json({ success: false, message: 'Aucune facture PHP arrêtée ce jour-là.' });
  const fileName = `releve-factures-php-${date}-${Date.now()}.pdf`;
  await fs.writeFile(path.resolve(process.cwd(), 'uploads', fileName), r.buffer);
  const document = await Document.create({
    title: `Relevé des factures PHP du ${date.split('-').reverse().join('/')}`,
    fileName, originalName: fileName, filePath: `uploads/${fileName}`, fileSize: r.buffer.length, fileType: 'application/pdf',
    userId: req.user.id, category: RELEVE_CATEGORY, status: r.template ? 'pending_validation' : 'draft',
    metadata: { signatureZones: r.signatureZones, signaturePage: r.signaturePage, releveDate: date, nbFactures: r.count, montantTotal: r.total, factures: r.factures.map(f => f.piece) },
    tenantId: req.tenantId,
  });
  if (r.template) await createWorkflowFromTemplate(document, r.template.id, req.tenantId);
  await AuditLog.log(req, 'UPLOAD', 'document', document.id, { title: document.title, releve: true, factures: r.count });
  res.status(201).json({
    success: true, documentId: document.id, count: r.count, total: r.total, circuit: !!r.template,
    message: r.template
      ? `Relevé créé (${r.count} factures) et envoyé dans le circuit « ${r.templateName} ».`
      : `Relevé créé (${r.count} factures). Modèle « ${r.templateName} » introuvable : soumettez-le depuis Documents.`,
  });
});
