// backend/src/models/DemandeAcquisition.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DemandeAcquisition = sequelize.define('DemandeAcquisition', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reference: { type: DataTypes.STRING(50), allowNull: true },         // auto-generated
  designation: { type: DataTypes.STRING(255), allowNull: false },     // equipment name
  type_equipement: { type: DataTypes.STRING(100), allowNull: true },
  quantite: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  service_demandeur: { type: DataTypes.STRING(100), allowNull: true },
  demandeur_nom: { type: DataTypes.STRING(255), allowNull: true },
  demandeur_id: { type: DataTypes.UUID, allowNull: true },            // FK users
  priorite: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'normale',
    validate: { isIn: [['normale','urgente','critique']] }
  },
  motif: { type: DataTypes.TEXT, allowNull: true },
  specifications: { type: DataTypes.TEXT, allowNull: true },
  budget_estime: { type: DataTypes.FLOAT, allowNull: true },
  statut: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'en_attente',
    validate: { isIn: [['en_attente','approuvee','rejetee','commandee','receptionnee','affectee']] }
  },
  date_demande: { type: DataTypes.DATEONLY, allowNull: false },
  date_approbation: { type: DataTypes.DATEONLY, allowNull: true },
  date_commande: { type: DataTypes.DATEONLY, allowNull: true },
  date_reception: { type: DataTypes.DATEONLY, allowNull: true },
  fournisseur: { type: DataTypes.STRING(255), allowNull: true },
  numero_commande: { type: DataTypes.STRING(100), allowNull: true },
  prix_achat: { type: DataTypes.FLOAT, allowNull: true },
  equipement_id: { type: DataTypes.INTEGER, allowNull: true },        // FK equipements (set when affecte)
  motif_rejet: { type: DataTypes.TEXT, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'gmao_acquisitions',
  timestamps: true,
  underscored: true,
});

export default DemandeAcquisition;
