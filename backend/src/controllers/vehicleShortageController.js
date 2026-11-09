// backend/src/controllers/vehicleShortageController.js
// Manques « ouverts » des ambulances (demande RO SAU, 09/11/2026).
// Un manque relevé à l'inventaire reste affiché sur l'ambulance jusqu'à ce
// qu'il soit réarmé. Circuit : À commander → Commandé (bon papier envoyé à la
// pharmacie) → Réarmé. L'infirmier du matin voit où en est chaque manque
// (« commandé le …, attend en pharmacie ») au lieu de tout reconstater.
//  - Commandé : responsables de l'ambulance (Chef de pôle RO SAU, chef
//    sécurité logistique)
//  - Réarmé   : l'infirmier de garde (membre du service) ou un responsable,
//    article par article avec la quantité remise en place
import { Op } from 'sequelize';
import { Vehicle, VehicleShortage } from '../models/index.js';
import { fleetAccess, canManage, canCheck, userName } from './vehicleController.js';
import { inventoryOf } from './vehicleInventoryController.js';
import { OPEN_STATUSES, shortagesFromRestock, answeredItemIds, reconcileShortages, applyRestock } from '../utils/vehicleShortages.js';
import { shortagesFromShift, shiftAnsweredIds } from '../utils/vehicleShift.js';

const event = (user, action, extra = {}) => ({ at: new Date().toISOString(), by: user ? userName(user) : null, action, ...extra });

export const serializeShortage = (s) => ({
  id: s.id, vehicleId: s.vehicleId, itemId: s.itemId, kind: s.kind, label: s.label, section: s.section, unit: s.unit,
  critical: s.critical, quantity: s.quantity, orderedQty: s.orderedQty, restockedQty: s.restockedQty, status: s.status,
  openedAt: s.openedAt, lastSeenAt: s.lastSeenAt, orderedAt: s.orderedAt, orderedByName: s.orderedByName, orderNote: s.orderNote,
  closedAt: s.closedAt, closedByName: s.closedByName, closedReason: s.closedReason, history: s.history || [],
});

const openWhere = (vehicleIds) => ({ vehicleId: vehicleIds, status: { [Op.in]: OPEN_STATUSES } });

/** Manques ouverts de plusieurs véhicules : Map vehicleId → [manques]. */
export async function openShortagesOf(vehicleIds) {
  const out = new Map();
  if (!vehicleIds.length) return out;
  const rows = await VehicleShortage.findAll({ where: openWhere(vehicleIds), order: [['critical', 'DESC'], ['openedAt', 'ASC']] });
  for (const r of rows) {
    if (!out.has(r.vehicleId)) out.set(r.vehicleId, []);
    out.get(r.vehicleId).push(r);
  }
  return out;
}

/** Résumé pour l'OM / la liste des ambulances : { open, critical, toOrder, ordered }. */
export async function shortageSummary(vehicleId) {
  const rows = await VehicleShortage.findAll({ where: openWhere([vehicleId]), attributes: ['status', 'critical', 'label'] });
  return {
    open: rows.length,
    critical: rows.filter((r) => r.critical).length,
    criticalLabels: rows.filter((r) => r.critical).map((r) => r.label).slice(0, 4),
    toOrder: rows.filter((r) => r.status === 'a_commander').length,
    ordered: rows.filter((r) => r.status === 'commande').length,
  };
}

/** Plus aucun manque critique ouvert : on lève l'indisponibilité posée par l'inventaire. */
async function refreshAvailability(vehicle) {
  if (vehicle.status !== 'indisponible' || !/^Inventaire/.test(vehicle.unavailableReason || '')) return;
  const left = await VehicleShortage.count({ where: { ...openWhere([vehicle.id]), critical: true } });
  if (!left) await vehicle.update({ status: 'disponible', unavailableReason: null });
}

/**
 * Après un inventaire : retrouve les manques déjà ouverts, crée les nouveaux,
 * ferme ceux relevés au complet. Retourne { fresh, open } — fresh = ce qui est
 * nouveau pour les responsables (seul objet de l'alerte).
 */
