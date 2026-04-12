// backend/src/models/PatientPHP.js - Module PHP

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PatientPHP = sequelize.define('PatientPHP', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  matricule: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Numéro matricule de l\'employé'
  },
  nom: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  prenom: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  genre: {
    type: DataTypes.ENUM('M', 'F'),
    allowNull: true
  },
  dateNaissance: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'date_naissance'
  },
  // Secteur de travail (détermine l'infirmerie automatiquement)
  secteurId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'secteur_id',
    references: {
      model: 'php_secteurs',
      key: 'id'
    }
  },
  // Infirmerie PHP de rattachement (auto-mappée depuis le secteur)
  infirmerieId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'infirmerie_id',
    references: {
      model: 'php_infirmeries',
      key: 'id'
    }
  },
  telephone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  adresse: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  // Statut global du patient dans le système
  status: {
    type: DataTypes.ENUM('actif', 'decede', 'transfere', 'inactif'),
    defaultValue: 'actif',
    allowNull: false
  },
  // Agent PHP qui a enregistré ce patient
  createdByUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by_user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'php_patients',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['matricule'], unique: true },
    { fields: ['nom'] },
    { fields: ['infirmerie_id'] },
    { fields: ['secteur_id'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

PatientPHP.associate = function(models) {
  PatientPHP.belongsTo(models.Secteur, {
    as: 'secteur',
    foreignKey: 'secteur_id'
  });
  PatientPHP.belongsTo(models.Infirmerie, {
    as: 'infirmerie',
    foreignKey: 'infirmerie_id'
  });
  PatientPHP.belongsTo(models.User, {
    as: 'createdBy',
    foreignKey: 'created_by_user_id'
  });
  PatientPHP.hasMany(models.ConsultationPHP, {
    as: 'consultations',
    foreignKey: 'patient_id'
  });
  PatientPHP.hasMany(models.BonPriseEnCharge, {
    as: 'bons',
    foreignKey: 'patient_id'
  });
  PatientPHP.hasMany(models.HospitalisationPHP, {
    as: 'hospitalisations',
    foreignKey: 'patient_id'
  });
  PatientPHP.hasMany(models.ReposPHP, {
    as: 'repos',
    foreignKey: 'patient_id'
  });
  PatientPHP.hasMany(models.OperationPHP, {
    as: 'operations',
    foreignKey: 'patient_id'
  });
};

export default PatientPHP;
