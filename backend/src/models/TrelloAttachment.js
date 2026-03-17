// backend/src/models/TrelloAttachment.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TrelloAttachment = sequelize.define('TrelloAttachment', {
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
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'uploaded_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_name'
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_path',
    comment: 'Chemin du fichier'
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_type',
    comment: 'MIME type'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'file_size',
    comment: 'Taille en octets'
  },
  attachmentType: {
    type: DataTypes.ENUM('photo_before', 'photo_after', 'document', 'other'),
    defaultValue: 'other',
    allowNull: false,
    field: 'attachment_type',
    comment: 'Type de pièce jointe'
  }
}, {
  tableName: 'trello_attachments',
  timestamps: true,
  underscored: true
});

TrelloAttachment.associate = function(models) {
  // Une pièce jointe appartient à une carte
  this.belongsTo(models.TrelloCard, {
    foreignKey: 'cardId',
    as: 'card'
  });

  // Une pièce jointe est uploadée par un utilisateur
  this.belongsTo(models.User, {
    foreignKey: 'uploadedBy',
    as: 'uploader'
  });
};

export default TrelloAttachment;