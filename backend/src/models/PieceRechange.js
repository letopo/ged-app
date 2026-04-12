// backend/src/models/PieceRechange.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PieceRechange = sequelize.define('PieceRechange', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reference: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  designation: { type: DataTypes.STRING(255), allowNull: false },
  categorie: { type: DataTypes.STRING(100), allowNull: true },
  quantite_stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  quantite_min: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }, // alert threshold
  unite: { type: DataTypes.STRING(30), allowNull: true, defaultValue: 'unité' },
  prix_unitaire: { type: DataTypes.FLOAT, allowNull: true },
  fournisseur: { type: DataTypes.STRING(255), allowNull: true },
  localisation: { type: DataTypes.STRING(100), allowNull: true }, // storage location
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'gmao_pieces_rechange',
  timestamps: true,
  underscored: true,
});

export default PieceRechange;
