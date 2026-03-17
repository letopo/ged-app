// backend/src/models/ScheduleAssignment.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ScheduleAssignment = sequelize.define('ScheduleAssignment', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'employees',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  employeeName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Nom de l\'employé (cache)'
  },
  assignmentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  shiftTypeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'shift_types',
      key: 'id'
    },
    onDelete: 'RESTRICT'
  },
  shiftCode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Code du shift (cache pour performance)'
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
  position: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  notes: {
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
  },
  reminderSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reminderSentAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'schedule_assignments',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['schedule_id', 'assignment_date']
    },
    {
      fields: ['user_id', 'assignment_date']
    },
    {
      fields: ['employee_id', 'assignment_date']
    }
  ]
});

ScheduleAssignment.associate = function(models) {
  // Planning parent
  this.belongsTo(models.Schedule, { 
    foreignKey: 'scheduleId', 
    as: 'schedule' 
  });
  
  // Utilisateur assigné
  this.belongsTo(models.User, { 
    foreignKey: 'userId', 
    as: 'user' 
  });
  
  // Employé assigné
  this.belongsTo(models.Employee, { 
    foreignKey: 'employeeId', 
    as: 'employee' 
  });
  
  // Type de shift
  this.belongsTo(models.ShiftType, { 
    foreignKey: 'shiftTypeId', 
    as: 'shiftType' 
  });
  
  // Département
  this.belongsTo(models.Department, { 
    foreignKey: 'departmentId', 
    as: 'department' 
  });
};

export default ScheduleAssignment;