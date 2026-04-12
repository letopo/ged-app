// backend/src/models/BonPriseEnCharge.js - Module PHP

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BonPriseEnCharge = sequelize.define('BonPriseEnCharge', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  numeroBon: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'numero_bon',
    comment: 'Numéro unique du bon (ex: BPC-2025-0001)'
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
  dateEmission: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'date_emission'
  },
  heureEmission: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'heure_emission'
  },
  serviceDestination: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'service_destination',
    comment: 'Service médical de destination'
  },
  motifVisite: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'motif_visite',
    comment: 'Motif de la consultation'
  },
  agentEmetteurId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'agent_emetteur_id',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Agent PHP qui a émis ce bon'
  },
  status: {
    type: DataTypes.ENUM('emis', 'utilise', 'annule'),
    defaultValue: 'emis',
    allowNull: false,
    comment: 'emis=en attente consultation, utilise=patient consulté, annule=annulé'
  },
  ticketId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'ticket_id',
    references: {
      model: 'tickets',
      key: 'id'
    },
    comment: 'Ticket de file d\'attente associé'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'php_bons_prise_en_charge',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['numero_bon'], unique: true },
    { fields: ['patient_id'] },
    { fields: ['date_emission'] },
    { fields: ['status'] },
    { fields: ['agent_emetteur_id'] }
  ]
});

// Génération automatique du numéro de bon
BonPriseEnCharge.generateNumeroBon = async function() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  const count = await BonPriseEnCharge.count({
    where: {
      dateEmission: today.toISOString().split('T')[0]
    }
  });

  const num = String(count + 1).padStart(4, '0');
  return `BPC-${year}${month}${day}-${num}`;
};

BonPriseEnCharge.associate = function(models) {
  BonPriseEnCharge.belongsTo(models.PatientPHP, {
    as: 'patient',
    foreignKey: 'patient_id'
  });
  BonPriseEnCharge.belongsTo(models.User, {
    as: 'agentEmetteur',
    foreignKey: 'agent_emetteur_id'
  });
  BonPriseEnCharge.belongsTo(models.Ticket, {
    as: 'ticket',
    foreignKey: 'ticket_id'
  });
  BonPriseEnCharge.hasOne(models.ConsultationPHP, {
    as: 'consultation',
    foreignKey: 'bon_prise_en_charge_id'
  });
};

export default BonPriseEnCharge;
