// backend/src/models/QueuePosition.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const QueuePosition = sequelize.define('QueuePosition', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  queueType: {
    type: DataTypes.ENUM('accueil_php', 'accueil_normal', 'caisse'),
    allowNull: false,
    field: 'queue_type',
    comment: 'Type de file d\'attente'
  },
  positionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'position_number',
    comment: 'Numéro de position (1-4 pour accueil, 1 pour caisse)'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Agent assigné à cette position'
  },
  currentTicketId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'current_ticket_id',
    references: {
      model: 'tickets',
      key: 'id'
    },
    comment: 'Ticket en cours de traitement'
  },
  status: {
    type: DataTypes.ENUM('available', 'busy', 'offline'),
    defaultValue: 'offline',
    allowNull: false,
    comment: 'Statut de la position'
  }
}, {
  tableName: 'queue_positions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['queue_type', 'position_number']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    }
  ]
});

export default QueuePosition;