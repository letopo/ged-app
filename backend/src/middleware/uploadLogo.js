// backend/src/middleware/uploadLogo.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = 'uploads/branding';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`✅ Dossier de branding créé : ${uploadDir}`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.tenantId}-logo-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Le fichier doit être une image (png, jpg, svg, etc.) !'), false);
  }
};

const uploadLogoMiddleware = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
});

export default uploadLogoMiddleware;
