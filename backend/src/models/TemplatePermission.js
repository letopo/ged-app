// backend/src/models/TemplatePermission.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TemplatePermission = sequelize.define('TemplatePermission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  templateName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nom du template (ex: "Demande de permission")',
  },
  // Restriction par rôle (optionnel)
  allowedRoles: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Tableau de rôles autorisés (vide = non restreint par rôle)',
  },
  // Restriction par utilisateur spécifique (optionnel)
  allowedUserIds: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Tableau d\'IDs utilisateurs autorisés (vide = non restreint par utilisateur)',
  },
  // Si true, seuls les admins + les personnes autorisées voient ce template
  isRestricted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si true, le template n\'est visible que pour les rôles/utilisateurs autorisés + admins',
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Visibilité par défaut des documents créés avec ce template : 'personal' ou 'service'.
  // L'uploader peut l'annuler au cas par cas au moment de l'upload.
  defaultVisibility: {
    type: DataTypes.STRING,
    defaultValue: 'personal',
    field: 'default_visibility',
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
}, {
  tableName: 'template_permissions',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['templateName'] },
  ],
});

export default TemplatePermission;
