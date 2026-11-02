// backend/src/utils/chatAttachments.js
// Pièces jointes de la discussion envoyées depuis l'ordinateur ou le téléphone.
// Rangées hors de la partie publique de /api/uploads (dossier « .chat », jamais
// servi par express.static) : on ne les télécharge que par
// GET /api/chat/messages/:id/attachment, réservé aux membres de la conversation.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { UPLOAD_CEILING_MB } from './tenantSettings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CHAT_DIR = path.join(__dirname, '../../uploads/.chat');

// Extensions acceptées (l'extension stockée vient de cette liste, jamais du client)
const ALLOWED_EXT = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.xlsm', '.ppt', '.pptx', '.odt', '.ods', '.odp',
  '.rtf', '.txt', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.zip',
]);
// Affichés dans le navigateur ; tout le reste est servi en téléchargement
export const INLINE_EXT = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp']);
export const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

export const chatExtension = (name) => {
  const ext = path.extname(name || '').toLowerCase();
  return ALLOWED_EXT.has(ext) ? ext : null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (!UUID.test(req.params.id)) return cb(new Error('Conversation invalide'));
      const dir = path.join(CHAT_DIR, req.params.id);
      fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${chatExtension(file.originalname)}`),
  }),
  limits: { fileSize: UPLOAD_CEILING_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (chatExtension(file.originalname)) return cb(null, true);
    const err = new Error('Type de fichier non accepté : PDF, Word, Excel, PowerPoint, OpenOffice, texte, CSV, images ou ZIP.');
    err.status = 400;
    cb(err);
  },
});

/** Chemin absolu d'une pièce jointe enregistrée (« <conversation>/<fichier> »), ou null s'il sort du dossier. */
export function chatFilePath(rel) {
  if (!rel) return null;
  const abs = path.resolve(CHAT_DIR, rel);
  return abs.startsWith(CHAT_DIR + path.sep) ? abs : null;
}
