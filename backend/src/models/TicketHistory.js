// backend/src/models/TicketHistory.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TicketHistory = sequelize.define('TicketHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ticketId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'ticket_id',
    references: {
      model: 'tickets',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.ENUM('created', 'called', 'started', 'transferred', 'completed', 'cancelled'),
    allowNull: false,
    comment: 'Action effectuée'
  },
  queueType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'queue_type'
  },
  positionNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'position_number'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Utilisateur qui a effectué l\'action'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'ticket_history',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['ticket_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['created_at']
    }
  ]
});

export default TicketHistory;