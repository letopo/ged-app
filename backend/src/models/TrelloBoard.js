// backend/src/models/TrelloBoard.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TrelloBoard = sequelize.define('TrelloBoard', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nom du tableau (ex: Moyens Généraux, Biomédical, Informatique)'
  },
  serviceType: {
    type: DataTypes.ENUM('MG', 'Biomedical', 'Informatique'),
    allowNull: false,
    unique: true,
    field: 'service_type',
    comment: 'Type de service technique'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    field: 'is_active'
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Paramètres du tableau (couleurs, règles, etc.)'
  }
}, {
  tableName: 'trello_boards',
  timestamps: true,
  underscored: true
});

TrelloBoard.associate = function(models) {
  // Un tableau contient plusieurs colonnes
  this.hasMany(models.TrelloList, {
    foreignKey: 'boardId',
    as: 'lists',
    onDelete: 'CASCADE'
  });
};

export default TrelloBoard;