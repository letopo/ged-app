// backend/src/models/Secteur.js - Module PHP

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Secteur = sequelize.define('Secteur', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Code unique du secteur'
  },
  nom: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Nom du secteur'
  },
  infirmerieId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'infirmerie_id',
    references: {
      model: 'php_infirmeries',
      key: 'id'
    },
    comment: 'Infirmerie PHP à laquelle ce secteur est rattaché'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'php_secteurs',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['code'], unique: true },
    { fields: ['infirmerie_id'] }
  ]
});

Secteur.associate = function(models) {
  Secteur.belongsTo(models.Infirmerie, {
    as: 'infirmerie',
    foreignKey: 'infirmerie_id'
  });
  Secteur.hasMany(models.PatientPHP, {
    as: 'patients',
    foreignKey: 'secteur_id'
  });
};

export default Secteur;
