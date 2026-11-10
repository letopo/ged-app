// backend/src/controllers/vehicleInventoryController.js
// Inventaire des ambulances (fiche RO SAU) : chaque jour prévu (tous les jours
// par défaut, réglable dans la check-list), l'infirmier relève les quantités présentes
// (matériel, consommables, médicaments, DSA, oxygène) et signe. Les manques et
// les péremptions du mois forment la liste de réassort envoyée aux
// responsables ; un point critique en défaut rend l'ambulance indisponible.
// La fiche PDF est transmise au responsable de l'ambulance (Chef de pôle RO SAU).
import crypto from 'crypto';
import { resolveStoredFile } from '../utils/storedFiles.js';
import fs from 'fs/promises';
import path from 'path';
import { Op } from 'sequelize';
import { Vehicle, VehicleInventory, VehicleShortage, VehicleMission, Document, Tenant } from '../models/index.js';
import { fleetAccess, canManage, canCheck, templateFor, notifyVehicleManagers, shareWithVehicleManagers, CHECK_DIR, userName, fmtFr } from './vehicleController.js';
import { evaluateInventory, doualaDay, weekStart } from '../utils/vehicleChecklist.js';
import { buildVehicleInventoryPdf } from '../utils/vehicleInventoryPdf.js';
import { parseSignaturePng } from './manualSignatureController.js';
import { syncInventoryShortages, openShortagesOf, serializeShortage } from './vehicleShortageController.js';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Fiche d'inventaire du véhicule (vide si ce n'est pas une ambulance). */
export async function inventoryOf(vehicle) {
  const tpl = await templateFor(vehicle);
  return { sections: tpl.inventorySections || [], days: tpl.inventoryDays || [] };
}

const summary = (inv) => ({
  id: inv.id, date: inv.inventoryDate, at: inv.performedAt, by: inv.performedByName,
  answered: inv.answeredItems, total: inv.totalItems, shortages: inv.shortages, expiring: inv.expiring,
  critical: inv.criticalAnomaly, documentId: inv.documentId, unchanged: !!inv.unchanged,
});

/** Inventaires d'une semaine (lundi → dimanche) : le dernier de chaque jour. */
async function weekOf(vehicleIds, monday) {
  const rows = await VehicleInventory.findAll({
    where: { vehicleId: vehicleIds, inventoryDate: { [Op.between]: [monday, addDays(monday, 6)] } },
    attributes: { exclude: ['answers', 'sections'] },
    order: [['performedAt', 'ASC']],
  });
  const out = new Map();
  for (const r of rows) {
    if (!out.has(r.vehicleId)) out.set(r.vehicleId, {});
    out.get(r.vehicleId)[r.inventoryDate] = summary(r);
  }
  return out;
}

/**
 * Faut-il recompter ? Une sortie (mission) a eu lieu depuis le dernier
 * inventaire réellement compté — y compris une sortie dont l'OM n'a été classé
 * qu'après coup (ex. OM du week-end classés le lundi). Et peut-on confirmer
 * « Rien n'a changé » : ni sortie ni réarmement depuis le dernier inventaire.
 */
export async function recountState(vehicle) {
  const [last, lastCounted] = await Promise.all([
    VehicleInventory.findOne({ where: { vehicleId: vehicle.id }, order: [['performedAt', 'DESC']], attributes: ['id', 'performedAt', 'performedByName', 'unchanged'] }),
    VehicleInventory.findOne({ where: { vehicleId: vehicle.id, unchanged: false }, order: [['performedAt', 'DESC']], attributes: ['id', 'performedAt'] }),
  ]);
  if (!last) return { recountNeeded: false, outings: [], canConfirmUnchanged: false, blocked: 'none' };
  const now = new Date();
  const since = lastCounted?.performedAt || last.performedAt;
  const missions = await VehicleMission.findAll({
    where: {
      vehicleId: vehicle.id, status: { [Op.ne]: 'annulee' },
      [Op.or]: [
        { departedAt: { [Op.gt]: since, [Op.lte]: now } },
        { departedAt: null, plannedDepartureAt: { [Op.gt]: since, [Op.lte]: now } },
      ],
    },
    order: [['plannedDepartureAt', 'ASC']], limit: 10,
  });
  const outings = missions.map((m) => ({ id: m.id, title: m.title, at: m.departedAt || m.plannedDepartureAt, documentId: m.documentId }));
  // Réarmé depuis le dernier inventaire : les quantités ont changé
  const touched = await VehicleShortage.findAll({ where: { vehicleId: vehicle.id, updatedAt: { [Op.gt]: last.performedAt } }, attributes: ['history'] });
  const restocked = touched.some((t) => (t.history || []).some((h) => h.action === 'rearme' && new Date(h.at) > new Date(last.performedAt)));
  const recountNeeded = outings.length > 0;
  return {
    recountNeeded, outings, restocked,
    canConfirmUnchanged: !recountNeeded && !restocked,
    blocked: recountNeeded ? 'sortie' : restocked ? 'rearmement' : null,
    lastCountedAt: lastCounted?.performedAt || null,
  };
}

