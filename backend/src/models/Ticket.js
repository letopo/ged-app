// backend/src/models/Ticket.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ticketNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'ticket_number',
    comment: 'Numéro du ticket (ex: C-PHP-001, V-NOR-025)'
  },
  visitType: {
    type: DataTypes.ENUM('consultation', 'visite', 'garde_malade'),
    allowNull: false,
    field: 'visit_type',
    comment: 'Type de visite'
  },
  patientType: {
    type: DataTypes.ENUM('php', 'normal'),
    allowNull: false,
    field: 'patient_type',
    comment: 'Type de patient (PHP ou Normal)'
  },
  status: {
    type: DataTypes.ENUM('waiting', 'called', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'waiting',
    allowNull: false,
    comment: 'Statut actuel du ticket'
  },
  queueType: {
    type: DataTypes.ENUM('accueil_php', 'accueil_normal', 'caisse'),
    allowNull: false,
    field: 'queue_type',
    comment: 'File d\'attente actuelle'
  },
  positionNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'position_number',
    comment: 'Position dans la file'
  },
  
  // Données patient (optionnelles)
  patientName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'patient_name'
  },
  patientPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'patient_phone'
  },
  
  // Timestamps du workflow
  calledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'called_at',
    comment: 'Quand le patient a été appelé'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'started_at',
    comment: 'Quand le traitement a commencé'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at',
    comment: 'Quand le traitement est terminé'
  },
  
  // Assignments
  createdByUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by_user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Gardien qui a créé le ticket'
  },
  assignedToUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assigned_to_user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Agent qui traite le ticket'
  },
  assignedPosition: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'assigned_position',
    comment: 'Position à l\'accueil (1-4)'
  },
  
  // Métadonnées
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'tickets',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['ticket_number'],
      unique: true
    },
    {
      fields: ['status']
    },
    {
      fields: ['queue_type']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Méthodes statiques utiles
Ticket.getNextPositionInQueue = async function(queueType) {
  const maxPosition = await Ticket.max('positionNumber', {
    where: {
      queueType,
      status: ['waiting', 'called', 'in_progress']
    }
  });
  return (maxPosition || 0) + 1;
};

Ticket.generateTicketNumber = async function(visitType, patientType) {
  // Préfixes
  const visitPrefix = {
    consultation: 'C',
    visite: 'V',
    garde_malade: 'G'
  };
  
  const patientPrefix = {
    php: 'PHP',
    normal: 'NOR'
  };
  
  // Compter les tickets du jour
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const count = await Ticket.count({
    where: {
      visitType,
      patientType,
      createdAt: {
        [sequelize.Sequelize.Op.gte]: today
      }
    }
  });
  
  const number = String(count + 1).padStart(3, '0');
  return `${visitPrefix[visitType]}-${patientPrefix[patientType]}-${number}`;
};

export default Ticket;