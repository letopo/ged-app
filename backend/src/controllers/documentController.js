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
    
    // ✅ AJOUTER CE LOG
    console.log('📥 Données reçues du frontend:');
    console.log('   Body:', req.body);
    console.log('   linkedOrdreMissionId:', req.body.linkedOrdreMissionId);
    console.log('   category:', req.body.category);

    const { title, category, dateDebut, dateFin, nomsDemandeur, metadata, linkedOrdreMissionId } = req.body;
    const { filename, originalname, size, mimetype } = req.file;

    let finalFilePath = `uploads/${filename}`;
    let finalFileName = filename;
    let finalSize = size;

    // Parse le metadata
    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (err) {
        console.warn('Metadata invalide, ignoré:', err.message);
        parsedMetadata = {};
      }
    }
    
    console.log('📦 Metadata reçu et parsé:', parsedMetadata);

    // ✅ NOUVELLE LOGIQUE : Fusion automatique si Pièce de Caisse liée à un Ordre de Mission
    if (category === 'Pièce de caisse' && linkedOrdreMissionId && mimetype === 'application/pdf') {
      try {
        console.log('🔗 Pièce de Caisse liée à un Ordre de Mission détectée');
        console.log('   OM ID:', linkedOrdreMissionId);

        // Récupérer l'Ordre de Mission lié
        const ordreMission = await Document.findByPk(linkedOrdreMissionId);
        
        if (!ordreMission) {
          console.warn('⚠️ Ordre de Mission introuvable:', linkedOrdreMissionId);
          throw new Error('Ordre de Mission introuvable');
        }

        if (ordreMission.category !== 'Ordre de mission') {
          console.warn('⚠️ Le document lié n\'est pas un Ordre de Mission');
          throw new Error('Le document lié n\'est pas un Ordre de Mission');
        }

        // Vérifier que l'OM est en PDF
        if (ordreMission.fileType !== 'application/pdf') {
          console.warn('⚠️ L\'Ordre de Mission n\'est pas au format PDF');
          throw new Error('L\'Ordre de Mission doit être au format PDF');
        }

        const omPath = path.resolve(process.cwd(), ordreMission.filePath);
        const pcPath = path.resolve(process.cwd(), finalFilePath);

        // Valider les deux PDFs
        const omValid = await validatePDF(omPath);
        const pcValid = await validatePDF(pcPath);

        if (!omValid || !pcValid) {
          throw new Error('Un des PDFs est invalide ou inaccessible');
        }

        console.log('✅ Validation des PDFs réussie, début de la fusion...');

        // Fusionner les PDFs (OM en premier, PC en second)
        const mergedPdfBytes = await mergePDFs(omPath, pcPath);

        // Sauvegarder le PDF fusionné
        const mergedFileName = `PC_OM_fusionné_${Date.now()}.pdf`;
        const mergedFilePath = path.resolve(process.cwd(), `uploads/${mergedFileName}`);
        await fs.writeFile(mergedFilePath, mergedPdfBytes);

        // Supprimer le PDF de la Pièce de Caisse seule (on garde l'OM original)
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
        parsedMetadata.ordreMissionId = linkedOrdreMissionId;
        parsedMetadata.ordreMissionTitle = ordreMission.title;
        parsedMetadata.fusionDate = new Date().toISOString();

        console.log('✅ Fusion réussie! Nouveau fichier:', mergedFileName);

      } catch (fusionError) {
        console.error('❌ Erreur lors de la fusion des PDFs:', fusionError);
        // On continue avec le PDF non fusionné, mais on log l'erreur
        parsedMetadata.fusionError = fusionError.message;
        parsedMetadata.fusionAttempted = true;
      }
    }

    const documentData = {
      title: title || `Demande de travaux - ${parsedMetadata.service || 'Inconnu'}`,
      fileName: finalFileName,
      originalName: originalname,
      filePath: finalFilePath,
      fileSize: finalSize,
      fileType: mimetype,
      userId: req.user.id,
      category: category || parsedMetadata.type || null,
      linkedDocumentId: linkedOrdreMissionId || null, // ✅ NOUVEAU : Sauvegarder la liaison
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
        ? '✅ Document uploadé et fusionné avec l\'Ordre de Mission avec succès.' 
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