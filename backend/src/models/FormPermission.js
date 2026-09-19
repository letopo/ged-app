// backend/src/models/FormPermission.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FormPermission = sequelize.define('FormPermission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  formId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'form_id',
  },
  // 'role' | 'service' | 'user' | 'all'
  targetType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'target_type',
  },
  // La valeur : nom du rôle, id du service, id de l'utilisateur, ou '*'
  targetId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'target_id',
  },
  canView: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'can_view',
  },
  canFill: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'can_fill',
  },
  canEdit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'can_edit',
  },
  canDelete: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'can_delete',
  },
}, {
  tableName: 'form_permissions',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['form_id'] },
    { fields: ['target_type', 'target_id'] },
  ],
});

export default FormPermission;
