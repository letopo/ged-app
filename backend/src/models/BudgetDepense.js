// backend/src/models/BudgetDepense.js — combines achats + factures
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BudgetDepense = sequelize.define('BudgetDepense', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  annee: { type: DataTypes.INTEGER, allowNull: false },
  type: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { isIn: [['achat','facture']] }
  },
  // Champs communs
  date: { type: DataTypes.DATEONLY, allowNull: false },
  description: { type: DataTypes.STRING(500), allowNull: true },
  categorie: { type: DataTypes.STRING(100), allowNull: true },
  montant: { type: DataTypes.FLOAT, allowNull: false },             // montant principal (TTC pour factures)
  fournisseur: { type: DataTypes.STRING(255), allowNull: true },
  // Champs spécifiques factures
  numero_facture: { type: DataTypes.STRING(100), allowNull: true },
  montant_ht: { type: DataTypes.FLOAT, allowNull: true },
  tva: { type: DataTypes.FLOAT, allowNull: true },
  statut_facture: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'en_attente',
    validate: { isIn: [['en_attente','payee','contestee', null]] }
  },
  created_by: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'gmao_budget_depenses',
  timestamps: true,
  underscored: true,
});

export default BudgetDepense;
