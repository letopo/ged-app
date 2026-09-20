import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Vérifie que le token JWT appartient à un superadmin
export const requireSuperAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token manquant' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Charger l'utilisateur sans filtre tenant (User.unscoped())
    const user = await User.unscoped().findByPk(decoded.id);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Accès réservé au super-administrateur' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token invalide ou expiré' });
  }
};
