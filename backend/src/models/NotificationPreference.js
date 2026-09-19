// backend/src/models/NotificationPreference.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const NotificationPreference = sequelize.define('NotificationPreference', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'user_id',
  },
  // Notifications par email
  emailOnNewTask: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_on_new_task',
  },
  emailOnApproval: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_on_approval',
  },
  emailOnRejection: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_on_rejection',
  },
  emailOnComment: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_on_comment',
  },
  // Notifications push
  pushEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'push_enabled',
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
}, {
  tableName: 'notification_preferences',
  timestamps: true,
  underscored: true,
});

export default NotificationPreference;
