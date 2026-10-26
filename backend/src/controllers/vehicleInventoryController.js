// backend/src/controllers/vehicleInventoryController.js
// Inventaire hebdomadaire des ambulances (fiche RO SAU) : le lundi, le
// mercredi et le vendredi, l'infirmier relève les quantités présentes
// (matériel, consommables, médicaments, DSA, oxygène) et signe. Les manques et
// les péremptions du mois forment la liste de réassort envoyée aux
// responsables ; un point critique en défaut rend l'ambulance indisponible.
import crypto from 'crypto';
import { resolveStoredFile } from '../utils/storedFiles.js';
import fs from 'fs/promises';
import path from 'path';
import { Op } from 'sequelize';
import { Vehicle, VehicleInventory, Document, Tenant } from '../models/index.js';
import { fleetAccess, canManage, canCheck, templateFor, notifyVehicleManagers, CHECK_DIR, userName, fmtFr } from './vehicleController.js';
import { evaluateInventory, doualaDay, weekStart } from '../utils/vehicleChecklist.js';
import { buildVehicleInventoryPdf } from '../utils/vehicleInventoryPdf.js';
import { parseSignaturePng } from './manualSignatureController.js';

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
  critical: inv.criticalAnomaly, documentId: inv.documentId,
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

/** Inventaire attendu aujourd'hui et pas encore fait ? */
export async function inventoryDueToday(vehicle, inv = null) {
  const { sections, days } = inv || await inventoryOf(vehicle);
  if (!sections.length) return false;
  const today = doualaDay();
  if (!days.includes(today.weekday)) return false;
  return !(await VehicleInventory.count({ where: { vehicleId: vehicle.id, inventoryDate: today.date } }));
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
    const result = evaluateInventory(sections, req.body?.answers);
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
    });

    // Disponibilité : point critique en défaut → indisponible ; un inventaire
    // complet lève une indisponibilité posée par un inventaire précédent.
    if (result.critical) {
      const bad = result.restock.filter((r) => sections.some((s) => (s.items || []).some((it) => it.id === r.itemId && it.critical) && (r.missing || r.low || r.ko))).map((r) => r.label);
      await v.update({ status: 'indisponible', unavailableReason: `Inventaire : ${bad.join(', ')}`.slice(0, 255) });
    } else if (v.status === 'indisponible' && /^Inventaire/.test(v.unavailableReason || '')) {
      await v.update({ status: 'disponible', unavailableReason: null });
    }

    // Fiche PDF archivée dans la GED
    try {
      const tenant = await Tenant.findByPk(v.tenantId, { attributes: ['name'] });
      const pdf = await buildVehicleInventoryPdf({ tenantName: tenant?.name, vehicle: v, inventory });
      const fileName = `inventaire-${v.id.slice(0, 8)}-${Date.now()}.pdf`;
      await fs.writeFile(path.resolve(process.cwd(), 'uploads', fileName), pdf);
      const doc = await Document.create({
        title: `Inventaire ambulance — ${v.label} (${v.immatriculation}) — ${fmtFr(now)}`,
        fileName, originalName: fileName, filePath: `uploads/${fileName}`, fileSize: pdf.length, fileType: 'application/pdf',
        userId: req.user.id, category: 'Contrôle véhicule', status: 'approved',
        visibility: v.serviceId ? 'service' : 'personal', serviceId: v.serviceId || null,
        metadata: { sourceType: 'vehicle_inventory', vehicleId: v.id, inventoryId: inventory.id },
      });
      await inventory.update({ documentId: doc.id, sha256: sha256(pdf) });
    } catch (err) {
      console.error('Fiche PDF inventaire :', err);
    }

    if (result.restock.length) {
      const lines = result.restock.map((r) => (r.low ? `${r.label} : ${r.value} ${r.unit}`
        : r.ko ? `${r.label} : hors service`
        : `${r.label}${r.missing ? ` : manque ${r.missing}${r.unit ? ` ${r.unit}` : ''}` : ''}${r.expiring ? ' (périme ce mois)' : ''}`));
      notifyVehicleManagers(v, {
        title: `${result.critical ? '🚨' : '🧰'} ${v.label} : ${result.restock.length} article(s) à réapprovisionner`,
        body: `Inventaire de ${userName(req.user)}\n${lines.slice(0, 8).join('\n')}${lines.length > 8 ? `\n… et ${lines.length - 8} autre(s)` : ''}`,
        url: '/vehicules?tab=inventaires',
      }).catch(() => {});
    }

    const { AuditLog } = await import('../models/index.js');
    AuditLog.log(req, 'VEHICLE_INVENTORY', 'vehicle', v.id, { inventoryId: inventory.id, shortages: result.shortages, expiring: result.expiring });

    res.status(201).json({ success: true, data: { inventory: summary(inventory), restock: result.restock } });
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
    const daySet = new Set();
    for (const v of managed) {
      const inv = await inventoryOf(v);
      if (!inv.sections.length) continue;
      inv.days.forEach((d) => daySet.add(d));
      withInventory.push({ v, inv });
    }
    const weekRows = await weekOf(withInventory.map((x) => x.v.id), monday);
    const vehicles = [];
    for (const { v, inv } of withInventory) {
      const last = await VehicleInventory.findOne({ where: { vehicleId: v.id }, order: [['performedAt', 'DESC']], attributes: { exclude: ['answers', 'sections'] } });
      vehicles.push({
        id: v.id, label: v.label, immatriculation: v.immatriculation, status: v.status, unavailableReason: v.unavailableReason,
        days: inv.days,
        cells: weekRows.get(v.id) || {},
        last: last ? { ...summary(last), restock: last.restock } : null,
      });
    }
    // Jours affichés : jours d'inventaire (lundi = 1) de la semaine
    const days = [...daySet].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((wd) => ({ weekday: wd, date: addDays(monday, (wd + 6) % 7) }));
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
      out.push({ type: 'inventaire', vehicle: { id: v.id, label: v.label, immatriculation: v.immatriculation } });
    }
  }
  return out;
}
