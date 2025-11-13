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

/**
 * @route   GET /api/documents/valides-pour-pc
 * @desc    Récupérer tous les documents validés pour créer une Pièce de Caisse
 * @access  Private (Comptable uniquement)
 */
router.get(
  '/valides-pour-pc',
  protect,
  async (req, res) => {
    try {
      console.log('📋 Requête pour récupérer les documents validés pour PC');
      console.log('👤 Utilisateur:', req.user.email, '- Rôle:', req.user.role);

      // ✅ MODIFIÉ : Récupérer les documents où le comptable a une tâche (pending OU approved)
      const documents = await Document.findAll({
        include: [
          {
            model: User,
            as: 'uploadedBy',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: Workflow,
            as: 'workflows',
            where: {
              validatorId: req.user.id,
              status: ['pending', 'approved'] // ✅ Inclure pending ET approved
            },
            required: true
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Filtrer pour ne garder que les documents en PDF
      const pdfDocuments = documents.filter(doc => doc.fileType === 'application/pdf');

      console.log(`✅ ${pdfDocuments.length} documents trouvés (PDF uniquement)`);
      pdfDocuments.forEach(doc => {
        const workflow = doc.workflows[0];
        console.log(`   - ${doc.title} | Category: ${doc.category} | Workflow: ${workflow?.status || 'N/A'} | Créé par: ${doc.uploadedBy?.firstName || 'Inconnu'} ${doc.uploadedBy?.lastName || ''}`);
      });

      res.json({
        success: true,
        data: pdfDocuments
      });

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des documents validés:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des documents validés.'
      });
    }
  }
);


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