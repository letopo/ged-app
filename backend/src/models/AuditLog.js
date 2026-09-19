// backend/src/models/AuditLog.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id',
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'user_email',
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'user_name',
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  resource: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  resourceId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'resource_id',
  },
  details: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ip_address',
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent',
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['action'] },
    { fields: ['resource'] },
    { fields: ['created_at'] },
  ],
});

// Helper pour creer un log facilement
AuditLog.log = async (req, action, resource, resourceId = null, details = null) => {
  try {
    await AuditLog.create({
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      userName: req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : null,
      tenantId: req.tenantId || null,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req.ip || req.headers?.['x-forwarded-for'] || null,
      userAgent: req.headers?.['user-agent'] || null,
    });
  } catch (err) {
    console.warn('Audit log error:', err.message);
  }
};

export default AuditLog;
