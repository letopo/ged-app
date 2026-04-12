// backend/src/models/Contrat.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Contrat = sequelize.define('Contrat', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reference: { type: DataTypes.STRING(50), allowNull: true },
  prestataire: { type: DataTypes.STRING(255), allowNull: false },
  type_contrat: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'maintenance_totale',
    validate: { isIn: [['maintenance_preventive','maintenance_corrective','maintenance_totale','piece_rechange','calibration','autre']] }
  },
  date_debut: { type: DataTypes.DATEONLY, allowNull: false },
  date_fin: { type: DataTypes.DATEONLY, allowNull: false },
  montant: { type: DataTypes.FLOAT, allowNull: true },
  periodicite: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: { isIn: [['mensuel','trimestriel','semestriel','annuel','ponctuel', null]] }
  },
  equipements_couverts: { type: DataTypes.TEXT, allowNull: true }, // JSON array of equipement ids / names
  services_couverts: { type: DataTypes.TEXT, allowNull: true },    // JSON array of service names
  statut: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'actif',
    validate: { isIn: [['actif','expire','resilie','en_renouvellement','suspendu']] }
  },
  description: { type: DataTypes.TEXT, allowNull: true },
  contact_prestataire: { type: DataTypes.STRING(255), allowNull: true },
  telephone: { type: DataTypes.STRING(30), allowNull: true },
  email: { type: DataTypes.STRING(255), allowNull: true },
  alerte_renouvellement: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 30 }, // days before expiry
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'gmao_contrats',
  timestamps: true,
  underscored: true,
});

export default Contrat;
