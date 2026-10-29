// backend/src/controllers/blocController.js
// Programme opératoire de la semaine, rempli en même temps par tous les services.
//  - Saisie (poste « bloc_saisie ») : ajoute ses interventions jusqu'au vendredi
//    12 h (heure de Douala) qui précède la semaine ; modifie/supprime les siennes.
//  - Responsable (poste « bloc_responsable ») et administrateurs : modifient
//    toutes les lignes, même après la date limite, gèrent la liste des services,
//    clôturent la semaine puis génèrent le document (Médecin Chef → DG).
//  - Direction (DG, DDS, Médecin Chef) : consultation.
// Chaque modification est diffusée en direct aux pages ouvertes (bloc:changed).
import { BlocProgramme, BlocIntervention, TenantSettings, User, Document, AuditLog } from '../models/index.js';
import { getUserPosteCodes } from '../utils/posteResolver.js';
import { emitBlocChanged } from '../utils/socketManager.js';

export const JOURS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
export const DEFAULT_BLOC_SERVICES = ['Chirurgie', 'Gynécologie', 'Pédiatrie', 'Médecine', 'ORL', 'Ophtalmologie'];
const ADMIN_ROLES = ['admin', 'superadmin'];
const VIEW_ROLES = ['director', 'dds', 'medical_chief'];
const FIELDS = ['service', 'jour', 'nomPatient', 'age', 'natureIntervention', 'intervenant', 'numeroSalle'];
const MAX = { service: 80, jour: 10, nomPatient: 160, age: 20, natureIntervention: 2000, intervenant: 120, numeroSalle: 20 };

/** Droits de l'utilisateur sur le programme opératoire. */
export async function blocAccess(user) {
  const postes = await getUserPosteCodes(user.id);
  const manage = ADMIN_ROLES.includes(user.role) || postes.includes('bloc_responsable');
  const fill = manage || postes.includes('bloc_saisie');
  const view = fill || VIEW_ROLES.includes(user.role);
  return { view, fill, manage };
}

/** Lundi « AAAA-MM-JJ » valide, sinon null. */
export function parseWeekStart(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value || d.getUTCDay() !== 1) return null;
  return value;
}

/** Fin de la saisie : vendredi 12 h à Douala (UTC+1) avant le lundi de la semaine. */
export function blocDeadline(weekStart) {
  const [y, m, d] = weekStart.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 3, 11, 0, 0));
}

const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : null);

async function blocServices(tenantId) {
  const row = await TenantSettings.findOne({ where: { tenantId }, attributes: ['blocServices'] });
  return Array.isArray(row?.blocServices) && row.blocServices.length ? row.blocServices : DEFAULT_BLOC_SERVICES;
}

/** Modifier une ligne : programme ouvert ; responsable toujours, saisie ses lignes avant la date limite. */
export function canEditLine(access, programme, line, userId, now = new Date()) {
  if (programme.status !== 'ouvert') return false;
  if (access.manage) return true;
  if (!access.fill || now >= blocDeadline(programme.weekStart)) return false;
  return !line || line.createdBy === userId;
}

const cleanLine = (body, { partial = false } = {}) => {
  const data = {};
  for (const f of FIELDS) {
    if (body[f] === undefined) continue;
    data[f] = String(body[f] ?? '').trim().slice(0, MAX[f]);
  }
  if (data.jour !== undefined) data.jour = data.jour.toUpperCase();
  if (data.jour !== undefined && !JOURS.includes(data.jour)) return { error: 'Jour de la semaine invalide.' };
  for (const f of ['service', 'jour', 'nomPatient', 'natureIntervention']) {
    if ((!partial || data[f] !== undefined) && !data[f]) return { error: 'Service, jour, patient et nature de l\'intervention sont obligatoires.' };
  }
  return { data };
};

const sortLines = (a, b) =>
  JOURS.indexOf(a.jour) - JOURS.indexOf(b.jour)
  || String(a.numeroSalle || '').localeCompare(String(b.numeroSalle || ''), 'fr', { numeric: true })
  || new Date(a.createdAt) - new Date(b.createdAt);

