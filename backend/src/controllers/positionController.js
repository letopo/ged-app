// backend/src/controllers/positionController.js

import Position from '../models/Position.js';
import User from '../models/User.js';

// Récupérer les positions d'une file
export const getPositions = async (req, res) => {
  try {
    const { queueType } = req.params;

    const positions = await Position.findAll({
      where: { queueType },
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['positionNumber', 'ASC']]
    });

    res.json({
      success: true,
      data: positions
    });
  } catch (error) {
    console.error('❌ Erreur getPositions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
};

// S'assigner à une position
export const assignToPosition = async (req, res) => {
  try {
    console.log('📝 assignToPosition - Body:', req.body);
    console.log('👤 assignToPosition - User:', req.user?.id, req.user?.email);
    
    const { queueType, positionNumber } = req.body;
    const userId = req.user.id;

    // ✅ VALIDATION : Vérifier que les champs sont présents
    if (!queueType) {
      console.error('❌ queueType manquant');
      return res.status(400).json({
        success: false,
        error: 'Le type de file (queueType) est requis'
      });
    }

    if (!positionNumber) {
      console.error('❌ positionNumber manquant');
      return res.status(400).json({
        success: false,
        error: 'Le numéro de position (positionNumber) est requis'
      });
    }

    console.log('🔍 Recherche position:', { queueType, positionNumber });

    // Vérifier si la position existe
    const position = await Position.findOne({
      where: { queueType, positionNumber }
    });

    if (!position) {
      console.error('❌ Position non trouvée:', { queueType, positionNumber });
      return res.status(404).json({
        success: false,
        error: 'Position non trouvée'
      });
    }

    console.log('✅ Position trouvée:', position.id);

    // Vérifier si la position est déjà occupée
    if (position.userId && position.userId !== userId) {
      console.error('❌ Position déjà occupée par:', position.userId);
      return res.status(400).json({
        success: false,
        error: 'Cette position est déjà occupée'
      });
    }

    // Vérifier si l'utilisateur est déjà assigné ailleurs
    const existingAssignment = await Position.findOne({
      where: {
        userId,
        queueType
      }
    });

    if (existingAssignment && existingAssignment.id !== position.id) {
      console.error('❌ Utilisateur déjà assigné à:', existingAssignment.id);
      return res.status(400).json({
        success: false,
        error: 'Vous êtes déjà assigné à une autre position'
      });
    }

    console.log('✅ Assignation de l\'utilisateur à la position...');

    // Assigner l'utilisateur
    await position.update({
      userId,
      status: 'available',
      lastActiveAt: new Date()
    });

    const updatedPosition = await Position.findByPk(position.id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    console.log('✅ Position assignée avec succès');

    res.json({
      success: true,
      data: updatedPosition
    });
  } catch (error) {
    console.error('❌ Erreur assignToPosition:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur serveur'
    });
  }
};

// Se désassigner d'une position
export const unassignFromPosition = async (req, res) => {
  try {
    const { positionId } = req.params;
    const userId = req.user.id;

    console.log('📝 unassignFromPosition:', { positionId, userId });

    const position = await Position.findByPk(positionId);

    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position non trouvée'
      });
    }

    // Vérifier que c'est bien l'utilisateur assigné
    if (position.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'êtes pas assigné à cette position'
      });
    }

    // Désassigner
    await position.update({
      userId: null,
      status: 'offline',
      lastActiveAt: new Date()
    });

    console.log('✅ Position désassignée');

    res.json({
      success: true,
      message: 'Vous avez été désassigné avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur unassignFromPosition:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
};

// Mettre à jour le statut d'une position
export const updatePositionStatus = async (req, res) => {
  try {
    const { positionId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const position = await Position.findByPk(positionId);

    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position non trouvée'
      });
    }

    if (position.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'êtes pas assigné à cette position'
      });
    }

    await position.update({
      status,
      lastActiveAt: new Date()
    });

    res.json({
      success: true,
      data: position
    });
  } catch (error) {
    console.error('❌ Erreur updatePositionStatus:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
};