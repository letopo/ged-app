// backend/src/models/Schedule.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Schedule = sequelize.define('Schedule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Titre du planning'
  },
  scheduleType: {
    type: DataTypes.ENUM(
      'administrative',
      'paramedical_services',
      'paramedical_pharmacy',
      'medical_duties',
      'hospital_services_agents',
      'general_services',
      'emergency_reinforcement',
      'weekend'
    ),
    allowNull: false,
    comment: 'Type de planning'
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 12
    }
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  createdByUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'RESTRICT'
  },
  status: {
    type: DataTypes.ENUM(
      'draft',
      'pending_dds',
      'pending_medical',
      'pending_dg',
      'approved',
      'rejected',
      'archived'
    ),
    defaultValue: 'draft'
  },
  validationWorkflow: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Workflow de validation selon le type'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  publishedByUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  pdfPath: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'schedules',
  timestamps: true,
  underscored: true
});

// Méthode helper pour déterminer le workflow de validation
Schedule.getValidationWorkflow = function(scheduleType) {
  const workflows = {
    'general_services': ['dg'],
    'administrative': ['dg'],
    'emergency_reinforcement': ['dg'],
    'paramedical_services': ['dds', 'dg'],
    'paramedical_pharmacy': ['dds', 'dg'],
    'hospital_services_agents': ['dds', 'dg'],
    'weekend': ['dds', 'medical_chief', 'dg'],
    'medical_duties': ['medical_chief', 'dg']
  };
  
  return workflows[scheduleType] || ['dg'];
};

Schedule.associate = function(models) {
  this.belongsTo(models.User, { 
    foreignKey: 'createdByUserId', 
    as: 'creator' 
  });
  
  this.belongsTo(models.User, { 
    foreignKey: 'publishedByUserId', 
    as: 'publisher' 
  });
  
  this.belongsTo(models.Department, { 
    foreignKey: 'departmentId', 
    as: 'department' 
  });
  
  this.hasMany(models.ScheduleAssignment, { 
    foreignKey: 'scheduleId', 
    as: 'assignments' 
  });
  
  this.hasMany(models.ScheduleValidation, { 
    foreignKey: 'scheduleId', 
    as: 'validations' 
  });
  
  this.hasMany(models.ScheduleChangeLog, { 
    foreignKey: 'scheduleId', 
    as: 'changesLog' 
  });
};

export default Schedule;