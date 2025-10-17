// backend/src/models/Workflow.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Workflow = sequelize.define('Workflow', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'document_id',
    references: {
      model: 'documents',
      key: 'id'
    }
  },
  validatorId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'validator_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    comment: 'Statut de la tâche de validation'
  },
  step: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Ordre dans le circuit de validation (1 = première étape)'
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Commentaire du validateur lors de l\'approbation/rejet'
  },
  validatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'validated_at',
    comment: 'Date et heure de la validation'
  },
  notified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indique si le validateur a été notifié'
  }
}, {
  tableName: 'workflows',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['document_id'] },
    { fields: ['validator_id'] },
    { fields: ['status'] },
    { fields: ['step'] },
    { fields: ['created_at'] }
  ]
});

export default Workflow;