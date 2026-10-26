// backend/src/controllers/vehicleController.js
// Parc véhicules — étape 1 : ambulances RO SAU.
//
// Droits (pas de service dédié) :
//  - gestion du parc (fiches, check-lists) : admin, poste « chef_securite_logistique » ;
//  - gestion d'un véhicule + tableau de bord : en plus, titulaires du poste
//    responsable du véhicule (ambulances : « chef_pole_ro_sau ») ;
//  - contrôles : en plus, membres du service du véhicule (SAU), chauffeurs
//    (service « Chauffeurs ») et équipage inscrit sur la mission.
import crypto from 'crypto';
import { resolveStoredFile } from '../utils/storedFiles.js';
import fs from 'fs/promises';
import path from 'path';
import { Op } from 'sequelize';
import {
  Vehicle, VehicleChecklistTemplate, VehicleMission, VehicleCheck, VehicleDeadline,
  Document, ServiceMember, Service, Employee, Tenant, TenantSettings, AuditLog,
} from '../models/index.js';
import { getUserPosteCodes, getPosteHolders } from '../utils/posteResolver.js';
import {
  DEFAULT_AMBULANCE_SECTIONS, DEFAULT_SERVICE_SECTIONS, DEFAULT_DEADLINES, sanitizeSections, evaluateAnswers, completionPct, completionLevel,
  DEFAULT_INVENTORY_SECTIONS, DEFAULT_INVENTORY_DAYS, LEGACY_MATERIEL_IDS, MISSION_MATERIEL_ITEMS, sanitizeInventorySections, sanitizeInventoryDays,
} from '../utils/vehicleChecklist.js';
import { buildVehicleCheckPdf } from '../utils/vehicleCheckPdf.js';
import { parseSignaturePng } from './manualSignatureController.js';
import { sendPushNotification } from '../services/pushNotificationService.js';
import { sendNotificationEmail } from '../utils/mailer.js';

const FLEET_POSTE = 'chef_securite_logistique';
const AMBULANCE_MANAGER_POSTE = 'chef_pole_ro_sau';
const CHECK_DIR = 'uploads/vehicle-checks';
const isSuperAdmin = (u) => u?.role === 'superadmin';
export { CHECK_DIR, userName, fmtFr };

