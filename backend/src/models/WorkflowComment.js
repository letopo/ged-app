import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const WorkflowComment = sequelize.define('WorkflowComment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'document_id',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'workflow_comments',
  timestamps: true,
  underscored: true,
});

WorkflowComment.associate = function(models) {
  this.belongsTo(models.Document, { foreignKey: 'documentId', as: 'document' });
  this.belongsTo(models.User, { foreignKey: 'userId', as: 'author' });
};

export default WorkflowComment;
