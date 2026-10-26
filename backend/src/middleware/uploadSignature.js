// backend/src/middleware/uploadSignature.js
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Définit le dossier de destination pour les signatures et cachets
const uploadDir = 'uploads/signatures';

// Crée le dossier de manière récursive s'il n'existe pas
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`✅ Dossier de signatures créé : ${uploadDir}`);
}

// Configuration du stockage avec Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Le dossier où sauvegarder les fichiers
  },
  filename: (req, file, cb) => {
    // Format : <id utilisateur>-<type>-<horodatage>-<aléa>.png|jpg ; l'identifiant
    // de l'URL n'est repris que s'il a la forme d'un UUID (aucun chemin possible)
    const type = req.path.includes('signature') ? 'signature' : 'stamp';
    const id = /^[0-9a-f-]{36}$/i.test(req.params.id || '') ? req.params.id : 'inconnu';
    cb(null, `${id}-${type}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${IMAGE_TYPES[file.mimetype]}`);
  }
});

// Signatures et cachets : PNG ou JPEG uniquement (incrustés dans les PDF)
const IMAGE_TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg' };
const fileFilter = (req, file, cb) => {
  if (IMAGE_TYPES[file.mimetype] && /^[0-9a-f-]{36}$/i.test(req.params.id || '')) {
    cb(null, true);
  } else {
    const err = new Error('Le fichier doit être une image PNG ou JPEG.');
    err.status = 400;
    cb(err, false);
  }
};

// Création de l'instance Multer avec la configuration
const uploadSignatureMiddleware = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo : cachets PNG haute résolution (~2000 px, fond transparent)
  fileFilter: fileFilter
});

export default uploadSignatureMiddleware;