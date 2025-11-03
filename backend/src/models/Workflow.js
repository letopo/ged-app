import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Workflow = sequelize.define('Workflow', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // =======================================================
  // ===        AJOUT DU CHAMP 'step' MANQUANT           ===
  // =======================================================
  step: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "L'ordre de cette étape dans le workflow",
  },
  // =======================================================
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
  // J'ajoute également les champs 'comment' et 'validatedAt' pour la cohérence
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  validatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'validated_at',
  },
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