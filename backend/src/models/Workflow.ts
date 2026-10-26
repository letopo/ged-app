// backend/src/models/Workflow.ts — une étape de validation d'un document

import { DataTypes, Model } from 'sequelize';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import sequelize from '../config/database.js';
import { initModel } from './types.js';
import type { ModelRegistry } from './types.js';

class Workflow extends Model<InferAttributes<Workflow>, InferCreationAttributes<Workflow>> {
  declare id: CreationOptional<string>;
  /** Ordre de cette étape dans le circuit. */
  declare step: number;
  declare status: string;
  declare documentId: string;
  declare validatorId: string;
  declare comment: string | null;
  declare validatedAt: Date | null;
  declare assignedAt: Date | null;
  declare deadlineAt: Date | null;
  declare tenantId: CreationOptional<string>;
  declare originalValidatorId: string | null;
  declare isSubstituted: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  // Champs calculés (VIRTUAL, lecture seule)
  declare isOverdue: CreationOptional<boolean>;
  declare daysOverdue: CreationOptional<number>;
  declare hoursOverdue: CreationOptional<number>;

  static associate(models: ModelRegistry) {
    this.belongsTo(models.Document, { foreignKey: 'documentId', as: 'document' });
    this.belongsTo(models.User, { foreignKey: 'validatorId', as: 'validator' });
    this.belongsTo(models.User, { foreignKey: 'originalValidatorId', as: 'originalValidator' });
  }
}

initModel(Workflow, {
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
      const hoursDiff = (now.getTime() - new Date(this.assignedAt).getTime()) / (1000 * 60 * 60);
      return hoursDiff > 8;
    }
  },
  // Jours de retard par rapport à la deadline
  daysOverdue: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.deadlineAt || !['pending'].includes(this.status)) return 0;
      const now = new Date();
      const diff = (now.getTime() - new Date(this.deadlineAt).getTime()) / (1000 * 60 * 60 * 24);
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
      const hoursDiff = (now.getTime() - assigned.getTime()) / (1000 * 60 * 60);
      return Math.max(0, Math.floor(hoursDiff - 8));
    }
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  // Vrai titulaire de cette étape quand elle est actuellement portée par son
  // remplaçant (absence) — permet le retour automatique si non encore traitée.
  originalValidatorId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'original_validator_id',
  },
  // Vrai tant que validatorId pointe vers un remplaçant plutôt que le titulaire
  // habituel — pilote le retour automatique et le tampon "P.O." sur le PDF.
  isSubstituted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_substituted',
  },
}, {
  sequelize,
  modelName: 'Workflow',
  tableName: 'workflows',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['validator_id'] },
    { fields: ['document_id'] },
    { fields: ['status'] },
    { fields: ['validator_id', 'status'] },
    { fields: ['document_id', 'status'] },
    { fields: ['created_at'] },
  ],
});

export default Workflow;