// backend/src/utils/emailOtp.js
// Codes de double authentification envoyés par e-mail : 6 chiffres, valables
// 10 minutes, 5 essais au plus, un envoi par minute au plus. Seule une
// empreinte du code est stockée (users.email_otp_hash), jamais le code.
import crypto from 'crypto';
import { Tenant } from '../models/index.js';
import { sendNotificationEmail } from './mailer.js';

const CODE_TTL_MS = 10 * 60_000;
const RESEND_DELAY_MS = 60_000;
export const MAX_ATTEMPTS = 5;

const hashCode = (userId, code) =>
  crypto.createHmac('sha256', `ged-email-otp:${process.env.JWT_SECRET}`).update(`${userId}:${code}`).digest('hex');

// « a*****b@gmail.com » : pour indiquer où le code est parti sans exposer l'adresse
export function maskEmail(email) {
  const [name, domain] = String(email || '').split('@');
  if (!domain) return '';
  const visible = name.length <= 2 ? name[0] : `${name[0]}${'*'.repeat(Math.min(name.length - 2, 6))}${name[name.length - 1]}`;
  return `${visible}@${domain}`;
}

export class EmailOtpError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const PURPOSES = {
  login:   { subject: 'Votre code de connexion',               intro: 'Voici votre code pour vous connecter à la GED' },
  enable:  { subject: 'Activation de la double authentification', intro: 'Voici votre code pour activer la double authentification par e-mail' },
  disable: { subject: 'Désactivation de la double authentification', intro: 'Voici votre code pour désactiver la double authentification par e-mail' },
};

/**
 * Envoie un nouveau code à l'utilisateur (instance User chargée avec unscoped()).
 * Lève EmailOtpError si l'envoi est trop rapproché ou si l'e-mail ne part pas.
 */
export async function sendEmailOtp(user, purpose = 'login') {
  if (!user.email) throw new EmailOtpError('Aucune adresse e-mail sur ce compte.');
  // Limite d'un envoi par minute, seulement si un code encore valide attend
  // (sinon l'utilisateur resterait sans code utilisable)
  const pending = user.emailOtpHash && user.emailOtpExpiresAt && new Date(user.emailOtpExpiresAt).getTime() > Date.now();
  if (pending && user.emailOtpSentAt && Date.now() - new Date(user.emailOtpSentAt).getTime() < RESEND_DELAY_MS) {
    throw new EmailOtpError('Un code vient d’être envoyé : patientez une minute avant d’en demander un autre.', 429);
  }
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const tenant = await Tenant.findByPk(user.tenantId, { attributes: ['name'] });
  const { subject, intro } = PURPOSES[purpose] || PURPOSES.login;
  const text = `${intro} :<br/><br/><b style="font-size:26px;letter-spacing:6px;">${code}</b><br/><br/>`
    + 'Ce code est valable 10 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail et prévenez votre administrateur.';

  const result = await sendNotificationEmail(user.email, `${subject}${tenant ? ` — GED ${tenant.name}` : ''}`, text, 'default', null, { tenantId: user.tenantId });
  if (!result.success || result.simulated) {
    throw new EmailOtpError(result.simulated
      ? 'La messagerie de votre organisation est désactivée : le code ne peut pas être envoyé par e-mail. Contactez un administrateur.'
      : 'Le code n’a pas pu être envoyé par e-mail (messagerie indisponible). Réessayez plus tard ou contactez un administrateur.', 503);
  }

  await user.update({
    emailOtpHash: hashCode(user.id, code),
    emailOtpExpiresAt: new Date(Date.now() + CODE_TTL_MS),
    emailOtpAttempts: 0,
    emailOtpSentAt: new Date(),
  });
  return maskEmail(user.email);
}

/** Vérifie un code ; efface le code s'il est bon, épuisé ou expiré. Lève EmailOtpError sinon. */
export async function verifyEmailOtp(user, rawCode) {
  const code = String(rawCode || '').replace(/\s/g, '');
  if (!user.emailOtpHash || !user.emailOtpExpiresAt) throw new EmailOtpError('Aucun code en attente : demandez-en un nouveau.');
  if (new Date(user.emailOtpExpiresAt).getTime() < Date.now()) {
    await user.update({ emailOtpHash: null, emailOtpExpiresAt: null });
    throw new EmailOtpError('Ce code a expiré : demandez-en un nouveau.');
  }
  const expected = Buffer.from(user.emailOtpHash, 'hex');
  const given = Buffer.from(hashCode(user.id, code), 'hex');
  if (!/^\d{6}$/.test(code) || !crypto.timingSafeEqual(expected, given)) {
    const attempts = (user.emailOtpAttempts || 0) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await user.update({ emailOtpHash: null, emailOtpExpiresAt: null, emailOtpAttempts: attempts });
      throw new EmailOtpError('Trop d’essais : ce code est annulé, demandez-en un nouveau.');
    }
    await user.update({ emailOtpAttempts: attempts });
    throw new EmailOtpError(`Code incorrect (${MAX_ATTEMPTS - attempts} essai(s) restant(s)).`);
  }
  await user.update({ emailOtpHash: null, emailOtpExpiresAt: null, emailOtpAttempts: 0 });
}
