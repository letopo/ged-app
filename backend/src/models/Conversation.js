import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM('channel', 'direct', 'document'),
    allowNull: false,
    defaultValue: 'channel',
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'document_id',
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by',
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_archived',
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_message_at',
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
}, {
  tableName: 'chat_conversations',
  timestamps: true,
  underscored: true,
});

export default Conversation;
