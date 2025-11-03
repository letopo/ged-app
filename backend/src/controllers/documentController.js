// backend/src/controllers/documentController.js - VERSION FINALE COMPLÈTE ET CORRIGÉE

import { Op } from 'sequelize';
import { Document, User, Workflow } from '../models/index.js';
import fs from 'fs/promises';
import path from 'path';

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni.' });
    }
    
    // Extrait les données du corps de la requête et du fichier uploadé
    const { title, category, dateDebut, dateFin, nomsDemandeur, metadata } = req.body;
    const { filename, originalname, size, mimetype } = req.file;

    const relativeFilePath = `uploads/${filename}`;

    // Parse le metadata, en s'assurant qu'il y a un objet par défaut
    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (err) {
        console.warn('Metadata invalide, ignoré:', err.message);
        parsedMetadata = {};
      }
    }
    
    // Log pour le débogage
    console.log('📦 Metadata reçu et parsé:', parsedMetadata);

    const documentData = {
      title: title || `Demande de travaux - ${parsedMetadata.service || 'Inconnu'}`,
      fileName: filename, // Nom du fichier sur le serveur (avec timestamp)
      originalName: originalname, // Nom original du fichier de l'utilisateur
      filePath: relativeFilePath,
      fileSize: size,
      fileType: mimetype,
      userId: req.user.id,
      category: category || parsedMetadata.type || null, // Prend la catégorie ou le type du metadata
      metadata: parsedMetadata,
      status: 'draft',
      dateDebut: dateDebut ? new Date(dateDebut) : null,
      dateFin: dateFin ? new Date(dateFin) : null,
    };

    const newDocument = await Document.create(documentData);
    
    // Récupère le document créé avec les informations de l'utilisateur pour le renvoyer au frontend
    const resultWithUser = await Document.findByPk(newDocument.id, {
        include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] }]
    });
    
    res.status(201).json({ success: true, data: resultWithUser, message: 'Document uploadé avec succès.' });

  } catch (error) {
    console.error('❌ Erreur lors de l\'upload du document:', error);
    // En cas d'erreur, on supprime le fichier qui a été uploadé pour ne pas polluer le disque
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