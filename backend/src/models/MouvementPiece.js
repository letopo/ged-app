// backend/src/models/MouvementPiece.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MouvementPiece = sequelize.define('MouvementPiece', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  piece_id: { type: DataTypes.INTEGER, allowNull: false },
  type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { isIn: [['entree','sortie','ajustement','retour']] }
  },
  quantite: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  intervention_id: { type: DataTypes.INTEGER, allowNull: true }, // FK interventions
  motif: { type: DataTypes.STRING(255), allowNull: true },
  prix_unitaire: { type: DataTypes.FLOAT, allowNull: true },
  created_by: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'gmao_mouvements_pieces',
  timestamps: true,
  underscored: true,
});

export default MouvementPiece;
