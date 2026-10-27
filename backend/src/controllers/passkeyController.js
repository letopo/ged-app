// backend/src/controllers/passkeyController.js
// Connexion sans mot de passe (passkeys / WebAuthn) : l'appareil vérifie la
// personne (empreinte, Face ID, code PIN du téléphone ou de Windows Hello) et
// signe un défi avec une clé qui ne quitte jamais l'appareil.
//  - Facultatif : chacun l'active, appareil par appareil, dans Paramètres ›
//    Sécurité. Le mot de passe reste toujours valable.
//  - La vérification de la personne par l'appareil est exigée
//    (userVerification 'required') : la clé + l'empreinte/PIN valent deux
//    facteurs, la 2FA par code n'est donc pas redemandée.
//  - WebAuthn exige un nom de domaine (ged.hsjmcam.net) : impossible depuis une
//    adresse IP. Le nom et l'origine viennent de la requête et doivent concorder.
import crypto from 'crypto';
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import User from '../models/User.js';
import UserPasskey from '../models/UserPasskey.js';
import { describeDevice } from '../utils/deviceLabel.js';
import { completeLogin } from './authController.js';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MAX_PASSKEYS_PER_USER = 20;
const IP_HOST = /^\d{1,3}(\.\d{1,3}){3}$|^\[?[0-9a-f:]+\]?$/i;

// Défis en cours (usage unique, 5 min) : challengeId → { challenge, kind, userId, expires }
const challenges = new Map();

function storeChallenge(challenge, kind, userId = null) {
  const now = Date.now();
  for (const [id, c] of challenges) if (c.expires < now) challenges.delete(id);
  if (challenges.size > 5000) challenges.clear(); // garde-fou mémoire
  const id = crypto.randomUUID();
  challenges.set(id, { challenge, kind, userId, expires: now + CHALLENGE_TTL_MS });
  return id;
}

function takeChallenge(id, kind, userId = null) {
  const c = typeof id === 'string' ? challenges.get(id) : null;
  if (c) challenges.delete(id);
  if (!c || c.kind !== kind || c.expires < Date.now() || (userId && c.userId !== userId)) return null;
  return c.challenge;
}

class PasskeyError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}

/**
 * Domaine (rpID) et origine attendus, tirés de la requête. Refus si la GED est
 * ouverte par une adresse IP, ou si l'origine du navigateur ne correspond pas.
 */
function relyingParty(req) {
  const rpID = String(req.hostname || '').toLowerCase();
  if (!rpID || IP_HOST.test(rpID)) {
    throw new PasskeyError(400, 'Ouvrez la GED par son nom (ex. ged.hsjmcam.net) et non par une adresse IP pour utiliser l’empreinte ou le code PIN.', 'PASSKEY_NEEDS_DOMAIN');
  }
  let origin;
  try { origin = new URL(req.headers.origin); } catch { throw new PasskeyError(400, 'Origine de la requête manquante.', 'PASSKEY_BAD_ORIGIN'); }
  const localhost = rpID === 'localhost' || rpID.endsWith('.localhost');
  if (origin.hostname.toLowerCase() !== rpID || !(origin.protocol === 'https:' || (localhost && origin.protocol === 'http:'))) {
    throw new PasskeyError(400, 'Origine de la requête non reconnue.', 'PASSKEY_BAD_ORIGIN');
  }
  return { rpID, origin: origin.origin, rpName: req.tenant?.name || 'GED' };
}

const fail = (res, error, next) => (error instanceof PasskeyError
  ? res.status(error.status).json({ success: false, error: error.message, code: error.code })
  : next(error));

const toPublic = (p) => ({ id: p.id, name: p.name, createdAt: p.createdAt, lastUsedAt: p.lastUsedAt });

// ── Enregistrer cet appareil (connecté) ──────────────────────────────────────

// POST /api/auth/passkeys/register/options
export const registrationOptions = async (req, res, next) => {
  try {
    const { rpID, rpName } = relyingParty(req);
    const existing = await UserPasskey.findAll({ where: { userId: req.user.id }, attributes: ['credentialId', 'transports'] });
    if (existing.length >= MAX_PASSKEYS_PER_USER) {
      throw new PasskeyError(400, `${MAX_PASSKEYS_PER_USER} appareils maximum : supprimez-en un d’abord.`, 'PASSKEY_LIMIT');
    }
    const options = await generateRegistrationOptions({
      rpName, rpID,
      userName: req.user.username || req.user.email,
      userDisplayName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username,
      userID: new TextEncoder().encode(req.user.id),
      attestationType: 'none',
      excludeCredentials: existing.map(p => ({ id: p.credentialId, transports: p.transports })),
      // Clé enregistrée sur l'appareil (connexion sans saisir l'identifiant),
      // personne vérifiée (empreinte, visage ou code PIN)
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    });
    res.json({ success: true, options, challengeId: storeChallenge(options.challenge, 'register', req.user.id) });
  } catch (error) { fail(res, error, next); }
};

