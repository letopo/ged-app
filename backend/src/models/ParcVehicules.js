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

Vehicle.belongsTo(VehicleChecklistTemplate, { as: 'template', foreignKey: 'checklistTemplateId' });
Vehicle.hasMany(VehicleMission, { as: 'missions', foreignKey: 'vehicleId' });
VehicleMission.belongsTo(Vehicle, { as: 'vehicle', foreignKey: 'vehicleId' });
VehicleMission.hasMany(VehicleCheck, { as: 'checks', foreignKey: 'missionId' });
VehicleCheck.belongsTo(VehicleMission, { as: 'mission', foreignKey: 'missionId' });
VehicleCheck.belongsTo(Vehicle, { as: 'vehicle', foreignKey: 'vehicleId' });
