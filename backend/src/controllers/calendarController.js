// backend/src/controllers/calendarController.js - VERSION CORRIGÉE
import { Document, User } from '../models/index.js';
import { Op } from 'sequelize';

export const getPermissions = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {
      status: 'approved',
      dateDebut: { [Op.not]: null },
      dateFin: { [Op.not]: null },
    };

    if (startDate && endDate) {
      whereClause[Op.or] = [
        {
          dateDebut: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        },
        {
          dateFin: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        },
        {
          [Op.and]: [
            { dateDebut: { [Op.lte]: new Date(startDate) } },
            { dateFin: { [Op.gte]: new Date(endDate) } }
          ]
        }
      ];
    }

    const permissions = await Document.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'uploadedBy',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      attributes: ['id', 'title', 'dateDebut', 'dateFin', 'userId', 'metadata'], // ⬇️ AJOUTER metadata
      order: [['dateDebut', 'ASC']]
    });

    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('❌ Erreur récupération permissions:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};