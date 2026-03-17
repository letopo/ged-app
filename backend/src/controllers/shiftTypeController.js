// backend/src/controllers/shiftTypeController.js

import { ShiftType } from '../models/index.js';

/**
 * Obtenir tous les types de shifts
 */
export const getShiftTypes = async (req, res) => {
  try {
    const { isActive, isWorkDay } = req.query;
    
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isWorkDay !== undefined) where.isWorkDay = isWorkDay === 'true';
    
    const shiftTypes = await ShiftType.findAll({
      where,
      order: [['code', 'ASC']]
    });
    
    res.json(shiftTypes);
  } catch (error) {
    console.error('Erreur récupération types de shifts:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des types de shifts' });
  }
};

/**
 * Obtenir un type de shift par ID
 */
export const getShiftTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const shiftType = await ShiftType.findByPk(id);
    
    if (!shiftType) {
      return res.status(404).json({ message: 'Type de shift non trouvé' });
    }
    
    res.json(shiftType);
  } catch (error) {
    console.error('Erreur récupération type de shift:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du type de shift' });
  }
};

/**
 * Créer un nouveau type de shift
 */
export const createShiftType = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      color,
      startTime,
      endTime,
      isWorkDay,
      isNightShift,
      requiresNotification,
      notificationHoursBefore
    } = req.body;
    
    const shiftType = await ShiftType.create({
      code,
      name,
      description,
      color,
      startTime,
      endTime,
      isWorkDay,
      isNightShift,
      requiresNotification,
      notificationHoursBefore
    });
    
    res.status(201).json(shiftType);
  } catch (error) {
    console.error('Erreur création type de shift:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ce code de shift existe déjà' });
    }
    
    res.status(500).json({ message: 'Erreur lors de la création du type de shift' });
  }
};

/**
 * Mettre à jour un type de shift
 */
export const updateShiftType = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      description,
      color,
      startTime,
      endTime,
      isWorkDay,
      isNightShift,
      requiresNotification,
      notificationHoursBefore,
      isActive
    } = req.body;
    
    const shiftType = await ShiftType.findByPk(id);
    
    if (!shiftType) {
      return res.status(404).json({ message: 'Type de shift non trouvé' });
    }
    
    await shiftType.update({
      code,
      name,
      description,
      color,
      startTime,
      endTime,
      isWorkDay,
      isNightShift,
      requiresNotification,
      notificationHoursBefore,
      isActive
    });
    
    res.json(shiftType);
  } catch (error) {
    console.error('Erreur mise à jour type de shift:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du type de shift' });
  }
};