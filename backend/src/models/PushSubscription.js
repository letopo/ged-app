// backend/src/models/PushSubscription.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PushSubscription = sequelize.define('PushSubscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  endpoint: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  subscription: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'JSON stringifié de la souscription push complète'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'push_subscriptions',
  timestamps: true,
  underscored: true
});

export default PushSubscription;