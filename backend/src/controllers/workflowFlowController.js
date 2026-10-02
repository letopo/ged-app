// backend/src/controllers/workflowFlowController.js
// Tableau de bord Workflow › Flux de validation : statistiques calculées sur les
// vrais circuits, document par document (cycle en cours, cf. currentCycleSteps).
//
// Périmètre selon le rôle : admin / direction voient toute l'organisation, les
// autres les documents qu'ils peuvent lister (mêmes règles que la page Documents,
// confidentialité par catégorie comprise).
import { Op } from 'sequelize';
import { Document, Workflow, User, Service } from '../models/index.js';
import { buildDocumentAccessWhere, buildCategoryRestrictionWhere, isAdminOrDirector } from '../utils/documentVisibility.js';
import { currentCycleSteps } from '../utils/workflowEngine.js';

const HOUR = 3_600_000;
const IN_PROGRESS = ['pending', 'en_pause'];
const MAX_DOCS_LIST = 2000;

const hoursBetween = (a, b) => (a && b ? Math.max(0, (new Date(b) - new Date(a)) / HOUR) : null);
const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

// Issue d'un document à partir des étapes de son cycle en cours
function documentOutcome(steps) {
  for (const s of steps) {
    if (s.status === 'approved') continue;
    if (s.status === 'rejected') return { outcome: 'rejected', atStep: s.step };
    if (s.status === 'expired') return { outcome: 'expired', atStep: s.step };
    if (IN_PROGRESS.includes(s.status)) return { outcome: 'in_progress', atStep: s.step };
    // queued sans étape active : circuit interrompu (cas rare) → en cours à cette étape
    return { outcome: 'in_progress', atStep: s.step };
  }
  return { outcome: 'approved', atStep: steps[steps.length - 1].step };
}

