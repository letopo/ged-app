// backend/src/controllers/userController.js - VERSION COMPLÈTE
import User from '../models/User.js';
import Service from '../models/Service.js';
import ServiceMember from '../models/ServiceMember.js';
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
    // Champs à mettre à jour, y compris ceux que vous voulez ajouter
    const { role, isActive, firstName, lastName, email, username } = req.body; 
    const userId = req.params.id;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    // --- Validation d'unicité pour Email et Username ---
    // Vérifier si un autre utilisateur utilise déjà ce nouvel email
    if (email !== undefined && email !== user.email) {
      const existingUser = await User.findOne({ where: { email: email, id: { [Op.ne]: userId } } });
      if (existingUser) {
        return res.status(409).json({ success: false, error: 'Email déjà utilisé par un autre utilisateur.' });
      }
      user.email = email;
    }

    // Vérifier si un autre utilisateur utilise déjà ce nouveau nom d'utilisateur
    if (username !== undefined && username !== user.username) {
      const existingUser = await User.findOne({ where: { username: username, id: { [Op.ne]: userId } } });
      if (existingUser) {
        return res.status(409).json({ success: false, error: 'Nom d\'utilisateur déjà utilisé par un autre utilisateur.' });
      }
      user.username = username;
    }
    // ----------------------------------------------------

    // Mise à jour des autres champs
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;

    await user.save();
    
    // Pour ne pas renvoyer le mot de passe
    const userResult = user.toJSON();
    delete userResult.password;
    
    res.json({ success: true, message: 'Utilisateur mis à jour', user: userResult });
  } catch (error) {
    next(error);
  }
};

// @desc    Réinitialiser le mot de passe d'un utilisateur
// @route   POST /api/users/:id/reset-password
// @access  Private (Admin)
export const resetUserPassword = async (req, res, next) => {
    try {
        // Récupération du nouveau mot de passe envoyé par le frontend (peut être vide)
        const { newPassword } = req.body; 
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
        }
        
        let finalPassword;

        if (newPassword && newPassword.length >= 6) { // Vérifie la présence et une longueur minimale
            finalPassword = newPassword;
        } else {
            // Logique actuelle : générer un mot de passe aléatoire (sécurité si l'admin oublie de saisir)
            finalPassword = Math.random().toString(36).slice(-8); 
        }

        user.password = finalPassword; // Le hook Sequelize hachera ce mot de passe
        await user.save();

        // On renvoie le mot de passe EN CLAIR pour qu'il soit affiché à l'admin
        res.json({
            success: true,
            message: `Le mot de passe pour ${user.username} a été réinitialisé.`,
            newPassword: finalPassword 
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

// @desc    Uploader ou mettre à jour une image de signature pour un utilisateur
// @route   POST /api/users/:id/signature
// @access  Private (Admin)
export const uploadSignature = async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier image n\'a été envoyé' });
      }
  
      user.signaturePath = req.file.path.replace(/\\/g, "/");
      await user.save();
  
      res.json({ success: true, message: 'Image de signature mise à jour avec succès.', user });
    } catch (error) {
      next(error);
    }
};

// @desc    Uploader ou mettre à jour une image de cachet pour un utilisateur
// @route   POST /api/users/:id/stamp
// @access  Private (Admin)
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

// @desc    Récupérer le service de l'utilisateur connecté
// @route   GET /api/users/me/service
// @access  Private
export const getMyService = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const serviceMember = await ServiceMember.findOne({
      where: { 
        userId: userId,
        isActive: true 
      },
      include: [{
        model: Service,
        as: 'service',
        attributes: ['id', 'name']
      }]
    });

    if (!serviceMember) {
      return res.json({ 
        success: true, 
        service: null,
        message: 'Aucun service associé à cet utilisateur' 
      });
    }

    res.json({ 
      success: true, 
      service: serviceMember.service,
      fonction: serviceMember.fonction
    });
  } catch (error) {
    console.error('❌ Erreur récupération service utilisateur:', error);
    next(error);
  }
};