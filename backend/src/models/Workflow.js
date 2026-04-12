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
  // Date limite de validation (assignedAt + DEADLINE_DAYS jours)
  deadlineAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deadline_at',
    comment: 'Date limite au-delà de laquelle la tâche expire automatiquement',
  },
  // Flag retard : pending depuis plus de 8h OU deadline dépassée
  isOverdue: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.assignedAt || !['pending'].includes(this.status)) return false;
      const now = new Date();
      if (this.deadlineAt) return now > new Date(this.deadlineAt);
      const hoursDiff = (now - new Date(this.assignedAt)) / (1000 * 60 * 60);
      return hoursDiff > 8;
    }
  },
  // Jours de retard par rapport à la deadline
  daysOverdue: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.deadlineAt || !['pending'].includes(this.status)) return 0;
      const now = new Date();
      const diff = (now - new Date(this.deadlineAt)) / (1000 * 60 * 60 * 24);
      return Math.max(0, Math.ceil(diff));
    }
  },
  // Heures de retard (compatibilité ancienne)
  hoursOverdue: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.assignedAt || !['pending'].includes(this.status)) return 0;
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