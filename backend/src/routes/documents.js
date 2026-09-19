// backend/src/routes/documents.js - VERSION CORRIGÉE

import express from 'express';
import { protect } from '../middleware/auth.js';
import upload, { fixUploadEncoding } from '../middleware/upload.js';
import {
  uploadDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  searchDocuments,
  addPageToDocument,
  getValidatedDemandesTravaux,
  archiveDocument,
  unarchiveDocument,
  getArchivedDocuments,
  getPieceDeCaisseHistory,
} from '../controllers/documentController.js';
import { Document, User, Workflow } from '../models/index.js';
import { Op } from 'sequelize'; // ✅ AJOUT IMPORTANT

const router = express.Router();

// ✅ NOUVELLE ROUTE : Récupérer les Demandes de Travaux validées
router.get('/demandes-travaux/validees', protect, getValidatedDemandesTravaux); 

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


// @route   GET /api/documents/next-numero?category=...
// @desc    Retourne le prochain numéro séquentiel pour une catégorie de document
// @access  Private
router.get('/next-numero', protect, async (req, res) => {
  try {
    const { category } = req.query;
    if (!category) return res.status(400).json({ success: false, message: 'Paramètre category requis.' });

    const prefixes = {
      'Ordre de mission': 'OM',
      'Pièce de caisse': 'PC',
    };
    const prefix = prefixes[category];
    if (!prefix) return res.status(400).json({ success: false, message: 'Catégorie non supportée.' });

    const year = new Date().getFullYear();
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear   = new Date(`${year}-12-31T23:59:59.999Z`);

    const count = await Document.count({
      where: {
        category,
        createdAt: { [Op.between]: [startOfYear, endOfYear] }
      }
    });

    const numero = `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`;
    res.json({ success: true, numero });
  } catch (error) {
    console.error('Erreur génération numéro:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// @route   GET /api/documents/archives
// @desc    Récupérer les documents archivés (groupés par catégorie)
// @access  Private
router.get('/archives', protect, getArchivedDocuments);

// @route   GET /api/documents/piece-de-caisse-history
// @desc    Historique des Pièces de caisse payées (rapport caissière), filtrable par date
// @access  Private (caissier/admin)
router.get('/piece-de-caisse-history', protect, getPieceDeCaisseHistory);

// @route   GET /api/documents/categories
// @desc    Retourne la liste distincte des catégories (léger, sans charger tous les docs)
// @access  Private
router.get('/categories', protect, async (req, res) => {
  try {
    const { QueryTypes } = await import('sequelize');
    const sequelize = (await import('../config/database.js')).default;
    const rows = await sequelize.query(
      `SELECT DISTINCT category FROM documents WHERE category IS NOT NULL AND archived = false ORDER BY category ASC`,
      { type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows.map(r => r.category) });
  } catch (err) {
    console.error('Erreur /categories:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   GET /api/documents/statistics
// @desc    Statistiques avancées sur les documents et workflows
// @access  Private (admin only)
router.get('/statistics', protect, async (req, res) => {
  try {
    if (!['admin','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs' });
    }

    const { period = '12' } = req.query; // nombre de mois
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(period));

    // 1. Documents par catégorie
    const byCategory = await Document.findAll({
      attributes: [
        'category',
        [Document.sequelize.fn('COUNT', Document.sequelize.col('Document.id')), 'count']
      ],
      where: { archived: { [Op.ne]: true } },
      group: ['category'],
      order: [[Document.sequelize.literal('count'), 'DESC']],
      raw: true,
    });

    // 2. Documents par statut
    const byStatus = await Document.findAll({
      attributes: [
        'status',
        [Document.sequelize.fn('COUNT', Document.sequelize.col('Document.id')), 'count']
      ],
      where: { archived: { [Op.ne]: true } },
      group: ['status'],
      raw: true,
    });

    // 3. Documents par mois (évolution)
    const byMonth = await Document.findAll({
      attributes: [
        [Document.sequelize.fn('DATE_TRUNC', 'month', Document.sequelize.col('Document.created_at')), 'month'],
        [Document.sequelize.fn('COUNT', Document.sequelize.col('Document.id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: monthsAgo }
      },
      group: [Document.sequelize.fn('DATE_TRUNC', 'month', Document.sequelize.col('Document.created_at'))],
      order: [[Document.sequelize.literal('month'), 'ASC']],
      raw: true,
    });

    // 4. Top uploaders
    const topUploaders = await Document.findAll({
      attributes: [
        [Document.sequelize.col('Document.user_id'), 'userId'],
        [Document.sequelize.fn('COUNT', Document.sequelize.col('Document.id')), 'count']
      ],
      include: [{
        model: User,
        as: 'uploadedBy',
        attributes: ['firstName', 'lastName', 'email'],
      }],
      group: ['Document.user_id', 'uploadedBy.id', 'uploadedBy.first_name', 'uploadedBy.last_name', 'uploadedBy.email'],
      order: [[Document.sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true,
      nest: true,
    });

    // 5. Workflows stats
    const workflowStats = await Workflow.findAll({
      attributes: [
        'status',
        [Workflow.sequelize.fn('COUNT', Workflow.sequelize.col('Workflow.id')), 'count']
      ],
      group: ['status'],
      raw: true,
    });

    // 6. Workflows par mois
    const workflowByMonth = await Workflow.findAll({
      attributes: [
        [Workflow.sequelize.fn('DATE_TRUNC', 'month', Workflow.sequelize.col('Workflow.created_at')), 'month'],
        'status',
        [Workflow.sequelize.fn('COUNT', Workflow.sequelize.col('Workflow.id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: monthsAgo }
      },
      group: [
        Workflow.sequelize.fn('DATE_TRUNC', 'month', Workflow.sequelize.col('Workflow.created_at')),
        'status'
      ],
      order: [[Workflow.sequelize.literal('month'), 'ASC']],
      raw: true,
    });

    // 7. Totaux
    const totalDocs = await Document.count({ where: { archived: { [Op.ne]: true } } });
    const totalArchived = await Document.count({ where: { archived: true } });
    const totalWorkflows = await Workflow.count();
    const pendingWorkflows = await Workflow.count({ where: { status: 'pending' } });

    res.json({
      success: true,
      data: {
        totals: { documents: totalDocs, archived: totalArchived, workflows: totalWorkflows, pending: pendingWorkflows },
        byCategory,
        byStatus,
        byMonth,
        topUploaders,
        workflowStats,
        workflowByMonth,
      }
    });
  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Appliquer la protection par token JWT à toutes les routes de ce fichier
router.use(protect);

// @route   POST /api/documents/upload
// @desc    Upload un nouveau document
// @access  Private
router.post('/upload', upload.single('file'), fixUploadEncoding, uploadDocument);

// ✅ NOUVELLE ROUTE : Ajouter une page (fusionner)
router.post('/:id/add-page', upload.single('file'), fixUploadEncoding, addPageToDocument);

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

// @route   PATCH /api/documents/:id/archive
// @desc    Archiver un document
// @access  Private
router.patch('/:id/archive', protect, archiveDocument);

// @route   PATCH /api/documents/:id/unarchive
// @desc    Désarchiver un document
// @access  Private
router.patch('/:id/unarchive', protect, unarchiveDocument);

export default router;