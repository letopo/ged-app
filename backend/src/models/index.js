// backend/src/models/index.js - VERSION CORRIGÉE AVEC INVOICE FOLDER

import sequelize from '../config/database.js';

// Imports existants
import User from './User.js';
import Document from './Document.js';
import Workflow from './Workflow.js';
import Service from './Service.js';
import Motif from './Motif.js';
import ServiceMember from './ServiceMember.js';
import Employee from './Employee.js';
import PushSubscription from './PushSubscription.js';
import Ticket from './Ticket.js';
import QueuePosition from './QueuePosition.js';
import TicketHistory from './TicketHistory.js';
import Position from './Position.js';
import Department from './Department.js';
import ShiftType from './ShiftType.js';
import Schedule from './Schedule.js';
import ScheduleAssignment from './ScheduleAssignment.js';
import ScheduleValidation from './ScheduleValidation.js';
import ScheduleChangeLog from './ScheduleChangeLog.js';
import License from './License.js';
import InvoiceFolder from './InvoiceFolder.js'; // ✅ AJOUT IMPORT
import DemandeAchat from './DemandeAchat.js'; // ✅ NOUVEL IMPORT

// Imports TRELLO
import TrelloBoard from './TrelloBoard.js';
import TrelloList from './TrelloList.js';
import TrelloCard from './TrelloCard.js';
import TrelloComment from './TrelloComment.js';
import TrelloAttachment from './TrelloAttachment.js';
import TrelloActivityLog from './TrelloActivityLog.js';

const db = {
  User,
  Document,
  Workflow,
  Service,
  Motif,
  ServiceMember,
  Employee,
  PushSubscription,
  Ticket,
  QueuePosition,
  TicketHistory,
  Position,
  Department,
  ShiftType,
  Schedule,
  ScheduleAssignment,
  ScheduleValidation,
  ScheduleChangeLog,
  License,
  InvoiceFolder, // ✅ AJOUT DANS L'OBJET DB
  // Modèles TRELLO
  TrelloBoard,
  TrelloList,
  TrelloCard,
  TrelloComment,
  TrelloAttachment,
  TrelloActivityLog,
  DemandeAchat, // ✅ AJOUT DANS L'OBJET DB
};

// Associations automatiques
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// ASSOCIATIONS EXISTANTES (Tickets - Manuelles)
Ticket.belongsTo(User, { 
  as: 'createdBy', 
  foreignKey: 'createdByUserId' 
});

Ticket.belongsTo(User, { 
  as: 'assignedTo', 
  foreignKey: 'assignedToUserId' 
});

User.hasMany(Ticket, { 
  as: 'createdTickets', 
  foreignKey: 'createdByUserId' 
});

User.hasMany(Ticket, { 
  as: 'assignedTickets', 
  foreignKey: 'assignedToUserId' 
});

QueuePosition.belongsTo(User, { 
  as: 'agent', 
  foreignKey: 'userId' 
});

QueuePosition.belongsTo(Ticket, { 
  as: 'currentTicket', 
  foreignKey: 'currentTicketId' 
});

User.hasMany(QueuePosition, { 
  as: 'positions', 
  foreignKey: 'userId' 
});

TicketHistory.belongsTo(Ticket, { 
  foreignKey: 'ticketId' 
});

TicketHistory.belongsTo(User, { 
  as: 'actionBy', 
  foreignKey: 'userId' 
});

Ticket.hasMany(TicketHistory, { 
  as: 'history', 
  foreignKey: 'ticketId' 
});

db.sequelize = sequelize;

export { 
  User, 
  Document, 
  Workflow, 
  Service, 
  Motif, 
  ServiceMember, 
  Employee, 
  sequelize, 
  PushSubscription,
  Ticket,
  QueuePosition,
  TicketHistory,
  Position,
  Department,
  ShiftType,
  Schedule,
  ScheduleAssignment,
  ScheduleValidation,
  ScheduleChangeLog,
  License,
  InvoiceFolder, // ✅ AJOUT EXPORT
  DemandeAchat, // ✅ AJOUT EXPORT
  // Exports TRELLO
  TrelloBoard,
  TrelloList,
  TrelloCard,
  TrelloComment,
  TrelloAttachment,
  TrelloActivityLog
};

export default db;