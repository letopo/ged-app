// backend/src/models/Equipement.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Equipement = sequelize.define('Equipement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nom: { type: DataTypes.STRING, allowNull: false },
  reference: { type: DataTypes.STRING, allowNull: true },
  numero_serie: { type: DataTypes.STRING, allowNull: true },
  service: { type: DataTypes.STRING, allowNull: true },
  type_equipement: { type: DataTypes.STRING, allowNull: true },
  marque: { type: DataTypes.STRING, allowNull: true },
  modele: { type: DataTypes.STRING, allowNull: true },
  date_mise_en_service: { type: DataTypes.DATEONLY, allowNull: true },
  statut: {
    type: DataTypes.ENUM('actif', 'en_reparation', 'hors_service'),
    defaultValue: 'actif',
    allowNull: false,
  },
  matricule: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Code matricule interne (ex: 01MILA1H8)'
  },
  origine: {
    type: DataTypes.ENUM('achat', 'don', 'transfert', 'autre'),
    allowNull: true,
    defaultValue: 'achat'
  },
  fournisseur: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  date_mise_au_rebus: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'equipements',
  timestamps: true,
  underscored: true,
});

export default Equipement;
