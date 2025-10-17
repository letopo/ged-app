// backend/src/controllers/documentController.js - VERSION CORRIGÉE

import { Op } from 'sequelize';
import Document from '../models/Document.js';
import User from '../models/User.js';
import fs from 'fs/promises';
import path from 'path';

export const uploadDocument = async (req, res) => {
  try {
    // 1. Vérifier que le fichier a bien été uploadé
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier uploadé' });
    }

    // 2. Extraire les informations du corps de la requête
    const { title, category, tags, metadata } = req.body;

    // 3. Extraire les informations du fichier (via multer) et de l'utilisateur (via l'auth)
    const { path: filePath, size, mimetype, filename, originalname } = req.file;
    const userId = req.user.id;

    // 4. CORRECTION: Transformer la chaîne de tags en un tableau JSON valide
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];

    // 5. Créer le document avec TOUTES les informations requises
    const newDocument = await Document.create({
      title: title || originalname,
      filename: filename,
      originalName: originalname,
      path: filePath,
      size: size,
      type: mimetype,
      userId: userId, // On fournit l'ID de l'utilisateur
      category: category,
      tags: tagsArray, // On utilise le tableau transformé
      metadata: metadata,
    });

    res.status(201).json({ success: true, data: newDocument });
  } catch (error) {
    console.error('Erreur upload:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, error: error.message, details: error.errors });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

export const getDocuments = async (req, res) => {
  const { page = 1, limit = 20, category, status } = req.query;

  try {
    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
    // CORRECTION: Utiliser userId pour le filtrage
    if (req.user.role !== 'admin') where.userId = req.user.id;

    const { count, rows } = await Document.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
      // CORRECTION: Utiliser l'alias 'user' défini dans le modèle
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }],
      attributes: { exclude: ['extractedText'] }
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur récupération:', error);
    res.status(500).json({ success: false, error: 'Erreur récupération' });
  }
};

export const getDocument = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id, {
      include: [
        // CORRECTION: Utiliser l'alias 'user'
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
        // NOTE: Si vous voulez aussi le validateur, l'alias doit correspondre à celui défini.
        // Je le commente pour l'instant car il n'est pas dans votre index.js sur Document.
        // { model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document non trouvé' });
    }

    // CORRECTION: Utiliser userId pour la vérification des droits
    if (req.user.role !== 'admin' && document.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    res.json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erreur récupération' });
  }
};

export const updateDocument = async (req, res) => {
  const { title, description, category, tags, status } = req.body;

  try {
    const document = await Document.findByPk(req.params.id);

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document non trouvé' });
    }

    // CORRECTION: Utiliser userId pour la vérification des droits
    if (req.user.role !== 'admin' && document.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    if (title) document.title = title;
    if (description) document.description = description;
    if (category) document.category = category;
    if (tags) document.tags = tags.split(',').map(t => t.trim());

    if (status && ['admin', 'manager'].includes(req.user.role)) {
      document.status = status;
      // Note: les champs validatedBy et validatedAt n'existent pas dans votre modèle Document.js
      // if (status === 'approved' || status === 'rejected') {
      //   document.validatedBy = req.user.id;
      //   document.validatedAt = new Date();
      // }
    }

    await document.save();

    res.json({ success: true, data: document, message: 'Document mis à jour' });
  } catch (error) {
    console.error('Erreur mise à jour:', error);
    res.status(500).json({ success: false, error: 'Erreur mise à jour' });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document non trouvé' });
    }

    // CORRECTION: Utiliser userId pour la vérification des droits
    if (req.user.role !== 'admin' && document.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    // CORRECTION BONUS: Utiliser document.path pour le chemin du fichier
    await fs.unlink(document.path).catch(console.error);
    await document.destroy();

    res.json({ success: true, message: 'Document supprimé' });
  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({ success: false, error: 'Erreur suppression' });
  }
};

export const searchDocuments = async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ success: false, error: 'Terme de recherche requis' });
  }

  try {
    const where = {
      [Op.or]: [
        { title: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } },
        // Note: fileName n'existe pas dans le modèle, c'est 'filename' ou 'originalName'
        { filename: { [Op.iLike]: `%${q}%` } },
        { originalName: { [Op.iLike]: `%${q}%` } }
      ]
    };

    // CORRECTION: Utiliser userId pour le filtrage
    if (req.user.role !== 'admin') where.userId = req.user.id;

    const documents = await Document.findAll({
      where,
      limit: 50,
      // CORRECTION: Utiliser l'alias 'user'
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }],
      attributes: { exclude: ['extractedText'] }
    });

    res.json({ success: true, data: documents, count: documents.length });
  } catch (error) {
    console.error('Erreur recherche:', error);
    res.status(500).json({ success: false, error: 'Erreur recherche' });
  }
};