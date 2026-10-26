// backend/src/middleware/auth.js - Middleware d'authentification et autorisation

import User from '../models/User.js';
import { verifySessionToken, sessionRejection } from '../utils/sessionTokens.js';
import { setFileCookie } from '../utils/fileAccess.js';

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

    // Vérifier et décoder le token (session uniquement : le jeton provisoire 2FA est refusé)
    const decoded = verifySessionToken(token);

    // Récupérer l'utilisateur depuis la base de données
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    // Compte inexistant, désactivé ou sessions révoquées
    const rejection = sessionRejection(user, decoded);
    if (rejection) {
      return res.status(401).json({ message: rejection });
    }

    // Cookie de session limité aux fichiers (/api/uploads, /api/signatures),
    // envoyé par le navigateur avec les images, liens et la visionneuse PDF
    setFileCookie(req, res, token, decoded);

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

    // superadmin hérite de tous les droits de 'admin'
    const effectiveRoles = roles.includes('admin')
      ? [...roles, 'superadmin']
      : roles;

    if (!effectiveRoles.includes(req.user.role)) {
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
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
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
  if (req.user && (req.user.role === 'validator' || req.user.role === 'director' || req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ 
      message: 'Accès réservé aux validateurs' 
    });
  }
};

// Export par défaut (optionnel)
export default {
  protect,
  authorize,
  isAdmin,
  isValidator
};