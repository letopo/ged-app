// backend/src/models/WorkflowTemplate.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const WorkflowTemplate = sequelize.define('WorkflowTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Categories de documents auxquelles ce modele s'applique (null = toutes)
  categories: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
  },
  // Liste ordonnee des validateurs [{userId, label}]
  validators: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  // Createur du modele
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
}, {
  tableName: 'workflow_templates',
  underscored: true,
});

export default WorkflowTemplate;
