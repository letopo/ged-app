// backend/src/utils/vehicleAlerts.js
// Toutes les 10 minutes : alerte les responsables (cheffe de pôle RO SAU, chef
// sécurité logistique) quand une mission semble partie sans contrôle de départ
// (30 min après l'heure prévue) ou rentrée sans contrôle de retour (2 h après
// l'heure de retour prévue). Une seule alerte de chaque sorte par mission.
// Inventaire hebdomadaire des ambulances : alerte à 14 h s'il n'est pas fait.
// Étape 2 : rappels à l'équipage (30 min avant le départ, à l'heure de retour)
// et annulation des missions dont l'ordre de mission est rejeté ou supprimé.
// Ambulances RO SAU (09/11/2026) : plus de contrôle à chaque mission (prise de
// poste du matin) — la mission se clôt seule à l'heure de retour, et la prise
// de poste non faite à 10 h est signalée aux responsables.
import { Op } from 'sequelize';
import { tenantNamespace } from '../config/database.js';
import { Tenant, Vehicle, VehicleMission, VehicleCheck, Document, VehicleDeadline } from '../models/index.js';
import { notifyVehicleManagers, notifyCrew, sectionsForRole, templateFor, missionChecksOn } from '../controllers/vehicleController.js';
import { shiftDoneToday } from '../controllers/vehicleShiftController.js';
import { deadlineStatus } from '../controllers/vehicleFleetController.js';
import { inventoryDueToday } from '../controllers/vehicleInventoryController.js';
import { doualaDay } from './vehicleChecklist.js';

