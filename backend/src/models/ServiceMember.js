// src/models/ServiceMember.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ServiceMember = sequelize.define('ServiceMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  serviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'service_id',
    references: {
      model: 'services',
      key: 'id',
    },
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  fonction: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [[
        'Personnel paramédical',
        'Secrétaire',
        'Major',
        'Chef de Service',
        'Chef de Service Adjoint',
        'DDS',
        'Médecin Chef',
        'Responsable SecuLog',
        'DS',
        'DGA',
        'DG',
      ]],
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  tableName: 'service_members',
  timestamps: true,
  underscored: true,
});

// AJOUT IMPORTANT : DÉFINITION DES ASSOCIATIONS
ServiceMember.associate = function(models) {
  this.belongsTo(models.Service, { foreignKey: 'serviceId', as: 'service' });
  this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
};

export default ServiceMember;