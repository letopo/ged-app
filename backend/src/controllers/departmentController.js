// backend/src/controllers/departmentController.js

import { Department } from '../models/index.js';

/**
 * Obtenir tous les départements
 */
export const getDepartments = async (req, res) => {
  try {
    const { type, isActive } = req.query;
    
    const where = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const departments = await Department.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    res.json(departments);
  } catch (error) {
    console.error('Erreur récupération départements:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des départements' });
  }
};

/**
 * Obtenir un département par ID
 */
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const department = await Department.findByPk(id);
    
    if (!department) {
      return res.status(404).json({ message: 'Département non trouvé' });
    }
    
    res.json(department);
  } catch (error) {
    console.error('Erreur récupération département:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du département' });
  }
};

/**
 * Créer un nouveau département
 */
export const createDepartment = async (req, res) => {
  try {
    const { code, name, type, description } = req.body;
    
    const department = await Department.create({
      code,
      name,
      type,
      description
    });
    
    res.status(201).json(department);
  } catch (error) {
    console.error('Erreur création département:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ce code de département existe déjà' });
    }
    
    res.status(500).json({ message: 'Erreur lors de la création du département' });
  }
};

/**
 * Mettre à jour un département
 */
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, type, description, isActive } = req.body;
    
    const department = await Department.findByPk(id);
    
    if (!department) {
      return res.status(404).json({ message: 'Département non trouvé' });
    }
    
    await department.update({
      code,
      name,
      type,
      description,
      isActive
    });
    
    res.json(department);
  } catch (error) {
    console.error('Erreur mise à jour département:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du département' });
  }
};