// backend/src/controllers/vehicleOxygenController.js
// Oxygène des ambulances RO SAU (retours de la responsable, 17/11/2026) :
//  - carte oxygène : nombre de bouteilles (à bord, réserve pleines / vides,
//    commandées), consommation calculée d'une prise de poste à l'autre ;
//  - commandes : le service Biomédical est prévenu quand il faut commander,
//    puis enregistre la commande dans la GED ou signale qu'elle est déjà faite ;
//    à la livraison, la commande est marquée reçue.
// Accès : Biomédical (commande), responsables du parc / des ambulances
// (commande), personnel soignant des ambulances (consultation, réception).
import { Op } from 'sequelize';
import {
  Vehicle, VehicleShiftCheck, VehicleOxygenOrder, Service, ServiceMember, User, AuditLog,
} from '../models/index.js';
import { fleetAccess, canManage, shiftPartsFor, userName, notifyVehicleManagers } from './vehicleController.js';
import { oxygenStatus, oxygenConsumption, consumedSince, fullBottles, BOTTLES_PER_AMBULANCE } from '../utils/vehicleShift.js';
import { doualaDay } from '../utils/vehicleChecklist.js';
import { sendPushNotification } from '../services/pushNotificationService.js';
import { sendNotificationEmail } from '../utils/mailer.js';

const OXYGEN_URL = '/vehicules?tab=oxygene';

// ── Service Biomédical ──────────────────────────────────────────────────────
/** Services « Biomédical » de l'établissement (nom contenant biom…dical). */
async function biomedicalServiceIds() {
  const services = await Service.findAll({ where: { name: { [Op.iLike]: '%biom%dical%' } }, attributes: ['id'] });
  return services.map((s) => s.id);
}

/** Membres actifs du service Biomédical (comptes actifs). */
export async function biomedicalUsers() {
  const ids = await biomedicalServiceIds();
  if (!ids.length) return [];
  const members = await ServiceMember.findAll({ where: { serviceId: ids, isActive: true }, attributes: ['userId'] });
  const userIds = [...new Set(members.map((m) => m.userId).filter(Boolean))];
  if (!userIds.length) return [];
  return User.findAll({ where: { id: userIds, isActive: true }, attributes: ['id', 'email', 'firstName', 'lastName', 'tenantId'] });
}

export async function isBiomedical(user) {
  const ids = await biomedicalServiceIds();
  if (!ids.length) return false;
  return (await ServiceMember.count({ where: { serviceId: ids, userId: user.id, isActive: true } })) > 0;
}

/** Prévient le service Biomédical (notification + e-mail). */
export async function notifyBiomedical({ title, body, url = OXYGEN_URL, tenantId = null }) {
  const users = await biomedicalUsers();
  for (const u of users) {
    sendPushNotification(u.id, {
      type: 'oxygen_order', title, body, icon: '/favicon.ico', badge: '/favicon.ico',
      tag: `oxygen-${Date.now()}`, data: { url, timestamp: Date.now() }, requireInteraction: true,
    }).catch(() => {});
    if (u.email) sendNotificationEmail(u.email, title, body, 'default', url, { tenantId: tenantId || u.tenantId }).catch(() => {});
  }
  return users.length;
}

// ── Droits ──────────────────────────────────────────────────────────────────
/**
 * { canView, canOrder, canReceive, biomedical }
 *  - Biomédical, responsables : consulter, commander, réceptionner
 *  - soignants des ambulances : consulter, réceptionner
 */
export async function oxygenAccess(user, acc = null) {
  acc = acc || await fleetAccess(user);
  const [biomedical, ambulances] = await Promise.all([
    isBiomedical(user),
    Vehicle.findAll({ where: { isActive: true, vehicleType: 'ambulance' } }),
  ]);
  const manager = acc.fleetManager || ambulances.some((v) => canManage(acc, v));
  const soignant = ambulances.some((v) => shiftPartsFor(acc, v).includes('soignant'));
  const canOrder = biomedical || manager;
  return { biomedical, canOrder, canView: canOrder || soignant, canReceive: canOrder || soignant, hasAmbulances: ambulances.length > 0 };
}

