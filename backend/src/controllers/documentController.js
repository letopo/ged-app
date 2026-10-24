// backend/src/controllers/documentController.js - VERSION FINALE AVEC GESTION FACTURES AUTOMATIQUE

import { Op } from 'sequelize';

import {
  buildCategoryRestrictionWhere,
  buildDocumentAccessWhere,
  hasDocumentReadAccess,
  resolveUploaderServiceId,
} from '../utils/documentVisibility.js';
import { Document, User, Workflow, InvoiceFolder, TemplatePermission } from '../models/index.js'; // ✅ AJOUT IMPORT InvoiceFolder
import fs from 'fs/promises';
import path from 'path';
import { mergePDFs, validatePDF } from '../utils/pdfMerger.js';
import { isManuallySigned } from './manualSignatureController.js';
import { getThumbnail, deleteThumbnails } from '../utils/thumbnails.js';

// Première date de début autorisée pour une demande de permission : J+2 (heure du Cameroun)
export const PERMISSION_NOTICE_DAYS = 2;
function permissionEarliestStart() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Douala' }); // AAAA-MM-JJ
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + PERMISSION_NOTICE_DAYS);
  return d.toISOString().slice(0, 10);
}

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni.' });
    }
    
    // Accepter linkedOrdreMissionId OU linkedDocumentId
    const linkedDocId = req.body.linkedOrdreMissionId || req.body.linkedDocumentId;
    
    const { title, category, dateDebut, dateFin, nomsDemandeur, metadata, visibility } = req.body;
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

    // Demande de permission : au moins 2 jours à l'avance (48 h), sauf administrateurs
    if ((category || parsedMetadata.type) === 'Demande de permission' && !['admin', 'superadmin'].includes(req.user.role)) {
      const starts = [
        ...(Array.isArray(parsedMetadata.periods) ? parsedMetadata.periods.map(p => p?.startDate) : []),
        dateDebut,
      ].filter(d => /^\d{4}-\d{2}-\d{2}/.test(String(d || ''))).map(d => String(d).slice(0, 10)).sort();
      const earliestAllowed = permissionEarliestStart();
      if (starts.length && starts[0] < earliestAllowed) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          success: false,
          message: `Une permission se demande au moins 48 h à l'avance : première date possible le ${earliestAllowed.split('-').reverse().join('/')}.`,
        });
      }
    }
    
    console.log('📥 Données reçues du frontend:');
    console.log('   Body:', req.body);
    console.log('   linkedDocumentId (unifié):', linkedDocId);
    console.log('   category:', category);
    console.log('📦 Metadata reçu et parsé:', parsedMetadata);

    // ==================================================================================
    // 0. DOCUMENT LIÉ : il faut pouvoir le lire pour s'y rattacher (et le joindre)
    // ==================================================================================
    if (linkedDocId) {
      const linkedForAccess = await Document.findByPk(linkedDocId);
      if (!linkedForAccess || !(await hasDocumentReadAccess(linkedForAccess, req.user))) {
        await fs.unlink(path.resolve(process.cwd(), finalFilePath)).catch(() => {});
        return res.status(403).json({ success: false, message: 'Document lié introuvable ou non autorisé.' });
      }
      // Référence toujours conservée, fusion ou non (affichage de la chaîne documentaire)
      parsedMetadata.linkedDocumentId = linkedDocId;
      parsedMetadata.linkedDocumentTitle = linkedForAccess.title;
      parsedMetadata.linkedDocumentCategory = linkedForAccess.category;
    }

    // ==================================================================================
    // 1. LIASSE : le document lié est placé en tête du nouveau PDF (pièce justificative).
    //    Toujours pour une Pièce de caisse ; pour les autres types si mergeLinked=true
    //    (« Créer un document lié » depuis la visionneuse). Le nouveau document reste
    //    en dernières pages : c'est là que les signatures du circuit sont apposées.
    // ==================================================================================
    const shouldMergeLinked = category === 'Pièce de caisse' || req.body.mergeLinked === 'true';
    if (shouldMergeLinked && linkedDocId && mimetype === 'application/pdf') {
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
        const prefix = category === 'Pièce de caisse' ? 'PC' : 'LIASSE';
        const mergedFileName = `${prefix}_${(linkedDocument.category || 'document').replace(/\s/g, '_')}_fusionné_${Date.now()}.pdf`;
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

    // Visibilité : override explicite de l'uploader, sinon défaut de la catégorie, sinon personnel.
    const finalCategory = category || parsedMetadata.type || null;
    const templatePermission = finalCategory
      ? await TemplatePermission.findOne({ where: { templateName: finalCategory } })
      : null;
    let finalVisibility = visibility || templatePermission?.defaultVisibility || 'personal';
    let documentServiceId = null;
    if (finalVisibility === 'service') {
      documentServiceId = await resolveUploaderServiceId(req.user.id);
      // Pas de service actif → un document "service" sans service n'aurait pas de sens.
      if (!documentServiceId) finalVisibility = 'personal';
    }

    const documentData = {
      title: title || `Document - ${parsedMetadata.service || 'Inconnu'}`,
      fileName: finalFileName,
      originalName: originalname,
      filePath: finalFilePath,
      fileSize: finalSize,
      fileType: mimetype,
      userId: req.user.id,
      tenantId: req.tenantId,
      category: finalCategory,
      linkedDocumentId: linkedDocId || null,
      metadata: parsedMetadata,
      status: 'draft',
      dateDebut: dateDebut ? new Date(dateDebut) : null,
      dateFin: dateFin ? new Date(dateFin) : null,
      invoiceFolderId: invoiceFolderId,
      visibility: finalVisibility,
      serviceId: documentServiceId,
      // Texte reconnu sur le téléphone (OCR du scanner) : indexé pour la recherche
      extractedText: typeof req.body.extractedText === 'string' && req.body.extractedText.trim()
        ? req.body.extractedText.trim().slice(0, 200000)
        : null,
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
    const { page, limit, search, status, category, dateFrom, dateTo, fileType, excludeId, sort } = req.query;
    const whereClause = { archived: false };
    const andConditions = [];

    const accessWhere = await buildDocumentAccessWhere(req.user);
    if (accessWhere) andConditions.push(accessWhere);

    const categoryWhere = await buildCategoryRestrictionWhere(req.user);
    if (categoryWhere) andConditions.push(categoryWhere);

    // Filtres optionnels
    if (search) {
      andConditions.push({
        [Op.or]: [
          { title: { [Op.iLike]: `%${search}%` } },
          { originalName: { [Op.iLike]: `%${search}%` } },
          { extractedText: { [Op.iLike]: `%${search}%` } }, // contenu des documents scannés (OCR)
        ],
      });
    }
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    if (category && category !== 'all') {
      andConditions.push({ category });
    }
    // Sélecteur « Ajouter depuis la GED » : PDF seulement, sans le document ouvert
    if (fileType === 'pdf') {
      andConditions.push({ [Op.or]: [{ fileType: 'application/pdf' }, { fileName: { [Op.iLike]: '%.pdf' } }] });
    }
    if (excludeId) {
      andConditions.push({ id: { [Op.ne]: String(excludeId) } });
    }
    if (andConditions.length > 0) {
      whereClause[Op.and] = andConditions;
    }
    if (dateFrom) {
      whereClause.createdAt = { ...(whereClause.createdAt || {}), [Op.gte]: new Date(dateFrom) };
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      whereClause.createdAt = { ...(whereClause.createdAt || {}), [Op.lte]: endDate };
    }

    // Documents transmis à l'utilisateur : date de réception (dernier transfert vers
    // lui) et expéditeur. Le tri se fait sur la date la plus récente entre création
    // et réception : un document reçu aujourd'hui remonte en tête, même s'il a été
    // créé et signé il y a longtemps (sa date d'origine reste intacte pour l'archive).
    const me = Document.sequelize.escape(req.user.id);
    const receivedAtSql = `(SELECT MAX(dt.updated_at) FROM document_transmissions dt WHERE dt.document_id = "Document"."id" AND dt.to_user_id = ${me})`;
    const receivedFromSql = `(SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name)) FROM document_transmissions dt JOIN users u ON u.id = dt.from_user_id WHERE dt.document_id = "Document"."id" AND dt.to_user_id = ${me} ORDER BY dt.updated_at DESC LIMIT 1)`;
    const lastActivitySql = `GREATEST("Document"."created_at", COALESCE(${receivedAtSql}, "Document"."created_at"))`;

    // Pagination (optionnelle — si pas de page/limit, retourne tout)
    const queryOptions = {
      where: whereClause,
      attributes: {
        exclude: ['extractedText'], // texte OCR : sert à la recherche, inutile (et lourd) dans les listes
        include: [
          [Document.sequelize.literal(receivedAtSql), 'receivedAt'],
          [Document.sequelize.literal(receivedFromSql), 'receivedFrom'],
          [Document.sequelize.literal(lastActivitySql), 'lastActivityAt'],
        ],
      },
      // distinct: indispensable, sinon findAndCountAll compte les lignes jointes
      // par l'include hasMany 'workflows' (1 par workflow) → total surévalué.
      distinct: true,
      include: [
        { model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] },
        {
          model: Workflow,
          as: 'workflows',
          include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName', 'signaturePath', 'stampPath'] }]
        }
      ],
      // Tri sur l'alias (valable dans la sous-requête de pagination comme au-dessus)
      order: [[Document.sequelize.literal('"lastActivityAt"'), 'DESC'], ['createdAt', 'DESC']],
    };
    // Tri demandé (sinon : activité la plus récente, comportement historique)
    const SORTS = {
      date_desc: [['createdAt', 'DESC']],
      date_asc: [['createdAt', 'ASC']],
      title_asc: [['title', 'ASC'], ['createdAt', 'DESC']],
      title_desc: [['title', 'DESC'], ['createdAt', 'DESC']],
      category_asc: [['category', 'ASC'], ['createdAt', 'DESC']],
    };
    if (SORTS[sort]) queryOptions.order = SORTS[sort];

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
              include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName', 'signaturePath', 'stampPath'] }]
            }
        ] 
    });
    if (!document) return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    if (!(await hasDocumentReadAccess(document, req.user))) {
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
    if (!['admin','superadmin'].includes(req.user.role) && document.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }
    const changes = { ...req.body };
    // Document signé à la main : le fichier et la preuve de signature ne bougent plus
    if (isManuallySigned(document)) {
      ['filePath', 'fileName', 'fileType', 'fileSize'].forEach((k) => delete changes[k]);
      if (changes.metadata) changes.metadata = { ...changes.metadata, manualSignature: document.metadata.manualSignature };
    }
    await document.update(changes);
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
    if (!['admin','superadmin'].includes(req.user.role) && document.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }
    const fullPath = path.resolve(process.cwd(), document.filePath);
    try { await fs.unlink(fullPath); } catch(err) { console.warn("Fichier physique déjà supprimé ou introuvable:", err.message); }
    // Document signé à la main : supprimer aussi l'original non signé conservé
    deleteThumbnails(id);
    const originalPath = document.metadata?.manualSignature?.original?.filePath;
    if (originalPath) { try { await fs.unlink(path.resolve(process.cwd(), originalPath)); } catch { /* déjà absent */ } }
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
        const andConditions = [
          { [Op.or]: [ { title: { [Op.iLike]: `%${q}%` } }, { originalName: { [Op.iLike]: `%${q}%` } }, { extractedText: { [Op.iLike]: `%${q}%` } } ] },
        ];
        const accessWhere = await buildDocumentAccessWhere(req.user);
        if (accessWhere) andConditions.push(accessWhere);
        const searchCategoryWhere = await buildCategoryRestrictionWhere(req.user);
        if (searchCategoryWhere) andConditions.push(searchCategoryWhere);
        const documents = await Document.findAll({ where: { [Op.and]: andConditions }, attributes: { exclude: ['extractedText'] }, limit: 50, include: [{ model: User, as: 'uploadedBy' }], });
        res.json({ success: true, data: documents });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur recherche' });
    }
};

