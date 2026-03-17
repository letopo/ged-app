// backend/src/models/TrelloList.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TrelloList = sequelize.define('TrelloList', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  boardId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'board_id',
    references: {
      model: 'trello_boards',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nom de la colonne (ex: À faire, En cours, Terminé)'
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Ordre d\'affichage'
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: true,
    comment: 'Couleur hex de la colonne'
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'is_archived'
  }
}, {
  tableName: 'trello_lists',
  timestamps: true,
  underscored: true
});

TrelloList.associate = function(models) {
  // Une colonne appartient à un tableau
  this.belongsTo(models.TrelloBoard, {
    foreignKey: 'boardId',
    as: 'board'
  });

  // Une colonne contient plusieurs cartes
  this.hasMany(models.TrelloCard, {
    foreignKey: 'listId',
    as: 'cards',
    onDelete: 'CASCADE'
  });
};

export default TrelloList;