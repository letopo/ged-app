// backend/src/models/Department.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Code du département (ex: SAU, CHIR, MED)'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Nom complet du département'
  },
  type: {
    type: DataTypes.ENUM(
      'medical',
      'paramedical',
      'administrative',
      'support',
      'pharmacy'
    ),
    allowNull: false,
    comment: 'Type de département'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'departments',
  timestamps: true,
  underscored: true
});

Department.associate = function(models) {
  // Un département peut avoir plusieurs plannings
  this.hasMany(models.Schedule, { 
    foreignKey: 'departmentId', 
    as: 'schedules' 
  });
  
  // Un département peut avoir plusieurs affectations
  this.hasMany(models.ScheduleAssignment, { 
    foreignKey: 'departmentId', 
    as: 'assignments' 
  });
};

export default Department;