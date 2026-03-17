import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const License = sequelize.define('License', {
  key: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Clé de licence chiffrée (JWT)'
  },
  clientName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'client_name'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  }
}, {
  tableName: 'licenses',
  timestamps: true,
  underscored: true
});

export default License;