export const downloadDocument = async (req, res) => {
    try {
        const document = await Document.findByPk(req.params.id);
        if (!document) return res.status(404).json({ success: false, message: 'Document non trouvé.' });
        if (!(await hasDocumentReadAccess(document, req.user))) {
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

// GET /api/documents/visibility-context — service auquel un document « service »
// de cet utilisateur serait rattaché (null : pas de service actif → personnel seulement)
export const getVisibilityContext = async (req, res) => {
  try {
    const serviceId = await resolveUploaderServiceId(req.user.id);
    let serviceName = null;
    if (serviceId) {
      const { Service } = await import('../models/index.js');
      serviceName = (await Service.findByPk(serviceId, { attributes: ['name'] }))?.name || null;
    }
    res.json({ success: true, data: { serviceId, serviceName } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/documents/:id/thumbnail — miniature de la 1re page (vue Grille).
// 204 si le document n'en a pas (Word, formulaire…) : le client garde l'icône.
export const getDocumentThumbnail = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id, { attributes: ['id', 'filePath', 'fileName', 'fileType', 'userId', 'visibility', 'serviceId'] });
    if (!document) return res.status(404).end();
    if (!(await hasDocumentReadAccess(document, req.user))) return res.status(403).end();
    const thumb = await getThumbnail(document);
    if (!thumb) return res.status(204).end();
    res.set({ 'Cache-Control': 'private, max-age=86400', ETag: `"${thumb.etag}"` });
    if (req.headers['if-none-match'] === `"${thumb.etag}"`) return res.status(304).end();
    res.type('image/jpeg').sendFile(thumb.path);
  } catch (error) {
    console.error('Erreur miniature:', error);
    res.status(500).end();
  }
};

export const addPageToDocument = async (req, res) => {
  const cleanupUpload = () => (req.file ? fs.unlink(req.file.path).catch(() => {}) : Promise.resolve());
  try {
    const { id } = req.params;
    const { position, sourceDocumentId } = req.body; // 'before' ou 'after' ; source = fichier envoyé OU document de la GED

    if (!req.file && !sourceDocumentId) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni.' });
    }

    const document = await Document.findByPk(id);
    if (!document) {
      await cleanupUpload();
      return res.status(404).json({ success: false, message: 'Document original non trouvé.' });
    }
    if (!(await hasDocumentReadAccess(document, req.user))) {
      await cleanupUpload();
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }
    if (isManuallySigned(document)) {
      await cleanupUpload();
      return res.status(409).json({ success: false, message: 'Ce document est signé : il est verrouillé.' });
    }

    // Pages à ajouter : fichier envoyé depuis le PC, ou PDF d'un autre document de la GED
    let source = null;
    let newPagePath;
    if (sourceDocumentId) {
      source = await Document.findByPk(sourceDocumentId);
      if (!source || source.id === document.id) {
        return res.status(404).json({ success: false, message: 'Document à ajouter introuvable.' });
      }
      if (!(await hasDocumentReadAccess(source, req.user))) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé au document à ajouter.' });
      }
      newPagePath = path.resolve(process.cwd(), source.filePath);
    } else {
      newPagePath = path.resolve(process.cwd(), req.file.path);
    }

    // Fusion propre : deux PDF
    const sourceIsPdf = source
      ? (source.fileType === 'application/pdf' || /\.pdf$/i.test(source.fileName || ''))
      : req.file.mimetype === 'application/pdf';
    if (document.fileType !== 'application/pdf' || !sourceIsPdf) {
      await cleanupUpload();
      return res.status(400).json({ success: false, message: 'La fusion nécessite deux fichiers PDF.' });
    }

    const originalPath = path.resolve(process.cwd(), document.filePath);
    console.log(`🔄 Fusion demandée : ${position} le document ${document.id}${source ? ` (depuis le document ${source.id})` : ''}`);

    const mergedPdfBytes = position === 'before'
      ? await mergePDFs(newPagePath, originalPath)   // nouvelles pages + ancien fichier
      : await mergePDFs(originalPath, newPagePath);  // ancien fichier + nouvelles pages

    // Écraser l'ancien fichier avec le contenu fusionné (le document source, lui, ne change pas)
    await fs.writeFile(originalPath, mergedPdfBytes);
    await cleanupUpload();

    const stats = await fs.stat(originalPath);
    const changes = { fileSize: stats.size, updatedAt: new Date() };
    if (source) {
      // Traçabilité + recherche dans le texte du document ajouté
      const mergedFrom = [...(document.metadata?.mergedFrom || []), {
        id: source.id, title: source.title, position: position === 'before' ? 'before' : 'after',
        at: new Date().toISOString(), by: req.user.id,
      }];
      changes.metadata = { ...(document.metadata || {}), mergedFrom };
      if (source.extractedText) {
        changes.extractedText = [document.extractedText, source.extractedText].filter(Boolean).join('\n\n').slice(0, 200000);
      }
    }
    await document.update(changes);

    res.json({ success: true, message: 'Page ajoutée avec succès.' });

  } catch (error) {
    console.error('❌ Erreur fusion document:', error);
    await cleanupUpload();
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
    if (document.userId !== req.user.id && !['admin','superadmin'].includes(req.user.role) && req.user.role !== 'director') {
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
    if (document.userId !== req.user.id && !['admin','superadmin'].includes(req.user.role) && req.user.role !== 'director') {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    await document.update({ archived: false });
    res.json({ success: true, message: 'Document désarchivé avec succès.' });
  } catch (error) {
    console.error('Erreur désarchivage:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// @desc   Dates de décision réelles (approbation finale / rejet) des documents
//         visibles par l'utilisateur, sur les N derniers jours (Accueil : barres
//         « Approuvés », synthèse « mes documents approuvés/rejetés cette semaine »).
//         La date vient du circuit (Workflow.validatedAt), pas de Document.updatedAt.
export const getRecentDecisions = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 31);
    const since = new Date(Date.now() - days * 86400000);

    // Même périmètre que la liste des documents (getDocuments) : non archivés + droits d'accès
    const docWhere = { archived: false, status: { [Op.in]: ['approved', 'rejected'] } };
    const andConditions = [];
    const accessWhere = await buildDocumentAccessWhere(req.user);
    if (accessWhere) andConditions.push(accessWhere);
    const decisionsCategoryWhere = await buildCategoryRestrictionWhere(req.user);
    if (decisionsCategoryWhere) andConditions.push(decisionsCategoryWhere);
    if (andConditions.length > 0) docWhere[Op.and] = andConditions;

    const steps = await Workflow.findAll({
      where: { status: { [Op.in]: ['approved', 'rejected'] }, validatedAt: { [Op.gte]: since } },
      attributes: ['documentId', 'status', 'validatedAt'],
      include: [{ model: Document, as: 'document', where: docWhere, required: true, attributes: ['id', 'status', 'userId'] }],
    });

    // Une décision par document : l'étape qui correspond à son statut actuel, la plus
    // récente (approuvé = dernière approbation du circuit ; rejeté = l'étape de rejet)
    const byDoc = new Map();
    for (const step of steps) {
      if (step.status !== step.document.status) continue;
      const prev = byDoc.get(step.documentId);
      if (!prev || new Date(step.validatedAt) > new Date(prev.decidedAt)) {
        byDoc.set(step.documentId, {
          documentId: step.documentId,
          status: step.status,
          decidedAt: step.validatedAt,
          userId: step.document.userId,
        });
      }
    }

    res.json({ success: true, days, decisions: [...byDoc.values()] });
  } catch (error) {
    console.error('Erreur dates de décision:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// @desc   Chaîne documentaire d'un document : on remonte au document d'origine
//         (linkedDocumentId), puis on redescend vers tous les documents qui en
//         découlent (demande d'achat → bon de commande → proformas…). Chaque maillon
//         indique type et statut ; son titre n'est donné que si l'utilisateur peut le lire.
export const getDocumentChain = async (req, res) => {
  try {
    const attrs = ['id', 'title', 'category', 'status', 'createdAt', 'linkedDocumentId', 'userId', 'visibility', 'serviceId', 'metadata'];
    const current = await Document.findByPk(req.params.id, { attributes: attrs });
    if (!current) return res.status(404).json({ success: false, message: 'Document introuvable.' });
    if (!(await hasDocumentReadAccess(current, req.user))) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }

    const MAX_NODES = 100;
    // 1. Remonter jusqu'à l'origine (garde contre les boucles)
    let root = current;
    const upSeen = new Set([current.id]);
    while (root.linkedDocumentId && !upSeen.has(root.linkedDocumentId) && upSeen.size < MAX_NODES) {
      const parent = await Document.findByPk(root.linkedDocumentId, { attributes: attrs });
      if (!parent) break;
      upSeen.add(parent.id);
      root = parent;
    }

    // 2. Redescendre en profondeur (ordre naturel d'une arborescence)
    const nodes = [];
    const seen = new Set();
    const walk = async (doc, depth) => {
      if (seen.has(doc.id) || nodes.length >= MAX_NODES) return;
      seen.add(doc.id);
      const accessible = await hasDocumentReadAccess(doc, req.user);
      nodes.push({
        id: doc.id, depth, category: doc.category, status: doc.status, createdAt: doc.createdAt,
        title: accessible ? doc.title : null, accessible, isCurrent: doc.id === current.id,
        // Pièce de caisse : bénéficiaire (sert à la comptable pour savoir qui a déjà la sienne sur un OM)
        beneficiaire: accessible && doc.category === 'Pièce de caisse' ? (doc.metadata?.nom || null) : undefined,
      });
      const children = await Document.findAll({ where: { linkedDocumentId: doc.id }, attributes: attrs, order: [['createdAt', 'ASC']] });
      for (const child of children) await walk(child, depth + 1);
    };
    await walk(root, 0);

    res.json({ success: true, chain: nodes });
  } catch (error) {
    console.error('Erreur chaîne documentaire:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// Archives visibles par l'utilisateur (droits d'accès + catégories restreintes RH/Compta)
const buildArchivedWhere = async (user, extraConditions = []) => {
  const whereClause = { archived: true };
  const andConditions = [...extraConditions];

  const accessWhere = await buildDocumentAccessWhere(user);
  if (accessWhere) andConditions.push(accessWhere);

  // Exclure les catégories restreintes (RH + Compta) pour les utilisateurs non-autorisés
  const archiveCategoryWhere = await buildCategoryRestrictionWhere(user);
  if (archiveCategoryWhere) andConditions.push(archiveCategoryWhere);

  if (andConditions.length > 0) whereClause[Op.and] = andConditions;
  return whereClause;
};

// Extrait de ~160 caractères autour de la 1re occurrence (insensible à la casse)
const textSnippet = (text, q) => {
  const flat = (text || '').replace(/\s+/g, ' ');
  const i = flat.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return '';
  const start = Math.max(0, i - 60);
  const end = Math.min(flat.length, i + q.length + 100);
  return `${start > 0 ? '…' : ''}${flat.slice(start, end).trim()}${end < flat.length ? '…' : ''}`;
};

// Recherche dans le texte reconnu (OCR) des documents archivés. La page Archives
// filtre le reste (titre, type, dates…) dans le navigateur ; elle n'a pas le texte,
// trop lourd à charger pour toutes les archives : elle demande ici les documents
// dont le contenu correspond, avec un extrait à afficher.
export const searchArchivedContent = async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) return res.json({ success: true, data: [] });
  try {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const documents = await Document.findAll({
      where: await buildArchivedWhere(req.user, [{ extractedText: { [Op.iLike]: like } }]),
      attributes: ['id', 'extractedText'],
      limit: 200,
    });
    res.json({ success: true, data: documents.map((d) => ({ id: d.id, snippet: textSnippet(d.extractedText, q) })) });
  } catch (error) {
    console.error('Erreur recherche texte archives:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

export const getArchivedDocuments = async (req, res) => {
  try {
    const whereClause = await buildArchivedWhere(req.user);

    const documents = await Document.findAll({
      where: whereClause,
      attributes: { exclude: ['extractedText'] },
      include: [
        { model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] },
        {
          model: Workflow,
          as: 'workflows',
          include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName', 'signaturePath', 'stampPath'] }]
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
// Historique des Pièces de caisse payées — pour le rapport de la caissière.
// Réservé aux caissiers/admin ; ne montre que les PC où l'utilisateur est
// validateur (via buildDocumentAccessWhere, cohérent avec le reste de l'app).
// ============================================
export const getPieceDeCaisseHistory = async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role) && req.user.role !== 'caissier') {
      return res.status(403).json({ success: false, message: 'Accès réservé aux caissiers.' });
    }

    const { from, to } = req.query;
    const andConditions = [{ category: 'Pièce de caisse' }];

    const accessWhere = await buildDocumentAccessWhere(req.user);
    if (accessWhere) andConditions.push(accessWhere);

    if (from) andConditions.push({ createdAt: { [Op.gte]: new Date(from) } });
    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      andConditions.push({ createdAt: { [Op.lte]: endDate } });
    }

    const documents = await Document.findAll({
      where: { [Op.and]: andConditions },
      include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['updatedAt', 'DESC']],
    });

    const rows = documents
      .filter(doc => doc.metadata?.paye === true)
      .map(doc => {
        const lines = doc.metadata?.lines || [];
        const montant = lines.reduce((sum, l) => sum + (Number(l.sorties) || 0), 0);
        return {
          id: doc.id,
          title: doc.title,
          nom: doc.metadata?.nom || null,
          concerne: doc.metadata?.concerne || null,
          origine: doc.linkedDocumentId ? 'OM' : 'simple',
          montant,
          payeAt: doc.metadata?.payeAt || null,
          uploadedBy: doc.uploadedBy ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : null,
        };
      });

    const total = rows.reduce((sum, r) => sum + r.montant, 0);
    res.json({ success: true, data: rows, total, count: rows.length });
  } catch (error) {
    console.error('Erreur historique Pièces de caisse:', error);
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