const loadAccess = async (req, res, need) => {
  const access = await blocAccess(req.user);
  if (!access[need]) {
    res.status(403).json({ success: false, message: 'Accès au programme opératoire non autorisé.' });
    return null;
  }
  return access;
};

const weekOr400 = (req, res) => {
  const weekStart = parseWeekStart(req.params.weekStart);
  if (!weekStart) res.status(400).json({ success: false, message: 'Semaine invalide (lundi AAAA-MM-JJ attendu).' });
  return weekStart;
};

const findOrCreateProgramme = async (weekStart) => {
  const [programme] = await BlocProgramme.findOrCreate({ where: { weekStart }, defaults: { weekStart } });
  return programme;
};

// GET /api/bloc/me
export const getMyAccess = async (req, res) => {
  res.json({ success: true, data: await blocAccess(req.user) });
};

// GET /api/bloc/services
export const getServices = async (req, res) => {
  if (!(await loadAccess(req, res, 'view'))) return;
  res.json({ success: true, data: await blocServices(req.tenantId) });
};

// PUT /api/bloc/services  { services: [...] }
export const updateServices = async (req, res) => {
  if (!(await loadAccess(req, res, 'manage'))) return;
  const list = Array.isArray(req.body?.services) ? req.body.services : [];
  const services = [...new Set(list.map(s => String(s || '').trim().slice(0, MAX.service)).filter(Boolean))];
  if (services.length === 0) return res.status(400).json({ success: false, message: 'Indiquez au moins un service.' });
  const [row] = await TenantSettings.findOrCreate({ where: { tenantId: req.tenantId }, defaults: { tenantId: req.tenantId } });
  const before = row.blocServices;
  await row.update({ blocServices: services, updatedBy: req.user.id });
  await AuditLog.log(req, 'TENANT_SETTINGS_UPDATED', 'tenant', req.tenantId, { blocServices: { avant: before, après: services } });
  res.json({ success: true, data: services });
};