export async function syncInventoryShortages(vehicle, inventory, sections, result, user) {
  const open = await VehicleShortage.findAll({ where: openWhere([vehicle.id]) });
  const found = shortagesFromRestock(result.restock, sections);
  const { create, update, close, fresh } = reconcileShortages(open, found, answeredItemIds(result.answers));
  const now = new Date();
  const byId = new Map(open.map((s) => [s.id, s]));
  for (const f of create) {
    await VehicleShortage.create({
      vehicleId: vehicle.id, itemId: f.itemId, kind: f.kind, label: f.label, section: f.section, unit: f.unit,
      critical: f.critical, quantity: f.quantity, status: 'a_commander', openedAt: now, openedInventoryId: inventory.id,
      lastSeenAt: now, history: [event(user, 'releve', { qty: f.quantity })],
    });
  }
  for (const u of update) {
    const s = byId.get(u.id);
    const patch = { lastSeenAt: now };
    if (u.quantity !== s.quantity) {
      patch.quantity = u.quantity;
      patch.history = [...(s.history || []), event(user, 'recompte', { qty: u.quantity })];
    }
    await s.update(patch);
  }
  for (const id of close) {
    const s = byId.get(id);
    await s.update({
      status: 'rearme', closedAt: now, closedByName: userName(user), closedReason: 'inventaire',
      restockedQty: (s.restockedQty || 0) + (s.quantity || 0), quantity: s.quantity === null ? null : 0,
      history: [...(s.history || []), event(user, 'complet_inventaire')],
    });
  }
  return { fresh, open: open.length - close.length + create.length, closed: close.length };
}

/**
 * Après une prise de poste : un point en anomalie (DSA Pas OK, pression d'O2
 * trop basse…) devient un manque suivi jusqu'au réarmement ; un point repassé
 * OK ferme le manque. Retourne les nouveautés (seul objet de l'alerte).
 */
export async function syncShiftShortages(vehicle, items, answers, user) {
  const open = await VehicleShortage.findAll({ where: openWhere([vehicle.id]) });
  const found = shortagesFromShift(items, answers);
  const { create, update, close, fresh } = reconcileShortages(open, found, shiftAnsweredIds(answers));
  const now = new Date();
  const byId = new Map(open.map((s) => [s.id, s]));
  for (const f of create) {
    await VehicleShortage.create({
      vehicleId: vehicle.id, itemId: f.itemId, kind: f.kind, label: f.label, section: f.section, unit: f.unit,
      critical: f.critical, quantity: null, status: 'a_commander', openedAt: now, lastSeenAt: now,
      history: [event(user, 'releve_prise_de_poste')],
    });
  }
  for (const u of update) await byId.get(u.id).update({ lastSeenAt: now });
  for (const id of close) {
    const s = byId.get(id);
    await s.update({
      status: 'rearme', closedAt: now, closedByName: userName(user), closedReason: 'inventaire',
      history: [...(s.history || []), event(user, 'ok_prise_de_poste')],
    });
  }
  return { fresh, closed: close.length };
}

/** Ambulances (avec inventaire) visibles par l'utilisateur. */
async function visibleAmbulances(acc) {
  const all = await Vehicle.findAll({ where: { isActive: true, vehicleType: 'ambulance' }, order: [['label', 'ASC']] });
  const out = [];
  for (const v of all) {
    if (!canCheck(acc, v, null)) continue;
    if (!(await inventoryOf(v)).sections.length) continue;
    out.push(v);
  }
  return out;
}

