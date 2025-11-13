// backend/src/controllers/documentController.js - VERSION FINALE COMPLÈTE ET CORRIGÉE

import { Op } from 'sequelize';
import { Document, User, Workflow } from '../models/index.js';
import fs from 'fs/promises';
import path from 'path';
import { mergePDFs, validatePDF } from '../utils/pdfMerger.js';

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni.' });
    }
    
    // ✅ MODIFIÉ : Accepter linkedOrdreMissionId OU linkedDocumentId
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

    // ✅ LOGIQUE GÉNÉRALISÉE : Fusion pour toute Pièce de Caisse avec document lié
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
    };

    const newDocument = await Document.create(documentData);
    
    const resultWithUser = await Document.findByPk(newDocument.id, {
        include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] }]
    });
    
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
        await fs.unlink(req.file.path); 
      } catch (err) { 
        console.error("Échec de la suppression du fichier après erreur:", err); 
      }
    }
    res.status(500).json({ success: false, message: 'Erreur serveur lors de l\'upload.' });
  }
};

export const getDocuments = async (req, res) => {
  try {
    const whereClause = {};
    const userRole = req.user.role;
    const userId = req.user.id;
    if (userRole !== 'admin' && userRole !== 'director') {
      whereClause.userId = userId;
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
    await document.destroy();
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
        if (req.user.role !== 'admin') where.userId = req.user.id;
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
        const filePath = path.resolve(process.cwd(), document.filePath);
        try { await fs.access(filePath); res.download(filePath, document.originalName); }
        catch { res.status(404).send('Fichier introuvable sur le serveur.'); }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};