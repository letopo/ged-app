// backend/src/models/Position.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Position = sequelize.define('Position', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  queueType: {
    type: DataTypes.ENUM('accueil_php', 'accueil_normal', 'caisse'),
    allowNull: false,
    comment: 'Type de file d\'attente'
  },
  positionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Numéro de la position (1, 2, etc.)'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL',
    comment: 'Utilisateur actuellement assigné'
  },
  status: {
    type: DataTypes.ENUM('offline', 'available', 'busy'),
    defaultValue: 'offline',
    comment: 'Statut de la position'
  },
  lastActiveAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Dernière activité'
  }
}, {
  tableName: 'positions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['queue_type', 'position_number']
    }
  ]
});

Position.associate = function(models) {
  this.belongsTo(models.User, { foreignKey: 'userId', as: 'assignedUser' });
};

export default Position;