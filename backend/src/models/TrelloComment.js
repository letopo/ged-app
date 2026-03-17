// backend/src/models/TrelloComment.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TrelloComment = sequelize.define('TrelloComment', {
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
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Contenu du commentaire'
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'is_edited'
  }
}, {
  tableName: 'trello_comments',
  timestamps: true,
  underscored: true
});

TrelloComment.associate = function(models) {
  // Un commentaire appartient à une carte
  this.belongsTo(models.TrelloCard, {
    foreignKey: 'cardId',
    as: 'card'
  });

  // Un commentaire est écrit par un utilisateur
  this.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'author'
  });
};

export default TrelloComment;