// ── Commandes ───────────────────────────────────────────────────────────────
export const orderSummary = (o) => ({
  id: o.id, quantity: o.quantity, supplier: o.supplier, source: o.source, orderedOn: o.orderedOn, expectedOn: o.expectedOn,
  note: o.note, status: o.status, orderedBy: o.orderedByName, createdAt: o.createdAt,
  receivedQuantity: o.receivedQuantity, receivedAt: o.receivedAt, receivedBy: o.receivedByName, cancelReason: o.cancelReason,
});

/** Bouteilles commandées et pas encore livrées. */
export async function openOrders() {
  const rows = await VehicleOxygenOrder.findAll({ where: { status: 'commandee' }, order: [['orderedOn', 'ASC'], ['createdAt', 'ASC']] });
  return { rows, quantity: rows.reduce((n, o) => n + (o.quantity || 0), 0) };
}

const cleanQty = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= 200 ? n : null;
};
const cleanDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

// GET /api/vehicles/oxygen — carte oxygène, consommation et commandes
export const getOxygen = async (req, res) => {
  try {
    const access = await oxygenAccess(req.user);
    if (!access.canView) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    const since = new Date(Date.now() - 90 * 86400000);
    const [shifts, orders, open] = await Promise.all([
      VehicleShiftCheck.findAll({
        where: { part: 'soignant', reserveFull: { [Op.ne]: null }, performedAt: { [Op.gte]: since } },
        order: [['performedAt', 'ASC']], attributes: ['id', 'performedAt', 'performedByName', 'reserveFull', 'reserveEmpty', 'reserveOrdered', 'vehicles', 'oxygenLevel'],
      }),
      VehicleOxygenOrder.findAll({ order: [['createdAt', 'DESC']], limit: 40 }),
      openOrders(),
    ]);
    const receipts = orders.filter((o) => o.status === 'recue' && o.receivedAt).map((o) => ({ at: o.receivedAt, quantity: o.receivedQuantity ?? o.quantity }));
    const intervals = oxygenConsumption(shifts.map((s) => ({ at: s.performedAt, reserveFull: s.reserveFull, vehicles: s.vehicles })), receipts);
    const last = shifts[shifts.length - 1] || null;
    let stock = null;
    if (last) {
      const onboard = (last.vehicles || []).map((v) => ({ vehicleId: v.vehicleId, label: v.label, bottles: v.bottles }));
      const st = oxygenStatus({ reserveFull: last.reserveFull, reserveEmpty: last.reserveEmpty, onboard });
      const onboardTotal = onboard.reduce((n, o) => n + (o.bottles || 0), 0);
      stock = {
        at: last.performedAt, by: last.performedByName, level: last.oxygenLevel || st.level, short: st.short,
        onboard, onboardTotal, reserveFull: last.reserveFull, reserveEmpty: last.reserveEmpty,
        full: fullBottles(last), total: st.total,
      };
    }
    // Consommation : 7 et 30 derniers jours, moyenne par jour sur la période comptée
    const covered = intervals.filter((x) => x.to.getTime() > Date.now() - 30 * 86400000);
    const coveredDays = covered.length ? Math.max(1, (covered[covered.length - 1].to - covered[0].from) / 86400000) : 0;
    const used30 = consumedSince(intervals, 30);
    res.json({
      success: true,
      data: {
        access,
        perAmbulance: BOTTLES_PER_AMBULANCE,
        stock,
        ordered: open.quantity,
        consumption: {
          week: consumedSince(intervals, 7),
          month: used30,
          perDay: coveredDays ? Math.round((used30 / coveredDays) * 10) / 10 : null,
          history: intervals.slice(-20).reverse().map((x) => ({ from: x.from, to: x.to, before: x.before, received: x.received, after: x.after, used: x.used })),
        },
        orders: orders.map(orderSummary),
      },
    });
  } catch (error) {
    console.error('Oxygène (état) :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/vehicles/oxygen/orders — { quantity, supplier, source: 'ged'|'externe', orderedOn, expectedOn, note }
export const createOxygenOrder = async (req, res) => {
  try {
    const access = await oxygenAccess(req.user);
    if (!access.canOrder) return res.status(403).json({ success: false, message: 'Seuls le Biomédical et les responsables passent les commandes d\'oxygène.' });
    const quantity = cleanQty(req.body?.quantity);
    if (!quantity) return res.status(400).json({ success: false, message: 'Indiquez le nombre de bouteilles commandées (1 à 200).' });
    const today = doualaDay().date;
    const orderedOn = cleanDate(req.body?.orderedOn) || today;
    if (orderedOn > today) return res.status(400).json({ success: false, message: 'La date de commande ne peut pas être dans le futur.' });
    const expectedOn = cleanDate(req.body?.expectedOn);
    if (expectedOn && expectedOn < orderedOn) return res.status(400).json({ success: false, message: 'La livraison prévue ne peut pas précéder la commande.' });
    const order = await VehicleOxygenOrder.create({
      quantity,
      supplier: String(req.body?.supplier || '').trim().slice(0, 150) || null,
      source: req.body?.source === 'externe' ? 'externe' : 'ged',
      orderedOn, expectedOn,
      note: String(req.body?.note || '').trim().slice(0, 500) || null,
      orderedBy: req.user.id, orderedByName: userName(req.user),
    });
    AuditLog.log(req, 'OXYGEN_ORDER', 'oxygen_order', order.id, { quantity, source: order.source, supplier: order.supplier });
    // Les responsables des ambulances savent que c'est commandé
    const ambulance = await Vehicle.findOne({ where: { isActive: true, vehicleType: 'ambulance' } });
    if (ambulance) {
      notifyVehicleManagers(ambulance, {
        title: `🫧 Oxygène commandé : ${quantity} bouteille(s)`,
        body: `${order.source === 'externe' ? 'Commande déjà faite' : 'Commande passée'} par ${order.orderedByName}${order.supplier ? ` auprès de ${order.supplier}` : ''}${expectedOn ? `, livraison prévue le ${expectedOn.split('-').reverse().join('/')}` : ''}.`,
        url: OXYGEN_URL,
      }).catch(() => {});
    }
    res.status(201).json({ success: true, data: orderSummary(order) });
  } catch (error) {
    console.error('Oxygène (commande) :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/vehicles/oxygen/orders/:oid/receive — { quantity } (par défaut : la quantité commandée)
export const receiveOxygenOrder = async (req, res) => {
  try {
    const access = await oxygenAccess(req.user);
    if (!access.canReceive) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    const order = await VehicleOxygenOrder.findByPk(req.params.oid);
    if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    if (order.status !== 'commandee') return res.status(409).json({ success: false, message: 'Cette commande est déjà close.' });
    const quantity = req.body?.quantity === undefined || req.body?.quantity === '' ? order.quantity : cleanQty(req.body.quantity);
    if (!quantity) return res.status(400).json({ success: false, message: 'Nombre de bouteilles reçues invalide.' });
    await order.update({ status: 'recue', receivedQuantity: quantity, receivedAt: new Date(), receivedBy: req.user.id, receivedByName: userName(req.user) });
    AuditLog.log(req, 'OXYGEN_ORDER_RECEIVED', 'oxygen_order', order.id, { quantity, ordered: order.quantity });
    if (order.orderedBy && order.orderedBy !== req.user.id) {
      sendPushNotification(order.orderedBy, {
        type: 'oxygen_order', title: `✅ Oxygène livré : ${quantity} bouteille(s)`, body: `Réception enregistrée par ${order.receivedByName}.`,
        icon: '/favicon.ico', badge: '/favicon.ico', tag: `oxygen-${order.id}`, data: { url: OXYGEN_URL, timestamp: Date.now() },
      }).catch(() => {});
    }
    res.json({ success: true, data: orderSummary(order) });
  } catch (error) {
    console.error('Oxygène (réception) :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/vehicles/oxygen/orders/:oid/cancel — { reason }
export const cancelOxygenOrder = async (req, res) => {
  try {
    const access = await oxygenAccess(req.user);
    if (!access.canOrder) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    const order = await VehicleOxygenOrder.findByPk(req.params.oid);
    if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    if (order.status !== 'commandee') return res.status(409).json({ success: false, message: 'Cette commande est déjà close.' });
    const reason = String(req.body?.reason || '').trim().slice(0, 300);
    if (!reason) return res.status(400).json({ success: false, message: 'Indiquez le motif de l\'annulation.' });
    await order.update({ status: 'annulee', cancelReason: reason });
    AuditLog.log(req, 'OXYGEN_ORDER_CANCELLED', 'oxygen_order', order.id, { reason });
    res.json({ success: true, data: orderSummary(order) });
  } catch (error) {
    console.error('Oxygène (annulation) :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};
