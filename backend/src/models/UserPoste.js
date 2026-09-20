// backend/src/models/UserPoste.js
// Table de jointure : quel utilisateur occupe quel poste.

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const UserPoste = sequelize.define('UserPoste', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  posteId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'poste_id',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  assignedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assigned_by',
  },
  assignedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'assigned_at',
  },
}, {
  tableName: 'user_postes',
  timestamps: true,
  underscored: true,
});

export default UserPoste;
