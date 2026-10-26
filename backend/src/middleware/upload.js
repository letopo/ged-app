// backend/src/middleware/upload.js - VERSION 100% COMPLÈTE ET CORRIGÉE
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getTenantSettings, UPLOAD_CEILING_MB } from '../utils/tenantSettings.js';

// Déterminer le chemin du dossier racine du projet backend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Le dossier 'uploads' sera créé à la racine du dossier 'backend'
const uploadDir = path.join(__dirname, '../../uploads');

// Créer le dossier 'uploads' s'il n'existe pas
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Types acceptés : extension → types MIME annoncés possibles. L'extension ET
// le type doivent correspondre ; l'extension stockée est celle de cette liste
// (jamais celle du client telle quelle) : un fichier actif (HTML, SVG, JS…) ne
// peut pas être déposé puis servi par /api/uploads.
const ALLOWED_TYPES = {
  '.pdf': ['application/pdf', 'application/x-pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.jpg': ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  '.jpeg': ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  '.png': ['image/png'],
  // Réponses de formulaire (FormFill) : petit marqueur JSON, jamais exécuté
  '.form': ['application/x-form-response'],
};
const allowedExtension = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  return ALLOWED_TYPES[ext]?.includes(String(file.mimetype || '').toLowerCase()) ? (ext === '.jpeg' ? '.jpg' : ext) : null;
};

// Configuration du stockage avec Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Le dossier où sauvegarder physiquement les fichiers
  },
  filename: (req, file, cb) => {
    // Nom unique et non prévisible, extension fixée par le serveur
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${allowedExtension(file)}`);
  },
});

// Filtre pour n'accepter que certains types de fichiers
const fileFilter = (req, file, cb) => {
  if (allowedExtension(file)) return cb(null, true);
  const err = new Error('Seuls les fichiers PDF, Word et images (JPEG, PNG) sont autorisés.');
  err.status = 400;
  cb(err);
};

// Création de l'instance multer à exporter et utiliser dans les routes
const upload = multer({
  storage: storage,
  // Plafond technique ; la limite réelle du tenant (Paramètres › Délais et
  // session) est vérifiée ensuite par fixUploadEncoding.
  limits: { fileSize: UPLOAD_CEILING_MB * 1024 * 1024 },
  fileFilter: fileFilter,
});

// busboy (utilisé par multer en interne) décode le paramètre `filename` du
// header Content-Disposition en latin1, pas en UTF-8 — un nom de fichier
// accentué envoyé par le navigateur (ex: "Réunion médicale.pdf") arrive donc
// corrompu ("RÃ©union mÃ©dicale.pdf") dans `file.originalname`. On le
// redécode correctement juste après multer, avant que le contrôleur ne s'en
// serve (ex: documents.original_name). Voir memory encoding-mojibake-fix.
//
// Vérifie aussi la taille maximale réglée pour le tenant : un fichier trop gros
// est supprimé du disque et l'envoi refusé (413) avant d'atteindre le contrôleur.
export const fixUploadEncoding = async (req, res, next) => {
  const files = req.file ? [req.file]
    : Array.isArray(req.files) ? req.files
    : req.files && typeof req.files === 'object' ? Object.values(req.files).flat()
    : [];
  for (const f of files) {
    if (f?.originalname) f.originalname = Buffer.from(f.originalname, 'latin1').toString('utf8');
  }
  if (files.length) {
    const { maxUploadMb } = await getTenantSettings(req.tenantId);
    const tooBig = files.find(f => f.size > maxUploadMb * 1024 * 1024);
    if (tooBig) {
      files.forEach(f => { if (f.path) fs.promises.unlink(f.path).catch(() => {}); });
      return res.status(413).json({
        success: false,
        message: `Le fichier « ${tooBig.originalname} » dépasse la taille maximale autorisée (${maxUploadMb} Mo).`,
      });
    }
  }
  next();
};

export default upload;