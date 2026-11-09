// backend/src/controllers/vehicleShiftController.js
// Fiche « Prise de poste » RO SAU (demande de la responsable, 09/11/2026) :
// chaque matin, le personnel coche le matériel vital de chaque ambulance sur
// UNE seule fiche (l'une puis l'autre), compte les bouteilles d'oxygène à bord
// et le stock en réserve (pleines / vides). Elle remplace les contrôles de
// départ / retour à chaque mission pour les ambulances.
//  - point critique en anomalie → ambulance indisponible + manque suivi
//  - oxygène : alerte « commander » / « urgent » quand le niveau se dégrade
//  - fiche PDF signée, archivée et transmise au Chef de pôle RO SAU
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { Op } from 'sequelize';
import { Vehicle, VehicleShiftCheck, VehicleShortage, Document, Tenant, AuditLog } from '../models/index.js';
import {
  fleetAccess, canManage, canCheck, templateFor, sectionsForRole, notifyVehicleManagers, shareWithVehicleManagers,
  CHECK_DIR, userName, fmtFr,
} from './vehicleController.js';
import { evaluateAnswers, doualaDay } from '../utils/vehicleChecklist.js';
import { oxygenStatus, oxygenWorsened, cleanCount, BOTTLES_PER_AMBULANCE } from '../utils/vehicleShift.js';
import { buildVehicleShiftPdf, OXYGEN_TEXT } from '../utils/vehicleShiftPdf.js';
import { parseSignaturePng } from './manualSignatureController.js';
import { syncShiftShortages, shortageSummary } from './vehicleShortageController.js';
import { resolveStoredFile } from '../utils/storedFiles.js';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const REASON = /^Prise de poste/;

/** Points de la prise de poste d'une ambulance : sections du soignant (matériel vital). */
export async function shiftItemsOf(vehicle) {
  const tpl = await templateFor(vehicle);
  const sections = sectionsForRole(tpl.sections || [], 'Soignant');
  return { items: sections.flatMap((s) => s.items || []), sectionLabel: sections.map((s) => s.label).join(' · ') || 'Matériel médical' };
}

/** Ambulances que l'utilisateur peut contrôler. */
async function visibleAmbulances(acc) {
  const all = await Vehicle.findAll({ where: { isActive: true, vehicleType: 'ambulance' }, order: [['label', 'ASC']] });
  return all.filter((v) => canCheck(acc, v, null));
}

export const shiftSummary = (s) => ({
  id: s.id, date: s.shiftDate, at: s.performedAt, by: s.performedByName, anomalies: s.anomalies, critical: s.criticalAnomaly,
  reserveFull: s.reserveFull, reserveEmpty: s.reserveEmpty, oxygenLevel: s.oxygenLevel, documentId: s.documentId,
  vehicles: (s.vehicles || []).map((v) => ({ vehicleId: v.vehicleId, label: v.label, bottles: v.bottles, anomalies: v.anomalies, critical: v.critical, answered: v.answered, total: v.total })),
});

/** Dernière prise de poste couvrant une ambulance (pour l'état « contrôlée » de l'OM). */
export async function lastShiftFor(vehicleId) {
  const s = await VehicleShiftCheck.findOne({ where: { vehicles: { [Op.contains]: [{ vehicleId }] } }, order: [['performedAt', 'DESC']] });
  if (!s) return null;
  const v = (s.vehicles || []).find((x) => x.vehicleId === vehicleId);
  return v ? { at: s.performedAt, by: s.performedByName, date: s.shiftDate, ...v } : null;
}

/** Prise de poste du jour faite pour cette ambulance ? */
export async function shiftDoneToday(vehicleId) {
  return (await VehicleShiftCheck.count({ where: { shiftDate: doualaDay().date, vehicles: { [Op.contains]: [{ vehicleId }] } } })) > 0;
}

/** État de l'oxygène d'après la dernière prise de poste. */
export async function currentOxygen() {
  const last = await VehicleShiftCheck.findOne({ where: { reserveFull: { [Op.ne]: null } }, order: [['performedAt', 'DESC']] });
  if (!last) return null;
  const st = oxygenStatus({ reserveFull: last.reserveFull, reserveEmpty: last.reserveEmpty, onboard: (last.vehicles || []).map((v) => ({ label: v.label, bottles: v.bottles })) });
  return { ...st, level: last.oxygenLevel || st.level, at: last.performedAt, by: last.performedByName, reserveFull: last.reserveFull, reserveEmpty: last.reserveEmpty, onboard: (last.vehicles || []).map((v) => ({ vehicleId: v.vehicleId, label: v.label, bottles: v.bottles })) };
}

