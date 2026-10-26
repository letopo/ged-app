// backend/src/models/ParcVehicules.js
// Parc véhicules : véhicules, check-lists modèles, missions (sorties) et
// contrôles départ / retour. Voir migration 20261025100000-create-parc-vehicules.
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const opts = (tableName) => ({ tableName, timestamps: true, underscored: true });
const tenantId = { type: DataTypes.UUID, allowNull: false };

export const VehicleChecklistTemplate = sequelize.define('VehicleChecklistTemplate', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  vehicleType: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ambulance', field: 'vehicle_type' },
  // [{ key, label, role, items: [{ id, label, kind: 'check'|'level'|'quantity', critical, expected }] }]
  sections: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  // Inventaire hebdomadaire (ambulances) : [{ key, label, items: [{ id, label, kind: 'qty'|'level'|'check'|'yesno', required, unit, expiry, critical }] }]
  inventorySections: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'inventory_sections' },
  inventoryDays: { type: DataTypes.JSONB, allowNull: false, defaultValue: [1, 3, 5], field: 'inventory_days' }, // 1 = lundi
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  updatedBy: { type: DataTypes.UUID, allowNull: true, field: 'updated_by' },
  tenantId,
}, opts('vehicle_checklist_templates'));

export const Vehicle = sequelize.define('Vehicle', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  label: { type: DataTypes.STRING(120), allowNull: false },
  immatriculation: { type: DataTypes.STRING(40), allowNull: false },
  vehicleType: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ambulance', field: 'vehicle_type' },
  serviceId: { type: DataTypes.UUID, allowNull: true, field: 'service_id' },
  managerPosteCode: { type: DataTypes.STRING(60), allowNull: true, field: 'manager_poste_code' },
  checklistTemplateId: { type: DataTypes.UUID, allowNull: true, field: 'checklist_template_id' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'disponible' },
  unavailableReason: { type: DataTypes.STRING(255), allowNull: true, field: 'unavailable_reason' },
  mileage: { type: DataTypes.INTEGER, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  brand: { type: DataTypes.STRING(60), allowNull: true },
  model: { type: DataTypes.STRING(60), allowNull: true },
  year: { type: DataTypes.INTEGER, allowNull: true },
  fuelType: { type: DataTypes.STRING(20), allowNull: true, field: 'fuel_type' },
  vin: { type: DataTypes.STRING(40), allowNull: true },
  inventoryAlerts: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: 'inventory_alerts' }, // { missing: 'AAAA-MM-JJ' }
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  tenantId,
}, opts('vehicles'));

export const VehicleMission = sequelize.define('VehicleMission', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  vehicleId: { type: DataTypes.UUID, allowNull: false, field: 'vehicle_id' },
  documentId: { type: DataTypes.UUID, allowNull: true, field: 'document_id' },
  title: { type: DataTypes.STRING(255), allowNull: true },
  destination: { type: DataTypes.STRING(255), allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'planifiee' },
  plannedDepartureAt: { type: DataTypes.DATE, allowNull: true, field: 'planned_departure_at' },
  plannedReturnAt: { type: DataTypes.DATE, allowNull: true, field: 'planned_return_at' },
  departedAt: { type: DataTypes.DATE, allowNull: true, field: 'departed_at' },
  returnedAt: { type: DataTypes.DATE, allowNull: true, field: 'returned_at' },
  crew: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, // [{ userId, name, role }]
  urgent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  omAfterDeparture: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'om_after_departure' },
  alertsSent: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: 'alerts_sent' },
  createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
  tenantId,
}, opts('vehicle_missions'));

export const VehicleCheck = sequelize.define('VehicleCheck', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  vehicleId: { type: DataTypes.UUID, allowNull: false, field: 'vehicle_id' },
  missionId: { type: DataTypes.UUID, allowNull: false, field: 'mission_id' },
  phase: { type: DataTypes.STRING(10), allowNull: false },
  sectionKey: { type: DataTypes.STRING(40), allowNull: false, field: 'section_key' },
  sectionLabel: { type: DataTypes.STRING(120), allowNull: false, field: 'section_label' },
  items: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  answers: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, // [{ itemId, status, value, comment, photoPath }]
  totalItems: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_items' },
  answeredItems: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'answered_items' },
  anomalies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  criticalAnomaly: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'critical_anomaly' },
  mileage: { type: DataTypes.INTEGER, allowNull: true },
  comment: { type: DataTypes.TEXT, allowNull: true },
  performedBy: { type: DataTypes.UUID, allowNull: true, field: 'performed_by' },
  performedByName: { type: DataTypes.STRING(150), allowNull: true, field: 'performed_by_name' },
  performedAt: { type: DataTypes.DATE, allowNull: false, field: 'performed_at' },
  signaturePath: { type: DataTypes.STRING(255), allowNull: true, field: 'signature_path' },
  documentId: { type: DataTypes.UUID, allowNull: true, field: 'document_id' },
  sha256: { type: DataTypes.STRING(64), allowNull: true },
  tenantId,
}, opts('vehicle_checks'));

