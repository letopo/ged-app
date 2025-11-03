// backend/src/controllers/userController.js - VERSION COMPLÈTE
import User from '../models/User.js';
import { Op } from 'sequelize';

// @desc    Récupérer tous les utilisateurs
// @route   GET /api/users
// @access  Private
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

// @desc    Récupérer un utilisateur par ID
// @route   GET /api/users/:id
// @access  Private (Admin/Director)
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer un nouvel utilisateur (par un admin)
// @route   POST /api/users
// @access  Private (Admin)
export const createUser = async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, username, role } = req.body;
  
      if (!email || !password || !username || !firstName || !lastName || !role) {
        return res.status(400).json({ success: false, error: 'Tous les champs sont requis' });
      }
  
      const existingUser = await User.findOne({ where: { [Op.or]: [{ email }, { username }] } });
      if (existingUser) {
        return res.status(409).json({ success: false, error: 'Email ou nom d\'utilisateur déjà utilisé' });
      }
  
      const newUser = await User.create({ email, password, firstName, lastName, username, role });
      const userResult = newUser.toJSON();
      delete userResult.password;
  
      res.status(201).json({ success: true, message: 'Utilisateur créé avec succès', user: userResult });
    } catch (error) {
      next(error);
    }
};

// @desc    Mettre à jour un utilisateur (admin)
// @route   PUT /api/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res, next) => {
  try {
    const { role, isActive } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }
    
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    res.json({ success: true, message: 'Utilisateur mis à jour', user });
  } catch (error) {
    next(error);
  }
};

// @desc    Réinitialiser le mot de passe d'un utilisateur
// @route   POST /api/users/:id/reset-password
// @access  Private (Admin)
export const resetUserPassword = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
        }
        const newPassword = Math.random().toString(36).slice(-8);
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: `Le mot de passe pour ${user.username} a été réinitialisé.`,
            newPassword: newPassword
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Supprimer un utilisateur
// @route   DELETE /api/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }
    await user.destroy();
    res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    next(error);
  }
};

// ===============================================
// === NOUVELLES FONCTIONS POUR LES SIGNATURES ===
// ===============================================

/**
 * @desc    Uploader ou mettre à jour une image de signature pour un utilisateur
 * @route   POST /api/users/:id/signature
 * @access  Private (Admin)
 */
export const uploadSignature = async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier image n\'a été envoyé' });
      }
  
      // Le middleware Multer a déjà sauvegardé le fichier.
      // On met à jour le chemin dans la base de données.
      // On normalise les slashes pour être compatible avec Windows et Linux.
      user.signaturePath = req.file.path.replace(/\\/g, "/");
      await user.save();
  
      res.json({ success: true, message: 'Image de signature mise à jour avec succès.', user });
    } catch (error) {
      next(error);
    }
};

/**
 * @desc    Uploader ou mettre à jour une image de cachet pour un utilisateur
 * @route   POST /api/users/:id/stamp
 * @access  Private (Admin)
 */
export const uploadStamp = async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier image n\'a été envoyé' });
      }
  
      user.stampPath = req.file.path.replace(/\\/g, "/");
      await user.save();
  
      res.json({ success: true, message: 'Image du cachet mise à jour avec succès.', user });
    } catch (error) {
      next(error);
    }
};