// GET /api/vehicles/shift — écran de la prise de poste
export const getShiftState = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const vehicles = await visibleAmbulances(acc);
    if (!vehicles.length) return res.status(403).json({ success: false, message: 'Aucune ambulance à contrôler.' });
    const today = doualaDay();
    const ambulances = [];
    for (const v of vehicles) {
      const { items, sectionLabel } = await shiftItemsOf(v);
      ambulances.push({
        id: v.id, label: v.label, immatriculation: v.immatriculation, status: v.status, unavailableReason: v.unavailableReason,
        items, sectionLabel, shortages: await shortageSummary(v.id), canManage: canManage(acc, v),
      });
    }
    const ids = vehicles.map((v) => v.id);
    const history = (await VehicleShiftCheck.findAll({ order: [['performedAt', 'DESC']], limit: 40, attributes: { exclude: ['comment'] } }))
      .filter((s) => (s.vehicles || []).some((x) => ids.includes(x.vehicleId)))
      .slice(0, 20);
    const last = history[0] || null;
    res.json({
      success: true,
      data: {
        today: today.date,
        ambulances,
        perAmbulance: BOTTLES_PER_AMBULANCE,
        todayChecks: history.filter((s) => s.shiftDate === today.date).map(shiftSummary),
        last: last ? { ...shiftSummary(last), answers: Object.fromEntries((last.vehicles || []).map((v) => [v.vehicleId, v.answers || []])) } : null,
        oxygen: await currentOxygen(),
        history: history.map(shiftSummary),
      },
    });
  } catch (error) {
    console.error('Prise de poste (état) :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/vehicles/shift
// body : { vehicles: [{ vehicleId, answers: [{ itemId, status, value, comment }], bottles }], reserveFull, reserveEmpty, comment, signature }
export const submitShift = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const allowed = await visibleAmbulances(acc);
    const byId = new Map(allowed.map((v) => [v.id, v]));
    const sigBytes = parseSignaturePng(req.body?.signature);
    if (!sigBytes) return res.status(400).json({ success: false, message: 'La signature est obligatoire.' });

    const rows = [];
    for (const raw of (Array.isArray(req.body?.vehicles) ? req.body.vehicles : [])) {
      const v = byId.get(String(raw?.vehicleId));
      if (!v || rows.some((r) => r.v.id === v.id)) continue;
      const { items } = await shiftItemsOf(v);
      const result = evaluateAnswers(items, raw.answers);
      const bottles = cleanCount(raw.bottles);
      if (!result.answered && bottles === null) continue;
      rows.push({ v, items, result, bottles });
    }
    if (!rows.length) return res.status(400).json({ success: false, message: 'Aucune ambulance contrôlée.' });
    const reserveFull = cleanCount(req.body?.reserveFull);
    const reserveEmpty = cleanCount(req.body?.reserveEmpty);
    const oxygen = oxygenStatus({ reserveFull, reserveEmpty, onboard: rows.map((r) => ({ label: r.v.label, bottles: r.bottles })) });

    await fs.mkdir(path.resolve(process.cwd(), CHECK_DIR), { recursive: true });
    const sigPath = `${CHECK_DIR}/signature-pp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`;
    await fs.writeFile(path.resolve(process.cwd(), sigPath), sigBytes);
    const now = new Date();
    const previous = await VehicleShiftCheck.findOne({ where: { reserveFull: { [Op.ne]: null } }, order: [['performedAt', 'DESC']], attributes: ['oxygenLevel'] });
    const shift = await VehicleShiftCheck.create({
      shiftDate: doualaDay(now).date,
      vehicles: rows.map(({ v, items, result, bottles }) => ({
        vehicleId: v.id, label: v.label, immatriculation: v.immatriculation, items, answers: result.answers, bottles,
        answered: result.answered, total: result.total, anomalies: result.anomalies, critical: result.critical,
      })),
      reserveFull, reserveEmpty, oxygenLevel: oxygen.level,
      anomalies: rows.reduce((n, r) => n + r.result.anomalies, 0),
      criticalAnomaly: rows.some((r) => r.result.critical),
      comment: String(req.body?.comment || '').trim().slice(0, 2000) || null,
      performedBy: req.user.id, performedByName: userName(req.user), performedAt: now, signaturePath: sigPath,
    });

    // Par ambulance : manques suivis et disponibilité
    const fresh = [];
    for (const { v, items, result } of rows) {
      try {
        const sync = await syncShiftShortages(v, items, result.answers, req.user);
        sync.fresh.forEach((f) => fresh.push({ vehicle: v, f }));
      } catch (err) {
        console.error('Prise de poste (manques) :', err);
      }
      if (result.critical) {
        const bad = items.filter((it) => it.critical && result.answers.some((a) => a.itemId === it.id && ['ko', 'absent'].includes(a.status))).map((it) => it.label);
        await v.update({ status: 'indisponible', unavailableReason: `Prise de poste : ${bad.join(', ')}`.slice(0, 255) });
      } else if (v.status === 'indisponible' && REASON.test(v.unavailableReason || '')) {
        const left = await VehicleShortage.count({ where: { vehicleId: v.id, critical: true, status: { [Op.in]: ['a_commander', 'commande'] } } });
        if (!left) await v.update({ status: 'disponible', unavailableReason: null });
      }
    }

    // Fiche PDF archivée et transmise au responsable
    try {
      const tenant = await Tenant.findByPk(req.user.tenantId, { attributes: ['name'] });
      const pdf = await buildVehicleShiftPdf({ tenantName: tenant?.name, shift, oxygen });
      const fileName = `prise-de-poste-${Date.now()}.pdf`;
      await fs.writeFile(path.resolve(process.cwd(), 'uploads', fileName), pdf);
      const first = rows[0].v;
      const doc = await Document.create({
        title: `Prise de poste ambulances — ${rows.map((r) => r.v.label).join(', ')} — ${fmtFr(now)}`,
        fileName, originalName: fileName, filePath: `uploads/${fileName}`, fileSize: pdf.length, fileType: 'application/pdf',
        userId: req.user.id, category: 'Contrôle véhicule', status: 'approved',
        visibility: first.serviceId ? 'service' : 'personal', serviceId: first.serviceId || null,
        metadata: { sourceType: 'vehicle_shift', shiftId: shift.id, vehicleIds: rows.map((r) => r.v.id) },
      });
      await shift.update({ documentId: doc.id, sha256: sha256(pdf) });
      await shareWithVehicleManagers(doc, first, req.user.id);
    } catch (err) {
      console.error('Fiche PDF prise de poste :', err);
    }

    // Alertes : nouvelles anomalies, et oxygène seulement quand il se dégrade
    const first = rows[0].v;
    if (fresh.length) {
      const lines = fresh.map(({ vehicle, f }) => `${vehicle.label} — ${f.label} : ${f.kind === 'niveau' ? 'sous le minimum' : 'hors service'}`);
      notifyVehicleManagers(first, {
        title: `${fresh.some((x) => x.f.critical) ? '🚨' : '⚠️'} Prise de poste : ${fresh.length} anomalie(s)`,
        body: `Prise de poste de ${userName(req.user)}\n${lines.slice(0, 8).join('\n')}`,
        url: '/vehicules?tab=manques',
      }).catch(() => {});
    }
    if (oxygenWorsened(previous?.oxygenLevel, oxygen.level)) {
      notifyVehicleManagers(first, {
        title: `${oxygen.level === 'urgent' ? '🚨' : '🫧'} Oxygène : ${oxygen.level === 'urgent' ? 'URGENT' : 'passer commande'}`,
        body: `${OXYGEN_TEXT[oxygen.level]}.\nRéserve : ${reserveFull} pleine(s), ${reserveEmpty ?? '?'} vide(s)${oxygen.short.length ? `\nMoins de ${BOTTLES_PER_AMBULANCE} bouteilles : ${oxygen.short.join(', ')}` : ''}`,
        url: '/vehicules?tab=prise',
      }).catch(() => {});
    }

    AuditLog.log(req, 'VEHICLE_SHIFT_CHECK', 'vehicle', first.id, { shiftId: shift.id, vehicles: rows.length, anomalies: shift.anomalies, oxygen: oxygen.level });
    res.status(201).json({ success: true, data: { shift: shiftSummary(shift), oxygen, fresh: fresh.length } });
  } catch (error) {
    console.error('Prise de poste :', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement de la prise de poste.' });
  }
};

// GET /api/vehicles/shift/:sid/pdf
export const getShiftPdf = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const s = await VehicleShiftCheck.findByPk(req.params.sid);
    if (!s?.documentId) return res.status(404).end();
    const vehicles = await Vehicle.findAll({ where: { id: (s.vehicles || []).map((v) => v.vehicleId) } });
    if (!vehicles.some((v) => canManage(acc, v) || canCheck(acc, v, null))) return res.status(403).end();
    const doc = await Document.findByPk(s.documentId, { attributes: ['filePath'] });
    if (!doc) return res.status(404).end();
    res.type('application/pdf').sendFile(resolveStoredFile(doc.filePath));
  } catch (error) {
    res.status(500).end();
  }
};

/** Prise de poste du jour à faire (membres du service des ambulances). */
export async function myPendingShift(user) {
  const acc = await fleetAccess(user);
  if (!acc.serviceIds?.length) return [];
  const vehicles = await Vehicle.findAll({ where: { isActive: true, vehicleType: 'ambulance', serviceId: acc.serviceIds } });
  const todo = [];
  for (const v of vehicles) if (!(await shiftDoneToday(v.id))) todo.push({ id: v.id, label: v.label, immatriculation: v.immatriculation });
  return todo.length ? [{ type: 'prise_de_poste', vehicles: todo, vehicle: todo[0] }] : [];
}
