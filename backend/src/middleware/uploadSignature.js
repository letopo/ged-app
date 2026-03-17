// backend/src/middleware/uploadSignature.js
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
    // Crée un nom de fichier unique pour éviter les conflits
    // Format: userID-type-timestamp.extension (ex: uuid-signature-1678886400000.png)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const type = req.path.includes('signature') ? 'signature' : 'stamp';
    cb(null, `${req.params.id}-${type}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Filtre pour n'accepter que les fichiers de type image
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Le fichier doit être une image (png, jpg, etc.) !'), false);
  }
};

// Création de l'instance Multer avec la configuration
const uploadSignatureMiddleware = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Limite la taille des fichiers à 2MB
  fileFilter: fileFilter
});

export default uploadSignatureMiddleware;