// POST /api/auth/passkeys/register/verify  { challengeId, response }
export const registrationVerify = async (req, res, next) => {
  try {
    const { rpID, origin } = relyingParty(req);
    const expectedChallenge = takeChallenge(req.body?.challengeId, 'register', req.user.id);
    if (!expectedChallenge) throw new PasskeyError(400, 'Demande expirée, recommencez.', 'PASSKEY_EXPIRED');
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: req.body?.response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
      });
    } catch (e) {
      throw new PasskeyError(400, 'L’appareil n’a pas pu être enregistré.', 'PASSKEY_INVALID');
    }
    if (!verification.verified) throw new PasskeyError(400, 'L’appareil n’a pas pu être enregistré.', 'PASSKEY_INVALID');

    const { credential } = verification.registrationInfo;
    const device = describeDevice(req.headers['user-agent']);
    const passkey = await UserPasskey.create({
      userId: req.user.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      transports: Array.isArray(req.body.response?.response?.transports) ? req.body.response.response.transports.slice(0, 6) : [],
      name: [device.browser, device.os].filter(Boolean).join(' · ').slice(0, 120) || null,
    });
    const { AuditLog } = await import('../models/index.js');
    AuditLog.log(req, 'PASSKEY_ADDED', 'auth', req.user.id, { passkeyId: passkey.id, name: passkey.name });
    res.status(201).json({ success: true, message: 'Connexion sans mot de passe activée sur cet appareil.', passkey: toPublic(passkey) });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Cet appareil est déjà enregistré.' });
    }
    fail(res, error, next);
  }
};

// GET /api/auth/passkeys
export const listPasskeys = async (req, res, next) => {
  try {
    const rows = await UserPasskey.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, passkeys: rows.map(toPublic) });
  } catch (error) { next(error); }
};

// DELETE /api/auth/passkeys/:id
export const deletePasskey = async (req, res, next) => {
  try {
    const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id);
    const count = valid ? await UserPasskey.destroy({ where: { id: req.params.id, userId: req.user.id } }) : 0;
    if (!count) return res.status(404).json({ success: false, error: 'Appareil introuvable.' });
    const { AuditLog } = await import('../models/index.js');
    AuditLog.log(req, 'PASSKEY_REMOVED', 'auth', req.user.id, { passkeyId: req.params.id });
    res.json({ success: true, message: 'Appareil retiré.' });
  } catch (error) { next(error); }
};

// ── Se connecter (sans identifiant ni mot de passe) ──────────────────────────

// POST /api/auth/passkeys/login/options
export const authenticationOptions = async (req, res, next) => {
  try {
    const { rpID } = relyingParty(req);
    // Pas de liste de clés : l'appareil propose les comptes qu'il connaît
    const options = await generateAuthenticationOptions({ rpID, userVerification: 'required' });
    res.json({ success: true, options, challengeId: storeChallenge(options.challenge, 'login') });
  } catch (error) { fail(res, error, next); }
};

// POST /api/auth/passkeys/login/verify  { challengeId, response, remember }
export const authenticationVerify = async (req, res, next) => {
  try {
    const { rpID, origin } = relyingParty(req);
    const expectedChallenge = takeChallenge(req.body?.challengeId, 'login');
    if (!expectedChallenge) throw new PasskeyError(400, 'Demande expirée, recommencez.', 'PASSKEY_EXPIRED');
    const refused = new PasskeyError(401, 'Appareil non reconnu. Connectez-vous avec votre mot de passe.', 'PASSKEY_UNKNOWN');

    const credentialId = req.body?.response?.id;
    const passkey = typeof credentialId === 'string' ? await UserPasskey.findOne({ where: { credentialId } }) : null;
    if (!passkey) throw refused;
    // Compte de cet établissement (même règle que la connexion par mot de passe)
    const user = await User.unscoped().findByPk(passkey.userId);
    if (!user || user.tenantId !== req.tenantId) throw refused;

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: req.body.response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
        credential: { id: passkey.credentialId, publicKey: Buffer.from(passkey.publicKey, 'base64url'), counter: passkey.counter, transports: passkey.transports },
      });
    } catch (e) {
      throw refused;
    }
    if (!verification.verified) throw refused;
    if (!user.isActive) return res.status(403).json({ success: false, error: 'Ce compte a été désactivé' });

    await passkey.update({ counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() });
    await completeLogin(req, res, user, { remember: req.body.remember === true, method: 'passkey' });
  } catch (error) { fail(res, error, next); }
};
