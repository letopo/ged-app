import { License } from '../models/index.js';
import jwt from 'jsonwebtoken';
import { PUBLIC_KEY } from '../config/licenseKeys.js'; 

export const activateLicense = async (req, res) => {
  try {
    console.log("🔑 Tentative d'activation de licence...");
    const { licenseKey } = req.body;

    // 1. Vérifier si la clé publique est chargée
    if (!PUBLIC_KEY) {
      throw new Error("La Clé Publique (PUBLIC_KEY) est vide ou introuvable dans la config !");
    }

    // 2. Vérification JWT
    let decoded;
    try {
      decoded = jwt.verify(licenseKey, PUBLIC_KEY, { algorithms: ['RS256'] });
      console.log("✅ Signature JWT valide pour :", decoded.clientName);
    } catch (jwtError) {
      console.error("❌ Échec verification JWT :", jwtError.message);
      // On retourne le message précis pour comprendre pourquoi (signature invalide ? format ?)
      return res.status(400).json({ 
        success: false, 
        message: `Clé invalide : ${jwtError.message}`,
        detail: "La clé privée utilisée pour générer ne correspond pas à la clé publique du serveur."
      });
    }
    
    // 3. Nettoyage et Sauvegarde
    await License.destroy({ where: {}, truncate: true });
    
    await License.create({ 
      key: licenseKey,
      clientName: decoded.clientName,
      expiresAt: decoded.expiresAt ? new Date(decoded.expiresAt) : null
    });

    res.json({ 
      success: true, 
      message: '✅ Licence activée avec succès !',
      info: decoded
    });

  } catch (error) {
    console.error("🔥 ERREUR CRITIQUE ACTIVATE :", error);
    res.status(500).json({ 
      success: false, 
      message: error.message, 
      stack: error.stack 
    });
  }
};

export const getLicenseStatus = async (req, res) => {
  try {
    console.log("🔍 Vérification du statut de la licence...");

    // 1. Vérification Clé Publique
    if (!PUBLIC_KEY) {
        console.error("❌ ERREUR : PUBLIC_KEY est undefined !");
        return res.status(500).json({ success: false, message: "Configuration serveur : Clé publique manquante" });
    }

    // 2. Récupération BDD
    const license = await License.findOne({ order: [['createdAt', 'DESC']] });
    
    if (!license) {
        console.log("ℹ️ Aucune licence trouvée en base de données.");
        return res.json({ active: false });
    }

    // 3. Vérification de la clé stockée
    try {
      const decoded = jwt.verify(license.key, PUBLIC_KEY, { algorithms: ['RS256'] });
      console.log("✅ Licence active trouvée pour :", decoded.clientName);
      
      res.json({ 
        active: true, 
        client: decoded.clientName,
        expiresAt: decoded.expiresAt,
        features: decoded.features
      });
    } catch (e) {
      console.warn("⚠️ Licence en base invalide (signature KO) :", e.message);
      res.json({ active: false, error: 'Licence stockée invalide ou corrompue' });
    }

  } catch (error) {
    console.error("🔥 ERREUR CRITIQUE STATUS :", error);
    // On renvoie l'erreur exacte au navigateur pour la voir
    res.status(500).json({ 
        success: false, 
        message: "Erreur interne serveur", 
        errorDetail: error.message,
        sql: error.sql // Si c'est une erreur SQL
    });
  }
};