// backend/src/controllers/auditLogController.js
import { AuditLog } from '../models/index.js';
import { Op } from 'sequelize';

export const getAuditLogs = async (req, res) => {
  try {
    // Seuls les admins peuvent voir le journal
    if (!['admin','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Acces refuse' });
    }

    const {
      page = 1,
      limit = 50,
      action,
      resource,
      userId,
      search,
      dateFrom,
      dateTo,
    } = req.query;

    const where = {};

    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (userId) where.userId = userId;

    if (search) {
      where[Op.or] = [
        { userEmail: { [Op.iLike]: `%${search}%` } },
        { userName: { [Op.iLike]: `%${search}%` } },
        { action: { [Op.iLike]: `%${search}%` } },
        { resource: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo + 'T23:59:59');
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    // Stats rapides
    const actions = await AuditLog.findAll({
      attributes: ['action', [AuditLog.sequelize.fn('COUNT', '*'), 'count']],
      group: ['action'],
      order: [[AuditLog.sequelize.fn('COUNT', '*'), 'DESC']],
      limit: 10,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
      stats: { actions: actions.map(a => ({ action: a.action, count: parseInt(a.get('count')) })) },
    });
  } catch (error) {
    console.error('Erreur getAuditLogs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
