// backend/src/models/DocumentTransmission.js — document transmis à un utilisateur
// (voir migration 20260930100000-create-document-transmissions et
// controllers/documentTransmissionController.js).
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DocumentTransmission = sequelize.define('DocumentTransmission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  documentId: { type: DataTypes.UUID, allowNull: false, field: 'document_id' },
  fromUserId: { type: DataTypes.UUID, allowNull: true, field: 'from_user_id' },
  toUserId:   { type: DataTypes.UUID, allowNull: false, field: 'to_user_id' },
  message:    { type: DataTypes.TEXT, allowNull: true },
  readAt:     { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'document_transmissions',
  timestamps: true,
  underscored: true,
});

DocumentTransmission.associate = function (models) {
  this.belongsTo(models.Document, { foreignKey: 'documentId', as: 'document' });
  this.belongsTo(models.User, { foreignKey: 'fromUserId', as: 'sender' });
  this.belongsTo(models.User, { foreignKey: 'toUserId', as: 'recipient' });
};

export default DocumentTransmission;
