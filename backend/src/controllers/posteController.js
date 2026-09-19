// backend/src/controllers/posteController.js
// Gestion des postes organisationnels et de leurs titulaires (admin).

import { Poste, User, UserPoste, OrdreMissionType } from '../models/index.js';
import AuditLog from '../models/AuditLog.js';
import { emitRightsChanged } from '../utils/socketManager.js';

// POST /api/postes  { code, label, description }
export const createPoste = async (req, res, next) => {
  try {
    const { code, label, description } = req.body;
    if (!code || !label) {
      return res.status(400).json({ success: false, error: 'code et label requis' });
    }
    const normalizedCode = String(code).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!normalizedCode) {
      return res.status(400).json({ success: false, error: 'code invalide' });
    }

    const existing = await Poste.findOne({ where: { code: normalizedCode } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Ce code de poste existe déjà' });
    }

    const poste = await Poste.create({ code: normalizedCode, label, description: description || null });

    try {
      await AuditLog.log(req, 'POSTE_CREATED', 'poste', poste.id, { posteCode: poste.code, posteLabel: poste.label });
    } catch (_) {}

    res.status(201).json({ success: true, message: `Poste "${poste.label}" créé`, data: poste });
  } catch (error) {
    next(error);
  }
};

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

    try {
      await AuditLog.log(req, 'POSTE_ASSIGNED', 'user', userId, {
        targetUser: `${user.firstName} ${user.lastName}`,
        targetEmail: user.email,
        posteCode: code,
        posteLabel: poste.label,
      });
    } catch (_) {}
    emitRightsChanged(userId, { type: 'poste_assigned', posteCode: code, posteLabel: poste.label });

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

    const user = await User.findByPk(userId, { attributes: ['firstName', 'lastName', 'email'] }).catch(() => null);
    try {
      await AuditLog.log(req, 'POSTE_REMOVED', 'user', userId, {
        targetUser: user ? `${user.firstName} ${user.lastName}` : userId,
        targetEmail: user?.email,
        posteCode: code,
        posteLabel: poste.label,
      });
    } catch (_) {}
    emitRightsChanged(userId, { type: 'poste_removed', posteCode: code, posteLabel: poste.label });

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
      attributes: ['id', 'code', 'label', 'posteChain', 'serviceId'],
    });
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
};
