import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { getTenantSettings } from '../utils/tenantSettings.js';
import User from '../models/User.js';
import { Tenant, AuditLog } from '../models/index.js';
import { sendEmailOtp, verifyEmailOtp, EmailOtpError } from '../utils/emailOtp.js';

// Nom affiché dans l'application d'authentification : « GED <organisation> »
const issuerFor = async (tenantId) => {
  const tenant = tenantId ? await Tenant.findByPk(tenantId, { attributes: ['name'] }) : null;
  return tenant ? `GED ${tenant.name}` : 'GED';
};

// ── Générer secret + QR code (setup) ─────────────────────────────────────────
export const setup2FA = async (req, res, next) => {
  try {
    const user = await User.unscoped().findByPk(req.user.id);

    if (user.totpEnabled || user.emailOtpEnabled) {
      return res.status(400).json({ success: false, error: '2FA déjà activée. Désactivez-la d\'abord.' });
    }

    const issuer = await issuerFor(user.tenantId);
    const secret = speakeasy.generateSecret({ length: 20 });

    // Stocker le secret temporairement (pas encore validé)
    await user.update({ totpSecret: secret.base32 });

    // Émetteur explicite : les applications affichent « GED <organisation> »
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.base32, encoding: 'base32', label: `${issuer}:${user.username}`, issuer,
    });
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      otpauthUrl
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
    if (!user || !(user.emailOtpEnabled || (user.totpEnabled && user.totpSecret))) {
      return res.status(401).json({ success: false, error: 'Utilisateur invalide' });
    }

    if (user.emailOtpEnabled) {
      // Code reçu par e-mail (erreurs 400 : ne déconnectent pas la page)
      try { await verifyEmailOtp(user, code); } catch (e) {
        if (e instanceof EmailOtpError) return res.status(e.status).json({ success: false, error: e.message });
        throw e;
      }
    } else {
      const valid = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: 'base32',
        token: code.replace(/\s/g, ''),
        window: 1
      });

      if (!valid) {
        return res.status(401).json({ success: false, error: 'Code incorrect ou expiré' });
      }
    }

    // Émettre le vrai JWT
    const { sessionMaxDays } = await getTenantSettings(user.tenantId);
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: `${sessionMaxDays}d` }
    );

    await user.update({ lastLogin: new Date() });

    const userResult = user.toJSON();
    delete userResult.password;
    delete userResult.totpSecret;
    delete userResult.emailOtpHash;

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
      attributes: ['id', 'email', 'totpEnabled', 'emailOtpEnabled']
    });
    res.json({
      success: true,
      totpEnabled: user.totpEnabled,
      emailOtpEnabled: user.emailOtpEnabled,
      method: user.emailOtpEnabled ? 'email' : user.totpEnabled ? 'totp' : null,
      email: user.email,
    });
  } catch (err) {
    next(err);
  }
};

// ── 2FA par e-mail ───────────────────────────────────────────────────────────
const otpError = (res, e, next) => (e instanceof EmailOtpError
  ? res.status(e.status).json({ success: false, error: e.message })
  : next(e));

// Envoyer un code à l'utilisateur connecté (pour activer ou désactiver)
export const sendEmail2FACode = async (req, res, next) => {
  try {
    const user = await User.unscoped().findByPk(req.user.id);
    if (user.totpEnabled) {
      return res.status(400).json({ success: false, error: 'Désactivez d\'abord la double authentification par application.' });
    }
    const maskedEmail = await sendEmailOtp(user, user.emailOtpEnabled ? 'disable' : 'enable');
    res.json({ success: true, maskedEmail, message: `Code envoyé à ${maskedEmail}.` });
  } catch (e) { otpError(res, e, next); }
};

export const enableEmail2FA = async (req, res, next) => {
  try {
    const user = await User.unscoped().findByPk(req.user.id);
    if (user.totpEnabled || user.emailOtpEnabled) {
      return res.status(400).json({ success: false, error: '2FA déjà activée.' });
    }
    await verifyEmailOtp(user, req.body?.code);
    await user.update({ emailOtpEnabled: true });
    AuditLog.log(req, '2FA_EMAIL_ENABLED', 'user', user.id);
    res.json({ success: true, message: 'Double authentification par e-mail activée.' });
  } catch (e) { otpError(res, e, next); }
};

export const disableEmail2FA = async (req, res, next) => {
  try {
    const user = await User.unscoped().findByPk(req.user.id);
    if (!user.emailOtpEnabled) return res.status(400).json({ success: false, error: '2FA par e-mail non activée.' });
    await verifyEmailOtp(user, req.body?.code);
    await user.update({ emailOtpEnabled: false });
    AuditLog.log(req, '2FA_EMAIL_DISABLED', 'user', user.id);
    res.json({ success: true, message: 'Double authentification par e-mail désactivée.' });
  } catch (e) { otpError(res, e, next); }
};

// Connexion : renvoyer un code (jeton temporaire de l'étape 1)
export const resendLogin2FACode = async (req, res, next) => {
  try {
    let decoded;
    try { decoded = jwt.verify(req.body?.tempToken || '', process.env.JWT_SECRET); } catch {
      return res.status(401).json({ success: false, error: 'Session de connexion expirée. Reconnectez-vous.' });
    }
    if (decoded.type !== '2fa_pending') return res.status(401).json({ success: false, error: 'Token invalide' });
    const user = await User.unscoped().findByPk(decoded.id);
    if (!user?.emailOtpEnabled) return res.status(400).json({ success: false, error: 'La 2FA par e-mail n\'est pas active.' });
    const maskedEmail = await sendEmailOtp(user, 'login');
    res.json({ success: true, maskedEmail, message: `Nouveau code envoyé à ${maskedEmail}.` });
  } catch (e) { otpError(res, e, next); }
};

// ── Administrateur : débloquer un utilisateur (appareil ou boîte e-mail perdus) ─
export const adminReset2FA = async (req, res, next) => {
  try {
    const user = await User.unscoped().findOne({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!user) return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    if (user.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Seul un super-administrateur peut modifier ce compte.' });
    }
    await user.update({ totpEnabled: false, totpSecret: null, emailOtpEnabled: false, emailOtpHash: null, emailOtpExpiresAt: null });
    AuditLog.log(req, '2FA_RESET_BY_ADMIN', 'user', user.id, { email: user.email });
    res.json({ success: true, message: `Double authentification désactivée pour ${user.firstName || user.email}. Il pourra la réactiver depuis Paramètres › Sécurité.` });
  } catch (err) { next(err); }
};
