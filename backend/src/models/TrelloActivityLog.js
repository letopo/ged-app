// backend/src/models/TrelloActivityLog.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TrelloActivityLog = sequelize.define('TrelloActivityLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  cardId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'card_id',
    references: {
      model: 'trello_cards',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  actionType: {
    type: DataTypes.ENUM(
      'card_created',
      'card_moved',
      'card_updated',
      'card_archived',
      'card_assigned',
      'card_unassigned',
      'comment_added',
      'attachment_added',
      'due_date_set',
      'priority_changed',
      'status_changed',
      'label_added',
      'label_removed'
    ),
    allowNull: false,
    field: 'action_type'
  },
  actionData: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'action_data',
    comment: 'Données de l\'action (old_value, new_value, etc.)'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at',
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'trello_activity_logs',
  timestamps: false // Pas de updatedAt pour les logs
});

TrelloActivityLog.associate = function(models) {
  // Un log appartient à une carte
  this.belongsTo(models.TrelloCard, {
    foreignKey: 'cardId',
    as: 'card'
  });

  // Un log est créé par un utilisateur
  this.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

export default TrelloActivityLog;