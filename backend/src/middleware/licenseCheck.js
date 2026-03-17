import jwt from 'jsonwebtoken';
import { License } from '../models/index.js';
import { PUBLIC_KEY } from '../config/licenseKeys.js'; // ✅ IMPORT CENTRALISÉ

export const checkLicense = (requiredFeature = null) => {
  return async (req, res, next) => {
    try {
      const licenseData = await License.findOne({ order: [['createdAt', 'DESC']] });

      if (!licenseData) {
        return res.status(402).json({ 
          success: false, 
          message: '⛔ Aucune licence installée. Accès restreint.' 
        });
      }

      // Utilisation de la clé importée
      const decoded = jwt.verify(licenseData.key, PUBLIC_KEY, { algorithms: ['RS256'] });

      // ... (Reste du code inchangé : vérification date, features, etc.) ...
      if (decoded.expiresAt) {
        const expirationDate = new Date(decoded.expiresAt);
        if (new Date() > expirationDate) {
          return res.status(402).json({ success: false, message: 'Licence expirée.' });
        }
      }

      if (requiredFeature) {
        if (!decoded.features || !decoded.features.includes(requiredFeature)) {
          return res.status(403).json({ success: false, message: 'Module non inclus.' });
        }
      }

      req.licenseInfo = decoded;
      next();

    } catch (error) {
      console.error("Erreur Licence:", error.message);
      return res.status(402).json({ success: false, message: '⛔ Licence invalide ou corrompue.' });
    }
  };
};