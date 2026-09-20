import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ChatMember = sequelize.define('ChatMember', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  role: {
    type: DataTypes.STRING(20),
    defaultValue: 'member',
  },
  lastReadAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_read_at',
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'joined_at',
  },
}, {
  tableName: 'chat_conversation_members',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['conversation_id', 'user_id'] },
  ],
});

export default ChatMember;
