// backend/src/controllers/notificationPreferenceController.js
import { NotificationPreference } from '../models/index.js';

// Recuperer les preferences de l'utilisateur connecte
export const getMyPreferences = async (req, res) => {
  try {
    let prefs = await NotificationPreference.findOne({ where: { userId: req.user.id } });
    if (!prefs) {
      // Creer avec les valeurs par defaut
      prefs = await NotificationPreference.create({ userId: req.user.id, tenantId: req.tenantId });
    }
    res.json({ success: true, data: prefs });
  } catch (error) {
    console.error('Erreur getMyPreferences:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Mettre a jour les preferences
export const updateMyPreferences = async (req, res) => {
  try {
    const { emailOnNewTask, emailOnApproval, emailOnRejection, emailOnComment, pushEnabled } = req.body;

    let prefs = await NotificationPreference.findOne({ where: { userId: req.user.id } });
    if (!prefs) {
      prefs = await NotificationPreference.create({ userId: req.user.id, tenantId: req.tenantId });
    }

    await prefs.update({
      emailOnNewTask: emailOnNewTask ?? prefs.emailOnNewTask,
      emailOnApproval: emailOnApproval ?? prefs.emailOnApproval,
      emailOnRejection: emailOnRejection ?? prefs.emailOnRejection,
      emailOnComment: emailOnComment ?? prefs.emailOnComment,
      pushEnabled: pushEnabled ?? prefs.pushEnabled,
    });

    res.json({ success: true, data: prefs });
  } catch (error) {
    console.error('Erreur updateMyPreferences:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