const fmt = (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

async function sectionsOf(vehicle) {
  return (await templateFor(vehicle))?.sections || [];
}

// Échéances (assurance, visite technique, vidange…) : alerte à J-30, J-7, au
// dépassement, et à 1 000 km / au dépassement du kilométrage — une fois chacune.
async function deadlineAlerts(tenantId) {
  const deadlines = await VehicleDeadline.findAll({ where: { tenantId, [Op.or]: [{ dueDate: { [Op.ne]: null } }, { dueMileage: { [Op.ne]: null } }] } });
  for (const d of deadlines) {
    const vehicle = await Vehicle.findByPk(d.vehicleId);
    if (!vehicle?.isActive) continue;
    const st = deadlineStatus(d, vehicle.mileage);
    let key = null;
    let when = '';
    if (st.status === 'depassee') { key = 'depassee'; when = 'est dépassée'; }
    else if (st.kmLeft !== null && st.kmLeft <= 1000) { key = 'km1000'; when = `arrive dans ${st.kmLeft} km`; }
    else if (st.days !== null && st.days <= 7) { key = 'j7'; when = `arrive dans ${st.days} jour(s)`; }
    else if (st.days !== null && st.days <= 30) { key = 'j30'; when = `arrive dans ${st.days} jours`; }
    if (!key || d.alertsSent?.[key]) continue;
    const due = [d.dueDate && `le ${d.dueDate.split('-').reverse().join('/')}`, d.dueMileage && `à ${d.dueMileage.toLocaleString('fr-FR')} km`].filter(Boolean).join(' ou ');
    await notifyVehicleManagers(vehicle, {
      title: `${key === 'depassee' ? '🚨' : '📅'} ${vehicle.label} : ${d.label} ${when}`,
      body: `${vehicle.label} (${vehicle.immatriculation}) — ${d.label} prévue ${due}.`,
      url: `/vehicules?tab=suivi&vehicle=${vehicle.id}`,
    });
    await d.update({ alertsSent: { ...(d.alertsSent || {}), [key]: new Date().toISOString() } });
  }
}

// Rappels à l'équipage : sections encore à faire pour son rôle
async function remindCrew(m, vehicle, phase, sent, key) {
  const sections = await sectionsOf(vehicle);
  const done = (await VehicleCheck.findAll({ where: { missionId: m.id, phase }, attributes: ['sectionKey'] })).map((c) => c.sectionKey);
  await notifyCrew(m, vehicle, (c) => {
    const todo = sectionsForRole(sections, c.role).filter((s) => !done.includes(s.key));
    if (!todo.length) return {};
    const what = todo.map((s) => s.label.toLowerCase()).join(' et ');
    return phase === 'depart'
      ? { title: `🚑 ${vehicle.label} : contrôle de départ`, body: `${m.title || 'Mission'} — départ le ${fmt(m.plannedDepartureAt)}. Faites le contrôle ${what} avant de partir.` }
      : { title: `🚑 ${vehicle.label} : contrôle de retour`, body: `${m.title || 'Mission'} — à votre retour, faites le contrôle ${what} de l'ambulance.` };
  });
  sent[key] = new Date().toISOString();
  await m.update({ alertsSent: { ...sent } });
}

// Inventaire de l'ambulance (jours prévus : tous par défaut) pas fait à 14 h : une alerte
// aux responsables par jour et par ambulance.
async function inventoryAlerts(tenantId) {
  const now = new Date();
  const hour = (now.getUTCHours() + 1) % 24; // Douala, UTC+1
  if (hour < 14) return;
  const today = doualaDay(now).date;
  const vehicles = await Vehicle.findAll({ where: { tenantId, isActive: true, vehicleType: 'ambulance' } });
  for (const v of vehicles) {
    if (v.inventoryAlerts?.missing === today) continue;
    if (!(await inventoryDueToday(v))) continue;
    await notifyVehicleManagers(v, {
      title: `🧰 ${v.label} : inventaire du jour non fait`,
      body: `${v.label} (${v.immatriculation}) — l'inventaire du matériel et des médicaments prévu aujourd'hui n'a pas encore été enregistré.`,
      url: '/vehicules?tab=inventaires',
    });
    await v.update({ inventoryAlerts: { ...(v.inventoryAlerts || {}), missing: today } });
  }
}

// Ordre de mission rejeté ou supprimé : la mission prévue n'a plus lieu
async function cancelOrphanedMissions(tenantId) {
  const planned = await VehicleMission.findAll({ where: { tenantId, status: 'planifiee', urgent: false } });
  for (const m of planned) {
    const doc = m.documentId ? await Document.findByPk(m.documentId, { attributes: ['status'] }) : null;
    if (!doc || doc.status === 'rejected') await m.update({ status: 'annulee' });
  }
}

// Ambulances sans contrôle de mission : la mission se termine à l'heure de retour prévue
async function closePastMissions(tenantId, noChecks) {
  if (!noChecks.size) return;
  const now = new Date();
  const planned = await VehicleMission.findAll({ where: { tenantId, status: { [Op.in]: ['planifiee', 'en_cours'] }, vehicleId: [...noChecks] } });
  for (const m of planned) {
    const end = m.plannedReturnAt || m.plannedDepartureAt;
    if (!end || new Date(end) > now) continue;
    await m.update({ status: 'terminee', departedAt: m.departedAt || m.plannedDepartureAt || end, returnedAt: m.returnedAt || end });
  }
}

// Prise de poste du matin pas faite à 10 h : une alerte par jour et par ambulance
async function shiftAlerts(vehicles) {
  const now = new Date();
  if ((now.getUTCHours() + 1) % 24 < 10) return;
  const today = doualaDay(now).date;
  for (const v of vehicles) {
    if (v.inventoryAlerts?.shift === today) continue;
    if (await shiftDoneToday(v.id)) continue;
    await notifyVehicleManagers(v, {
      title: `🚑 ${v.label} : prise de poste non faite`,
      body: `${v.label} (${v.immatriculation}) — la fiche de prise de poste de ce matin n'a pas été enregistrée.`,
      url: '/vehicules?tab=prise',
    });
    await v.update({ inventoryAlerts: { ...(v.inventoryAlerts || {}), shift: today } });
  }
}

async function checkTenant(tenantId) {
  return tenantNamespace.runPromise(async () => {
    tenantNamespace.set('tenantId', tenantId);
    const now = Date.now();
    await cancelOrphanedMissions(tenantId);
    await deadlineAlerts(tenantId);
    await inventoryAlerts(tenantId);
    const ambulances = await Vehicle.findAll({ where: { tenantId, isActive: true, vehicleType: 'ambulance' } });
    const noChecks = new Set();
    for (const v of ambulances) if (!missionChecksOn(await templateFor(v))) noChecks.add(v.id);
    await closePastMissions(tenantId, noChecks);
    await shiftAlerts(ambulances.filter((v) => noChecks.has(v.id)));

    // Rappels à l'équipage
    const toRemind = await VehicleMission.findAll({
      where: {
        tenantId,
        [Op.or]: [
          { status: 'planifiee', plannedDepartureAt: { [Op.lte]: new Date(now + 30 * 60000), [Op.gt]: new Date(now - 3 * 3600000) } },
          { status: 'en_cours', plannedReturnAt: { [Op.lte]: new Date(now), [Op.gt]: new Date(now - 86400000) } },
        ],
      },
    });
    for (const m of toRemind) {
      const sent = { ...(m.alertsSent || {}) };
      const vehicle = await Vehicle.findByPk(m.vehicleId);
      if (!vehicle || noChecks.has(vehicle.id)) continue;
      if (m.status === 'planifiee' && !sent.crewDepart) await remindCrew(m, vehicle, 'depart', sent, 'crewDepart');
      else if (m.status === 'en_cours' && !sent.crewRetour) await remindCrew(m, vehicle, 'retour', sent, 'crewRetour');
    }

    const candidates = await VehicleMission.findAll({
      where: {
        tenantId,
        [Op.or]: [
          { status: 'planifiee', plannedDepartureAt: { [Op.lt]: new Date(now - 30 * 60000), [Op.gt]: new Date(now - 3 * 86400000) } },
          { status: 'en_cours', plannedReturnAt: { [Op.lt]: new Date(now - 2 * 3600000), [Op.gt]: new Date(now - 3 * 86400000) } },
        ],
      },
    });
    for (const m of candidates) {
      const sent = { ...(m.alertsSent || {}) };
      const vehicle = await Vehicle.findByPk(m.vehicleId);
      if (!vehicle || noChecks.has(vehicle.id)) continue;
      if (m.status === 'planifiee' && !sent.depart) {
        if (await VehicleCheck.count({ where: { missionId: m.id, phase: 'depart' } })) continue;
        await notifyVehicleManagers(vehicle, {
          title: `⏰ ${vehicle.label} : départ sans contrôle ?`,
          body: `${m.title || 'Mission'} — départ prévu le ${fmt(m.plannedDepartureAt)}, aucun contrôle de départ enregistré.`,
        });
        sent.depart = new Date().toISOString();
        await m.update({ alertsSent: sent });
      } else if (m.status === 'en_cours' && !sent.retour) {
        if (await VehicleCheck.count({ where: { missionId: m.id, phase: 'retour' } })) continue;
        await notifyVehicleManagers(vehicle, {
          title: `⏰ ${vehicle.label} : retour non contrôlé`,
          body: `${m.title || 'Mission'} — retour prévu le ${fmt(m.plannedReturnAt)}, aucun contrôle de retour enregistré.`,
        });
        sent.retour = new Date().toISOString();
        await m.update({ alertsSent: sent });
      }
    }
  });
}

export async function runVehicleAlerts() {
  try {
    const tenants = await Tenant.findAll({ where: { isActive: true }, attributes: ['id'] });
    for (const t of tenants) await checkTenant(t.id);
  } catch (err) {
    console.warn('[Parc véhicules] alertes :', err.message);
  }
}

export function startVehicleAlertsScheduler() {
  setTimeout(runVehicleAlerts, 60 * 1000);
  setInterval(runVehicleAlerts, 10 * 60 * 1000);
  console.log('[Parc véhicules] ⏰ Alertes de contrôle toutes les 10 minutes');
}
