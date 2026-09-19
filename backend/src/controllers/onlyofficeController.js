// backend/src/controllers/onlyofficeController.js
// Intégration OnlyOffice Document Server

import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import { Document } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ONLYOFFICE_JWT_SECRET = process.env.ONLYOFFICE_JWT_SECRET || 'onlyoffice_jwt_secret_change_me';
const ONLYOFFICE_URL = process.env.ONLYOFFICE_URL || 'http://localhost:8080';
// URL que OnlyOffice utilise pour joindre le backend (depuis son propre conteneur Docker)
// En Docker : http://ged-backend:3000 | En local : http://localhost:3000
const BACKEND_ONLYOFFICE_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000';

// Extensions supportées par OnlyOffice
const ONLYOFFICE_EXTENSIONS = ['.docx', '.doc', '.odt', '.xlsx', '.xls', '.ods', '.pptx', '.ppt', '.odp'];

// Map extension → type OnlyOffice
const DOC_TYPE_MAP = {
  '.docx': 'word', '.doc': 'word', '.odt': 'word',
  '.xlsx': 'cell', '.xls': 'cell', '.ods': 'cell',
  '.pptx': 'slide', '.ppt': 'slide', '.odp': 'slide',
};

/**
 * GET /api/onlyoffice/config/:documentId
 * Retourne la config JSON + token JWT pour l'éditeur OnlyOffice
 */
export const getOnlyOfficeConfig = async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.user;

    // Récupérer le document
    const document = await Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document non trouvé' });
    }

    // Vérifier que c'est un fichier supporté
    const ext = path.extname(document.fileName).toLowerCase();
    if (!ONLYOFFICE_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ message: `Extension ${ext} non supportée par OnlyOffice` });
    }

    // Déterminer si l'utilisateur peut éditer
    // Peut éditer : propriétaire du document OU admin OU validateur dans le workflow
    const canEdit = document.userId === user.id || ['admin','superadmin'].includes(user.role);
    const editorMode = canEdit ? 'edit' : 'view';

    // URL que OnlyOffice utilise pour télécharger le fichier (réseau Docker interne en prod)
    // Le backend sert les uploads à /api/uploads/<filename>
    const fileUrl = `${BACKEND_ONLYOFFICE_URL}/api/uploads/${document.fileName}`;

    // URL du callback (OnlyOffice POST ici après sauvegarde — même réseau Docker)
    const callbackUrl = `${BACKEND_ONLYOFFICE_URL}/api/onlyoffice/callback/${documentId}`;

    // Config OnlyOffice
    const config = {
      document: {
        fileType: ext.replace('.', ''),
        key: `doc${documentId.replace(/-/g, '')}${Date.now()}`, // alphanumérique uniquement
        title: document.title || document.originalName || document.fileName,
        url: fileUrl,
        permissions: {
          comment: true,
          download: true,
          edit: canEdit,
          fillForms: canEdit,
          modifyFilter: canEdit,
          print: true,
          review: canEdit,
        },
      },
      documentType: DOC_TYPE_MAP[ext] || 'word',
      editorConfig: {
        callbackUrl,
        lang: 'fr',
        mode: editorMode,
        user: {
          id: user.id,
          name: `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email,
        },
        customization: {
          autosave: true,
          forcesave: false,
          compactToolbar: false,
          logo: {
            visible: false,
          },
        },
      },
    };

    // Signer la config avec le secret JWT OnlyOffice
    const token = jwt.sign(config, ONLYOFFICE_JWT_SECRET);

    return res.json({
      config,
      token,
      onlyofficeUrl: ONLYOFFICE_URL,
      docType: DOC_TYPE_MAP[ext] || 'word',
    });
  } catch (err) {
    console.error('[OnlyOffice] getConfig error:', err);
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

/**
 * POST /api/onlyoffice/callback/:documentId
 * Callback appelé par OnlyOffice après sauvegarde du document
 * Status 2 = document prêt à être sauvegardé
 * Status 6 = erreur
 */
export const onlyofficeCallback = async (req, res) => {
  try {
    const { documentId } = req.params;
    const body = req.body;

    console.log(`[OnlyOffice] Callback reçu pour ${documentId}:`, JSON.stringify(body));

    // Vérifier le token JWT dans le body ou le header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        jwt.verify(token, ONLYOFFICE_JWT_SECRET);
      } catch (e) {
        console.error('[OnlyOffice] Token JWT invalide:', e.message);
        return res.json({ error: 1 });
      }
    }

    // Status 2 = document modifié, prêt à être sauvegardé
    if (body.status === 2 || body.status === 6) {
      const downloadUrl = body.url;
      if (!downloadUrl) {
        console.error('[OnlyOffice] Pas d\'URL de téléchargement dans le callback');
        return res.json({ error: 0 }); // On dit OK quand même pour éviter les boucles
      }

      // Récupérer le document en base
      const document = await Document.findByPk(documentId);
      if (!document) {
        console.error(`[OnlyOffice] Document ${documentId} non trouvé`);
        return res.json({ error: 0 });
      }

      // Chemin du fichier sur le disque (UPLOAD_DIR = /app/uploads en Docker)
      const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
      const filePath = path.join(uploadsDir, document.fileName);

      // Télécharger le fichier depuis OnlyOffice et l'écraser
      await downloadFile(downloadUrl, filePath);

      console.log(`[OnlyOffice] Document ${documentId} sauvegardé avec succès → ${filePath}`);

      // Mettre à jour la taille du fichier en base
      const stats = fs.statSync(filePath);
      await document.update({ fileSize: stats.size });
    }

    // OnlyOffice attend {"error": 0} pour confirmer la réception
    return res.json({ error: 0 });
  } catch (err) {
    console.error('[OnlyOffice] Callback error:', err);
    return res.json({ error: 1 });
  }
};

/**
 * Télécharge un fichier depuis une URL et l'écrit sur le disque
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);

    proto.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        reject(new Error(`Téléchargement échoué: HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {}); // Nettoyer le fichier partiel
      reject(err);
    });
  });
}
