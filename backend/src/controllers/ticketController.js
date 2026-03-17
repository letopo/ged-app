// backend/src/controllers/ticketController.js

import { Ticket, QueuePosition, TicketHistory, User } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../models/index.js';
import { 
  emitTicketCreated, 
  emitTicketCalled, 
  emitTicketCompleted,
  emitQueueUpdate 
} from '../utils/socketManager.js';

// ============================================
// CRÉER UN NOUVEAU TICKET (Gardien)
// ============================================
export const createTicket = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { visitType, patientType, patientName, patientPhone } = req.body;
    const userId = req.user.id;

    // Validation
    if (!visitType || !patientType) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'visitType et patientType sont requis'
      });
    }

    // Déterminer la file d'attente
    const queueType = patientType === 'php' ? 'accueil_php' : 'accueil_normal';

    // Générer le numéro de ticket
    const ticketNumber = await Ticket.generateTicketNumber(visitType, patientType);

    // Obtenir la position dans la file
    const position = await Ticket.getNextPositionInQueue(queueType);

    // Créer le ticket
    const ticket = await Ticket.create({
      ticketNumber,
      visitType,
      patientType,
      status: 'waiting',
      queueType,
      positionNumber: position,
      patientName,
      patientPhone,
      createdByUserId: userId
    }, { transaction: t });

    // Enregistrer l'historique
    await TicketHistory.create({
      ticketId: ticket.id,
      action: 'created',
      queueType,
      positionNumber: position,
      userId
    }, { transaction: t });

    await t.commit();

    // Charger le ticket complet avec les relations
    const fullTicket = await Ticket.findByPk(ticket.id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    // 🔔 Émettre événement Socket.IO
    emitTicketCreated(queueType, fullTicket);
    emitQueueUpdate(queueType);

    console.log(`✅ Ticket créé: ${ticketNumber} - File: ${queueType} - Position: ${position}`);

    res.status(201).json({
      success: true,
      data: fullTicket,
      message: `Ticket ${ticketNumber} créé avec succès`
    });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('❌ Erreur création ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du ticket'
    });
  }
};

