// backend/src/utils/vehicleAlerts.js
// Toutes les 10 minutes : alerte les responsables (cheffe de pôle RO SAU, chef
// sécurité logistique) quand une mission semble partie sans contrôle de départ
// (30 min après l'heure prévue) ou rentrée sans contrôle de retour (2 h après
// l'heure de retour prévue). Une seule alerte de chaque sorte par mission.
// Étape 2 : rappels à l'équipage (30 min avant le départ, à l'heure de retour)
// et annulation des missions dont l'ordre de mission est rejeté ou supprimé.
import { Op } from 'sequelize';
import { tenantNamespace } from '../config/database.js';
import { Tenant, Vehicle, VehicleMission, VehicleCheck, Document, VehicleChecklistTemplate } from '../models/index.js';
import { notifyVehicleManagers, notifyCrew, sectionsForRole } from '../controllers/vehicleController.js';

const fmt = (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

async function sectionsOf(vehicle) {
  const tpl = (vehicle.checklistTemplateId && await VehicleChecklistTemplate.findByPk(vehicle.checklistTemplateId))
    || await VehicleChecklistTemplate.findOne({ where: { vehicleType: vehicle.vehicleType, isActive: true }, order: [['createdAt', 'ASC']] });
  return tpl?.sections || [];
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

// Ordre de mission rejeté ou supprimé : la mission prévue n'a plus lieu
async function cancelOrphanedMissions(tenantId) {
  const planned = await VehicleMission.findAll({ where: { tenantId, status: 'planifiee', urgent: false } });
  for (const m of planned) {
    const doc = m.documentId ? await Document.findByPk(m.documentId, { attributes: ['status'] }) : null;
    if (!doc || doc.status === 'rejected') await m.update({ status: 'annulee' });
  }
}

async function checkTenant(tenantId) {
  return tenantNamespace.runPromise(async () => {
    tenantNamespace.set('tenantId', tenantId);
    const now = Date.now();
    await cancelOrphanedMissions(tenantId);

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
      if (!vehicle) continue;
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
      if (!vehicle) continue;
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
