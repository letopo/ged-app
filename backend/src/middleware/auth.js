// backend/src/middleware/auth.js - Middleware d'authentification et autorisation

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ============================================
// Middleware de protection des routes (JWT)
// ============================================
export const protect = async (req, res, next) => {
  let token;

  try {
    // Vérifier si le token est présent dans les headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Extraire le token
      token = req.headers.authorization.split(' ')[1];
    }

    // Vérifier si le token existe
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé, token manquant' });
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Récupérer l'utilisateur depuis la base de données
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    // Ajouter l'utilisateur à la requête
    req.user = user;
    next();

  } catch (error) {
    console.error('❌ Erreur authentification:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide' });
    }
    
    return res.status(401).json({ message: 'Non autorisé' });
  }
};

// ============================================
// Middleware d'autorisation par rôle
// ============================================
export const authorize = (...roles) => {
  return (req, res, next) => {
    // Vérifier si l'utilisateur est authentifié
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Non authentifié' 
      });
    }

    // Vérifier si l'utilisateur a le bon rôle
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Accès refusé. Rôle requis: ${roles.join(' ou ')}` 
      });
    }

    next();
  };
};

// ============================================
// Middleware optionnel : vérifier si admin
// ============================================
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      message: 'Accès réservé aux administrateurs' 
    });
  }
};

// ============================================
// Middleware optionnel : vérifier si validator ou director
// ============================================
export const isValidator = (req, res, next) => {
  if (req.user && (req.user.role === 'validator' || req.user.role === 'director' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ 
      message: 'Accès réservé aux validateurs' 
    });
  }
};

// ============================================
// Fonction utilitaire : générer un token JWT
// ============================================
export const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Export par défaut (optionnel)
export default {
  protect,
  authorize,
  isAdmin,
  isValidator,
  generateToken
};