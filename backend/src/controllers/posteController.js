// backend/src/controllers/posteController.js
// Gestion des postes organisationnels et de leurs titulaires (admin).

import { Poste, User, UserPoste, OrdreMissionType } from '../models/index.js';

// GET /api/postes — catalogue + titulaires
export const listPostes = async (req, res, next) => {
  try {
    const postes = await Poste.findAll({
      order: [['label', 'ASC']],
      include: [{
        model: User,
        as: 'holders',
        attributes: ['id', 'firstName', 'lastName', 'email', 'isActive'],
        through: { attributes: [] },
      }],
    });
    res.json({ success: true, data: postes });
  } catch (error) {
    next(error);
  }
};

// POST /api/postes/:code/holders  { userId }
export const assignHolder = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId requis' });
    }

    const poste = await Poste.findOne({ where: { code } });
    if (!poste) {
      return res.status(404).json({ success: false, error: 'Poste introuvable' });
    }
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    }

    const [assignment, created] = await UserPoste.findOrCreate({
      where: { posteId: poste.id, userId },
      defaults: { posteId: poste.id, userId, assignedBy: req.user.id, assignedAt: new Date() },
    });
    if (!created) {
      return res.status(409).json({ success: false, error: 'Cet utilisateur occupe déjà ce poste' });
    }

    res.status(201).json({ success: true, message: `${user.firstName} ${user.lastName} assigné au poste ${poste.label}`, data: assignment });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/postes/:code/holders/:userId
export const removeHolder = async (req, res, next) => {
  try {
    const { code, userId } = req.params;
    const poste = await Poste.findOne({ where: { code } });
    if (!poste) {
      return res.status(404).json({ success: false, error: 'Poste introuvable' });
    }
    const deleted = await UserPoste.destroy({ where: { posteId: poste.id, userId } });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Assignation introuvable' });
    }
    res.json({ success: true, message: 'Titulaire retiré du poste' });
  } catch (error) {
    next(error);
  }
};

// GET /api/postes/ordre-mission-types — pour le sélecteur de type côté frontend
export const listOrdreMissionTypes = async (req, res, next) => {
  try {
    const types = await OrdreMissionType.findAll({
      where: { isActive: true },
      order: [['label', 'ASC']],
      attributes: ['id', 'code', 'label', 'posteChain'],
    });
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
};
