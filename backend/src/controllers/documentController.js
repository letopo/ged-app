// backend/src/controllers/documentController.js - VERSION FINALE AVEC GESTION FACTURES AUTOMATIQUE

import { Op } from 'sequelize';

import { getPosteHolders, userHasPoste } from '../utils/posteResolver.js';

// Documents générés par le RH : visibles uniquement par l'admin
const canViewHRDocuments = (user) => user.role === 'admin';

// Catégories réservées RH : visibles uniquement par les titulaires du poste RH + admins
const HR_ONLY_CATEGORIES = ['Attestation de départ en congé annuel'];
const canViewHRCategory = async (user) => user.role === 'admin' || await userHasPoste(user.id, 'rh');

// Retourne les userId des titulaires du poste RH (documents restreints)
const getHRUserIds = async () => (await getPosteHolders('rh')).map(u => u.id);
import { Document, User, Workflow, InvoiceFolder } from '../models/index.js'; // ✅ AJOUT IMPORT InvoiceFolder
import fs from 'fs/promises';
import path from 'path';
import { mergePDFs, validatePDF } from '../utils/pdfMerger.js';

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni.' });
    }
    
    // Accepter linkedOrdreMissionId OU linkedDocumentId
    const linkedDocId = req.body.linkedOrdreMissionId || req.body.linkedDocumentId;
    
    const { title, category, dateDebut, dateFin, nomsDemandeur, metadata } = req.body;
    const { filename, originalname, size, mimetype } = req.file;

    let finalFilePath = `uploads/${filename}`;
    let finalFileName = filename;
    let finalSize = size;

    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (err) {
        console.warn('Metadata invalide, ignoré:', err.message);
        parsedMetadata = {};
      }
    }
    
    console.log('📥 Données reçues du frontend:');
    console.log('   Body:', req.body);
    console.log('   linkedDocumentId (unifié):', linkedDocId);
    console.log('   category:', category);
    console.log('📦 Metadata reçu et parsé:', parsedMetadata);

    // ==================================================================================
    // 1. LOGIQUE GÉNÉRALISÉE : Fusion pour toute Pièce de Caisse avec document lié
    // ==================================================================================
    if (category === 'Pièce de caisse' && linkedDocId && mimetype === 'application/pdf') {
      try {
        console.log('🔗 Pièce de Caisse liée à un document détectée');
        console.log('   Document lié ID:', linkedDocId);

        // Récupérer le document lié (n'importe quel type)
        const linkedDocument = await Document.findByPk(linkedDocId);
        
        if (!linkedDocument) {
          console.warn('⚠️ Document lié introuvable:', linkedDocId);
          throw new Error('Document lié introuvable');
        }

        // Vérifier que le document lié est en PDF
        if (linkedDocument.fileType !== 'application/pdf') {
          console.warn('⚠️ Le document lié n\'est pas au format PDF');
          throw new Error('Le document lié doit être au format PDF pour être fusionné');
        }

        const linkedDocPath = path.resolve(process.cwd(), linkedDocument.filePath);
        const pcPath = path.resolve(process.cwd(), finalFilePath);

        // Valider les deux PDFs
        const linkedDocValid = await validatePDF(linkedDocPath);
        const pcValid = await validatePDF(pcPath);

        if (!linkedDocValid || !pcValid) {
          throw new Error('Un des PDFs est invalide ou inaccessible');
        }

        console.log('✅ Validation des PDFs réussie, début de la fusion...');

        // Fusionner les PDFs (Document justificatif en premier, PC en second)
        const mergedPdfBytes = await mergePDFs(linkedDocPath, pcPath);

        // Sauvegarder le PDF fusionné
        const mergedFileName = `PC_${linkedDocument.category.replace(/\s/g, '_')}_fusionné_${Date.now()}.pdf`;
        const mergedFilePath = path.resolve(process.cwd(), `uploads/${mergedFileName}`);
        await fs.writeFile(mergedFilePath, mergedPdfBytes);

        // Supprimer le PDF de la Pièce de Caisse seule (on garde le document original)
        try {
          await fs.unlink(pcPath);
          console.log('🗑️ PDF original de la PC supprimé');
        } catch (unlinkError) {
          console.warn('⚠️ Impossible de supprimer le PDF original de la PC:', unlinkError.message);
        }

        // Mettre à jour les infos du fichier
        finalFilePath = `uploads/${mergedFileName}`;
        finalFileName = mergedFileName;
        finalSize = mergedPdfBytes.length;

        // Ajouter l'info de fusion dans les métadonnées
        parsedMetadata.fusionné = true;
        parsedMetadata.linkedDocumentId = linkedDocId;
        parsedMetadata.linkedDocumentTitle = linkedDocument.title;
        parsedMetadata.linkedDocumentCategory = linkedDocument.category;
        parsedMetadata.fusionDate = new Date().toISOString();

        console.log('✅ Fusion réussie! Nouveau fichier:', mergedFileName);

      } catch (fusionError) {
        console.error('❌ Erreur lors de la fusion des PDFs:', fusionError);
        parsedMetadata.fusionError = fusionError.message;
        parsedMetadata.fusionAttempted = true;
      }
    }

    // ==================================================================================
    // 2. LOGIQUE AUTOMATIQUE FACTURES : Assignation à la Boîte de réception
    // ==================================================================================
    let invoiceFolderId = null;
    if (category === 'Factures') {
      try {
        // Chercher le dossier de type 'inbox'
        const inbox = await InvoiceFolder.findOne({ where: { type: 'inbox' } });
        if (inbox) {
          invoiceFolderId = inbox.id;
          console.log(`📂 Document assigné au dossier facture : ${inbox.name} (ID: ${inbox.id})`);
        } else {
            console.warn("⚠️ Aucun dossier 'inbox' trouvé pour les factures.");
        }
      } catch (err) {
        console.error("❌ Erreur lors de la recherche du dossier inbox:", err);
      }
    }

    const documentData = {
      title: title || `Document - ${parsedMetadata.service || 'Inconnu'}`,
      fileName: finalFileName,
      originalName: originalname,
      filePath: finalFilePath,
      fileSize: finalSize,
      fileType: mimetype,
      userId: req.user.id,
      category: category || parsedMetadata.type || null,
      linkedDocumentId: linkedDocId || null,
      metadata: parsedMetadata,
      status: 'draft',
      dateDebut: dateDebut ? new Date(dateDebut) : null,
      dateFin: dateFin ? new Date(dateFin) : null,
      invoiceFolderId: invoiceFolderId // ✅ Ajout du champ pour lier au dossier
    };

    const newDocument = await Document.create(documentData);
    
    const resultWithUser = await Document.findByPk(newDocument.id, {
        include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] }]
    });
    
    // Audit upload
    const { AuditLog } = await import('../models/index.js');
    AuditLog.log(req, 'UPLOAD', 'document', newDocument.id, { title: newDocument.title, category: newDocument.category });

    res.status(201).json({
      success: true,
      data: resultWithUser,
      message: parsedMetadata.fusionné
        ? '✅ Document uploadé et fusionné avec la pièce justificative avec succès.'
        : 'Document uploadé avec succès.'
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'upload du document:', error);
    if (req.file) {
      try { 
        // Vérifier si le fichier existe avant de tenter de le supprimer
        const filePathToCheck = req.file.path;
        await fs.access(filePathToCheck);
        await fs.unlink(filePathToCheck); 
      } catch (err) { 
        // Ignorer l'erreur si le fichier n'existe déjà plus ou a été renommé
        // console.error("Info suppression fichier échouée (peut-être déjà renommé/supprimé):", err.message); 
      }
    }
    res.status(500).json({ success: false, message: 'Erreur serveur lors de l\'upload.' });
  }
};

