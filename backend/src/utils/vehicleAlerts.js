// backend/src/utils/vehicleAlerts.js
// Toutes les 10 minutes : alerte les responsables (cheffe de pôle RO SAU, chef
// sécurité logistique) quand une mission semble partie sans contrôle de départ
// (30 min après l'heure prévue) ou rentrée sans contrôle de retour (2 h après
// l'heure de retour prévue). Une seule alerte de chaque sorte par mission.
import { Op } from 'sequelize';
import { tenantNamespace } from '../config/database.js';
import { Tenant, Vehicle, VehicleMission, VehicleCheck } from '../models/index.js';
import { notifyVehicleManagers } from '../controllers/vehicleController.js';

const fmt = (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

async function checkTenant(tenantId) {
  return tenantNamespace.runPromise(async () => {
    tenantNamespace.set('tenantId', tenantId);
    const now = Date.now();
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
