// backend/src/controllers/notificationController.js
import { Workflow } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * @desc    Vérifie si de nouvelles tâches sont apparues pour l'utilisateur depuis un certain timestamp.
 * @route   GET /api/notifications/new-tasks-check?since=...
 * @access  Private
 */
export const checkNewTasks = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { since } = req.query; // Le timestamp de la dernière vérification

        if (!since) {
            return res.status(400).json({ success: false, message: "Le paramètre 'since' est requis." });
        }

        // Convertir le timestamp en objet Date
        const sinceDate = new Date(parseInt(since));

        const newTasksCount = await Workflow.count({
            where: {
                validatorId: userId,
                status: 'pending',
                createdAt: {
                    [Op.gt]: sinceDate // gt = greater than (plus récent que)
                }
            }
        });

        res.json({
            success: true,
            newTasks: newTasksCount > 0,
            count: newTasksCount
        });

    } catch (error) {
        next(error);
    }
};