// @route GET /api/workflows/flow-stats?period=30|90|365|all&category=&serviceId=
export const getFlowStats = async (req, res) => {
  try {
    const { period = '30', category, serviceId } = req.query;
    const since = period === 'all' ? null : new Date(Date.now() - Number(period || 30) * 24 * HOUR);

    // Documents visibles par l'utilisateur et ayant un circuit
    const and = [];
    const access = await buildDocumentAccessWhere(req.user);
    if (access) and.push(access);
    const catRestriction = await buildCategoryRestrictionWhere(req.user);
    if (catRestriction) and.push(catRestriction);
    const docWhere = and.length ? { [Op.and]: and } : {};

    const docs = await Document.findAll({
      where: docWhere,
      attributes: ['id', 'title', 'category', 'serviceId', 'createdAt'],
      include: [
        { model: Workflow, as: 'workflows', required: true, attributes: ['id', 'step', 'status', 'validatorId', 'createdAt', 'assignedAt', 'validatedAt'] },
        { model: Service, as: 'service', required: false, attributes: ['id', 'name'] },
      ],
    });

    // Cycle en cours de chaque document, puis filtres (période = début du cycle)
    const all = docs.map(d => {
      const steps = currentCycleSteps(d.workflows.map(w => w.get({ plain: true })));
      return { doc: d, steps, startedAt: steps[0]?.createdAt || d.createdAt };
    }).filter(x => x.steps.length);

    const categories = [...new Set(all.map(x => x.doc.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    const services = [...new Map(all.filter(x => x.doc.service).map(x => [x.doc.service.id, x.doc.service.name])).entries()]
      .map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    const items = all.filter(x =>
      (!since || new Date(x.startedAt) >= since)
      && (!category || x.doc.category === category)
      && (!serviceId || x.doc.serviceId === serviceId));

    // ── Étapes ──────────────────────────────────────────────────────────────
    const maxStep = Math.max(0, ...items.map(x => x.steps.length));
    const stages = Array.from({ length: maxStep }, (_, i) => ({
      step: i + 1, entered: 0, passed: 0, completed: 0, rejected: 0, expired: 0, inProgress: 0,
      _approvedHours: [], _waitingHours: [],
    }));
    const outcomes = { approved: 0, rejected: 0, expired: 0, in_progress: 0 };
    const cycleHours = [];
    const now = new Date();

    for (const x of items) {
      const o = documentOutcome(x.steps);
      x.outcome = o.outcome; x.atStep = o.atStep;
      outcomes[o.outcome]++;
      x.steps.forEach((s, idx) => {
        const st = stages[idx];
        const reached = idx === 0 || x.steps[idx - 1].status === 'approved';
        if (!reached) return;
        st.entered++;
        const start = s.assignedAt || s.createdAt;
        if (s.status === 'approved') {
          if (idx === x.steps.length - 1) st.completed++; else st.passed++;
          const h = hoursBetween(start, s.validatedAt);
          if (h != null) st._approvedHours.push(h);
        } else if (s.status === 'rejected') st.rejected++;
        else if (s.status === 'expired') st.expired++;
        else {
          st.inProgress++;
          const h = hoursBetween(start, now);
          if (h != null) st._waitingHours.push(h);
        }
      });
      if (o.outcome === 'approved') {
        const h = hoursBetween(x.startedAt, x.steps[x.steps.length - 1].validatedAt);
        if (h != null) cycleHours.push(h);
      }
    }
    const stagesOut = stages.map(({ _approvedHours, _waitingHours, ...s }) => ({
      ...s, avgHours: round1(mean(_approvedHours)), avgWaitingHours: round1(mean(_waitingHours)),
    }));

    // ── Goulots : délai moyen de traitement par type de document ────────────
    const byCat = new Map();
    for (const x of items) {
      const key = x.doc.category || 'Autre';
      if (!byCat.has(key)) byCat.set(key, { category: key, documents: 0, rejected: 0, _hours: [] });
      const c = byCat.get(key);
      c.documents++;
      if (x.outcome === 'rejected') c.rejected++;
      for (const s of x.steps) {
        if (s.status === 'approved') { const h = hoursBetween(s.assignedAt || s.createdAt, s.validatedAt); if (h != null) c._hours.push(h); }
      }
    }
    const bottlenecks = [...byCat.values()]
      .map(({ _hours, ...c }) => ({ ...c, avgStepHours: round1(mean(_hours)) }))
      .filter(c => c.avgStepHours != null)
      .sort((a, b) => b.avgStepHours - a.avgStepHours)
      .slice(0, 6);

    // ── Valideurs : décisions prises sur la période ─────────────────────────
    const byVal = new Map();
    for (const x of items) for (const s of x.steps) {
      if (!['approved', 'rejected'].includes(s.status)) continue;
      if (!byVal.has(s.validatorId)) byVal.set(s.validatorId, { id: s.validatorId, decisions: 0, _hours: [] });
      const v = byVal.get(s.validatorId);
      v.decisions++;
      const h = hoursBetween(s.assignedAt || s.createdAt, s.validatedAt);
      if (h != null) v._hours.push(h);
    }
    const topIds = [...byVal.values()].sort((a, b) => b.decisions - a.decisions).slice(0, 5);
    const users = topIds.length
      ? await User.findAll({ where: { id: topIds.map(v => v.id) }, attributes: ['id', 'firstName', 'lastName', 'role'] })
      : [];
    const topValidators = topIds.map(({ _hours, ...v }) => {
      const u = users.find(x => x.id === v.id);
      return { ...v, name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '—', role: u?.role || null, avgHours: round1(mean(_hours)) };
    });

    // ── Liste (export CSV) ──────────────────────────────────────────────────
    const documents = items
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .slice(0, MAX_DOCS_LIST)
      .map(x => ({
        id: x.doc.id, title: x.doc.title, category: x.doc.category, service: x.doc.service?.name || null,
        outcome: x.outcome, atStep: x.atStep, totalSteps: x.steps.length,
        startedAt: x.startedAt, closedAt: x.outcome === 'in_progress' ? null : (x.steps.find(s => s.step === x.atStep)?.validatedAt || null),
      }));

    res.json({
      success: true,
      scope: isAdminOrDirector(req.user) ? 'organisation' : 'personnel',
      period, filters: { categories, services },
      totals: {
        documents: items.length, ...outcomes,
        avgCycleHours: round1(mean(cycleHours)),
        approvalRate: items.length ? Math.round((outcomes.approved / items.length) * 1000) / 10 : null,
      },
      stages: stagesOut, bottlenecks, topValidators, documents,
    });
  } catch (error) {
    console.error('Statistiques du flux de validation :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};
