// backend/src/models/index.js - VERSION AVEC MODULE PHP

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
import Equipement from './Equipement.js'; // ✅ GMAO
import PlanMaintenance from './PlanMaintenance.js'; // ✅ GMAO
import Intervention from './Intervention.js'; // ✅ GMAO Phase 2
import Contrat from './Contrat.js'; // ✅ GMAO Phase 4
import PieceRechange from './PieceRechange.js'; // ✅ GMAO Phase 4
import MouvementPiece from './MouvementPiece.js'; // ✅ GMAO Phase 4
import DemandeAcquisition from './DemandeAcquisition.js'; // ✅ GMAO Phase 4
import BudgetLigne from './BudgetLigne.js'; // ✅ GMAO Phase 4
import BudgetDepense from './BudgetDepense.js'; // ✅ GMAO Phase 4

// ── Imports MODULE PHP ────────────────────────────────────────────────────────
import Infirmerie from './Infirmerie.js';
import Secteur from './Secteur.js';
import PatientPHP from './PatientPHP.js';
import BonPriseEnCharge from './BonPriseEnCharge.js';
import ConsultationPHP from './ConsultationPHP.js';
import HospitalisationPHP from './HospitalisationPHP.js';
import ReposPHP from './ReposPHP.js';
import OperationPHP from './OperationPHP.js';
import DecesTransfertPHP from './DecesTransfertPHP.js';
import RendezVousPHP from './RendezVousPHP.js';

// Imports TRELLO
import TrelloBoard from './TrelloBoard.js';
import TrelloList from './TrelloList.js';
import TrelloCard from './TrelloCard.js';
import TrelloComment from './TrelloComment.js';
import TrelloAttachment from './TrelloAttachment.js';
import TrelloActivityLog from './TrelloActivityLog.js';
import TemplatePermission from './TemplatePermission.js';

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
  Equipement, // ✅ GMAO
  PlanMaintenance, // ✅ GMAO
  Intervention, // ✅ GMAO Phase 2
  Contrat, PieceRechange, MouvementPiece, DemandeAcquisition, BudgetLigne, BudgetDepense, // ✅ GMAO Phase 4
  // ── MODULE PHP ──────────────────────────────
  Infirmerie,
  Secteur,
  PatientPHP,
  BonPriseEnCharge,
  ConsultationPHP,
  HospitalisationPHP,
  ReposPHP,
  OperationPHP,
  DecesTransfertPHP,
  RendezVousPHP,
  TemplatePermission,
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

// ─── GMAO ASSOCIATIONS ──────────────────────────────────────────────────────
Equipement.hasMany(PlanMaintenance, {
  as: 'plans',
  foreignKey: 'equipement_id',
  onDelete: 'CASCADE',
});
PlanMaintenance.belongsTo(Equipement, {
  as: 'equipement',
  foreignKey: 'equipement_id',
});
PlanMaintenance.belongsTo(User, {
  as: 'technicien',
  foreignKey: 'technicien_id',
});
User.hasMany(PlanMaintenance, {
  as: 'plansMaintenance',
  foreignKey: 'technicien_id',
});

// ─── GMAO PHASE 2 - INTERVENTION ASSOCIATIONS ───────────────────────────────
Intervention.belongsTo(Equipement, { as: 'equipement', foreignKey: 'equipement_id' });
Intervention.belongsTo(PlanMaintenance, { as: 'plan', foreignKey: 'plan_id' });
Intervention.belongsTo(User, { as: 'technicien', foreignKey: 'technicien_id' });
Equipement.hasMany(Intervention, { as: 'interventions', foreignKey: 'equipement_id', onDelete: 'CASCADE' });
PlanMaintenance.hasMany(Intervention, { as: 'interventions', foreignKey: 'plan_id', onDelete: 'SET NULL' });

// ─── GMAO PHASE 4 ASSOCIATIONS ──────────────────────────────────────────────
Contrat.belongsTo(User, { as: 'createur', foreignKey: 'created_by' });
PieceRechange.hasMany(MouvementPiece, { as: 'mouvements', foreignKey: 'piece_id', onDelete: 'CASCADE' });
MouvementPiece.belongsTo(PieceRechange, { as: 'piece', foreignKey: 'piece_id' });
MouvementPiece.belongsTo(User, { as: 'auteur', foreignKey: 'created_by' });
DemandeAcquisition.belongsTo(User, { as: 'demandeur', foreignKey: 'demandeur_id' });
DemandeAcquisition.belongsTo(Equipement, { as: 'equipement', foreignKey: 'equipement_id' });
BudgetLigne.belongsTo(User, { as: 'createur', foreignKey: 'created_by' });
BudgetDepense.belongsTo(User, { as: 'createur', foreignKey: 'created_by' });

// ─── MODULE PHP - ASSOCIATIONS COMPLÉMENTAIRES ──────────────────────────────
// Uniquement les associations depuis User/Ticket qui n'ont pas de associate()
// NE PAS redéfinir ici ce qui est déjà dans les associate() des modèles PHP
User.hasMany(PatientPHP, { as: 'patientsCreated', foreignKey: 'created_by_user_id' });
User.hasMany(BonPriseEnCharge, { as: 'bonsEmis', foreignKey: 'agent_emetteur_id' });
Ticket.hasMany(BonPriseEnCharge, { as: 'ticketBons', foreignKey: 'ticket_id' });
User.hasMany(ConsultationPHP, { as: 'consultationsMedecin', foreignKey: 'medecin_id' });
User.hasMany(ConsultationPHP, { as: 'consultationsAccueil', foreignKey: 'agent_accueil_id' });
User.hasMany(ReposPHP, { as: 'reposPrescrit', foreignKey: 'medecin_id' });
PatientPHP.hasMany(DecesTransfertPHP, { as: 'decesTransferts', foreignKey: 'patient_id' });
User.hasMany(DecesTransfertPHP, { as: 'decesEnregistres', foreignKey: 'enregistre_par_id' });

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
  // Exports GMAO
  Equipement,
  PlanMaintenance,
  Intervention,
  Contrat, PieceRechange, MouvementPiece, DemandeAcquisition, BudgetLigne, BudgetDepense, // ✅ Phase 4
  // Exports TRELLO
  TrelloBoard,
  TrelloList,
  TrelloCard,
  TrelloComment,
  TrelloAttachment,
  TrelloActivityLog,
  // Exports MODULE PHP
  Infirmerie,
  Secteur,
  PatientPHP,
  BonPriseEnCharge,
  ConsultationPHP,
  HospitalisationPHP,
  ReposPHP,
  OperationPHP,
  DecesTransfertPHP,
  TemplatePermission
};

export default db;