// ============================================
// OBTENIR LA FILE D'ATTENTE
// ============================================
export const getQueue = async (req, res) => {
  try {
    const { queueType } = req.params;

    if (!['accueil_php', 'accueil_normal', 'caisse'].includes(queueType)) {
      return res.status(400).json({
        success: false,
        message: 'Type de file invalide'
      });
    }

    const tickets = await Ticket.findAll({
      where: {
        queueType,
        status: ['waiting', 'called', 'in_progress']
      },
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['positionNumber', 'ASC']]
    });

    // Statistiques de la file
    const stats = {
      total: tickets.length,
      waiting: tickets.filter(t => t.status === 'waiting').length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      called: tickets.filter(t => t.status === 'called').length
    };

    res.json({
      success: true,
      data: {
        queueType,
        tickets,
        stats
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération file:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================
// APPELER LE PROCHAIN PATIENT
// ============================================
export const callNextPatient = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { queueType, positionNumber } = req.body;
    const userId = req.user.id;

    // Vérifier que la position existe et est disponible
    const position = await QueuePosition.findOne({
      where: {
        queueType,
        positionNumber,
        userId
      },
      transaction: t
    });

    if (!position) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'Position non assignée ou invalide'
      });
    }

    // Vérifier qu'il n'y a pas déjà un patient en cours
    if (position.currentTicketId) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà un patient en cours. Terminez d\'abord.'
      });
    }

    // Trouver le prochain ticket en attente
    const nextTicket = await Ticket.findOne({
      where: {
        queueType,
        status: 'waiting'
      },
      order: [['positionNumber', 'ASC']],
      transaction: t
    });

    if (!nextTicket) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Aucun patient en attente'
      });
    }

    // Mettre à jour le ticket
    await nextTicket.update({
      status: 'called',
      calledAt: new Date(),
      assignedToUserId: userId,
      assignedPosition: positionNumber
    }, { transaction: t });

    // Mettre à jour la position
    await position.update({
      currentTicketId: nextTicket.id,
      status: 'busy'
    }, { transaction: t });

    // Enregistrer l'historique
    await TicketHistory.create({
      ticketId: nextTicket.id,
      action: 'called',
      queueType,
      positionNumber,
      userId
    }, { transaction: t });

    await t.commit();

    // Charger le ticket complet
    const fullTicket = await Ticket.findByPk(nextTicket.id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    // 🔔 Émettre événements Socket.IO
    emitTicketCalled(queueType, fullTicket, positionNumber);
    emitQueueUpdate(queueType);

    console.log(`📢 Patient appelé: ${nextTicket.ticketNumber} → Position ${positionNumber}`);

    res.json({
      success: true,
      data: fullTicket,
      message: `Patient ${nextTicket.ticketNumber} appelé`
    });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('❌ Erreur appel patient:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================
// DÉMARRER LE TRAITEMENT DU PATIENT
// ============================================
export const startTreatment = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;

    const ticket = await Ticket.findByPk(ticketId, { transaction: t });

    if (!ticket) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Ticket introuvable'
      });
    }

    if (ticket.assignedToUserId !== userId) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    if (ticket.status !== 'called') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Le patient doit d\'abord être appelé'
      });
    }

    // Mettre à jour le ticket
    await ticket.update({
      status: 'in_progress',
      startedAt: new Date()
    }, { transaction: t });

    // Enregistrer l'historique
    await TicketHistory.create({
      ticketId: ticket.id,
      action: 'started',
      queueType: ticket.queueType,
      positionNumber: ticket.assignedPosition,
      userId
    }, { transaction: t });

    await t.commit();

    const fullTicket = await Ticket.findByPk(ticketId, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    emitQueueUpdate(ticket.queueType);

    res.json({
      success: true,
      data: fullTicket,
      message: 'Traitement démarré'
    });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('❌ Erreur démarrage traitement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================
// TRANSFÉRER À LA CAISSE
// ============================================
export const transferToCaisse = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { ticketId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    const ticket = await Ticket.findByPk(ticketId, { transaction: t });

    if (!ticket) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Ticket introuvable'
      });
    }

    if (ticket.assignedToUserId !== userId) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    if (ticket.status !== 'in_progress') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Le traitement doit être en cours'
      });
    }

    // Obtenir la position dans la file caisse
    const caissePosition = await Ticket.getNextPositionInQueue('caisse');

    // Mettre à jour le ticket
    await ticket.update({
      status: 'waiting',
      queueType: 'caisse',
      positionNumber: caissePosition,
      assignedToUserId: null,
      assignedPosition: null,
      completedAt: new Date(),
      notes: notes || ticket.notes
    }, { transaction: t });

    // Libérer la position d'accueil
    await QueuePosition.update({
      currentTicketId: null,
      status: 'available'
    }, {
      where: {
        queueType: ticket.queueType === 'caisse' ? ticket.queueType : ticket.queueType,
        userId
      },
      transaction: t
    });

    // Enregistrer l'historique
    await TicketHistory.create({
      ticketId: ticket.id,
      action: 'transferred',
      queueType: 'caisse',
      positionNumber: caissePosition,
      userId,
      notes
    }, { transaction: t });

    await t.commit();

    const fullTicket = await Ticket.findByPk(ticketId, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    // 🔔 Émettre événements
    const oldQueueType = ticket.queueType === 'accueil_php' ? 'accueil_php' : 'accueil_normal';
    emitQueueUpdate(oldQueueType);
    emitQueueUpdate('caisse');
    emitTicketCreated('caisse', fullTicket);

    console.log(`💰 Ticket ${ticket.ticketNumber} transféré à la caisse - Position: ${caissePosition}`);

    res.json({
      success: true,
      data: fullTicket,
      message: 'Patient transféré à la caisse'
    });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('❌ Erreur transfert caisse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================
// COMPLÉTER UN TICKET (Caisse)
// ============================================
export const completeTicket = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { ticketId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    const ticket = await Ticket.findByPk(ticketId, { transaction: t });

    if (!ticket) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Ticket introuvable'
      });
    }

    if (ticket.assignedToUserId !== userId) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    // Mettre à jour le ticket
    await ticket.update({
      status: 'completed',
      completedAt: new Date(),
      notes: notes || ticket.notes
    }, { transaction: t });

    // Libérer la position
    await QueuePosition.update({
      currentTicketId: null,
      status: 'available'
    }, {
      where: {
        queueType: 'caisse',
        userId
      },
      transaction: t
    });

    // Enregistrer l'historique
    await TicketHistory.create({
      ticketId: ticket.id,
      action: 'completed',
      queueType: 'caisse',
      userId,
      notes
    }, { transaction: t });

    await t.commit();

    const fullTicket = await Ticket.findByPk(ticketId, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    // 🔔 Émettre événements
    emitTicketCompleted('caisse', fullTicket);
    emitQueueUpdate('caisse');

    console.log(`✅ Ticket ${ticket.ticketNumber} complété`);

    res.json({
      success: true,
      data: fullTicket,
      message: 'Ticket complété avec succès'
    });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('❌ Erreur complétion ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================
// ANNULER UN TICKET
// ============================================
export const cancelTicket = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { ticketId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const ticket = await Ticket.findByPk(ticketId, { transaction: t });

    if (!ticket) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Ticket introuvable'
      });
    }

    // Seul le créateur ou l'assigné peut annuler
    if (ticket.createdByUserId !== userId && ticket.assignedToUserId !== userId) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    await ticket.update({
      status: 'cancelled',
      notes: reason || 'Annulé'
    }, { transaction: t });

    // Libérer la position si assignée
    if (ticket.assignedToUserId) {
      await QueuePosition.update({
        currentTicketId: null,
        status: 'available'
      }, {
        where: {
          queueType: ticket.queueType,
          userId: ticket.assignedToUserId
        },
        transaction: t
      });
    }

    // Enregistrer l'historique
    await TicketHistory.create({
      ticketId: ticket.id,
      action: 'cancelled',
      queueType: ticket.queueType,
      userId,
      notes: reason
    }, { transaction: t });

    await t.commit();

    emitQueueUpdate(ticket.queueType);

    res.json({
      success: true,
      message: 'Ticket annulé'
    });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('❌ Erreur annulation ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================
// OBTENIR LES POSITIONS DE FILE
// ============================================
export const getQueuePositions = async (req, res) => {
  try {
    const { queueType } = req.params;

    const positions = await QueuePosition.findAll({
      where: { queueType },
      include: [
        { model: User, as: 'agent', attributes: ['id', 'firstName', 'lastName'] },
        { 
          model: Ticket, 
          as: 'currentTicket',
          include: [
            { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] }
          ]
        }
      ],
      order: [['positionNumber', 'ASC']]
    });

    res.json({
      success: true,
      data: positions
    });

  } catch (error) {
    console.error('❌ Erreur récupération positions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================
// S'ASSIGNER À UNE POSITION
// ============================================
export const assignToPosition = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { queueType, positionNumber } = req.body;
    const userId = req.user.id;

    // Vérifier que la position existe
    const position = await QueuePosition.findOne({
      where: {
        queueType,
        positionNumber
      },
      transaction: t
    });

    if (!position) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Position introuvable'
      });
    }

    // Vérifier que la position est libre
    if (position.userId && position.status !== 'offline') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Position déjà occupée'
      });
    }

    // S'assigner
    await position.update({
      userId,
      status: 'available'
    }, { transaction: t });

    await t.commit();

    const updatedPosition = await QueuePosition.findByPk(position.id, {
      include: [
        { model: User, as: 'agent', attributes: ['id', 'firstName', 'lastName'] },
        { model: Ticket, as: 'currentTicket' }
      ]
    });

    res.json({
      success: true,
      data: updatedPosition,
      message: 'Position assignée avec succès'
    });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('❌ Erreur assignation position:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================
// SE DÉSASSIGNER D'UNE POSITION
// ============================================
export const unassignFromPosition = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { positionId } = req.params;
    const userId = req.user.id;

    const position = await QueuePosition.findByPk(positionId, { transaction: t });

    if (!position) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Position introuvable'
      });
    }

    if (position.userId !== userId) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    if (position.currentTicketId) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Terminez d\'abord le patient en cours'
      });
    }

    await position.update({
      userId: null,
      status: 'offline'
    }, { transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: 'Position libérée'
    });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('❌ Erreur libération position:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================
// STATISTIQUES
// ============================================
export const getStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const stats = {
      total: await Ticket.count({ where: whereClause }),
      byVisitType: await Ticket.findAll({
        where: whereClause,
        attributes: [
          'visitType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['visitType']
      }),
      byPatientType: await Ticket.findAll({
        where: whereClause,
        attributes: [
          'patientType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['patientType']
      }),
      byStatus: await Ticket.findAll({
        where: whereClause,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status']
      }),
      averageWaitTime: await Ticket.findAll({
        where: {
          ...whereClause,
          status: 'completed'
        },
        attributes: [
          [sequelize.fn('AVG', 
            sequelize.literal('EXTRACT(EPOCH FROM (called_at - created_at))')
          ), 'avgWaitSeconds']
        ]
      })
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Erreur statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

export default {
  createTicket,
  getQueue,
  callNextPatient,
  startTreatment,
  transferToCaisse,
  completeTicket,
  cancelTicket,
  getQueuePositions,
  assignToPosition,
  unassignFromPosition,
  getStatistics
};