// Le superadmin voit toujours le parc ; les administrateurs seulement si le
// superadmin le leur a ouvert (tenant_settings.fleet_admin_access).
async function adminsAllowed(tenantId) {
  if (!tenantId) return false;
  const row = await TenantSettings.findOne({ where: { tenantId }, attributes: ['fleetAdminAccess'] });
  return !!row?.fleetAdminAccess;
}
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const userName = (u) => `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.email || '';
const fmtFr = (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ── Droits ───────────────────────────────────────────────────────────────────
const chauffeursServiceCache = new Map(); // tenantId → { at, id }
async function chauffeursServiceId(tenantId) {
  const hit = chauffeursServiceCache.get(tenantId);
  if (hit && Date.now() - hit.at < 60_000) return hit.id;
  const s = await Service.findOne({ where: { name: 'Chauffeurs', ...(tenantId ? { tenantId } : {}) }, attributes: ['id'] });
  chauffeursServiceCache.set(tenantId, { at: Date.now(), id: s?.id || null });
  return s?.id || null;
}

export async function fleetAccess(user) {
  const [posteCodes, memberships, chauffeursId, adminOk] = await Promise.all([
    getUserPosteCodes(user.id),
    ServiceMember.findAll({ where: { userId: user.id, isActive: true }, attributes: ['serviceId'] }),
    chauffeursServiceId(user.tenantId),
    user.role === 'admin' ? adminsAllowed(user.tenantId) : Promise.resolve(false),
  ]);
  const serviceIds = memberships.map((m) => m.serviceId);
  return {
    user,
    posteCodes,
    serviceIds,
    fleetManager: isSuperAdmin(user) || adminOk || posteCodes.includes(FLEET_POSTE),
    chauffeur: !!chauffeursId && serviceIds.includes(chauffeursId),
  };
}

export const canManage = (acc, v) => acc.fleetManager || (!!v.managerPosteCode && acc.posteCodes.includes(v.managerPosteCode));
const inCrew = (acc, mission) => (mission?.crew || []).some((c) => c.userId === acc.user.id);
export const canCheck = (acc, v, mission) => canManage(acc, v) || (!!v.serviceId && acc.serviceIds.includes(v.serviceId)) || acc.chauffeur || inCrew(acc, mission);

// ── Check-list ───────────────────────────────────────────────────────────────
// Check-list par type : ambulance (véhicule + matériel médical) ou véhicule de service
const templateType = (vehicleType) => (vehicleType === 'ambulance' ? 'ambulance' : 'service');
async function ensureDefaultTemplate(type = 'ambulance', userId = null) {
  let tpl = await VehicleChecklistTemplate.findOne({ where: { vehicleType: type, isActive: true }, order: [['createdAt', 'ASC']] });
  if (!tpl) {
    tpl = type === 'ambulance'
      ? await VehicleChecklistTemplate.create({ name: 'Check-list ambulance', vehicleType: 'ambulance', sections: DEFAULT_AMBULANCE_SECTIONS, inventorySections: DEFAULT_INVENTORY_SECTIONS, inventoryDays: DEFAULT_INVENTORY_DAYS, updatedBy: userId })
      : await VehicleChecklistTemplate.create({ name: 'Check-list véhicule de service', vehicleType: 'service', sections: DEFAULT_SERVICE_SECTIONS, updatedBy: userId });
  }
  return upgradeAmbulanceTemplate(tpl);
}

// Check-list ambulance créée avant l'inventaire hebdomadaire : on ajoute la
// fiche d'inventaire RO SAU et, si la section « Matériel médical » n'a pas été
// modifiée, on la remplace par le contrôle court de mission (points vitaux).
async function upgradeAmbulanceTemplate(tpl) {
  if (tpl.vehicleType !== 'ambulance' || (tpl.inventorySections || []).length) return tpl;
  const sections = (tpl.sections || []).map((s) => {
    const ids = (s.items || []).map((it) => it.id);
    const legacy = s.key === 'materiel' && ids.length === LEGACY_MATERIEL_IDS.length && ids.every((id, i) => id === LEGACY_MATERIEL_IDS[i]);
    return legacy ? { ...s, items: MISSION_MATERIEL_ITEMS } : s;
  });
  await tpl.update({ sections, inventorySections: DEFAULT_INVENTORY_SECTIONS, inventoryDays: DEFAULT_INVENTORY_DAYS });
  return tpl;
}

export async function templateFor(vehicle) {
  if (vehicle.checklistTemplateId) {
    const tpl = await VehicleChecklistTemplate.findByPk(vehicle.checklistTemplateId);
    if (tpl) return upgradeAmbulanceTemplate(tpl);
  }
  return ensureDefaultTemplate(templateType(vehicle.vehicleType));
}

// ── État des contrôles ───────────────────────────────────────────────────────
// Dernier contrôle du véhicule (ensemble des sections d'une même phase d'une
// même mission) : % de la check-list vérifié → code couleur.
async function lastRound(vehicle, template) {
  const last = await VehicleCheck.findOne({ where: { vehicleId: vehicle.id }, order: [['performedAt', 'DESC']] });
  const total = (template?.sections || []).reduce((n, s) => n + (s.items?.length || 0), 0);
  if (!last) return { pct: 0, level: 'aucun', phase: null, at: null, anomalies: 0, sections: [] };
  const round = await VehicleCheck.findAll({ where: { missionId: last.missionId, phase: last.phase }, attributes: ['sectionKey', 'sectionLabel', 'answeredItems', 'totalItems', 'anomalies', 'criticalAnomaly', 'performedByName', 'performedAt'] });
  const answered = round.reduce((n, c) => n + c.answeredItems, 0);
  const pct = completionPct(answered, Math.max(total, round.reduce((n, c) => n + c.totalItems, 0)));
  return {
    pct,
    level: completionLevel(pct),
    phase: last.phase,
    at: last.performedAt,
    anomalies: round.reduce((n, c) => n + c.anomalies, 0),
    critical: round.some((c) => c.criticalAnomaly),
    sections: round.map((c) => ({ key: c.sectionKey, label: c.sectionLabel, by: c.performedByName, at: c.performedAt, anomalies: c.anomalies })),
  };
}

const activeMissionOf = (vehicleId) => VehicleMission.findOne({
  where: { vehicleId, status: { [Op.in]: ['en_cours', 'planifiee'] } },
  order: [[VehicleMission.sequelize.literal(`CASE WHEN "VehicleMission"."status" = 'en_cours' THEN 0 ELSE 1 END`), 'ASC'], ['plannedDepartureAt', 'ASC NULLS LAST'], ['createdAt', 'ASC']],
});

async function serializeVehicle(v, acc, { withState = true } = {}) {
  const base = {
    id: v.id, label: v.label, immatriculation: v.immatriculation, vehicleType: v.vehicleType,
    serviceId: v.serviceId, managerPosteCode: v.managerPosteCode, checklistTemplateId: v.checklistTemplateId,
    status: v.status, unavailableReason: v.unavailableReason, mileage: v.mileage, notes: v.notes, isActive: v.isActive,
    brand: v.brand, model: v.model, year: v.year, fuelType: v.fuelType, vin: v.vin,
  };
  if (!withState) return base;
  const [template, mission] = await Promise.all([templateFor(v), activeMissionOf(v.id)]);
  const doc = mission?.documentId ? await Document.findByPk(mission.documentId, { attributes: ['id', 'title'] }) : null;
  return {
    ...base,
    readiness: await lastRound(v, template),
    currentMission: mission ? {
      id: mission.id, status: mission.status, title: mission.title, urgent: mission.urgent,
      documentId: mission.documentId, documentTitle: doc?.title || null,
      plannedDepartureAt: mission.plannedDepartureAt, departedAt: mission.departedAt,
    } : null,
    canManage: acc ? canManage(acc, v) : false,
    canCheck: acc ? canCheck(acc, v, mission) : false,
  };
}

// ── Notifications aux responsables ───────────────────────────────────────────
export async function notifyVehicleManagers(vehicle, { title, body, url = '/vehicules?tab=tableau' }) {
  const codes = [...new Set([vehicle.managerPosteCode, FLEET_POSTE].filter(Boolean))];
  const holders = (await Promise.all(codes.map((c) => getPosteHolders(c)))).flat();
  const seen = new Set();
  for (const u of holders) {
    if (seen.has(u.id)) continue;
    seen.add(u.id);
    sendPushNotification(u.id, {
      type: 'vehicle_alert', title, body, icon: '/favicon.ico', badge: '/favicon.ico',
      tag: `vehicle-${vehicle.id}-${Date.now()}`, data: { url, timestamp: Date.now() }, requireInteraction: true,
    }).catch(() => {});
    if (u.email) sendNotificationEmail(u.email, title, body, 'default', url, { tenantId: vehicle.tenantId }).catch(() => {});
  }
}

// Sections qu'un membre d'équipage doit contrôler : chauffeur → sections dont le
// « fait par » mentionne le chauffeur (Véhicule), soignant → les autres.
export function sectionsForRole(sections, role) {
  const isDriver = (s) => /chauffeur|conducteur/i.test(s.role || '') || s.key === 'vehicule';
  if (/chauffeur|conducteur/i.test(role || '')) return sections.filter(isDriver);
  if (role) return sections.filter((s) => !isDriver(s));
  return sections;
}

// Rappel à l'équipage (push + e-mail), message adapté à chacun
export async function notifyCrew(mission, vehicle, build) {
  const { User: UserModel } = await import('../models/index.js');
  const seen = new Set();
  for (const c of mission.crew || []) {
    if (!c.userId || seen.has(c.userId)) continue;
    seen.add(c.userId);
    const { title, body } = build(c);
    if (!title) continue;
    const url = `/vehicules?vehicle=${vehicle.id}`;
    sendPushNotification(c.userId, {
      type: 'vehicle_check', title, body, icon: '/favicon.ico', badge: '/favicon.ico',
      tag: `vehicle-check-${mission.id}`, data: { url, timestamp: Date.now() }, requireInteraction: true,
    }).catch(() => {});
    const u = await UserModel.findByPk(c.userId, { attributes: ['email'] });
    if (u?.email) sendNotificationEmail(u.email, title, body, 'default', url, { tenantId: vehicle.tenantId }).catch(() => {});
  }
}

const sectionNames = (sections) => sections.map((s) => s.label.toLowerCase()).join(' et ');

// ── Ordre de mission RO SAU → mission véhicule ───────────────────────────────
function parisDate(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return null;
  const t = /^\d{2}:\d{2}/.test(String(time || '')) ? String(time).slice(0, 5) : '00:00';
  const d = new Date(`${date}T${t}:00+01:00`); // heure du Cameroun (UTC+1, sans heure d'été)
  return Number.isNaN(d.getTime()) ? null : d;
}

async function crewFromOrdreMission(meta = {}) {
  const people = [];
  const missionnaires = Array.isArray(meta.missionnaires) && meta.missionnaires.length
    ? meta.missionnaires
    : (meta.nom_missionnaire ? [{ nom: meta.nom_missionnaire, id: meta.missionnaire_id, source: meta.missionnaire_source }] : []);
  missionnaires.forEach((m) => people.push({ ...m, role: 'Soignant' }));
  if (meta.nom_conducteur) people.push({ nom: meta.nom_conducteur, id: meta.conducteur_id, source: meta.conducteur_source, role: 'Chauffeur' });
  const crew = [];
  for (const p of people) {
    let uid = null;
    if (p.id && p.source === 'user') uid = p.id;
    else if (p.id && p.source === 'employee') uid = (await Employee.findByPk(p.id, { attributes: ['userId'] }))?.userId || null;
    if ((p.nom || '').trim() || uid) crew.push({ userId: uid, name: String(p.nom || '').trim(), role: p.role });
  }
  return crew;
}

/**
 * Appelé à la création d'un ordre de mission : si un véhicule du parc y est
 * choisi, crée la mission véhicule — ou rattache la sortie urgente déjà en
 * cours de ce véhicule (contrôle de départ fait avant l'OM).
 */
export async function linkOrdreMissionVehicle(document) {
  const meta = document.metadata || {};
  if (document.category !== 'Ordre de mission' || !meta.vehicle_id) return null;
  const vehicle = await Vehicle.findByPk(meta.vehicle_id);
  if (!vehicle) return null;
  const crew = await crewFromOrdreMission(meta);
  const fields = {
    documentId: document.id,
    title: document.title,
    destination: meta.objet_mission || meta.destination || null,
    plannedDepartureAt: parisDate(meta.date_depart, meta.heure_depart),
    plannedReturnAt: parisDate(meta.date_retour || meta.date_depart, meta.heure_retour),
  };
  const orphan = await VehicleMission.findOne({
    where: { vehicleId: vehicle.id, documentId: null, urgent: true, status: { [Op.in]: ['planifiee', 'en_cours', 'terminee'] }, createdAt: { [Op.gte]: new Date(Date.now() - 48 * 3600 * 1000) } },
    order: [['createdAt', 'DESC']],
  });
  if (orphan) {
    const merged = [...(orphan.crew || [])];
    crew.forEach((c) => { if (!merged.some((m) => (c.userId && m.userId === c.userId) || (!c.userId && m.name === c.name))) merged.push(c); });
    await orphan.update({ ...fields, crew: merged, omAfterDeparture: !!orphan.departedAt });
    return orphan;
  }
  const mission = await VehicleMission.create({ ...fields, vehicleId: vehicle.id, crew, status: 'planifiee', createdBy: document.userId });
  // L'équipage est prévenu dès l'ordre de mission : contrôle à faire avant de partir
  try {
    const sections = (await templateFor(vehicle)).sections || [];
    const when = fields.plannedDepartureAt ? ` le ${fmtFr(fields.plannedDepartureAt)}` : '';
    await notifyCrew(mission, vehicle, (c) => ({
      title: `🚑 Mission ${vehicle.label}${when}`,
      body: `${document.title}\nAvant de partir : contrôle ${sectionNames(sectionsForRole(sections, c.role))} de l'ambulance (${vehicle.immatriculation}) dans la GED.`,
    }));
  } catch (err) {
    console.warn('Rappel équipage :', err.message);
  }
  return mission;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Droits sur le module (menu, onglets) — aussi renvoyés avec le profil (user.fleet)