// Étape 3 : échéances, carburant, entretien
export const VehicleDeadline = sequelize.define('VehicleDeadline', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  vehicleId: { type: DataTypes.UUID, allowNull: false, field: 'vehicle_id' },
  kind: { type: DataTypes.STRING(30), allowNull: false },
  label: { type: DataTypes.STRING(120), allowNull: false },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'due_date' },
  dueMileage: { type: DataTypes.INTEGER, allowNull: true, field: 'due_mileage' },
  intervalMonths: { type: DataTypes.INTEGER, allowNull: true, field: 'interval_months' },
  intervalKm: { type: DataTypes.INTEGER, allowNull: true, field: 'interval_km' },
  lastDoneDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'last_done_date' },
  lastDoneMileage: { type: DataTypes.INTEGER, allowNull: true, field: 'last_done_mileage' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  attachmentPath: { type: DataTypes.STRING(255), allowNull: true, field: 'attachment_path' },
  alertsSent: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: 'alerts_sent' },
  tenantId,
}, opts('vehicle_deadlines'));

export const VehicleFuelLog = sequelize.define('VehicleFuelLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  vehicleId: { type: DataTypes.UUID, allowNull: false, field: 'vehicle_id' },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  liters: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  amount: { type: DataTypes.INTEGER, allowNull: true },
  mileage: { type: DataTypes.INTEGER, allowNull: true },
  fullTank: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'full_tank' },
  station: { type: DataTypes.STRING(120), allowNull: true },
  attachmentPath: { type: DataTypes.STRING(255), allowNull: true, field: 'attachment_path' },
  createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
  createdByName: { type: DataTypes.STRING(150), allowNull: true, field: 'created_by_name' },
  tenantId,
}, opts('vehicle_fuel_logs'));

export const VehicleMaintenance = sequelize.define('VehicleMaintenance', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  vehicleId: { type: DataTypes.UUID, allowNull: false, field: 'vehicle_id' },
  kind: { type: DataTypes.STRING(30), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'terminee' },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  mileage: { type: DataTypes.INTEGER, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  garage: { type: DataTypes.STRING(120), allowNull: true },
  cost: { type: DataTypes.INTEGER, allowNull: true },
  attachmentPath: { type: DataTypes.STRING(255), allowNull: true, field: 'attachment_path' },
  deadlineId: { type: DataTypes.UUID, allowNull: true, field: 'deadline_id' },
  checkId: { type: DataTypes.UUID, allowNull: true, field: 'check_id' },
  createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
  createdByName: { type: DataTypes.STRING(150), allowNull: true, field: 'created_by_name' },
  tenantId,
}, opts('vehicle_maintenances'));

// Inventaire hebdomadaire d'une ambulance (fiche RO SAU, lun / mer / ven)
export const VehicleInventory = sequelize.define('VehicleInventory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  vehicleId: { type: DataTypes.UUID, allowNull: false, field: 'vehicle_id' },
  inventoryDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'inventory_date' },
  sections: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  answers: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, // [{ itemId, present, expiring, value, status, comment }]
  totalItems: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_items' },
  answeredItems: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'answered_items' },
  shortages: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  expiring: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  criticalAnomaly: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'critical_anomaly' },
  restock: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  comment: { type: DataTypes.TEXT, allowNull: true },
  performedBy: { type: DataTypes.UUID, allowNull: true, field: 'performed_by' },
  performedByName: { type: DataTypes.STRING(150), allowNull: true, field: 'performed_by_name' },
  performedAt: { type: DataTypes.DATE, allowNull: false, field: 'performed_at' },
  signaturePath: { type: DataTypes.STRING(255), allowNull: true, field: 'signature_path' },
  documentId: { type: DataTypes.UUID, allowNull: true, field: 'document_id' },
  sha256: { type: DataTypes.STRING(64), allowNull: true },
  tenantId,
}, opts('vehicle_inventories'));

Vehicle.hasMany(VehicleInventory, { as: 'inventories', foreignKey: 'vehicleId' });
Vehicle.hasMany(VehicleDeadline, { as: 'deadlines', foreignKey: 'vehicleId' });
Vehicle.hasMany(VehicleFuelLog, { as: 'fuelLogs', foreignKey: 'vehicleId' });
Vehicle.hasMany(VehicleMaintenance, { as: 'maintenances', foreignKey: 'vehicleId' });

Vehicle.belongsTo(VehicleChecklistTemplate, { as: 'template', foreignKey: 'checklistTemplateId' });
Vehicle.hasMany(VehicleMission, { as: 'missions', foreignKey: 'vehicleId' });
VehicleMission.belongsTo(Vehicle, { as: 'vehicle', foreignKey: 'vehicleId' });
VehicleMission.hasMany(VehicleCheck, { as: 'checks', foreignKey: 'missionId' });
VehicleCheck.belongsTo(VehicleMission, { as: 'mission', foreignKey: 'missionId' });
VehicleCheck.belongsTo(Vehicle, { as: 'vehicle', foreignKey: 'vehicleId' });