/** Inventaire attendu aujourd'hui (jour prévu, pas encore fait) ou recomptage après une sortie ? */
export async function inventoryDueToday(vehicle, inv = null) {
  const { sections, days } = inv || await inventoryOf(vehicle);
  if (!sections.length) return false;
  const today = doualaDay();
  if (days.includes(today.weekday) && !(await VehicleInventory.count({ where: { vehicleId: vehicle.id, inventoryDate: today.date } }))) return true;
  return (await recountState(vehicle)).recountNeeded;
}

// GET /api/vehicles/:id/inventory — écran d'inventaire
export const getInventoryState = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const v = await Vehicle.findByPk(req.params.id);
    if (!v) return res.status(404).json({ success: false, message: 'Véhicule introuvable.' });
    if (!canCheck(acc, v, null)) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    const inv = await inventoryOf(v);
    const today = doualaDay();
    const monday = weekStart(today.date);
    const last = await VehicleInventory.findOne({ where: { vehicleId: v.id }, order: [['performedAt', 'DESC']] });
    res.json({
      success: true,
      data: {
        vehicle: { id: v.id, label: v.label, immatriculation: v.immatriculation, status: v.status, unavailableReason: v.unavailableReason },
        sections: inv.sections,
        days: inv.days,
        today: { date: today.date, weekday: today.weekday, due: await inventoryDueToday(v, inv) },
        weekStart: monday,
        week: (await weekOf([v.id], monday)).get(v.id) || {},
        last: last ? { ...summary(last), answers: last.answers, restock: last.restock } : null,
        shortages: ((await openShortagesOf([v.id])).get(v.id) || []).map(serializeShortage),
        recount: await recountState(v),
      },
    });
  } catch (error) {
    console.error('Inventaire ambulance (état) :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/vehicles/:id/inventory — enregistre (et fige) un inventaire signé
// body : { answers: [{ itemId, present, expiring, value, status, comment }], comment, signature }
export const submitInventory = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const v = await Vehicle.findByPk(req.params.id);
    if (!v || !v.isActive) return res.status(404).json({ success: false, message: 'Véhicule introuvable.' });
    if (!canCheck(acc, v, null)) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    const { sections } = await inventoryOf(v);
    if (!sections.length) return res.status(400).json({ success: false, message: 'Pas d\'inventaire prévu pour ce véhicule.' });
    const sigBytes = parseSignaturePng(req.body?.signature);
    if (!sigBytes) return res.status(400).json({ success: false, message: 'La signature est obligatoire.' });
    // « Rien n'a changé » : quantités reprises de l'inventaire précédent, permis
    // seulement sans sortie ni réarmement depuis (vérifié ici, pas seulement à l'écran)
    let basedOn = null;
    if (req.body?.unchanged) {
      const rc = await recountState(v);
      if (!rc.canConfirmUnchanged) {
        return res.status(409).json({ success: false, message: rc.blocked === 'sortie' ? 'L\'ambulance est sortie depuis le dernier comptage : recomptez tout.' : 'Du matériel a été réarmé depuis : recomptez.' });
      }
      basedOn = await VehicleInventory.findOne({ where: { vehicleId: v.id }, order: [['performedAt', 'DESC']] });
    }
    const result = evaluateInventory(sections, basedOn ? basedOn.answers : req.body?.answers);
    if (!result.answered) return res.status(400).json({ success: false, message: 'Aucune ligne relevée.' });

    await fs.mkdir(path.resolve(process.cwd(), CHECK_DIR), { recursive: true });
    const sigPath = `${CHECK_DIR}/signature-inv-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`;
    await fs.writeFile(path.resolve(process.cwd(), sigPath), sigBytes);
    const now = new Date();
    const inventory = await VehicleInventory.create({
      vehicleId: v.id, inventoryDate: doualaDay(now).date, sections, answers: result.answers,
      totalItems: result.total, answeredItems: result.answered, shortages: result.shortages, expiring: result.expiring,
      criticalAnomaly: result.critical, restock: result.restock,
      comment: String(req.body?.comment || '').trim().slice(0, 2000) || null,
      performedBy: req.user.id, performedByName: userName(req.user), performedAt: now, signaturePath: sigPath,
      unchanged: !!basedOn, basedOnId: basedOn?.id || null,
    });

    // Disponibilité : point critique en défaut → indisponible ; un inventaire
    // complet lève une indisponibilité posée par un inventaire précédent.
    // Manques ouverts : l'inventaire retrouve ceux déjà connus (commandés…),
    // crée les nouveaux et ferme ceux relevés au complet.
    let sync = { fresh: result.restock.map((r) => ({ ...r, added: r.missing })), open: result.restock.length, closed: 0 };
    try {
      sync = await syncInventoryShortages(v, inventory, sections, result, req.user);
    } catch (err) {
      console.error('Manques ouverts (inventaire) :', err);
    }

    if (result.critical) {
      const bad = result.restock.filter((r) => sections.some((s) => (s.items || []).some((it) => it.id === r.itemId && it.critical) && (r.missing || r.low || r.ko))).map((r) => r.label);
      await v.update({ status: 'indisponible', unavailableReason: `Inventaire : ${bad.join(', ')}`.slice(0, 255) });
    } else if (v.status === 'indisponible' && /^Inventaire/.test(v.unavailableReason || '')) {
      const criticalLeft = await VehicleShortage.count({ where: { vehicleId: v.id, critical: true, status: { [Op.in]: ['a_commander', 'commande'] } } });
      if (!criticalLeft) await v.update({ status: 'disponible', unavailableReason: null });
    }

    // Fiche PDF archivée dans la GED
    try {
      const tenant = await Tenant.findByPk(v.tenantId, { attributes: ['name'] });
      const pdf = await buildVehicleInventoryPdf({ tenantName: tenant?.name, vehicle: v, inventory, basedOnAt: basedOn?.performedAt || null });
      const fileName = `inventaire-${v.id.slice(0, 8)}-${Date.now()}.pdf`;
      await fs.writeFile(path.resolve(process.cwd(), 'uploads', fileName), pdf);
      const doc = await Document.create({
        title: `Inventaire ambulance${basedOn ? ' (rien n\'a changé)' : ''} — ${v.label} (${v.immatriculation}) — ${fmtFr(now)}`,
        fileName, originalName: fileName, filePath: `uploads/${fileName}`, fileSize: pdf.length, fileType: 'application/pdf',
        userId: req.user.id, category: 'Contrôle véhicule', status: 'approved',
        visibility: v.serviceId ? 'service' : 'personal', serviceId: v.serviceId || null,
        metadata: { sourceType: 'vehicle_inventory', vehicleId: v.id, inventoryId: inventory.id },
      });
      await inventory.update({ documentId: doc.id, sha256: sha256(pdf) });
      await shareWithVehicleManagers(doc, v, req.user.id);
    } catch (err) {
      console.error('Fiche PDF inventaire :', err);
    }

    // Alerte aux responsables : seulement ce qui est NOUVEAU (un manque déjà
    // commandé ne repart pas dans une nouvelle liste).
    if (sync.fresh.length) {
      const lines = sync.fresh.map((f) => (f.kind === 'niveau' || f.low ? `${f.label} : sous le minimum`
        : f.kind === 'panne' || f.ko ? `${f.label} : hors service`
        : f.kind === 'peremption' || (f.expiring && !f.missing) ? `${f.label} : périme ce mois`
        : `${f.label} : ${f.existing ? `+${f.added}` : `manque ${f.added ?? f.quantity}`}${f.unit ? ` ${f.unit}` : ''}`));
      const urgent = sync.fresh.some((f) => f.critical);
      notifyVehicleManagers(v, {
        title: `${urgent ? '🚨' : '🧰'} ${v.label} : ${sync.fresh.length} nouveau(x) manque(s) à commander`,
        body: `Inventaire de ${userName(req.user)}\n${lines.slice(0, 8).join('\n')}${lines.length > 8 ? `\n… et ${lines.length - 8} autre(s)` : ''}${sync.open > sync.fresh.length ? `\n(${sync.open} manque(s) ouvert(s) au total)` : ''}`,
        url: '/vehicules?tab=manques',
      }).catch(() => {});
    }

    const { AuditLog } = await import('../models/index.js');
    AuditLog.log(req, 'VEHICLE_INVENTORY', 'vehicle', v.id, { inventoryId: inventory.id, shortages: result.shortages, expiring: result.expiring });

    res.status(201).json({ success: true, data: { inventory: summary(inventory), restock: result.restock, fresh: sync.fresh.length, openShortages: sync.open, closedShortages: sync.closed } });
  } catch (error) {
    console.error('Inventaire ambulance :', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement de l\'inventaire.' });
  }
};

