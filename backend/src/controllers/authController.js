// backend/src/controllers/authController.js
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../models/User.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

export const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, username, role } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ success: false, error: 'Email, mot de passe et nom d\'utilisateur sont requis' });
    }

    const existingUser = await User.findOne({ where: { [Op.or]: [{ email }, { username }] } });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email ou nom d\'utilisateur déjà utilisé.' });
    }

    // Le hachage est maintenant géré par le hook du modèle User.js.
    // Il suffit de passer le mot de passe en clair.
    const user = await User.create({
      email, password, firstName, lastName, username, role: role || 'user'
    });
    
    const token = generateToken(user);
    const userResult = user.toJSON();
    delete userResult.password;

    res.status(201).json({ success: true, message: 'Compte créé avec succès', token, user: userResult });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Identifiant et mot de passe requis' });
    }

    const user = await User.scope('withPassword').findOne({ 
      where: { [Op.or]: [{ email: username }, { username: username }] }
    });

    // Utilisation de la méthode comparePassword() du modèle
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Ce compte a été désactivé' });
    }

    await user.update({ lastLogin: new Date() });
    const token = generateToken(user);
    const userResult = user.toJSON();
    delete userResult.password;

    res.json({ success: true, message: 'Connexion réussie', token, user: userResult });
  } catch (error) {
    next(error);
  }
};

// ... gardez les autres fonctions (getProfile, updateProfile) telles quelles.
// Le reste du fichier est correct.

export const getProfile = async (req, res, next) => {
    try {
      res.json({ success: true, user: req.user });
    } catch (error) {
      next(error);
    }
};
  
export const updateProfile = async (req, res, next) => {
    try {
        const { firstName, lastName, username, currentPassword, newPassword } = req.body;
    
        // On doit récupérer l'utilisateur avec son mot de passe pour la comparaison
        const user = await User.scope('withPassword').findByPk(req.user.id);
    
        if (!user) {
            return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
        }
    
        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (username !== undefined) user.username = username;
    
        // Changement de mot de passe
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ success: false, error: 'Le mot de passe actuel est requis' });
            }
            if (!(await user.comparePassword(currentPassword))) {
                return res.status(401).json({ success: false, error: 'Mot de passe actuel incorrect' });
            }
            // Le hook `beforeSave` s'occupera de hacher le nouveau mot de passe
            user.password = newPassword;
        }
    
        await user.save();
    
        const updatedUser = user.toJSON();
        delete updatedUser.password;
    
        res.json({ success: true, message: 'Profil mis à jour', user: updatedUser });
    } catch (error) {
        next(error);
    }
};