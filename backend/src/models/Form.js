// backend/src/models/Form.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Form = sequelize.define('Form', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    // consultation | admission | satisfaction | rh | administratif | custom
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft',
  },
  // Schéma complet du formulaire (champs, layout, logique)
  schema: {
    type: DataTypes.JSONB,
    defaultValue: {
      version: 1,
      fields: [],
      layout: { columns: 12, rowHeight: 40, gap: 8 },
      logic: { conditions: [], calculations: [] },
    },
  },
  // Paramètres globaux (logo, couleurs, message de confirmation, etc.)
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      submitLabel: 'Soumettre',
      successMessage: 'Votre formulaire a été soumis avec succès.',
      allowMultipleSubmissions: true,
      showProgressBar: false,
      theme: 'default',
    },
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by',
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'published_at',
  },
  // Version — incrémentée à chaque publication
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  workflowTemplateId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'workflow_template_id',
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
}, {
  tableName: 'forms',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['type'] },
    { fields: ['created_by'] },
    { fields: ['created_at'] },
  ],
});

export default Form;
