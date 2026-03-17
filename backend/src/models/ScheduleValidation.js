// backend/src/models/ScheduleValidation.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ScheduleValidation = sequelize.define('ScheduleValidation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  scheduleId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'schedules',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  validatorRole: {
    type: DataTypes.ENUM('dds', 'medical_chief', 'dg'),
    allowNull: false,
    comment: 'Rôle du validateur requis'
  },
  validatorUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  validationOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Ordre de validation dans le workflow'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  validatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notificationSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notificationSentAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'schedule_validations',
  timestamps: true,
  underscored: true
});

ScheduleValidation.associate = function(models) {
  this.belongsTo(models.Schedule, { 
    foreignKey: 'scheduleId', 
    as: 'schedule' 
  });
  
  this.belongsTo(models.User, { 
    foreignKey: 'validatorUserId', 
    as: 'validator' 
  });
};

// Méthode helper pour obtenir le label du rôle
ScheduleValidation.getRoleLabel = function(role) {
  const labels = {
    'dds': 'Directrice des Soins',
    'medical_chief': 'Médecin Chef',
    'dg': 'Directeur Général'
  };
  return labels[role] || role;
};

export default ScheduleValidation;