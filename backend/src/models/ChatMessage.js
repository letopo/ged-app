import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'conversation_id',
  },
  authorId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'author_id',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '',
  },
  attachmentPath: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'attachment_path',
  },
  attachmentName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'attachment_name',
  },
  attachmentSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'attachment_size',
  },
  // Document de la GED partagé (ouvert seulement par qui a le droit de le lire)
  attachmentDocumentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'attachment_document_id',
  },
  // Message automatique (discussion d'un document : validation, transmission…)
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_system',
  },
  // Réponse à un message de la même conversation
  replyToId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reply_to_id',
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_deleted',
  },
  editedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'edited_at',
  },
}, {
  tableName: 'chat_messages',
  timestamps: true,
  underscored: true,
});

export default ChatMessage;
