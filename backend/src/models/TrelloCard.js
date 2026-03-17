// backend/src/models/TrelloCard.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TrelloCard = sequelize.define('TrelloCard', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  listId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'list_id',
    references: {
      model: 'trello_lists',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Titre de la tâche'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description détaillée'
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Ordre dans la colonne'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    allowNull: false,
    comment: 'Priorité de la tâche'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'due_date',
    comment: 'Date d\'échéance'
  },
  dateHistory: {
    type: DataTypes.JSON, // ou DataTypes.JSONB si Postgres
    defaultValue: [],
    allowNull: true,
    field: 'date_history',
    comment: 'Historique des changements de date'
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assigned_to',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Technicien assigné'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Créateur de la tâche'
  },
  linkedWorkRequestId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'linked_work_request_id',
    references: {
      model: 'documents',
      key: 'id'
    },
    comment: 'Lien vers la Demande de Travaux'
  },
  status: {
    type: DataTypes.ENUM('todo', 'in_progress', 'blocked', 'completed', 'cancelled'),
    defaultValue: 'todo',
    allowNull: false
  },
  labels: {
    type: DataTypes.JSONB, // Utilisez JSONB pour les tableaux d'objets complexes
    defaultValue: [],
    allowNull: true,
    comment: 'Étiquettes (couleur, nom, etc.) sous forme de JSON Array'
  },
  dates: {
    type: DataTypes.JSONB, // Contient startDate, dueDate, dueTime, recurrence, reminder
    allowNull: true,
    defaultValue: {}
  },
  
  // ✅ AJOUT NÉCESSAIRE (Checklists)
  checklists: {
    type: DataTypes.JSONB, // Contient les checklists complètes avec items
    allowNull: true,
    defaultValue: []
  },
  estimatedHours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'estimated_hours',
    comment: 'Temps estimé en heures'
  },
  actualHours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'actual_hours',
    comment: 'Temps réel passé'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Localisation (service, salle, etc.)'
  },
  equipment: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Équipement concerné'
  },
  partsUsed: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'parts_used',
    comment: 'Pièces utilisées [{name, quantity, ref}]'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at',
    comment: 'Date de complétion'
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'is_archived'
  },
  // ✅ Propriété virtuelle : Statut de retard
  isOverdue: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.dueDate || this.status === 'completed' || this.status === 'cancelled') {
        return false;
      }
      return new Date() > new Date(this.dueDate);
    }
  },
  // ✅ Propriété virtuelle : Temps restant
  daysUntilDue: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.dueDate) return null;
      const now = new Date();
      const due = new Date(this.dueDate);
      const diffTime = due - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
  }
}, {
  tableName: 'trello_cards',
  timestamps: true,
  underscored: true
});

TrelloCard.associate = function(models) {
  // Une carte appartient à une colonne
  this.belongsTo(models.TrelloList, {
    foreignKey: 'listId',
    as: 'list'
  });

  // Une carte est assignée à un utilisateur
  this.belongsTo(models.User, {
    foreignKey: 'assignedTo',
    as: 'assignee'
  });

  // Une carte est créée par un utilisateur
  this.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });

  // Une carte peut être liée à un document (DT)
  this.belongsTo(models.Document, {
    foreignKey: 'linkedWorkRequestId',
    as: 'workRequest'
  });

  // Une carte contient plusieurs commentaires
  this.hasMany(models.TrelloComment, {
    foreignKey: 'cardId',
    as: 'comments',
    onDelete: 'CASCADE'
  });

  // Une carte contient plusieurs pièces jointes
  this.hasMany(models.TrelloAttachment, {
    foreignKey: 'cardId',
    as: 'attachments',
    onDelete: 'CASCADE'
  });

  // Une carte a un historique d'activités
  this.hasMany(models.TrelloActivityLog, {
    foreignKey: 'cardId',
    as: 'activityLog',
    onDelete: 'CASCADE'
  });
};

export default TrelloCard;