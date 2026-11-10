// backend/src/controllers/vehicleShiftController.js
// Fiche « Prise de poste » RO SAU (demande de la responsable, 09/11/2026) :
// chaque matin, UNE fiche pour les ambulances (l'une puis l'autre), en deux
// parties selon la fonction de chacun (10/11/2026) :
//  - soignant  : matériel médical vital, bouteilles d'oxygène à bord et
//                stock en réserve (pleines / vides)
//  - chauffeur : section « Véhicule » (carburant, freins, pneus…) + kilométrage
// Elle remplace les contrôles de départ / retour à chaque mission.
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
  CHECK_DIR, userName, fmtFr, shiftPartsFor,
} from './vehicleController.js';
import { evaluateAnswers, doualaDay } from '../utils/vehicleChecklist.js';
import { oxygenStatus, oxygenWorsened, cleanCount, BOTTLES_PER_AMBULANCE } from '../utils/vehicleShift.js';
import { buildVehicleShiftPdf, OXYGEN_TEXT } from '../utils/vehicleShiftPdf.js';
import { parseSignaturePng } from './manualSignatureController.js';
import { syncShiftShortages, shortageSummary } from './vehicleShortageController.js';
import { resolveStoredFile } from '../utils/storedFiles.js';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const REASON = /^Prise de poste/;

export const PARTS = ['soignant', 'chauffeur'];
export const PART_LABEL = { soignant: 'Matériel médical et oxygène', chauffeur: 'Véhicule' };

/** Points d'une partie de la prise de poste : sections du soignant ou du chauffeur. */
export async function shiftItemsOf(vehicle, part = 'soignant') {
  const tpl = await templateFor(vehicle);
  const sections = sectionsForRole(tpl.sections || [], part === 'chauffeur' ? 'Chauffeur' : 'Soignant');
  return {
    items: sections.flatMap((s) => s.items || []),
    sectionLabel: sections.map((s) => s.label).join(' · ') || (part === 'chauffeur' ? 'Véhicule' : 'Matériel médical'),
    askMileage: part === 'chauffeur' && sections.some((s) => s.askMileage),
  };
}

/** Ambulances que l'utilisateur peut contrôler, avec ses parties. */
async function visibleAmbulances(acc) {
  const all = await Vehicle.findAll({ where: { isActive: true, vehicleType: 'ambulance' }, order: [['label', 'ASC']] });
  return all.map((v) => ({ v, parts: shiftPartsFor(acc, v) })).filter((x) => x.parts.length);
}

export const shiftSummary = (s) => ({
  id: s.id, date: s.shiftDate, part: s.part || 'soignant', at: s.performedAt, by: s.performedByName, anomalies: s.anomalies, critical: s.criticalAnomaly,
  reserveFull: s.reserveFull, reserveEmpty: s.reserveEmpty, oxygenLevel: s.oxygenLevel, documentId: s.documentId,
  vehicles: (s.vehicles || []).map((v) => ({ vehicleId: v.vehicleId, label: v.label, bottles: v.bottles, mileage: v.mileage ?? null, anomalies: v.anomalies, critical: v.critical, answered: v.answered, total: v.total })),
});

/**
 * Dernière prise de poste d'une ambulance (pour l'état « contrôlée » de l'OM) :
 * les deux parties (véhicule + matériel) additionnées.
 */
export async function lastShiftFor(vehicleId) {
  const parts = [];
  for (const part of PARTS) {
    const s = await VehicleShiftCheck.findOne({ where: { part, vehicles: { [Op.contains]: [{ vehicleId }] } }, order: [['performedAt', 'DESC']] });
    const v = s && (s.vehicles || []).find((x) => x.vehicleId === vehicleId);
    if (v) parts.push({ part, at: s.performedAt, by: s.performedByName, date: s.shiftDate, ...v });
  }
  if (!parts.length) return null;
  const latest = parts.reduce((a, b) => (new Date(a.at) > new Date(b.at) ? a : b));
  const today = doualaDay().date;
  return {
    at: latest.at, by: latest.by, date: latest.date,
    answered: parts.reduce((n, p) => n + (p.answered || 0), 0),
    // une partie jamais faite compte comme non vérifiée
    total: parts.reduce((n, p) => n + (p.total || 0), 0) + (parts.length < PARTS.length ? 1 : 0),
    anomalies: parts.reduce((n, p) => n + (p.anomalies || 0), 0),
    critical: parts.some((p) => p.critical),
    bottles: parts.find((p) => p.part === 'soignant')?.bottles ?? null,
    todayParts: parts.filter((p) => p.date === today).map((p) => p.part),
    parts: parts.map((p) => ({ part: p.part, at: p.at, by: p.by, date: p.date, answered: p.answered, total: p.total, anomalies: p.anomalies })),
  };
}