// GET /api/vehicles/inventories?week=AAAA-MM-JJ — grille de la semaine (responsables)
export const listInventories = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const all = await Vehicle.findAll({ where: { isActive: true }, order: [['label', 'ASC']] });
    const managed = all.filter((v) => canManage(acc, v));
    if (!managed.length && !acc.fleetManager) return res.status(403).json({ success: false, message: 'Accès réservé aux responsables.' });
    const today = doualaDay();
    const monday = weekStart(/^\d{4}-\d{2}-\d{2}$/.test(req.query.week || '') ? req.query.week : today.date);
    const withInventory = [];
    for (const v of managed) {
      const inv = await inventoryOf(v);
      if (inv.sections.length) withInventory.push({ v, inv });
    }
    const weekRows = await weekOf(withInventory.map((x) => x.v.id), monday);
    const openByVehicle = await openShortagesOf(withInventory.map((x) => x.v.id));
    const vehicles = [];
    for (const { v, inv } of withInventory) {
      const last = await VehicleInventory.findOne({ where: { vehicleId: v.id }, order: [['performedAt', 'DESC']], attributes: { exclude: ['answers', 'sections'] } });
      vehicles.push({
        id: v.id, label: v.label, immatriculation: v.immatriculation, status: v.status, unavailableReason: v.unavailableReason,
        days: inv.days,
        cells: weekRows.get(v.id) || {},
        last: last ? { ...summary(last), restock: last.restock } : null,
        shortages: ((openByVehicle.get(v.id)) || []).map(serializeShortage),
      });
    }
    // Les 7 jours, du lundi au dimanche : un inventaire fait un jour non prévu
    // reste visible (« — » seulement si rien n'a été fait ce jour-là)
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ weekday: (i + 1) % 7, date: addDays(monday, i) }));
    res.json({ success: true, data: { weekStart: monday, today: today.date, days, vehicles } });
  } catch (error) {
    console.error('Inventaires (semaine) :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/vehicles/inventories/:iid/pdf — fiche PDF
export const getInventoryPdf = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const inv = await VehicleInventory.findByPk(req.params.iid);
    if (!inv?.documentId) return res.status(404).end();
    const v = await Vehicle.findByPk(inv.vehicleId);
    if (!canManage(acc, v) && !canCheck(acc, v, null)) return res.status(403).end();
    const doc = await Document.findByPk(inv.documentId, { attributes: ['filePath'] });
    if (!doc) return res.status(404).end();
    res.type('application/pdf').sendFile(resolveStoredFile(doc.filePath));
  } catch (error) {
    res.status(500).end();
  }
};

/** Inventaires du jour à faire par l'utilisateur (membre du service de l'ambulance). */
export async function myPendingInventories(user) {
  const acc = await fleetAccess(user);
  if (!acc.serviceIds?.length) return [];
  const vehicles = await Vehicle.findAll({ where: { isActive: true, serviceId: acc.serviceIds } });
  const out = [];
  for (const v of vehicles) {
    if (await inventoryDueToday(v)) {
      const rc = await recountState(v);
      out.push({ type: 'inventaire', recount: rc.recountNeeded, outings: rc.outings.slice(0, 3), vehicle: { id: v.id, label: v.label, immatriculation: v.immatriculation } });
    }
  }
  return out;
}
