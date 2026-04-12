// backend/src/models/BudgetLigne.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BudgetLigne = sequelize.define('BudgetLigne', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  annee: { type: DataTypes.INTEGER, allowNull: false },
  categorie: { type: DataTypes.STRING(100), allowNull: false },
  montant: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  description: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'gmao_budget_lignes',
  timestamps: true,
  underscored: true,
});

export default BudgetLigne;