/** Partie de la prise de poste faite aujourd'hui pour cette ambulance ? */
export async function shiftDoneToday(vehicleId, part = 'soignant') {
  return (await VehicleShiftCheck.count({ where: { part, shiftDate: doualaDay().date, vehicles: { [Op.contains]: [{ vehicleId }] } } })) > 0;
}

/** État de l'oxygène d'après la dernière prise de poste. */
export async function currentOxygen() {
  const last = await VehicleShiftCheck.findOne({ where: { part: 'soignant', reserveFull: { [Op.ne]: null } }, order: [['performedAt', 'DESC']] });
  if (!last) return null;
  const st = oxygenStatus({ reserveFull: last.reserveFull, reserveEmpty: last.reserveEmpty, onboard: (last.vehicles || []).map((v) => ({ label: v.label, bottles: v.bottles })) });
  return { ...st, level: last.oxygenLevel || st.level, at: last.performedAt, by: last.performedByName, reserveFull: last.reserveFull, reserveEmpty: last.reserveEmpty, onboard: (last.vehicles || []).map((v) => ({ vehicleId: v.vehicleId, label: v.label, bottles: v.bottles })) };
}

// GET /api/vehicles/shift — écran de la prise de poste
export const getShiftState = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const visible = await visibleAmbulances(acc);
    if (!visible.length) return res.status(403).json({ success: false, message: 'Aucune ambulance à contrôler.' });
    const today = doualaDay();
    const myParts = PARTS.filter((p) => visible.some((x) => x.parts.includes(p)));
    const ambulances = [];
    for (const { v, parts } of visible) {
      const byPart = {};
      for (const part of parts) byPart[part] = await shiftItemsOf(v, part);
      ambulances.push({
        id: v.id, label: v.label, immatriculation: v.immatriculation, status: v.status, unavailableReason: v.unavailableReason,
        mileage: v.mileage, parts: byPart, shortages: await shortageSummary(v.id), canManage: canManage(acc, v),
      });
    }
    const ids = visible.map((x) => x.v.id);
    const history = (await VehicleShiftCheck.findAll({ where: { part: myParts }, order: [['performedAt', 'DESC']], limit: 60, attributes: { exclude: ['comment'] } }))
      .filter((s) => (s.vehicles || []).some((x) => ids.includes(x.vehicleId)))
      .slice(0, 20);
    const lastOf = (part) => history.find((s) => (s.part || 'soignant') === part) || null;
    res.json({
      success: true,
      data: {
        today: today.date,
        myParts,
        partLabels: PART_LABEL,
        ambulances,
        perAmbulance: BOTTLES_PER_AMBULANCE,
        todayChecks: history.filter((s) => s.shiftDate === today.date).map(shiftSummary),
        last: Object.fromEntries(myParts.map((p) => [p, lastOf(p) ? shiftSummary(lastOf(p)) : null])),
        oxygen: myParts.includes('soignant') ? await currentOxygen() : null,
        history: history.map(shiftSummary),
      },
    });
  } catch (error) {
    console.error('Prise de poste (état) :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/vehicles/shift
// body : { part: 'soignant'|'chauffeur', vehicles: [{ vehicleId, answers: [{ itemId, status, value, comment }], bottles, mileage }],
//          reserveFull, reserveEmpty (soignant), comment, signature }
export const submitShift = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const part = PARTS.includes(req.body?.part) ? req.body.part : 'soignant';
    const allowed = (await visibleAmbulances(acc)).filter((x) => x.parts.includes(part)).map((x) => x.v);
    if (!allowed.length) return res.status(403).json({ success: false, message: part === 'chauffeur' ? 'Partie réservée au chauffeur.' : 'Partie réservée au personnel soignant.' });
    const byId = new Map(allowed.map((v) => [v.id, v]));
    const sigBytes = parseSignaturePng(req.body?.signature);
    if (!sigBytes) return res.status(400).json({ success: false, message: 'La signature est obligatoire.' });

    const rows = [];
    for (const raw of (Array.isArray(req.body?.vehicles) ? req.body.vehicles : [])) {
      const v = byId.get(String(raw?.vehicleId));
      if (!v || rows.some((r) => r.v.id === v.id)) continue;
      const { items } = await shiftItemsOf(v, part);
      const result = evaluateAnswers(items, raw.answers);
      const bottles = part === 'soignant' ? cleanCount(raw.bottles) : null;
      let mileage = null;
      if (part === 'chauffeur' && raw.mileage !== '' && raw.mileage !== null && raw.mileage !== undefined) {
        const n = Math.round(Number(raw.mileage));
        if (!Number.isFinite(n) || n < 0 || n > 5_000_000) return res.status(400).json({ success: false, message: `Kilométrage invalide (${v.label}).` });
        mileage = n;
      }
      if (!result.answered && bottles === null && mileage === null) continue;
      rows.push({ v, items, result, bottles, mileage });
    }
    if (!rows.length) return res.status(400).json({ success: false, message: 'Aucune ambulance contrôlée.' });
    const reserveFull = part === 'soignant' ? cleanCount(req.body?.reserveFull) : null;
    const reserveEmpty = part === 'soignant' ? cleanCount(req.body?.reserveEmpty) : null;
    const oxygen = part === 'soignant'
      ? oxygenStatus({ reserveFull, reserveEmpty, onboard: rows.map((r) => ({ label: r.v.label, bottles: r.bottles })) })
      : { level: null, short: [], total: 0 };

    await fs.mkdir(path.resolve(process.cwd(), CHECK_DIR), { recursive: true });
    const sigPath = `${CHECK_DIR}/signature-pp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`;
    await fs.writeFile(path.resolve(process.cwd(), sigPath), sigBytes);
    const now = new Date();
    const previous = await VehicleShiftCheck.findOne({ where: { part: 'soignant', reserveFull: { [Op.ne]: null } }, order: [['performedAt', 'DESC']], attributes: ['oxygenLevel'] });
    const shift = await VehicleShiftCheck.create({
      shiftDate: doualaDay(now).date,
      part,
      vehicles: rows.map(({ v, items, result, bottles, mileage }) => ({
        vehicleId: v.id, label: v.label, immatriculation: v.immatriculation, items, answers: result.answers, bottles, mileage,
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
    for (const { v, items, result, mileage } of rows) {
      if (mileage !== null && (v.mileage === null || mileage > v.mileage)) await v.update({ mileage });
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
      const pdf = await buildVehicleShiftPdf({ tenantName: tenant?.name, shift, oxygen, partLabel: PART_LABEL[part] });
      const fileName = `prise-de-poste-${part}-${Date.now()}.pdf`;
      await fs.writeFile(path.resolve(process.cwd(), 'uploads', fileName), pdf);
      const first = rows[0].v;
      const doc = await Document.create({
        title: `Prise de poste ${part === 'chauffeur' ? 'chauffeur (véhicule)' : 'soignant (matériel)'} — ${rows.map((r) => r.v.label).join(', ')} — ${fmtFr(now)}`,
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
        title: `${fresh.some((x) => x.f.critical) ? '🚨' : '⚠️'} Prise de poste ${part === 'chauffeur' ? 'chauffeur' : 'soignant'} : ${fresh.length} anomalie(s)`,
        body: `Prise de poste de ${userName(req.user)}\n${lines.slice(0, 8).join('\n')}`,
        url: '/vehicules?tab=manques',
      }).catch(() => {});
    }
    if (part === 'soignant' && oxygenWorsened(previous?.oxygenLevel, oxygen.level)) {
      notifyVehicleManagers(first, {
        title: `${oxygen.level === 'urgent' ? '🚨' : '🫧'} Oxygène : ${oxygen.level === 'urgent' ? 'URGENT' : 'passer commande'}`,
        body: `${OXYGEN_TEXT[oxygen.level]}.\nRéserve : ${reserveFull} pleine(s), ${reserveEmpty ?? '?'} vide(s)${oxygen.short.length ? `\nMoins de ${BOTTLES_PER_AMBULANCE} bouteilles : ${oxygen.short.join(', ')}` : ''}`,
        url: '/vehicules?tab=prise',
      }).catch(() => {});
    }

    AuditLog.log(req, 'VEHICLE_SHIFT_CHECK', 'vehicle', first.id, { shiftId: shift.id, part, vehicles: rows.length, anomalies: shift.anomalies, oxygen: oxygen.level });
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
    if (!vehicles.some((v) => canManage(acc, v) || shiftPartsFor(acc, v).includes(s.part || 'soignant'))) return res.status(403).end();
    const doc = await Document.findByPk(s.documentId, { attributes: ['filePath'] });
    if (!doc) return res.status(404).end();
    res.type('application/pdf').sendFile(resolveStoredFile(doc.filePath));
  } catch (error) {
    res.status(500).end();
  }
};

/** Prise de poste du jour à faire (membres du service des ambulances), selon sa fonction. */
export async function myPendingShift(user) {
  const acc = await fleetAccess(user);
  if (!acc.serviceIds?.length) return [];
  const vehicles = await Vehicle.findAll({ where: { isActive: true, vehicleType: 'ambulance', serviceId: acc.serviceIds } });
  const out = [];
  for (const part of PARTS) {
    const todo = [];
    for (const v of vehicles) {
      if (canManage(acc, v) || !shiftPartsFor(acc, v).includes(part)) continue; // les responsables ont l'alerte de 10 h
      if (!(await shiftDoneToday(v.id, part))) todo.push({ id: v.id, label: v.label, immatriculation: v.immatriculation });
    }
    if (todo.length) out.push({ type: 'prise_de_poste', part, vehicles: todo, vehicle: todo[0] });
  }
  return out;
}

/** Fonction de l'utilisateur pour l'inventaire : un chauffeur ne fait pas l'inventaire du matériel médical. */
export const doesInventory = (acc, v) => shiftPartsFor(acc, v).includes('soignant');
