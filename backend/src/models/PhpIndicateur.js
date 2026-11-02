// backend/src/models/PhpIndicateur.js - Module PHP
// Indicateur du Point Focal repéré par des mots-clés du diagnostic (paludisme,
// IST…) : un diagnostic compte s'il contient un mot commençant par l'un d'eux.
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PhpIndicateur = sequelize.define('PhpIndicateur', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  libelle: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  motsCles: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'mots_cles'
  },
  ordre: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'tenant_id'
  }
}, {
  tableName: 'php_indicateurs',
  timestamps: true,
  underscored: true
});

export default PhpIndicateur;
