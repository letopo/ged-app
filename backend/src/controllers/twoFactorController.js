import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const APP_NAME = 'GED SaaS';

// ── Générer secret + QR code (setup) ─────────────────────────────────────────
export const setup2FA = async (req, res, next) => {
  try {
    const user = await User.unscoped().findByPk(req.user.id);

    if (user.totpEnabled) {
      return res.status(400).json({ success: false, error: '2FA déjà activée. Désactivez-la d\'abord.' });
    }

    const secret = speakeasy.generateSecret({
      name: `${APP_NAME} (${user.username})`,
      length: 20
    });

    // Stocker le secret temporairement (pas encore validé)
    await user.update({ totpSecret: secret.base32 });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      otpauthUrl: secret.otpauth_url
    });
  } catch (err) {
    next(err);
  }
};

// ── Valider le premier code et activer la 2FA ─────────────────────────────────
export const enable2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code requis' });

    const user = await User.unscoped().findByPk(req.user.id);
    if (!user.totpSecret) {
      return res.status(400).json({ success: false, error: 'Lancez d\'abord la configuration 2FA' });
    }

    const valid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1
    });

    if (!valid) {
      return res.status(400).json({ success: false, error: 'Code incorrect. Vérifiez l\'heure de votre appareil.' });
    }

    await user.update({ totpEnabled: true });
    res.json({ success: true, message: 'Double authentification activée avec succès.' });
  } catch (err) {
    next(err);
  }
};

// ── Désactiver la 2FA ──────────────────────────────────────────────────────────
export const disable2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code requis pour désactiver la 2FA' });

    const user = await User.unscoped().findByPk(req.user.id);
    if (!user.totpEnabled) {
      return res.status(400).json({ success: false, error: '2FA non activée' });
    }

    const valid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1
    });

    if (!valid) {
      return res.status(400).json({ success: false, error: 'Code incorrect' });
    }

    await user.update({ totpEnabled: false, totpSecret: null });
    res.json({ success: true, message: '2FA désactivée.' });
  } catch (err) {
    next(err);
  }
};

// ── Valider le code TOTP lors du login (étape 2) ─────────────────────────────
export const verifyLogin2FA = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ success: false, error: 'Token temporaire et code requis' });
    }

    // Décoder le token temporaire
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: 'Token expiré ou invalide. Reconnectez-vous.' });
    }

    if (decoded.type !== '2fa_pending') {
      return res.status(401).json({ success: false, error: 'Token invalide' });
    }

    const user = await User.unscoped().findByPk(decoded.id);
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return res.status(401).json({ success: false, error: 'Utilisateur invalide' });
    }

    const valid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1
    });

    if (!valid) {
      return res.status(401).json({ success: false, error: 'Code incorrect ou expiré' });
    }

    // Émettre le vrai JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    await user.update({ lastLogin: new Date() });

    const userResult = user.toJSON();
    delete userResult.password;
    delete userResult.totpSecret;

    const { getUserPosteCodes } = await import('../utils/posteResolver.js');
    userResult.postes = await getUserPosteCodes(user.id);

    res.json({ success: true, message: 'Connexion réussie', token, user: userResult });
  } catch (err) {
    next(err);
  }
};

// ── Statut 2FA de l'utilisateur connecté ─────────────────────────────────────
export const get2FAStatus = async (req, res, next) => {
  try {
    const user = await User.unscoped().findByPk(req.user.id, {
      attributes: ['id', 'totpEnabled']
    });
    res.json({ success: true, totpEnabled: user.totpEnabled });
  } catch (err) {
    next(err);
  }
};
