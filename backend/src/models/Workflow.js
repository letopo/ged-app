import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Workflow = sequelize.define('Workflow', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  step: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "L'ordre de cette étape dans le workflow",
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'document_id',
  },
  validatorId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'validator_id',
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  validatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'validated_at',
  },
  // ✅ NOUVEAU : Date d'assignation de la tâche
  assignedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'assigned_at',
    comment: 'Date à laquelle la tâche a été assignée au validateur',
  },
  // ✅ NOUVEAU : Flag pour indiquer si la validation est en retard
  isOverdue: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.assignedAt || this.status !== 'pending') return false;
      const now = new Date();
      const assigned = new Date(this.assignedAt);
      const hoursDiff = (now - assigned) / (1000 * 60 * 60);
      return hoursDiff > 8;
    }
  },
  // ✅ NOUVEAU : Heures de retard
  hoursOverdue: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.assignedAt || this.status !== 'pending') return 0;
      const now = new Date();
      const assigned = new Date(this.assignedAt);
      const hoursDiff = (now - assigned) / (1000 * 60 * 60);
      return Math.max(0, Math.floor(hoursDiff - 8));
    }
  }
}, {
  tableName: 'workflows',
  timestamps: true,
  underscored: true,
});

Workflow.associate = function(models) {
  this.belongsTo(models.Document, { foreignKey: 'documentId', as: 'document' });
  this.belongsTo(models.User, { foreignKey: 'validatorId', as: 'validator' });
};

export default Workflow;