import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { Op } from 'sequelize';
import User from '../models/User.js';

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password, firstName, lastName, username } = req.body; // ← AJOUTÉ username

  try {
    // Vérifier email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Cet email est déjà utilisé'
      });
    }

    // Vérifier username
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        error: 'Ce nom d\'utilisateur est déjà utilisé'
      });
    }

    // Créer l'utilisateur AVEC username
    const user = await User.create({ 
      email, 
      password, 
      firstName, 
      lastName,
      username  // ← AJOUTÉ username
    });
    
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      token,  // ← Structure corrigée
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      message: 'Inscription réussie'
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ success: false, error: 'Erreur inscription' });
  }
};

export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    // Accepter username OU email
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username },
          { email: username }  // Si username contient @, chercher par email aussi
        ]
      } 
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        error: 'Identifiants invalides'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Compte désactivé'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      message: 'Connexion réussie'
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ success: false, error: 'Erreur connexion' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erreur profil' });
  }
};

export const updateProfile = async (req, res) => {
  const { firstName, lastName, email } = req.body;
  try {
    const user = await User.findByPk(req.user.id);
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    await user.save();
    res.json({ success: true, data: user.toJSON(), message: 'Profil mis à jour' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erreur mise à jour' });
  }
};