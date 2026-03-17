// backend/src/controllers/invoiceController.js - VERSION FINALE (HIERARCHIQUE + CRUD ACTIVÉ)

import { InvoiceFolder, Document, User } from '../models/index.js';
import { Op } from 'sequelize';

// Récupérer le tableau (Board) avec hiérarchie
export const getBoard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Filtre date pour les documents
    const documentWhereClause = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      documentWhereClause.createdAt = { [Op.between]: [start, end] };
    }

    // Récupérer les dossiers racines (ParentId = NULL) incluant leurs enfants
    const folders = await InvoiceFolder.findAll({
      where: { parentId: null }, // Seulement les racines
      order: [['position', 'ASC'], [{ model: InvoiceFolder, as: 'children' }, 'position', 'ASC']],
      include: [
        // 1. Documents du dossier racine
        {
          model: Document,
          as: 'documents',
          where: startDate && endDate ? documentWhereClause : undefined,
          required: false,
          include: [{ model: User, as: 'uploadedBy', attributes: ['username'] }]
        },
        // 2. Enfants (Sous-dossiers) et leurs documents
        {
          model: InvoiceFolder,
          as: 'children',
          include: [{
            model: Document,
            as: 'documents',
            where: startDate && endDate ? documentWhereClause : undefined,
            required: false,
            include: [{ model: User, as: 'uploadedBy', attributes: ['username'] }]
          }]
        }
      ]
    });
    
    res.json(folders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Déplacer un document
export const moveDocument = async (req, res) => {
    try {
      const { documentId, targetFolderId } = req.body;
      const doc = await Document.findByPk(documentId);
      if (!doc) return res.status(404).json({ message: 'Document non trouvé' });
  
      await doc.update({ invoiceFolderId: targetFolderId });
      
      const updatedDoc = await Document.findByPk(documentId, {
          include: [{ model: User, as: 'uploadedBy', attributes: ['username'] }]
      });
  
      res.json(updatedDoc);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
};

// ✅ CRÉER UN DOSSIER (ACTIVÉ)
export const createFolder = async (req, res) => {
  try {
    const { name, parentId } = req.body;

    // Déterminer le scope pour la position (Racine ou Enfant)
    const whereClause = parentId ? { parentId } : { parentId: null };
    
    // Trouver la dernière position dans ce scope
    const maxPos = await InvoiceFolder.max('position', { where: whereClause }) || 0;

    const folder = await InvoiceFolder.create({
      name,
      type: 'custom', // Type par défaut modifiable si besoin
      parentId: parentId || null, // Gestion du sous-dossier
      position: maxPos + 1
    });

    res.status(201).json(folder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ METTRE À JOUR UN DOSSIER (ACTIVÉ)
export const updateFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const folder = await InvoiceFolder.findByPk(id);
    if (!folder) return res.status(404).json({ message: 'Dossier non trouvé' });
    
    await folder.update({ name });
    res.json(folder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ SUPPRIMER UN DOSSIER (ACTIVÉ)
export const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await InvoiceFolder.findByPk(id);
    
    if (!folder) return res.status(404).json({ message: 'Dossier non trouvé' });
    
    // Protection : Ne pas supprimer la Inbox
    if (folder.type === 'inbox') {
        return res.status(403).json({ message: 'Impossible de supprimer la boîte de réception' });
    }

    // 1. Détacher les documents contenus directement
    await Document.update({ invoiceFolderId: null }, { where: { invoiceFolderId: id } });
    
    // 2. Si c'est un conteneur (ex: PHP), gérer ses enfants
    // On supprime les enfants (cascade) ou on les remonte à la racine ?
    // Ici, la suppression en cascade est gérée par la BDD (ON DELETE CASCADE) si configurée,
    // sinon on supprime le dossier et Sequelize/PG gère selon le modèle.
    
    await folder.destroy();
    res.json({ message: 'Dossier supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};