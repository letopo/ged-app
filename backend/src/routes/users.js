// backend/src/routes/users.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { User } from '../models/index.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// ?? Récupérer tous les utilisateurs (pour sélection des validateurs)
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'role'],
      order: [['username', 'ASC']]
    });

    res.json({ 
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
      }))
    });

  } catch (error) {
    console.error('? Erreur récupération utilisateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// ?? Récupérer un utilisateur spécifique
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'role', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('? Erreur récupération utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur' });
  }
});

export default router;
