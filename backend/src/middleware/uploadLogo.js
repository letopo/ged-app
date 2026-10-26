// backend/src/middleware/uploadLogo.js
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = 'uploads/branding';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`✅ Dossier de branding créé : ${uploadDir}`);
}

// Logos : affichés en <img> (un SVG n'y exécute aucun script) ; /api/uploads
// sert de toute façon les fichiers actifs en téléchargement isolé.
const LOGO_TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/webp': '.webp', 'image/svg+xml': '.svg' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `${req.tenantId}-logo-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${LOGO_TYPES[file.mimetype]}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (LOGO_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    const err = new Error('Le logo doit être une image PNG, JPEG, WebP ou SVG.');
    err.status = 400;
    cb(err, false);
  }
};

const uploadLogoMiddleware = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
});

export default uploadLogoMiddleware;