export async function fleetModuleFlags(user) {
  const acc = await fleetAccess(user);
  const vehicles = await Vehicle.findAll({ where: { isActive: true } });
  const managed = vehicles.filter((v) => canManage(acc, v));
  const checkable = acc.fleetManager || managed.length > 0 || (vehicles.length > 0 && acc.chauffeur)
    || vehicles.some((v) => v.serviceId && acc.serviceIds.includes(v.serviceId))
    || (await VehicleMission.count({ where: { status: { [Op.in]: ['planifiee', 'en_cours'] }, crew: { [Op.contains]: [{ userId: user.id }] } } })) > 0;
  const chefPole = acc.posteCodes.includes(AMBULANCE_MANAGER_POSTE);
  return {
    fleetManager: acc.fleetManager,
    superAdmin: isSuperAdmin(user),
    canCreate: acc.fleetManager || chefPole,
    canDashboard: acc.fleetManager || managed.length > 0,
    canCheck: checkable,
    hasModule: checkable || acc.fleetManager || chefPole,
  };
}

// GET /api/vehicles/me
export const getMyFleetAccess = async (req, res) => {
  try {
    res.json({ success: true, data: await fleetModuleFlags(req.user) });
  } catch (error) {
    console.error('Parc véhicules /me :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/vehicles — véhicules visibles (état, mission en cours, dernier contrôle)
export const listVehicles = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    await ensureDefaultTemplate('ambulance', req.user.id);
    const vehicles = await Vehicle.findAll({ where: acc.fleetManager && req.query.all === '1' ? {} : { isActive: true }, order: [['label', 'ASC']] });
    const out = [];
    for (const v of vehicles) {
      const s = await serializeVehicle(v, acc);
      if (s.canCheck || s.canManage) out.push(s);
    }
    res.json({ success: true, data: out });
  } catch (error) {
    console.error('Parc véhicules liste :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/vehicles/options — liste déroulante de l'ordre de mission (ambulances)
export const vehicleOptions = async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll({ where: { isActive: true, vehicleType: req.query.type || 'ambulance' }, order: [['label', 'ASC']] });
    const out = [];
    for (const v of vehicles) out.push(await serializeVehicle(v, null));
    res.json({ success: true, data: out.map(({ canManage: _a, canCheck: _b, ...rest }) => rest) });
  } catch (error) {
    console.error('Parc véhicules options :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

const cleanVehicle = (b = {}) => {
  const out = {};
  if (b.label !== undefined) out.label = String(b.label || '').trim().slice(0, 120);
  if (b.immatriculation !== undefined) out.immatriculation = String(b.immatriculation || '').toUpperCase().replace(/\s+/g, ' ').trim().slice(0, 40);
  if (b.vehicleType !== undefined) out.vehicleType = ['ambulance', 'service', 'autre'].includes(b.vehicleType) ? b.vehicleType : 'ambulance';
  if (b.serviceId !== undefined) out.serviceId = b.serviceId || null;
  if (b.managerPosteCode !== undefined) out.managerPosteCode = String(b.managerPosteCode || '').trim().slice(0, 60) || null;
  if (b.checklistTemplateId !== undefined) out.checklistTemplateId = b.checklistTemplateId || null;
  if (b.mileage !== undefined) out.mileage = b.mileage === '' || b.mileage === null ? null : Math.max(0, Math.round(Number(b.mileage) || 0));
  if (b.notes !== undefined) out.notes = String(b.notes || '').slice(0, 2000) || null;
  if (b.isActive !== undefined) out.isActive = !!b.isActive;
  if (b.brand !== undefined) out.brand = String(b.brand || '').trim().slice(0, 60) || null;
  if (b.model !== undefined) out.model = String(b.model || '').trim().slice(0, 60) || null;
  if (b.year !== undefined) { const y = Math.round(Number(b.year)); out.year = y >= 1950 && y <= 2100 ? y : null; }
  if (b.fuelType !== undefined) out.fuelType = ['diesel', 'essence', 'autre'].includes(b.fuelType) ? b.fuelType : null;
  if (b.vin !== undefined) out.vin = String(b.vin || '').toUpperCase().trim().slice(0, 40) || null;
  return out;
};

// POST /api/vehicles — nouveau véhicule (gestion du parc)
export const createVehicle = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const data = cleanVehicle(req.body);
    const isAmbulance = (data.vehicleType || 'ambulance') === 'ambulance';
    if (!acc.fleetManager && !(isAmbulance && acc.posteCodes.includes(AMBULANCE_MANAGER_POSTE))) {
      return res.status(403).json({ success: false, message: 'Réservé à la gestion du parc.' });
    }
    if (!data.label || !data.immatriculation) return res.status(400).json({ success: false, message: 'Nom et immatriculation obligatoires.' });
    if (await Vehicle.findOne({ where: { immatriculation: data.immatriculation } })) {
      return res.status(409).json({ success: false, message: 'Un véhicule porte déjà cette immatriculation.' });
    }
    if (isAmbulance && data.managerPosteCode === undefined) data.managerPosteCode = AMBULANCE_MANAGER_POSTE;
    const v = await Vehicle.create({ ...data, status: 'disponible' });
    // Échéances habituelles (dates à renseigner par le parc)
    await VehicleDeadline.bulkCreate(DEFAULT_DEADLINES.map((d) => ({ ...d, vehicleId: v.id, tenantId: v.tenantId })));
    res.status(201).json({ success: true, data: await serializeVehicle(v, acc) });
  } catch (error) {
    console.error('Parc véhicules création :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// PUT /api/vehicles/:id
export const updateVehicle = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const v = await Vehicle.findByPk(req.params.id);
    if (!v) return res.status(404).json({ success: false, message: 'Véhicule introuvable.' });
    if (!canManage(acc, v)) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    const data = cleanVehicle(req.body);
    if (!acc.fleetManager) delete data.managerPosteCode; // seul le parc change le responsable
    if (data.immatriculation && data.immatriculation !== v.immatriculation
      && await Vehicle.findOne({ where: { immatriculation: data.immatriculation, id: { [Op.ne]: v.id } } })) {
      return res.status(409).json({ success: false, message: 'Un véhicule porte déjà cette immatriculation.' });
    }
    await v.update(data);
    res.json({ success: true, data: await serializeVehicle(v, acc) });
  } catch (error) {
    console.error('Parc véhicules modification :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// PATCH /api/vehicles/:id/status — remise en service / indisponibilité
export const setVehicleStatus = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const v = await Vehicle.findByPk(req.params.id);
    if (!v) return res.status(404).json({ success: false, message: 'Véhicule introuvable.' });
    if (!canManage(acc, v)) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    const status = req.body?.status === 'indisponible' ? 'indisponible' : 'disponible';
    if (status === 'disponible' && await VehicleMission.count({ where: { vehicleId: v.id, status: 'en_cours' } })) {
      return res.status(409).json({ success: false, message: 'Le véhicule est en mission : faites le contrôle de retour.' });
    }
    await v.update({ status, unavailableReason: status === 'indisponible' ? String(req.body?.reason || 'Indisponible').slice(0, 255) : null });
    res.json({ success: true, data: await serializeVehicle(v, acc) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/vehicles/templates
export const listTemplates = async (req, res) => {
  try {
    await ensureDefaultTemplate('ambulance', req.user.id);
    await ensureDefaultTemplate('service', req.user.id);
    const rows = await VehicleChecklistTemplate.findAll({ where: { isActive: true }, order: [['createdAt', 'ASC']] });
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// PUT /api/vehicles/templates/:id — modifier la check-list (parc, ou responsable d'un véhicule qui l'utilise)
export const updateTemplate = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const tpl = await VehicleChecklistTemplate.findByPk(req.params.id);
    if (!tpl) return res.status(404).json({ success: false, message: 'Check-list introuvable.' });
    let allowed = acc.fleetManager;
    if (!allowed) {
      const vehicles = await Vehicle.findAll({ where: { isActive: true } });
      allowed = vehicles.some((v) => canManage(acc, v) && (v.checklistTemplateId === tpl.id || (!v.checklistTemplateId && tpl.vehicleType === v.vehicleType)));
    }
    if (!allowed) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    const sections = sanitizeSections(req.body?.sections);
    if (!sections || !sections.length || !sections.some((s) => s.items.length)) {
      return res.status(400).json({ success: false, message: 'La check-list doit contenir au moins une section avec des points.' });
    }
    const patch = { sections, name: String(req.body?.name || tpl.name).slice(0, 150), updatedBy: req.user.id };
    if (req.body?.inventorySections !== undefined) {
      const inv = sanitizeInventorySections(req.body.inventorySections);
      if (!inv) return res.status(400).json({ success: false, message: 'Inventaire invalide.' });
      patch.inventorySections = inv;
      patch.inventoryDays = sanitizeInventoryDays(req.body?.inventoryDays);
    }
    await tpl.update(patch);
    res.json({ success: true, data: tpl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/vehicles/:id/state — écran de contrôle (check-list, mission, sections faites)
export const getVehicleState = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const v = await Vehicle.findByPk(req.params.id);
    if (!v) return res.status(404).json({ success: false, message: 'Véhicule introuvable.' });
    const mission = await activeMissionOf(v.id);
    if (!canCheck(acc, v, mission)) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    const template = await templateFor(v);
    // Dernière mission terminée (contrôle de retour d'une section encore à faire)
    const lastDone = await VehicleMission.findOne({ where: { vehicleId: v.id, status: 'terminee' }, order: [['returnedAt', 'DESC']] });
    const missionIds = [mission?.id, lastDone?.id].filter(Boolean);
    const checks = missionIds.length ? await VehicleCheck.findAll({
      where: { missionId: missionIds }, attributes: ['id', 'missionId', 'phase', 'sectionKey', 'performedByName', 'performedAt', 'anomalies', 'answeredItems', 'totalItems'],
    }) : [];
    res.json({
      success: true,
      data: {
        vehicle: await serializeVehicle(v, acc),
        sections: template.sections,
        mission: mission ? { id: mission.id, status: mission.status, title: mission.title, urgent: mission.urgent, crew: mission.crew, documentId: mission.documentId, plannedDepartureAt: mission.plannedDepartureAt, plannedReturnAt: mission.plannedReturnAt, departedAt: mission.departedAt } : null,
        lastFinishedMission: lastDone ? { id: lastDone.id, title: lastDone.title, returnedAt: lastDone.returnedAt } : null,
        checks,
      },
    });
  } catch (error) {
    console.error('Parc véhicules état :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/vehicles/check-photos — photo d'une anomalie (réduite à 1600 px)
export const uploadCheckPhoto = async (req, res) => {
  try {
    if (!req.file || !/^image\//.test(req.file.mimetype)) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ success: false, message: 'Envoyez une photo.' });
    }
    await fs.mkdir(path.resolve(process.cwd(), CHECK_DIR), { recursive: true });
    const name = `photo-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
    const dest = path.resolve(process.cwd(), CHECK_DIR, name);
    const { default: sharp } = await import('sharp');
    await sharp(req.file.path, { failOn: 'none' }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 78 }).toFile(dest);
    await fs.unlink(req.file.path).catch(() => {});
    res.json({ success: true, data: { path: `${CHECK_DIR}/${name}` } });
  } catch (error) {
    console.error('Photo contrôle :', error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, message: 'Photo illisible.' });
  }
};

// POST /api/vehicles/:id/checks — enregistre (et fige) le contrôle d'une section
// body : { phase: 'depart'|'retour', sectionKey, missionId?, answers, mileage, comment, signature }
export const submitCheck = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const v = await Vehicle.findByPk(req.params.id);
    if (!v || !v.isActive) return res.status(404).json({ success: false, message: 'Véhicule introuvable.' });
    const { phase, sectionKey, missionId, answers, comment } = req.body || {};
    if (!['depart', 'retour'].includes(phase)) return res.status(400).json({ success: false, message: 'Phase invalide.' });
    const template = await templateFor(v);
    const section = (template.sections || []).find((s) => s.key === sectionKey);
    if (!section) return res.status(400).json({ success: false, message: 'Section inconnue.' });
    const sigBytes = parseSignaturePng(req.body?.signature);
    if (!sigBytes) return res.status(400).json({ success: false, message: 'La signature est obligatoire.' });

    // Mission concernée
    let mission = null;
    if (missionId) {
      mission = await VehicleMission.findOne({ where: { id: missionId, vehicleId: v.id } });
      if (!mission) return res.status(404).json({ success: false, message: 'Mission introuvable.' });
    } else if (phase === 'depart') {
      mission = await activeMissionOf(v.id);
    } else {
      mission = await VehicleMission.findOne({ where: { vehicleId: v.id, status: 'en_cours' }, order: [['departedAt', 'DESC']] })
        || await VehicleMission.findOne({ where: { vehicleId: v.id, status: 'terminee', returnedAt: { [Op.gte]: new Date(Date.now() - 48 * 3600 * 1000) } }, order: [['returnedAt', 'DESC']] });
      if (!mission) return res.status(400).json({ success: false, message: 'Aucune mission en cours pour ce véhicule : faites d\'abord le contrôle de départ.' });
    }
    if (mission && phase === 'depart' && !['planifiee', 'en_cours'].includes(mission.status)) {
      return res.status(409).json({ success: false, message: 'Cette mission est terminée.' });
    }
    if (!canCheck(acc, v, mission)) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });

    if (mission) {
      const done = await VehicleCheck.findOne({ where: { missionId: mission.id, phase, sectionKey } });
      if (done) {
        return res.status(409).json({ success: false, message: `Déjà fait par ${done.performedByName || 'un collègue'} le ${fmtFr(done.performedAt)}.` });
      }
    }

    const items = section.items || [];
    const result = evaluateAnswers(items, answers);
    if (!result.answered) return res.status(400).json({ success: false, message: 'Aucun point vérifié.' });
    let mileage = null;
    if (section.askMileage) {
      mileage = Math.round(Number(req.body?.mileage));
      if (!Number.isFinite(mileage) || mileage < 0 || mileage > 5_000_000) {
        return res.status(400).json({ success: false, message: 'Indiquez le kilométrage.' });
      }
    }

    // Sortie urgente : pas encore d'ordre de mission → mission créée ici, rattachée à l'OM plus tard
    const now = new Date();
    if (!mission) {
      // Ambulance : sortie urgente, rattachée à l'OM RO SAU créé ensuite ;
      // autre véhicule : simple sortie (carnet de bord), avec sa destination
      const isAmbulance = v.vehicleType === 'ambulance';
      const destination = String(req.body?.destination || '').trim().slice(0, 255) || null;
      mission = await VehicleMission.create({
        vehicleId: v.id, status: 'planifiee', urgent: isAmbulance,
        title: isAmbulance ? 'Sortie urgente (ordre de mission à venir)' : `Sortie${destination ? ` — ${destination}` : ''}`,
        destination,
        crew: [{ userId: req.user.id, name: userName(req.user), role: section.role || null }], createdBy: req.user.id,
      });
    } else if (!inCrew(acc, mission)) {
      await mission.update({ crew: [...(mission.crew || []), { userId: req.user.id, name: userName(req.user), role: section.role || null }] });
    }

    await fs.mkdir(path.resolve(process.cwd(), CHECK_DIR), { recursive: true });
    const sigPath = `${CHECK_DIR}/signature-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`;
    await fs.writeFile(path.resolve(process.cwd(), sigPath), sigBytes);

    const check = await VehicleCheck.create({
      vehicleId: v.id, missionId: mission.id, phase, sectionKey: section.key, sectionLabel: section.label,
      items, answers: result.answers, totalItems: result.total, answeredItems: result.answered,
      anomalies: result.anomalies, criticalAnomaly: result.critical, mileage,
      comment: String(comment || '').trim().slice(0, 2000) || null,
      performedBy: req.user.id, performedByName: userName(req.user), performedAt: now, signaturePath: sigPath,
    });

    // État de la mission et du véhicule
    if (phase === 'depart') {
      await mission.update({ status: 'en_cours', departedAt: mission.departedAt || now });
      await v.update({ status: 'en_mission' });
    } else {
      await mission.update({ status: 'terminee', returnedAt: mission.returnedAt || now });
      if (result.critical) {
        const bad = items.filter((it) => it.critical && result.answers.find((a) => a.itemId === it.id && ['ko', 'absent'].includes(a.status))).map((it) => it.label);
        await v.update({ status: 'indisponible', unavailableReason: `Anomalie critique au retour : ${bad.join(', ')}`.slice(0, 255) });
      } else if (v.status === 'en_mission') {
        await v.update({ status: 'disponible', unavailableReason: null });
      }
    }
    if (mileage !== null && (v.mileage === null || mileage > v.mileage)) await v.update({ mileage });

    // Fiche PDF archivée dans la GED (liée à l'ordre de mission)
    try {
      const tenant = await Tenant.findByPk(v.tenantId, { attributes: ['name'] });
      const omDoc = mission.documentId ? await Document.findByPk(mission.documentId, { attributes: ['id', 'title'] }) : null;
      const missionLabel = omDoc?.title || mission.title || (mission.urgent ? 'Sortie urgente (ordre de mission à venir)' : 'Mission');
      const pdf = await buildVehicleCheckPdf({ tenantName: tenant?.name, vehicle: v, mission, missionLabel, check, items });
      const fileName = `controle-${phase}-${section.key}-${Date.now()}.pdf`;
      await fs.writeFile(path.resolve(process.cwd(), 'uploads', fileName), pdf);
      const doc = await Document.create({
        title: `Contrôle ${phase === 'depart' ? 'départ' : 'retour'} ${section.label.toLowerCase()} — ${v.label} (${v.immatriculation}) — ${fmtFr(now)}`,
        fileName, originalName: fileName, filePath: `uploads/${fileName}`, fileSize: pdf.length, fileType: 'application/pdf',
        userId: req.user.id, category: 'Contrôle véhicule', status: 'approved',
        linkedDocumentId: mission.documentId || null,
        visibility: v.serviceId ? 'service' : 'personal', serviceId: v.serviceId || null,
        metadata: { sourceType: 'vehicle_check', vehicleId: v.id, missionId: mission.id, checkId: check.id, phase, sectionKey: section.key },
      });
      await check.update({ documentId: doc.id, sha256: sha256(pdf) });
    } catch (err) {
      console.error('Fiche PDF contrôle véhicule :', err);
    }

    if (result.anomalies) {
      const labels = items.filter((it) => result.answers.find((a) => a.itemId === it.id && ['ko', 'absent'].includes(a.status))).map((it) => it.label);
      notifyVehicleManagers(v, {
        title: `${result.critical ? '🚨' : '⚠️'} ${v.label} : ${result.anomalies} anomalie(s) au ${phase === 'depart' ? 'départ' : 'retour'}`,
        body: `${section.label} — contrôlé par ${userName(req.user)}\n${labels.slice(0, 6).join(', ')}${labels.length > 6 ? '…' : ''}`,
      }).catch(() => {});
    }

    const { AuditLog } = await import('../models/index.js');
    AuditLog.log(req, 'VEHICLE_CHECK', 'vehicle', v.id, { phase, section: section.key, missionId: mission.id, anomalies: result.anomalies });

    res.status(201).json({ success: true, data: { check, mission, vehicle: await serializeVehicle(v, acc) } });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Ce contrôle vient d\'être fait par un collègue.' });
    }
    console.error('Contrôle véhicule :', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement du contrôle.' });
  }
};

// Résumé d'une phase (départ / retour) d'une mission pour le tableau de bord
function phaseSummary(checks, sections, phase) {
  const list = sections.map((s) => {
    const c = checks.find((x) => x.phase === phase && x.sectionKey === s.key);
    return c
      ? { key: s.key, label: s.label, role: s.role, done: true, checkId: c.id, by: c.performedByName, at: c.performedAt, anomalies: c.anomalies, critical: c.criticalAnomaly, pct: completionPct(c.answeredItems, c.totalItems), documentId: c.documentId }
      : { key: s.key, label: s.label, role: s.role, done: false };
  });
  const total = sections.reduce((n, s) => n + (s.items?.length || 0), 0);
  const answered = checks.filter((c) => c.phase === phase).reduce((n, c) => n + c.answeredItems, 0);
  const pct = completionPct(answered, total);
  return { pct, level: completionLevel(pct), sections: list, anomalies: list.reduce((n, s) => n + (s.anomalies || 0), 0) };
}

// GET /api/vehicles/missions?from=&to=&vehicleId= — tableau de bord
export const listMissions = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const vehicles = await Vehicle.findAll();
    const managed = vehicles.filter((v) => canManage(acc, v));
    if (!managed.length && !acc.fleetManager) return res.status(403).json({ success: false, message: 'Accès réservé aux responsables.' });
    const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? new Date(`${req.query.from}T00:00:00+01:00`) : new Date(Date.now() - 30 * 86400000);
    const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '') ? new Date(`${req.query.to}T23:59:59+01:00`) : new Date(Date.now() + 30 * 86400000);
    const ids = managed.map((v) => v.id).filter((id) => !req.query.vehicleId || id === req.query.vehicleId);
    const missions = await VehicleMission.findAll({
      where: {
        vehicleId: ids,
        status: { [Op.ne]: 'annulee' },
        [Op.or]: [
          { plannedDepartureAt: { [Op.between]: [from, to] } },
          { departedAt: { [Op.between]: [from, to] } },
          { plannedDepartureAt: null, departedAt: null, createdAt: { [Op.between]: [from, to] } },
        ],
      },
      order: [[VehicleMission.sequelize.literal('COALESCE("VehicleMission"."departed_at", "VehicleMission"."planned_departure_at", "VehicleMission"."created_at")'), 'DESC']],
      limit: 300,
    });
    // Contrôles chargés à part (avec limit + include, Sequelize imbrique une sous-requête qui casse le tri)
    const allChecks = missions.length ? await VehicleCheck.findAll({ where: { missionId: missions.map((m) => m.id) }, attributes: { exclude: ['answers', 'items'] } }) : [];
    const checksOf = (id) => allChecks.filter((c) => c.missionId === id);
    const templates = new Map();
    const vById = new Map(vehicles.map((v) => [v.id, v]));
    const docIds = missions.map((m) => m.documentId).filter(Boolean);
    const docs = docIds.length ? await Document.findAll({ where: { id: docIds }, attributes: ['id', 'title', 'status'] }) : [];
    const now = Date.now();
    const rows = [];
    for (const m of missions) {
      const v = vById.get(m.vehicleId);
      if (!templates.has(v.id)) templates.set(v.id, (await templateFor(v)).sections || []);
      const sections = templates.get(v.id);
      const depart = phaseSummary(checksOf(m.id), sections, 'depart');
      const retour = phaseSummary(checksOf(m.id), sections, 'retour');
      const doc = docs.find((d) => d.id === m.documentId);
      const departDue = m.status !== 'planifiee' || (m.plannedDepartureAt && new Date(m.plannedDepartureAt).getTime() < now - 30 * 60000);
      rows.push({
        id: m.id, status: m.status, title: m.title, destination: m.destination, urgent: m.urgent, omAfterDeparture: m.omAfterDeparture,
        vehicle: { id: v.id, label: v.label, immatriculation: v.immatriculation },
        document: doc ? { id: doc.id, title: doc.title, status: doc.status } : null,
        crew: m.crew, plannedDepartureAt: m.plannedDepartureAt, plannedReturnAt: m.plannedReturnAt, departedAt: m.departedAt, returnedAt: m.returnedAt,
        depart, retour,
        alerts: {
          departMissing: departDue && depart.pct === 0,
          retourMissing: m.status === 'terminee' ? retour.pct < 100 : (m.status === 'en_cours' && m.plannedReturnAt && new Date(m.plannedReturnAt).getTime() < now - 2 * 3600000 && retour.pct === 0),
          anomalies: depart.anomalies + retour.anomalies,
        },
      });
    }
    const relevant = rows.filter((r) => r.status !== 'planifiee' || r.alerts.departMissing);
    const stats = {
      missions: rows.length,
      departComplete: relevant.filter((r) => r.depart.pct >= 100).length,
      retourComplete: rows.filter((r) => r.status === 'terminee' && r.retour.pct >= 100).length,
      finished: rows.filter((r) => r.status === 'terminee').length,
      relevant: relevant.length,
      anomalies: rows.reduce((n, r) => n + r.alerts.anomalies, 0),
      withoutDepartCheck: rows.filter((r) => r.alerts.departMissing).length,
    };
    res.json({ success: true, data: { missions: rows, stats, vehicles: managed.map((v) => ({ id: v.id, label: v.label, immatriculation: v.immatriculation, status: v.status, unavailableReason: v.unavailableReason })) } });
  } catch (error) {
    console.error('Parc véhicules missions :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/vehicles/checks/:id — détail d'un contrôle (réponses)
export const getCheck = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const check = await VehicleCheck.findByPk(req.params.id);
    if (!check) return res.status(404).json({ success: false, message: 'Contrôle introuvable.' });
    const v = await Vehicle.findByPk(check.vehicleId);
    const mission = await VehicleMission.findByPk(check.missionId);
    if (!canManage(acc, v) && !canCheck(acc, v, mission)) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    res.json({ success: true, data: check });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/vehicles/checks/:id/pdf — fiche PDF (contrôle d'accès du module)
export const getCheckPdf = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const check = await VehicleCheck.findByPk(req.params.id);
    if (!check?.documentId) return res.status(404).end();
    const v = await Vehicle.findByPk(check.vehicleId);
    const mission = await VehicleMission.findByPk(check.missionId);
    if (!canManage(acc, v) && !canCheck(acc, v, mission)) return res.status(403).end();
    const doc = await Document.findByPk(check.documentId, { attributes: ['filePath', 'fileName'] });
    if (!doc) return res.status(404).end();
    res.type('application/pdf').sendFile(resolveStoredFile(doc.filePath));
  } catch (error) {
    res.status(500).end();
  }
};

// POST /api/vehicles/missions/:id/cancel — mission prévue annulée (responsable)
export const cancelMission = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const m = await VehicleMission.findByPk(req.params.id);
    if (!m) return res.status(404).json({ success: false, message: 'Mission introuvable.' });
    const v = await Vehicle.findByPk(m.vehicleId);
    if (!canManage(acc, v)) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    if (m.status !== 'planifiee') return res.status(409).json({ success: false, message: 'Seule une mission pas encore partie peut être annulée.' });
    await m.update({ status: 'annulee' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};



// GET /api/vehicles/settings — accès des administrateurs (superadmin)
export const getFleetSettings = async (req, res) => {
  if (!isSuperAdmin(req.user)) return res.status(403).json({ success: false, message: 'Réservé au superadmin.' });
  res.json({ success: true, data: { adminAccess: await adminsAllowed(req.tenantId) } });
};

// PUT /api/vehicles/settings { adminAccess } — ouvrir / fermer le module aux administrateurs
export const updateFleetSettings = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) return res.status(403).json({ success: false, message: 'Réservé au superadmin.' });
    const adminAccess = req.body?.adminAccess === true;
    const before = await adminsAllowed(req.tenantId);
    const [row] = await TenantSettings.findOrCreate({ where: { tenantId: req.tenantId }, defaults: { tenantId: req.tenantId } });
    await row.update({ fleetAdminAccess: adminAccess, updatedBy: req.user.id });
    if (before !== adminAccess) {
      await AuditLog.log(req, 'TENANT_SETTINGS_UPDATED', 'tenant', req.tenantId, { fleetAdminAccess: { avant: before, après: adminAccess } });
    }
    res.json({ success: true, data: { adminAccess } });
  } catch (error) {
    console.error('Parc véhicules réglages :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// Sections encore à contrôler pour une mission et une phase
async function missingSections(mission, vehicle, phase) {
  const sections = (await templateFor(vehicle)).sections || [];
  const done = await VehicleCheck.findAll({ where: { missionId: mission.id, phase }, attributes: ['sectionKey'] });
  return sections.filter((s) => !done.some((d) => d.sectionKey === s.key));
}

// GET /api/vehicles/my-pending — contrôles que l'utilisateur (équipage) doit faire
export const myPendingChecks = async (req, res) => {
  try {
    const horizon = new Date(Date.now() + 24 * 3600 * 1000);
    const missions = await VehicleMission.findAll({
      where: {
        crew: { [Op.contains]: [{ userId: req.user.id }] },
        [Op.or]: [
          { status: 'planifiee', [Op.or]: [{ plannedDepartureAt: null }, { plannedDepartureAt: { [Op.lte]: horizon } }] },
          { status: 'en_cours' },
          { status: 'terminee', returnedAt: { [Op.gte]: new Date(Date.now() - 24 * 3600 * 1000) } },
        ],
      },
      order: [['plannedDepartureAt', 'ASC NULLS LAST']],
      limit: 20,
    });
    const out = [];
    for (const m of missions) {
      const v = await Vehicle.findByPk(m.vehicleId);
      if (!v || !v.isActive) continue;
      const me = (m.crew || []).find((c) => c.userId === req.user.id);
      const phase = m.status === 'planifiee' ? 'depart' : (m.status === 'en_cours' && !(await VehicleCheck.count({ where: { missionId: m.id, phase: 'depart' } }))) ? 'depart' : 'retour';
      // Au retour, seulement une fois l'heure de retour approchée (ou la mission terminée)
      if (phase === 'retour' && m.status === 'en_cours' && m.plannedReturnAt && new Date(m.plannedReturnAt).getTime() > Date.now() + 3600 * 1000) continue;
      const mine = sectionsForRole(await missingSections(m, v, phase), me?.role);
      if (!mine.length) continue;
      const doc = m.documentId ? await Document.findByPk(m.documentId, { attributes: ['title'] }) : null;
      out.push({
        missionId: m.id, phase, status: m.status, title: doc?.title || m.title,
        plannedDepartureAt: m.plannedDepartureAt, plannedReturnAt: m.plannedReturnAt, departedAt: m.departedAt,
        vehicle: { id: v.id, label: v.label, immatriculation: v.immatriculation },
        sections: mine.map((x) => ({ key: x.key, label: x.label, role: x.role })),
      });
    }
    // Inventaire de l'ambulance attendu aujourd'hui (lun / mer / ven)
    const { myPendingInventories } = await import('./vehicleInventoryController.js');
    out.push(...await myPendingInventories(req.user));
    res.json({ success: true, data: out });
  } catch (error) {
    console.error('Contrôles à faire :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/vehicles/by-document/:documentId — contrôles de l'ambulance d'un ordre de mission
export const missionByDocument = async (req, res) => {
  try {
    const { hasDocumentReadAccess } = await import('../utils/documentVisibility.js');
    const doc = await Document.findByPk(req.params.documentId);
    if (!doc) return res.status(404).json({ success: false, message: 'Document introuvable.' });
    if (!(await hasDocumentReadAccess(doc, req.user))) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    const m = await VehicleMission.findOne({ where: { documentId: doc.id }, order: [['createdAt', 'DESC']] });
    if (!m) return res.json({ success: true, data: null });
    const v = await Vehicle.findByPk(m.vehicleId);
    const sections = (await templateFor(v)).sections || [];
    const checks = await VehicleCheck.findAll({ where: { missionId: m.id }, attributes: { exclude: ['answers', 'items'] } });
    res.json({
      success: true,
      data: {
        id: m.id, status: m.status, omAfterDeparture: m.omAfterDeparture, urgent: m.urgent,
        plannedDepartureAt: m.plannedDepartureAt, departedAt: m.departedAt, returnedAt: m.returnedAt,
        vehicle: { id: v.id, label: v.label, immatriculation: v.immatriculation, status: v.status, unavailableReason: v.unavailableReason },
        depart: phaseSummary(checks, sections, 'depart'),
        retour: phaseSummary(checks, sections, 'retour'),
      },
    });
  } catch (error) {
    console.error('Contrôles de l\'OM :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};
