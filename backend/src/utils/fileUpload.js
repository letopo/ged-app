// backend/src/utils/fileUpload.js

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Assurer que le dossier d'upload existe
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration du stockage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Nettoyage du nom de fichier + Timestamp pour éviter les doublons
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    
    cb(null, `${basename}_${uniqueSuffix}${ext}`);
  }
});

// Filtre de fichiers (Optionnel - ici on accepte tout sauf exe)
const fileFilter = (req, file, cb) => {
  // Refuser les exécutables pour la sécurité
  if (file.mimetype === 'application/x-msdownload' || path.extname(file.originalname) === '.exe') {
    return cb(new Error('Les fichiers exécutables ne sont pas autorisés'), false);
  }
  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // Limite à 50MB
  },
  fileFilter: fileFilter
});

export default upload;