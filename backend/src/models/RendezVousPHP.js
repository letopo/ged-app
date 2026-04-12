import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const RendezVousPHP = sequelize.define('RendezVousPHP', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  patientId:      { type: DataTypes.UUID, allowNull: false, field: 'patient_id' },
  consultationId: { type: DataTypes.UUID, field: 'consultation_id' },
  dateRdv:        { type: DataTypes.DATEONLY, allowNull: false, field: 'date_rdv' },
  heureRdv:       { type: DataTypes.TIME, field: 'heure_rdv' },
  service:        { type: DataTypes.STRING(255) },
  motif:          { type: DataTypes.TEXT },
  notes:          { type: DataTypes.TEXT },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'planifie',
    validate: { isIn: [['planifie', 'honore', 'annule', 'reporte']] },
  },
  creePar:        { type: DataTypes.UUID, field: 'cree_par_id' },
}, {
  tableName: 'php_rendez_vous',
  underscored: true,
});

RendezVousPHP.associate = (models) => {
  RendezVousPHP.belongsTo(models.PatientPHP, { as: 'patient', foreignKey: 'patient_id' });
  RendezVousPHP.belongsTo(models.ConsultationPHP, { as: 'consultation', foreignKey: 'consultation_id' });
  RendezVousPHP.belongsTo(models.User, { as: 'createdBy', foreignKey: 'cree_par_id' });
};

export default RendezVousPHP;
