// src/models/Service.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  tableName: 'services',
  timestamps: true,
  underscored: true,
});

// AJOUT IMPORTANT : DÉFINITION DES ASSOCIATIONS
Service.associate = function(models) {
  this.hasMany(models.ServiceMember, { foreignKey: 'serviceId', as: 'members' });
};

export default Service;