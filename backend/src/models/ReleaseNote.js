// backend/src/models/ReleaseNote.js — Nouveautés rédigées depuis l'application
// (voir migration 20260929140000-create-release-notes et controllers/releaseNoteController.js).
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ReleaseNote = sequelize.define('ReleaseNote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title:       { type: DataTypes.STRING(200), allowNull: false },
  items:       { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  target:      { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'app' },
  audience:    { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'all' },
  status:      { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
  publishedAt: { type: DataTypes.DATE, allowNull: true, field: 'published_at' },
  createdBy:   { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'release_notes',
  timestamps: true,
  underscored: true,
});

ReleaseNote.associate = function (models) {
  this.belongsTo(models.User, { foreignKey: 'createdBy', as: 'author' });
};

export default ReleaseNote;
