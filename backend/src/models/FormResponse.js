// backend/src/models/FormResponse.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FormResponse = sequelize.define('FormResponse', {
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
  // Version du schéma au moment de la soumission
  formVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'form_version',
  },
  submittedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'submitted_by',
  },
  // Données soumises : { fieldId: valeur, ... }
  data: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  status: {
    type: DataTypes.ENUM('submitted', 'reviewed', 'archived'),
    defaultValue: 'submitted',
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'submitted_at',
  },
  // Workflow déclenché à la soumission
  workflowStatus: {
    type: DataTypes.STRING(30),
    allowNull: true,
    defaultValue: null,
    field: 'workflow_status',
    // null | pending_approval | approved | rejected
  },
  workflowCurrentStep: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    field: 'workflow_current_step',
  },
  workflowData: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
    field: 'workflow_data',
    // { templateId, templateName, steps: [{ step, name, validatorType, role, userId, userLabel, deadlineDays, onReject, status, comment, validatedAt }] }
  },
}, {
  tableName: 'form_responses',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['form_id'] },
    { fields: ['submitted_by'] },
    { fields: ['status'] },
    { fields: ['submitted_at'] },
    // Index GIN pour recherche dans les données JSONB
    {
      fields: ['data'],
      using: 'gin',
      operator: 'jsonb_path_ops',
    },
  ],
});

export default FormResponse;
