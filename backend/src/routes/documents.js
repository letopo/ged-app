// backend/src/routes/documents.js - VERSION CORRIGÉE

import express from 'express';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  uploadDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  searchDocuments
} from '../controllers/documentController.js';
import { Document, User, Workflow } from '../models/index.js';
import { Op } from 'sequelize'; // ✅ AJOUT IMPORTANT

const router = express.Router();

// ✅ NOUVELLE ROUTE : Récupérer les Ordres de Mission validés (accessible à tous les validateurs)
// ⚠️ CHANGÉ : authenticateToken → protect
router.get('/ordres-mission/valides', protect, async (req, res) => {
  try {
    console.log('📋 Requête pour récupérer les Ordres de Mission validés');
    console.log('👤 Utilisateur:', req.user.email, '- Rôle:', req.user.role);

    const documents = await Document.findAll({
      where: {
        category: 'Ordre de mission',
        status: {
          [Op.in]: ['pending_validation', 'in_progress', 'approved']
        }
      },
      include: [
        { 
          model: User, 
          as: 'uploadedBy', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        {
          model: Workflow,
          as: 'workflows',
          include: [
            { 
              model: User, 
              as: 'validator', 
              attributes: ['id', 'firstName', 'lastName', 'email'] 
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ ${documents.length} Ordres de Mission trouvés`);
    documents.forEach(doc => {
      console.log(`   - ${doc.title} | Status: ${doc.status} | Créé par: ${doc.uploadedBy?.firstName} ${doc.uploadedBy?.lastName}`);
    });

    res.json({ 
      success: true, 
      data: documents 
    });
  } catch (error) {
    console.error('❌ Erreur récupération OM validés:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la récupération des Ordres de Mission' 
    });
  }
});

// Appliquer la protection par token JWT à toutes les routes de ce fichier
router.use(protect);

// @route   POST /api/documents/upload
// @desc    Upload un nouveau document
// @access  Private
router.post('/upload', upload.single('file'), uploadDocument);

// @route   GET /api/documents
// @desc    Récupérer tous les documents
// @access  Private
router.get('/', getDocuments);

// @route   GET /api/documents/search
// @desc    Rechercher des documents
// @access  Private
router.get('/search', searchDocuments);

// Routes pour un document spécifique par son ID
router.route('/:id')
  .get(getDocument)
  .put(updateDocument)
  .delete(deleteDocument);

// @route   GET /api/documents/:id/download
// @desc    Télécharger un document
// @access  Private
router.get('/:id/download', downloadDocument);

export default router;