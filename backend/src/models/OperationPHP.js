// backend/src/models/OperationPHP.js - Module PHP

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const OperationPHP = sequelize.define('OperationPHP', {
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
  typeOperation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'type_operation',
    comment: 'Type / nature de l\'opération chirurgicale'
  },
  dateOperation: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'date_operation'
  },
  chirurgienNom: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'chirurgien_nom'
  },
  anesthesisteNom: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'anesthesiste_nom'
  },
  status: {
    type: DataTypes.ENUM('planifiee', 'realisee', 'annulee'),
    defaultValue: 'planifiee',
    allowNull: false
  },
  diagnostic: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Diagnostic opératoire'
  },
  compteRendu: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'compte_rendu',
    comment: 'Compte rendu opératoire'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'php_operations',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['patient_id'] },
    { fields: ['consultation_id'] },
    { fields: ['date_operation'] },
    { fields: ['status'] }
  ]
});

OperationPHP.associate = function(models) {
  OperationPHP.belongsTo(models.PatientPHP, {
    as: 'patient',
    foreignKey: 'patient_id'
  });
  OperationPHP.belongsTo(models.ConsultationPHP, {
    as: 'consultation',
    foreignKey: 'consultation_id'
  });
};

export default OperationPHP;