export const getDocuments = async (req, res) => {
  try {
    const { page, limit, search, status, category, dateFrom, dateTo } = req.query;
    const whereClause = { archived: false };
    const userRole = req.user.role;
    const userId = req.user.id;
    if (userRole !== 'admin' && userRole !== 'director') {
      whereClause.userId = userId;
    } else if (!canViewHRDocuments(req.user)) {
      const hrUserIds = await getHRUserIds();
      if (hrUserIds.length) {
        whereClause.userId = { [Op.notIn]: hrUserIds };
      }
    }
    if (!(await canViewHRCategory(req.user))) {
      whereClause.category = { [Op.notIn]: HR_ONLY_CATEGORIES };
    }

    // Filtres optionnels
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { originalName: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    if (category && category !== 'all') {
      // Fusionner avec le filtre HR existant si présent
      if (whereClause.category && whereClause.category[Op.notIn]) {
        whereClause[Op.and] = [
          { category },
          { category: { [Op.notIn]: HR_ONLY_CATEGORIES } },
        ];
        delete whereClause.category;
      } else {
        whereClause.category = category;
      }
    }
    if (dateFrom) {
      whereClause.createdAt = { ...(whereClause.createdAt || {}), [Op.gte]: new Date(dateFrom) };
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      whereClause.createdAt = { ...(whereClause.createdAt || {}), [Op.lte]: endDate };
    }

    // Pagination (optionnelle — si pas de page/limit, retourne tout)
    const queryOptions = {
      where: whereClause,
      // distinct: indispensable, sinon findAndCountAll compte les lignes jointes
      // par l'include hasMany 'workflows' (1 par workflow) → total surévalué.
      distinct: true,
      include: [
        { model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] },
        {
          model: Workflow,
          as: 'workflows',
          include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName'] }]
        }
      ],
      order: [['createdAt', 'DESC']],
    };

    if (page && limit) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      queryOptions.limit = limitNum;
      queryOptions.offset = (pageNum - 1) * limitNum;

      const { count, rows } = await Document.findAndCountAll(queryOptions);
      return res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum),
        },
      });
    }

    // Sans pagination : retourne tout (compatibilité)
    const documents = await Document.findAll(queryOptions);
    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('❌ Erreur récupération documents:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

export const getDocument = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id, { 
        include: [
            { model: User, as: 'uploadedBy' },
            {
              model: Workflow,
              as: 'workflows',
              include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName'] }]
            }
        ] 
    });
    if (!document) return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    if (req.user.role !== 'admin' && req.user.role !== 'director' && document.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }
    // Bloquer l'accès aux documents RH pour les non-autorisés
    const hrUserIds = await getHRUserIds();
    if (hrUserIds.includes(document.userId) && !canViewHRDocuments(req.user) && document.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }
    // Bloquer l'accès aux catégories RH-only pour les non-autorisés
    if (HR_ONLY_CATEGORIES.includes(document.category) && !(await canViewHRCategory(req.user))) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }
    res.json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

