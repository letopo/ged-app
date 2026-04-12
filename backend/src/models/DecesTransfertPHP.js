// backend/src/models/DecesTransfertPHP.js - Module PHP

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DecesTransfertPHP = sequelize.define('DecesTransfertPHP', {
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
  type: {
    type: DataTypes.ENUM('deces', 'transfert'),
    allowNull: false,
    comment: 'Type d\'archivage : décès ou transfert'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  motif: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Motif du décès ou du transfert'
  },
  // Si transfert
  destination: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Établissement de destination (si transfert)'
  },
  // Si décès
  causesDeces: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'causes_deces',
    comment: 'Causes du décès'
  },
  enregistreParId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'enregistre_par_id',
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
  tableName: 'php_deces_transferts',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['patient_id'] },
    { fields: ['consultation_id'] },
    { fields: ['type'] },
    { fields: ['date'] }
  ]
});

DecesTransfertPHP.associate = function(models) {
  DecesTransfertPHP.belongsTo(models.PatientPHP, {
    as: 'patient',
    foreignKey: 'patient_id'
  });
  DecesTransfertPHP.belongsTo(models.ConsultationPHP, {
    as: 'consultation',
    foreignKey: 'consultation_id'
  });
  DecesTransfertPHP.belongsTo(models.User, {
    as: 'enregistrePar',
    foreignKey: 'enregistre_par_id'
  });
};

export default DecesTransfertPHP;