// GET /api/bloc/semaines/:weekStart
export const getWeek = async (req, res) => {
  const access = await loadAccess(req, res, 'view');
  if (!access) return;
  const weekStart = weekOr400(req, res);
  if (!weekStart) return;
  const programme = await BlocProgramme.findOne({
    where: { weekStart },
    include: [{ model: User, as: 'closedByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }],
  });
  const lines = programme
    ? await BlocIntervention.findAll({
      where: { programmeId: programme.id },
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email'] }],
    })
    : [];
  const prog = programme || { weekStart, status: 'ouvert' };
  // Document commun : brouillon (signataire à choisir), en signature, signé ou rejeté
  const document = programme?.documentId
    ? await Document.unscoped().findByPk(programme.documentId, { attributes: ['id', 'status'] })
    : null;
  const deadline = blocDeadline(weekStart);
  res.json({
    success: true,
    data: {
      weekStart,
      status: prog.status,
      deadline,
      deadlinePassed: new Date() >= deadline,
      closedAt: programme?.closedAt || null,
      closedBy: fullName(programme?.closedByUser),
      documentId: document?.id || null,
      documentStatus: document?.status || null,
      access: { ...access, canAdd: canEditLine(access, prog, null, req.user.id) },
      services: await blocServices(req.tenantId),
      interventions: lines.map(l => l.toJSON()).sort(sortLines).map(l => ({
        id: l.id, service: l.service, jour: l.jour, nomPatient: l.nomPatient, age: l.age,
        natureIntervention: l.natureIntervention, intervenant: l.intervenant, numeroSalle: l.numeroSalle,
        author: fullName(l.author), updatedAt: l.updatedAt,
        canEdit: canEditLine(access, prog, l, req.user.id),
      })),
    },
  });
};

// POST /api/bloc/semaines/:weekStart/interventions
export const addIntervention = async (req, res) => {
  const access = await loadAccess(req, res, 'fill');
  if (!access) return;
  const weekStart = weekOr400(req, res);
  if (!weekStart) return;
  const { data, error } = cleanLine(req.body || {});
  if (error) return res.status(400).json({ success: false, message: error });
  if (!access.manage && !(await blocServices(req.tenantId)).includes(data.service)) {
    return res.status(400).json({ success: false, message: 'Service absent de la liste du programme opératoire.' });
  }
  const programme = await findOrCreateProgramme(weekStart);
  if (!canEditLine(access, programme, null, req.user.id)) {
    return res.status(409).json({ success: false, message: programme.status !== 'ouvert'
      ? 'Ce programme est clôturé : demandez au responsable du programme opératoire de le rouvrir.'
      : 'La saisie de cette semaine est fermée (vendredi 12 h) : adressez-vous au responsable du programme opératoire.' });
  }
  const line = await BlocIntervention.create({ ...data, programmeId: programme.id, createdBy: req.user.id, updatedBy: req.user.id });
  emitBlocChanged(weekStart, req.user.id);
  res.status(201).json({ success: true, data: { id: line.id } });
};

const loadLine = async (req, res) => {
  const line = await BlocIntervention.findByPk(req.params.id, { include: [{ model: BlocProgramme, as: 'programme' }] });
  if (!line) res.status(404).json({ success: false, message: 'Intervention introuvable.' });
  return line;
};

// PUT /api/bloc/interventions/:id
export const updateIntervention = async (req, res) => {
  const access = await loadAccess(req, res, 'fill');
  if (!access) return;
  const line = await loadLine(req, res);
  if (!line) return;
  if (!canEditLine(access, line.programme, line, req.user.id)) {
    return res.status(403).json({ success: false, message: 'Vous ne pouvez plus modifier cette intervention.' });
  }
  const { data, error } = cleanLine(req.body || {}, { partial: true });
  if (error) return res.status(400).json({ success: false, message: error });
  if (data.service && data.service !== line.service && !access.manage && !(await blocServices(req.tenantId)).includes(data.service)) {
    return res.status(400).json({ success: false, message: 'Service absent de la liste du programme opératoire.' });
  }
  await line.update({ ...data, updatedBy: req.user.id });
  emitBlocChanged(line.programme.weekStart, req.user.id);
  res.json({ success: true });
};

// DELETE /api/bloc/interventions/:id
export const deleteIntervention = async (req, res) => {
  const access = await loadAccess(req, res, 'fill');
  if (!access) return;
  const line = await loadLine(req, res);
  if (!line) return;
  if (!canEditLine(access, line.programme, line, req.user.id)) {
    return res.status(403).json({ success: false, message: 'Vous ne pouvez plus supprimer cette intervention.' });
  }
  await line.destroy();
  emitBlocChanged(line.programme.weekStart, req.user.id);
  res.json({ success: true });
};

// POST /api/bloc/semaines/:weekStart/statut  { status: 'cloture' | 'ouvert' | 'envoye', documentId? }
export const setStatus = async (req, res) => {
  if (!(await loadAccess(req, res, 'manage'))) return;
  const weekStart = weekOr400(req, res);
  if (!weekStart) return;
  const { status, documentId } = req.body || {};
  if (!['cloture', 'ouvert', 'envoye'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Statut invalide.' });
  }
  const programme = await findOrCreateProgramme(weekStart);
  if (status === 'cloture' || status === 'envoye') {
    const count = await BlocIntervention.count({ where: { programmeId: programme.id } });
    if (count === 0) return res.status(400).json({ success: false, message: 'Aucune intervention dans ce programme.' });
  }
  if (status === 'envoye' && programme.status !== 'cloture') {
    return res.status(409).json({ success: false, message: 'Clôturez le programme avant de l\'envoyer à la signature.' });
  }
  const update = { status };
  if (status === 'cloture') Object.assign(update, { closedBy: req.user.id, closedAt: new Date() });
  if (status === 'envoye') update.documentId = documentId || null;
  if (status === 'ouvert') Object.assign(update, { closedBy: null, closedAt: null });
  await programme.update(update);
  await AuditLog.log(req, 'BLOC_PROGRAMME_STATUS', 'bloc_programme', programme.id, { weekStart, status, documentId: documentId || undefined });
  emitBlocChanged(weekStart, req.user.id);
  res.json({ success: true, data: { status } });
};