// GET /api/vehicles/shortages — manques ouverts de chaque ambulance (+ réglés récemment)
export const listShortages = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const vehicles = await visibleAmbulances(acc);
    const ids = vehicles.map((v) => v.id);
    const open = await openShortagesOf(ids);
    const since = new Date(Date.now() - 7 * 86400 * 1000);
    const recent = ids.length ? await VehicleShortage.findAll({
      where: { vehicleId: ids, status: { [Op.in]: ['rearme', 'annule'] }, closedAt: { [Op.gte]: since } },
      order: [['closedAt', 'DESC']], limit: 60,
    }) : [];
    res.json({
      success: true,
      data: vehicles.map((v) => ({
        id: v.id, label: v.label, immatriculation: v.immatriculation, status: v.status, unavailableReason: v.unavailableReason,
        canManage: canManage(acc, v), canRestock: true,
        shortages: (open.get(v.id) || []).map(serializeShortage),
        recent: recent.filter((r) => r.vehicleId === v.id).slice(0, 15).map(serializeShortage),
      })),
    });
  } catch (error) {
    console.error('Manques ambulances :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/vehicles/shortages/order — { ids, note } : bon envoyé à la pharmacie
export const orderShortages = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(String).slice(0, 300);
    if (!ids.length) return res.status(400).json({ success: false, message: 'Aucun article choisi.' });
    const note = String(req.body?.note || '').trim().slice(0, 255) || null;
    const rows = await VehicleShortage.findAll({ where: { id: ids, status: { [Op.in]: OPEN_STATUSES } } });
    const vehicles = new Map((await Vehicle.findAll({ where: { id: [...new Set(rows.map((r) => r.vehicleId))] } })).map((v) => [v.id, v]));
    if (rows.some((r) => !canManage(acc, vehicles.get(r.vehicleId)))) {
      return res.status(403).json({ success: false, message: 'Seuls les responsables de l\'ambulance marquent une commande.' });
    }
    const now = new Date();
    for (const r of rows) {
      await r.update({
        status: 'commande', orderedAt: now, orderedByName: userName(req.user), orderNote: note,
        orderedQty: r.quantity ?? 0,
        history: [...(r.history || []), event(req.user, 'commande', { qty: r.quantity, note })],
      });
    }
    res.json({ success: true, data: { updated: rows.length } });
  } catch (error) {
    console.error('Manques (commande) :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/vehicles/shortages/:sid/status — { status: 'a_commander' | 'annule', note }
// Responsables : annuler une commande notée par erreur, ou classer un manque sans suite.
export const setShortageStatus = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const s = await VehicleShortage.findByPk(req.params.sid);
    if (!s || !OPEN_STATUSES.includes(s.status)) return res.status(404).json({ success: false, message: 'Manque introuvable ou déjà réglé.' });
    const v = await Vehicle.findByPk(s.vehicleId);
    if (!canManage(acc, v)) return res.status(403).json({ success: false, message: 'Accès réservé aux responsables.' });
    const status = req.body?.status;
    const note = String(req.body?.note || '').trim().slice(0, 255) || null;
    if (status === 'a_commander') {
      await s.update({ status, orderedAt: null, orderedByName: null, orderNote: null, orderedQty: 0, history: [...(s.history || []), event(req.user, 'commande_annulee', { note })] });
    } else if (status === 'annule') {
      await s.update({ status, closedAt: new Date(), closedByName: userName(req.user), closedReason: 'annule', history: [...(s.history || []), event(req.user, 'annule', { note })] });
      await refreshAvailability(v);
    } else {
      return res.status(400).json({ success: false, message: 'Statut inconnu.' });
    }
    res.json({ success: true, data: serializeShortage(s) });
  } catch (error) {
    console.error('Manques (statut) :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/vehicles/:id/restock — { lines: [{ id, qty }] } : matériel remis dans l'ambulance
export const restockVehicle = async (req, res) => {
  try {
    const acc = await fleetAccess(req.user);
    const v = await Vehicle.findByPk(req.params.id);
    if (!v) return res.status(404).json({ success: false, message: 'Véhicule introuvable.' });
    if (!canCheck(acc, v, null)) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    const lines = (Array.isArray(req.body?.lines) ? req.body.lines : []).slice(0, 300);
    const wanted = new Map(lines.map((l) => [String(l?.id), l?.qty === null || l?.qty === undefined || l?.qty === '' ? null : Number(l.qty)]));
    if (!wanted.size) return res.status(400).json({ success: false, message: 'Cochez au moins un article réarmé.' });
    const rows = await VehicleShortage.findAll({ where: { id: [...wanted.keys()], vehicleId: v.id, status: { [Op.in]: OPEN_STATUSES } } });
    if (!rows.length) return res.status(404).json({ success: false, message: 'Ces manques sont déjà réglés.' });
    const now = new Date();
    let closed = 0;
    let partial = 0;
    for (const s of rows) {
      const qty = wanted.get(s.id);
      if (qty !== null && !(qty > 0)) continue;
      const r = applyRestock(s, qty);
      const patch = {
        quantity: r.quantity, restockedQty: (s.restockedQty || 0) + r.restocked,
        orderedQty: Math.max(0, (s.orderedQty || 0) - r.restocked),
        history: [...(s.history || []), event(req.user, 'rearme', { qty: r.restocked || null })],
      };
      if (r.closed) {
        Object.assign(patch, { status: 'rearme', closedAt: now, closedByName: userName(req.user), closedReason: 'rearme' });
        closed++;
      } else partial++;
      await s.update(patch);
    }
    await refreshAvailability(v);
    const { AuditLog } = await import('../models/index.js');
    AuditLog.log(req, 'VEHICLE_RESTOCK', 'vehicle', v.id, { closed, partial });
    res.json({ success: true, data: { closed, partial, status: v.status } });
  } catch (error) {
    console.error('Réarmement ambulance :', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement du réarmement.' });
  }
};
