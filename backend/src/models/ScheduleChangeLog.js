// backend/src/models/ScheduleChangeLog.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ScheduleChangeLog = sequelize.define('ScheduleChangeLog', {
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
  assignmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID de l\'affectation modifiée'
  },
  changedByUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'RESTRICT'
  },
  changeType: {
    type: DataTypes.ENUM(
      'create',
      'update',
      'delete',
      'status_change',
      'validation',
      'publish'
    ),
    allowNull: false
  },
  affectedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  affectedEmployee: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  oldValue: {
    type: DataTypes.JSON,
    allowNull: true
  },
  newValue: {
    type: DataTypes.JSON,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'schedule_changes_log',
  timestamps: true,
  underscored: true,
  updatedAt: false, // Pas de mise à jour pour les logs
  indexes: [
    {
      fields: ['schedule_id', 'created_at']
    },
    {
      fields: ['changed_by_user_id', 'created_at']
    },
    {
      fields: ['change_type']
    }
  ]
});

ScheduleChangeLog.associate = function(models) {
  // Planning modifié
  this.belongsTo(models.Schedule, { 
    foreignKey: 'scheduleId', 
    as: 'schedule' 
  });
  
  // Utilisateur ayant effectué la modification
  this.belongsTo(models.User, { 
    foreignKey: 'changedByUserId', 
    as: 'changedBy' 
  });
};

// Méthode helper pour créer un log
ScheduleChangeLog.logChange = async function(data, transaction = null) {
  const options = transaction ? { transaction } : {};
  
  return await this.create({
    scheduleId: data.scheduleId,
    assignmentId: data.assignmentId || null,
    changedByUserId: data.userId,
    changeType: data.changeType,
    affectedDate: data.affectedDate || null,
    affectedEmployee: data.affectedEmployee || null,
    oldValue: data.oldValue || null,
    newValue: data.newValue || null,
    description: data.description || null,
    ipAddress: data.ipAddress || null,
    userAgent: data.userAgent || null
  }, options);
};

export default ScheduleChangeLog;