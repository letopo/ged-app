// backend/src/models/Infirmerie.js - Module PHP

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Infirmerie = sequelize.define('Infirmerie', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Code unique infirmerie (ex: INF_NYOMBE)'
  },
  nom: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Nom complet de l\'infirmerie'
  },
  localisation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Localisation / site'
  },
  responsable: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Nom du responsable de l\'infirmerie'
  },
  telephone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'php_infirmeries',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['code'], unique: true },
    { fields: ['is_active'] }
  ]
});

Infirmerie.associate = function(models) {
  Infirmerie.hasMany(models.Secteur, {
    as: 'secteurs',
    foreignKey: 'infirmerie_id'
  });
  Infirmerie.hasMany(models.PatientPHP, {
    as: 'patients',
    foreignKey: 'infirmerie_id'
  });
};

export default Infirmerie;