export const updateDocument = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    if (req.user.role !== 'admin' && document.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }
    await document.update(req.body);
    const updatedDocument = await Document.findByPk(req.params.id, { include: [{ model: User, as: 'uploadedBy' }] });
    res.json({ success: true, data: updatedDocument, message: 'Document mis à jour.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "ID du document manquant." });
    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    if (req.user.role !== 'admin' && document.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }
    const fullPath = path.resolve(process.cwd(), document.filePath);
    try { await fs.unlink(fullPath); } catch(err) { console.warn("Fichier physique déjà supprimé ou introuvable:", err.message); }
    await Workflow.destroy({ where: { documentId: id } });
    const docTitle = document.title;
    await document.destroy();
    // Audit delete
    const { AuditLog } = await import('../models/index.js');
    AuditLog.log(req, 'DELETE', 'document', id, { title: docTitle });
    res.json({ success: true, message: 'Document supprimé.' });
  } catch (error) {
    next(error);
  }
};

export const searchDocuments = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Terme de recherche requis' });
    try {
        const where = { [Op.or]: [ { title: { [Op.iLike]: `%${q}%` } }, { originalName: { [Op.iLike]: `%${q}%` } } ] };
        if (req.user.role !== 'admin' && req.user.role !== 'director') {
          where.userId = req.user.id;
        } else if (!canViewHRDocuments(req.user)) {
          const hrUserIds = await getHRUserIds();
          if (hrUserIds.length) where.userId = { [Op.notIn]: hrUserIds };
        }
        if (!(await canViewHRCategory(req.user))) {
          where.category = { [Op.notIn]: HR_ONLY_CATEGORIES };
        }
        const documents = await Document.findAll({ where, limit: 50, include: [{ model: User, as: 'uploadedBy' }], });
        res.json({ success: true, data: documents });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur recherche' });
    }
};

