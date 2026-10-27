// backend/src/utils/fileAccess.js
// Accès aux fichiers déposés (/api/uploads, /api/signatures). Les navigateurs
// chargent ces fichiers par <img>, liens et visionneuse PDF, sans en-tête
// Authorization : la session est donc aussi portée par un cookie limité aux
// routes /api (ged_files, HttpOnly, SameSite=Lax), déposé à chaque requête
// authentifiée de l'API. Règles :
//  - session valable obligatoire (mêmes règles que l'API : type, compte actif,
//    sessions non révoquées) — cookie ou en-tête Authorization ;
//  - fichier d'un document : droit de lecture sur ce document (même établissement) ;
//  - autres fichiers (signatures, pièces jointes…) : toute session valable ;
//  - lien signé à durée courte (OnlyOffice, qui récupère le fichier côté serveur).
import crypto from 'crypto';
import { Op } from 'sequelize';
import { tenantNamespace } from '../config/database.js';
import { verifySessionToken, sessionRejection } from './sessionTokens.js';

export const FILE_COOKIE = 'ged_files';

const hmac = (rel, exp) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(`file:${rel}:${exp}`).digest('base64url');

/** URL signée (chemin relatif « uploads/… »), valable ttlSec secondes. */
export function signFileUrl(relPath, ttlSec = 600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  return `/api/${relPath.split('/').map(encodeURIComponent).join('/')}?exp=${exp}&sig=${hmac(relPath, exp)}`;
}

function validSignature(relPath, exp, sig) {
  const e = Number(exp);
  if (!Number.isInteger(e) || e < Math.floor(Date.now() / 1000) || typeof sig !== 'string') return false;
  const expected = Buffer.from(hmac(relPath, e));
  const given = Buffer.from(sig);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

const cookieValue = (req, name) => {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
};

/** Dépose (ou rafraîchit) le cookie de fichiers pour ce jeton de session. */
export function setFileCookie(req, res, token, decoded) {
  if (cookieValue(req, FILE_COOKIE) === token) return;
  const maxAge = decoded?.exp ? Math.max(0, decoded.exp * 1000 - Date.now()) : undefined;
  res.cookie(FILE_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/api', ...(maxAge !== undefined ? { maxAge } : {}) });
}

/**
 * Middleware placé devant les dossiers statiques. `root` est le préfixe du
 * chemin enregistré correspondant ('uploads' pour /api/uploads).
 */
export function requireFileAccess(root) {
  return async (req, res, next) => {
    try {
      let rel;
      try { rel = `${root}${decodeURIComponent(req.path)}`; } catch { return res.sendStatus(400); }
      if (req.query.sig && validSignature(rel, req.query.exp, req.query.sig)) return next();
      if (req.query.sig) return res.status(401).json({ success: false, message: 'Lien expiré ou invalide.' });

      const header = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
      const token = header || cookieValue(req, FILE_COOKIE);
      if (!token) return res.status(401).json({ success: false, message: 'Connexion requise.' });
      let decoded;
      try { decoded = verifySessionToken(token); } catch { return res.status(401).json({ success: false, message: 'Session invalide.' }); }

      const { User, Document } = await import('../models/index.js');
      const user = await User.unscoped().findByPk(decoded.id);
      if (await sessionRejection(user, decoded)) return res.status(401).json({ success: false, message: 'Session invalide.' });

      // Fichier d'un document : mêmes droits que pour l'ouvrir dans la GED
      if (root === 'uploads') {
        // Recherche hors contexte d'établissement (aucun filtre ajouté) : un
        // document d'un autre établissement doit être refusé, pas ignoré
        // (condition explicite sur tenantId : le hook n'ajoute alors aucun filtre,
        // même si un contexte d'établissement est actif)
        const doc = await Document.findOne({ where: { filePath: rel, tenantId: { [Op.ne]: null } }, attributes: { exclude: ['extractedText'] } });
        const allowed = !doc || (doc.tenantId === user.tenantId && await tenantNamespace.runPromise(async () => {
          tenantNamespace.set('tenantId', user.tenantId);
          const { hasDocumentReadAccess } = await import('./documentVisibility.js');
          return hasDocumentReadAccess(doc, user);
        }));
        if (!allowed) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
      }
      next();
    } catch (err) {
      console.error('Accès fichier :', err.message);
      res.sendStatus(500);
    }
  };
}
