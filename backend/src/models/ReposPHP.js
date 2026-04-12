// backend/src/models/ReposPHP.js - Module PHP

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ReposPHP = sequelize.define('ReposPHP', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'patient_id',
    references: {
      model: 'php_patients',
      key: 'id'
    }
  },
  consultationId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'consultation_id',
    references: {
      model: 'php_consultations',
      key: 'id'
    }
  },
  dateDebut: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'date_debut'
  },
  dateFin: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'date_fin'
  },
  dureeJours: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'duree_jours',
    comment: 'Durée totale du repos en jours ouvrés'
  },
  status: {
    type: DataTypes.ENUM('en_cours', 'termine', 'prolonge'),
    defaultValue: 'en_cours',
    allowNull: false
  },
  // Historique des prolongations (tableau JSON)
  prolongations: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Tableau des prolongations [{dateDebut, dateFin, duree, motif, date_prolongation}]'
  },
  motif: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Motif médical du repos'
  },
  medecinId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'medecin_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  medecinNom: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'medecin_nom'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'php_repos',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['patient_id'] },
    { fields: ['consultation_id'] },
    { fields: ['date_debut'] },
    { fields: ['status'] }
  ]
});

ReposPHP.associate = function(models) {
  ReposPHP.belongsTo(models.PatientPHP, {
    as: 'patient',
    foreignKey: 'patient_id'
  });
  ReposPHP.belongsTo(models.ConsultationPHP, {
    as: 'consultation',
    foreignKey: 'consultation_id'
  });
  ReposPHP.belongsTo(models.User, {
    as: 'medecin',
    foreignKey: 'medecin_id'
  });
};

export default ReposPHP;