export const downloadDocument = async (req, res) => {
    try {
        const document = await Document.findByPk(req.params.id);
        if (!document) return res.status(404).json({ success: false, message: 'Document non trouvé.' });
        if (req.user.role !== 'admin' && req.user.role !== 'director' && document.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
        }
        // Bloquer le téléchargement des documents RH pour les non-autorisés
        const hrUserIds = await getHRUserIds();
        if (hrUserIds.includes(document.userId) && !canViewHRDocuments(req.user) && document.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
        }
        const filePath = path.resolve(process.cwd(), document.filePath);
        try {
          await fs.access(filePath);
          // Utiliser le titre du document comme nom de fichier téléchargé
          const ext = path.extname(document.fileName || document.originalName || '.pdf') || '.pdf';
          const safeName = (document.title || document.originalName || 'document')
            .replace(/[/\\?%*:|"<>]/g, '-') // caractères interdits dans les noms de fichiers
            .trim();
          res.download(filePath, `${safeName}${ext}`);
        }
        catch { res.status(404).send('Fichier introuvable sur le serveur.'); }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

export const addPageToDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { position } = req.body; // 'before' ou 'after'
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni.' });
    }

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document original non trouvé.' });
    }

    // Vérification basique des types (PDF uniquement pour la fusion propre)
    if (document.fileType !== 'application/pdf' || req.file.mimetype !== 'application/pdf') {
      // Nettoyer le fichier uploadé
      await fs.unlink(req.file.path);
      return res.status(400).json({ success: false, message: 'La fusion nécessite deux fichiers PDF.' });
    }

    const originalPath = path.resolve(process.cwd(), document.filePath);
    const newPagePath = path.resolve(process.cwd(), req.file.path);

    console.log(`🔄 Fusion demandée : ${position} le document ${document.id}`);

    // Déterminer l'ordre de fusion
    let mergedPdfBytes;
    if (position === 'before') {
      // Nouveau fichier + Ancien fichier
      mergedPdfBytes = await mergePDFs(newPagePath, originalPath);
    } else {
      // Ancien fichier + Nouveau fichier
      mergedPdfBytes = await mergePDFs(originalPath, newPagePath);
    }

    // Écraser l'ancien fichier avec le nouveau contenu fusionné
    await fs.writeFile(originalPath, mergedPdfBytes);

    // Supprimer le fichier temporaire uploadé
    await fs.unlink(newPagePath);

    // Mettre à jour la taille du fichier en base de données
    const stats = await fs.stat(originalPath);
    await document.update({ 
      fileSize: stats.size,
      updatedAt: new Date() // Forcer la mise à jour de la date
    });

    res.json({ success: true, message: 'Page ajoutée avec succès.' });

  } catch (error) {
    console.error('❌ Erreur fusion document:', error);
    if (req.file) {
      try { await fs.unlink(req.file.path); } catch (e) {}
    }
    res.status(500).json({ success: false, message: 'Erreur lors de la fusion.' });
  }
};

// ============================================================
// ARCHIVE
// ============================================================

export const archiveDocument = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    // Vérifier que l'utilisateur a le droit (propriétaire ou admin/director)
    if (document.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'director') {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    await document.update({ archived: true });
    res.json({ success: true, message: 'Document archivé avec succès.' });
  } catch (error) {
    console.error('Erreur archivage:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

export const unarchiveDocument = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    if (document.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'director') {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    await document.update({ archived: false });
    res.json({ success: true, message: 'Document désarchivé avec succès.' });
  } catch (error) {
    console.error('Erreur désarchivage:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

export const getArchivedDocuments = async (req, res) => {
  try {
    const whereClause = { archived: true };
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole !== 'admin' && userRole !== 'director') {
      whereClause.userId = userId;
    } else if (!canViewHRDocuments(req.user)) {
      const hrUserIds = await getHRUserIds();
      if (hrUserIds.length) {
        whereClause.userId = { [Op.notIn]: hrUserIds };
      }
    }
    // Exclure les catégories RH pour les utilisateurs non-autorisés
    if (!(await canViewHRCategory(req.user))) {
      whereClause.category = { [Op.notIn]: HR_ONLY_CATEGORIES };
    }

    const documents = await Document.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] },
        {
          model: Workflow,
          as: 'workflows',
          include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName'] }]
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    // Grouper par catégorie
    const grouped = documents.reduce((acc, doc) => {
      const cat = doc.category || 'Autres';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    }, {});

    res.json({ success: true, data: grouped, total: documents.length });
  } catch (error) {
    console.error('Erreur récupération archives:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ============================================
// ✅ NOUVEAU : Récupérer les Demandes de Travaux validées
// ============================================
export const getValidatedDemandesTravaux = async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: {
        category: 'Demande de travaux',
        status: {
          [Op.in]: ['pending_validation', 'in_progress', 'approved'] // Les DT en cours ou validées
        }
      },
      include: [
        { 
          model: User, 
          as: 'uploadedBy', 
          attributes: ['id', 'firstName', 'lastName'] 
        },
        // Inutile d'inclure le workflow ici, mais pas bloquant
      ],
      attributes: ['id', 'title', 'createdAt', 'filePath', 'metadata'], // On ne récupère que les champs nécessaires
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('❌ Erreur récupération Demandes de Travaux validées:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la récupération des DT validées.' });
  }
};