// backend/src/controllers/vehicleFleetController.js
// Parc véhicules — étape 3 : suivi de tout le parc (chef sécurité logistique).
//  - échéances (assurance, visite technique, vidange…) par date et/ou km ;
//  - pleins de carburant (consommation) — saisis aussi par les conducteurs ;
//  - entretiens et réparations (coût, garage, facture) ;
//  - fiche véhicule (carnet de bord : sorties avec km départ / retour) ;
//  - vue d'ensemble du parc.
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { Op } from 'sequelize';
import {
  Vehicle, VehicleMission, VehicleCheck, VehicleDeadline, VehicleFuelLog, VehicleMaintenance, Document,
} from '../models/index.js';
import { fleetAccess, canManage, canCheck } from './vehicleController.js';

const DOC_DIR = 'uploads/vehicle-docs';
const DEADLINE_KINDS = ['assurance', 'visite_technique', 'vidange', 'extincteur', 'autre'];
const MAINTENANCE_KINDS = ['vidange', 'revision', 'reparation', 'pneus', 'freins', 'carrosserie', 'autre'];
const SOON_DAYS = 30;
const SOON_KM = 1000;
const userName = (u) => `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.email || '';
const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Douala' });
const isoDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);
const intOrNull = (v, max = 10_000_000) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
};
const okPath = (p) => (typeof p === 'string' && /^uploads\/(vehicle-docs|vehicle-checks)\/[\w.-]+\.(jpe?g|png|pdf)$/i.test(p) ? p : null);
const addMonths = (iso, months) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};
const daysUntil = (iso) => Math.round((new Date(`${iso}T12:00:00Z`) - new Date(`${todayIso()}T12:00:00Z`)) / 86400000);

/** État d'une échéance : a_renseigner | ok | bientot | depassee (date et/ou km). */
export function deadlineStatus(d, mileage) {
  if (!d.dueDate && !d.dueMileage) return { status: 'a_renseigner' };
  let status = 'ok';
  let days = null;
  let kmLeft = null;
  if (d.dueDate) {
    days = daysUntil(d.dueDate);
    if (days < 0) status = 'depassee'; else if (days <= SOON_DAYS) status = 'bientot';
  }
  if (d.dueMileage && mileage !== null && mileage !== undefined) {
    kmLeft = d.dueMileage - mileage;
    if (kmLeft <= 0) status = 'depassee'; else if (kmLeft <= SOON_KM && status === 'ok') status = 'bientot';
  }
  return { status, days, kmLeft };
}

const serializeDeadline = (d, mileage) => ({ ...d.toJSON(), ...deadlineStatus(d, mileage) });

async function loadManaged(req, res, { allowCheckers = false } = {}) {
  const acc = await fleetAccess(req.user);
  const v = await Vehicle.findByPk(req.params.id);
  if (!v) { res.status(404).json({ success: false, message: 'Véhicule introuvable.' }); return null; }
  const ok = canManage(acc, v) || (allowCheckers && canCheck(acc, v, null));
  if (!ok) { res.status(403).json({ success: false, message: 'Accès non autorisé.' }); return null; }
  return { acc, v };
}

// ── Pièces jointes (facture, attestation d'assurance, ticket de carburant) ──
export const uploadVehicleAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier.' });
    const isPdf = req.file.mimetype === 'application/pdf';
    const isImg = /^image\/(jpe?g|png)$/.test(req.file.mimetype);
    if (!isPdf && !isImg) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ success: false, message: 'PDF ou photo uniquement.' });
    }
    await fs.mkdir(path.resolve(process.cwd(), DOC_DIR), { recursive: true });
    const name = `piece-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${isPdf ? 'pdf' : 'jpg'}`;
    const dest = path.resolve(process.cwd(), DOC_DIR, name);
    if (isPdf) {
      await fs.rename(req.file.path, dest).catch(async () => { await fs.copyFile(req.file.path, dest); await fs.unlink(req.file.path).catch(() => {}); });
    } else {
      const { default: sharp } = await import('sharp');
      await sharp(req.file.path, { failOn: 'none' }).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(dest);
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.json({ success: true, data: { path: `${DOC_DIR}/${name}` } });
  } catch (error) {
    console.error('Pièce jointe véhicule :', error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, message: 'Fichier illisible.' });
  }
};

// ── Fiche véhicule (carnet de bord) ──────────────────────────────────────────
export const getVehicleDetails = async (req, res) => {
  try {
    const ctx = await loadManaged(req, res, { allowCheckers: true });
    if (!ctx) return;
    const { acc, v } = ctx;
    const manager = canManage(acc, v);
    const [deadlines, fuel, maintenances, missions] = await Promise.all([
      VehicleDeadline.findAll({ where: { vehicleId: v.id }, order: [['dueDate', 'ASC NULLS LAST'], ['label', 'ASC']] }),
      VehicleFuelLog.findAll({ where: { vehicleId: v.id }, order: [['date', 'DESC'], ['createdAt', 'DESC']], limit: 100 }),
      manager ? VehicleMaintenance.findAll({ where: { vehicleId: v.id }, order: [['date', 'DESC'], ['createdAt', 'DESC']], limit: 100 }) : [],
      VehicleMission.findAll({ where: { vehicleId: v.id, status: { [Op.ne]: 'annulee' } }, order: [['createdAt', 'DESC']], limit: 60 }),
    ]);
    // Carnet de bord : km départ / retour relevés aux contrôles
    const checks = missions.length ? await VehicleCheck.findAll({ where: { missionId: missions.map((m) => m.id), mileage: { [Op.ne]: null } }, attributes: ['missionId', 'phase', 'mileage', 'performedByName'] }) : [];
    const docIds = missions.map((m) => m.documentId).filter(Boolean);
    const docs = docIds.length ? await Document.findAll({ where: { id: docIds }, attributes: ['id', 'title'] }) : [];
    const trips = missions.map((m) => {
      const dep = checks.find((c) => c.missionId === m.id && c.phase === 'depart');
      const ret = checks.find((c) => c.missionId === m.id && c.phase === 'retour');
      return {
        id: m.id, status: m.status, title: docs.find((d) => d.id === m.documentId)?.title || m.title, destination: m.destination,
        documentId: m.documentId, departedAt: m.departedAt, returnedAt: m.returnedAt, plannedDepartureAt: m.plannedDepartureAt,
        crew: (m.crew || []).map((c) => c.name).filter(Boolean),
        kmDepart: dep?.mileage ?? null, kmRetour: ret?.mileage ?? null,
        distance: dep?.mileage != null && ret?.mileage != null && ret.mileage >= dep.mileage ? ret.mileage - dep.mileage : null,
      };
    });
    // Consommation : litres entre deux pleins complets / km parcourus
    const full = fuel.filter((f) => f.fullTank && f.mileage != null).sort((a, b) => a.mileage - b.mileage);
    let consumption = null;
    if (full.length >= 2) {
      const km = full[full.length - 1].mileage - full[0].mileage;
      const liters = fuel.filter((f) => f.mileage != null && f.mileage > full[0].mileage && f.mileage <= full[full.length - 1].mileage).reduce((n, f) => n + Number(f.liters), 0);
      if (km > 0) consumption = Math.round((liters / km) * 1000) / 10; // L/100 km
    }
    const since30 = addMonths(todayIso(), -1);
    const since12 = addMonths(todayIso(), -12);
    res.json({
      success: true,
      data: {
        canManage: manager,
        deadlines: deadlines.map((d) => serializeDeadline(d, v.mileage)),
        fuel,
        maintenances,
        trips,
        stats: {
          consumption,
          fuel30Liters: Math.round(fuel.filter((f) => f.date >= since30).reduce((n, f) => n + Number(f.liters), 0)),
          fuel30Amount: fuel.filter((f) => f.date >= since30).reduce((n, f) => n + (f.amount || 0), 0),
          maintenance12Cost: maintenances.filter((m) => m.date >= since12).reduce((n, m) => n + (m.cost || 0), 0),
          km30: trips.filter((t) => t.departedAt && new Date(t.departedAt) >= new Date(`${since30}T00:00:00Z`)).reduce((n, t) => n + (t.distance || 0), 0),
        },
      },
    });
  } catch (error) {
    console.error('Fiche véhicule :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── Échéances ────────────────────────────────────────────────────────────────
const cleanDeadline = (b = {}) => ({
  kind: DEADLINE_KINDS.includes(b.kind) ? b.kind : 'autre',
  label: String(b.label || '').trim().slice(0, 120),
  dueDate: isoDate(b.dueDate),
  dueMileage: intOrNull(b.dueMileage),
  intervalMonths: intOrNull(b.intervalMonths, 240),
  intervalKm: intOrNull(b.intervalKm, 1_000_000),
  notes: String(b.notes || '').slice(0, 1000) || null,
  attachmentPath: okPath(b.attachmentPath),
});

export const createDeadline = async (req, res) => {
  const ctx = await loadManaged(req, res); if (!ctx) return;
  const data = cleanDeadline(req.body);
  if (!data.label) return res.status(400).json({ success: false, message: 'Libellé obligatoire.' });
  const d = await VehicleDeadline.create({ ...data, vehicleId: ctx.v.id });
  res.status(201).json({ success: true, data: serializeDeadline(d, ctx.v.mileage) });
};

export const updateDeadline = async (req, res) => {
  const ctx = await loadManaged(req, res); if (!ctx) return;
  const d = await VehicleDeadline.findOne({ where: { id: req.params.did, vehicleId: ctx.v.id } });
  if (!d) return res.status(404).json({ success: false, message: 'Échéance introuvable.' });
  const data = cleanDeadline({ ...d.toJSON(), ...req.body });
  if (!data.label) return res.status(400).json({ success: false, message: 'Libellé obligatoire.' });
  const changedDue = data.dueDate !== d.dueDate || data.dueMileage !== d.dueMileage;
  await d.update({ ...data, ...(changedDue ? { alertsSent: {} } : {}) });
  res.json({ success: true, data: serializeDeadline(d, ctx.v.mileage) });
};

export const deleteDeadline = async (req, res) => {
  const ctx = await loadManaged(req, res); if (!ctx) return;
  await VehicleDeadline.destroy({ where: { id: req.params.did, vehicleId: ctx.v.id } });
  res.json({ success: true });
};

// POST /api/vehicles/:id/deadlines/:did/done { date, mileage, cost, garage, attachmentPath, dueDate? }
// Échéance réalisée : prochaine échéance calculée (date + mois, km + intervalle),
// et un entretien enregistré pour la vidange / le contrôle.
export const completeDeadline = async (req, res) => {
  const ctx = await loadManaged(req, res); if (!ctx) return;
  const { v } = ctx;
  const d = await VehicleDeadline.findOne({ where: { id: req.params.did, vehicleId: v.id } });
  if (!d) return res.status(404).json({ success: false, message: 'Échéance introuvable.' });
  const date = isoDate(req.body?.date) || todayIso();
  const mileage = intOrNull(req.body?.mileage) ?? v.mileage;
  const nextDate = isoDate(req.body?.dueDate) || (d.intervalMonths ? addMonths(date, d.intervalMonths) : null);
  const nextKm = d.intervalKm && mileage != null ? mileage + d.intervalKm : null;
  await d.update({
    lastDoneDate: date, lastDoneMileage: mileage, dueDate: nextDate, dueMileage: nextKm, alertsSent: {},
    attachmentPath: okPath(req.body?.attachmentPath) || d.attachmentPath,
  });
  if (mileage != null && (v.mileage == null || mileage > v.mileage)) await v.update({ mileage });
  const cost = intOrNull(req.body?.cost);
  if (['vidange', 'visite_technique', 'extincteur'].includes(d.kind) || cost) {
    await VehicleMaintenance.create({
      vehicleId: v.id, kind: d.kind === 'vidange' ? 'vidange' : 'revision', status: 'terminee', date, mileage,
      description: d.label, garage: String(req.body?.garage || '').slice(0, 120) || null, cost,
      attachmentPath: okPath(req.body?.attachmentPath), deadlineId: d.id, createdBy: req.user.id, createdByName: userName(req.user),
    });
  }
  res.json({ success: true, data: serializeDeadline(d, v.mileage) });
};

// ── Carburant (conducteurs et responsables) ──────────────────────────────────
export const createFuelLog = async (req, res) => {
  const ctx = await loadManaged(req, res, { allowCheckers: true }); if (!ctx) return;
  const { v } = ctx;
  const liters = Math.round(Number(String(req.body?.liters ?? '').replace(',', '.')) * 100) / 100;
  if (!Number.isFinite(liters) || liters <= 0 || liters > 1000) return res.status(400).json({ success: false, message: 'Indiquez le nombre de litres.' });
  const mileage = intOrNull(req.body?.mileage);
  const log = await VehicleFuelLog.create({
    vehicleId: v.id, date: isoDate(req.body?.date) || todayIso(), liters, amount: intOrNull(req.body?.amount),
    mileage, fullTank: req.body?.fullTank !== false, station: String(req.body?.station || '').trim().slice(0, 120) || null,
    attachmentPath: okPath(req.body?.attachmentPath), createdBy: req.user.id, createdByName: userName(req.user),
  });
  if (mileage != null && (v.mileage == null || mileage > v.mileage)) await v.update({ mileage });
  res.status(201).json({ success: true, data: log });
};

export const deleteFuelLog = async (req, res) => {
  const ctx = await loadManaged(req, res); if (!ctx) return;
  await VehicleFuelLog.destroy({ where: { id: req.params.fid, vehicleId: ctx.v.id } });
  res.json({ success: true });
};

// ── Entretien et réparations (responsables) ──────────────────────────────────
const cleanMaintenance = (b = {}) => ({
  kind: MAINTENANCE_KINDS.includes(b.kind) ? b.kind : 'autre',
  status: ['a_faire', 'en_cours', 'terminee'].includes(b.status) ? b.status : 'terminee',
  date: isoDate(b.date) || todayIso(),
  mileage: intOrNull(b.mileage),
  description: String(b.description || '').trim().slice(0, 2000) || null,
  garage: String(b.garage || '').trim().slice(0, 120) || null,
  cost: intOrNull(b.cost),
  attachmentPath: okPath(b.attachmentPath),
});

// Après un entretien : kilométrage, et état du véhicule
//  - immobilize : réparation à faire / en cours qui immobilise le véhicule → indisponible ;
//  - putBackInService : réparation terminée → véhicule remis en service.
async function afterMaintenance(v, m, { putBackInService, immobilize }) {
  if (m.mileage != null && (v.mileage == null || m.mileage > v.mileage)) await v.update({ mileage: m.mileage });
  if (putBackInService && m.status === 'terminee' && v.status === 'indisponible') {
    await v.update({ status: 'disponible', unavailableReason: null });
  } else if (immobilize && m.status !== 'terminee' && v.status === 'disponible') {
    await v.update({ status: 'indisponible', unavailableReason: `En entretien : ${m.description || m.kind}`.slice(0, 255) });
  }
}

export const createMaintenance = async (req, res) => {
  const ctx = await loadManaged(req, res); if (!ctx) return;
  const { v } = ctx;
  const data = cleanMaintenance(req.body);
  const m = await VehicleMaintenance.create({ ...data, vehicleId: v.id, checkId: req.body?.checkId || null, createdBy: req.user.id, createdByName: userName(req.user) });
  await afterMaintenance(v, m, { putBackInService: !!req.body?.putBackInService, immobilize: !!req.body?.immobilize });
  res.status(201).json({ success: true, data: m });
};

export const updateMaintenance = async (req, res) => {
  const ctx = await loadManaged(req, res); if (!ctx) return;
  const { v } = ctx;
  const m = await VehicleMaintenance.findOne({ where: { id: req.params.mid, vehicleId: v.id } });
  if (!m) return res.status(404).json({ success: false, message: 'Entretien introuvable.' });
  await m.update(cleanMaintenance({ ...m.toJSON(), ...req.body }));
  await afterMaintenance(v, m, { putBackInService: !!req.body?.putBackInService, immobilize: !!req.body?.immobilize });
  res.json({ success: true, data: m });
};

export const deleteMaintenance = async (req, res) => {
  const ctx = await loadManaged(req, res); if (!ctx) return;
  await VehicleMaintenance.destroy({ where: { id: req.params.mid, vehicleId: ctx.v.id } });
  res.json({ success: true });
};

// ── Vue d'ensemble du parc (responsables) ────────────────────────────────────
export const fleetOverview = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const vehicles = (await Vehicle.findAll({ where: { isActive: true }, order: [['label', 'ASC']] })).filter((v) => canManage(acc, v));
    if (!vehicles.length && !acc.fleetManager) return res.status(403).json({ success: false, message: 'Accès réservé aux responsables.' });
    const ids = vehicles.map((v) => v.id);
    const since30 = addMonths(todayIso(), -1);
    const startYear = `${todayIso().slice(0, 4)}-01-01`;
    const [deadlines, fuel, maint] = ids.length ? await Promise.all([
      VehicleDeadline.findAll({ where: { vehicleId: ids } }),
      VehicleFuelLog.findAll({ where: { vehicleId: ids, date: { [Op.gte]: since30 } } }),
      VehicleMaintenance.findAll({ where: { vehicleId: ids, [Op.or]: [{ date: { [Op.gte]: startYear } }, { status: { [Op.ne]: 'terminee' } }] } }),
    ]) : [[], [], []];
    const order = { depassee: 0, bientot: 1, a_renseigner: 2, ok: 3 };
    const rows = vehicles.map((v) => {
      const ds = deadlines.filter((d) => d.vehicleId === v.id).map((d) => serializeDeadline(d, v.mileage)).sort((a, b) => order[a.status] - order[b.status]);
      return {
        id: v.id, label: v.label, immatriculation: v.immatriculation, vehicleType: v.vehicleType, status: v.status, unavailableReason: v.unavailableReason,
        mileage: v.mileage, brand: v.brand, model: v.model,
        deadlines: ds,
        fuel30Amount: fuel.filter((f) => f.vehicleId === v.id).reduce((n, f) => n + (f.amount || 0), 0),
        fuel30Liters: Math.round(fuel.filter((f) => f.vehicleId === v.id).reduce((n, f) => n + Number(f.liters), 0)),
        maintenanceYearCost: maint.filter((m) => m.vehicleId === v.id && m.date >= startYear).reduce((n, m) => n + (m.cost || 0), 0),
        openMaintenances: maint.filter((m) => m.vehicleId === v.id && m.status !== 'terminee').length,
      };
    });
    const allDeadlines = rows.flatMap((r) => r.deadlines.filter((d) => ['depassee', 'bientot'].includes(d.status)).map((d) => ({ ...d, vehicle: { id: r.id, label: r.label, immatriculation: r.immatriculation } })))
      .sort((a, b) => order[a.status] - order[b.status] || String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')));
    res.json({
      success: true,
      data: {
        vehicles: rows,
        deadlines: allDeadlines,
        totals: {
          vehicles: rows.length,
          available: rows.filter((r) => r.status === 'disponible').length,
          onMission: rows.filter((r) => r.status === 'en_mission').length,
          unavailable: rows.filter((r) => r.status === 'indisponible').length,
          overdue: allDeadlines.filter((d) => d.status === 'depassee').length,
          soon: allDeadlines.filter((d) => d.status === 'bientot').length,
          fuel30Amount: rows.reduce((n, r) => n + r.fuel30Amount, 0),
          maintenanceYearCost: rows.reduce((n, r) => n + r.maintenanceYearCost, 0),
        },
      },
    });
  } catch (error) {
    console.error('Suivi du parc :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};
