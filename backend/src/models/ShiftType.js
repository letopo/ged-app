// backend/src/models/ShiftType.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ShiftType = sequelize.define('ShiftType', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    comment: 'Code du shift (P, R, J, N, A, etc.)'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Nom du shift'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: true,
    comment: 'Couleur hexadécimale pour affichage (#RRGGBB)'
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Heure de début (si applicable)'
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Heure de fin (si applicable)'
  },
  isWorkDay: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Indique si c\'est un jour de travail'
  },
  isNightShift: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indique si c\'est une garde de nuit'
  },
  requiresNotification: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Nécessite une notification de rappel'
  },
  notificationHoursBefore: {
    type: DataTypes.INTEGER,
    defaultValue: 24,
    comment: 'Heures avant le shift pour notifier'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'shift_types',
  timestamps: true,
  underscored: true
});

ShiftType.associate = function(models) {
  // Un type de shift peut être utilisé dans plusieurs affectations
  this.hasMany(models.ScheduleAssignment, { 
    foreignKey: 'shiftTypeId', 
    as: 'assignments' 
  });
};

export default ShiftType;