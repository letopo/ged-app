// backend/src/controllers/demandeAchatController.js - VERSION AMÉLIORÉE
import db from '../models/index.js';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs/promises';

const { DemandeAchat, User } = db;

// Génération du numéro DA
const generateDaNumber = async () => {
  const currentYear = new Date().getFullYear();
  const lastDa = await DemandeAchat.findOne({
    where: {
      daNumber: { [Op.like]: `DAI-${currentYear}-%` }
    },
    order: [['createdAt', 'DESC']]
  });

  let nextNumber = 1;
  if (lastDa) {
    const parts = lastDa.daNumber.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }

  return `DAI-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
};

// ============================================
// 1. Créer une nouvelle Demande d'Achat
// ============================================
export const createDemandeAchat = async (req, res) => {
  try {
    const {
      domain, requestDescription, purchaseType, deliveryDate,
      domainDescription, articleNature, beneficiaryName, beneficiaryEmail, beneficiaryPhone,
      isMagasinOutput, linkedDocNumber, isForWorks, nonRefArticles, totalRefValue,
      totalNonRefValue, supplierId
    } = req.body;

    const requesterId = req.user.id;

    if (!domain || !requestDescription || !purchaseType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le domaine, la description et le type d\'achat sont requis.' 
      });
    }

    const daNumber = await generateDaNumber();

    // Gestion des fichiers uploadés
    let attachedDocuments = [];
    if (req.files && req.files.length > 0) {
      attachedDocuments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        uploadedAt: new Date()
      }));
    }

    const newDa = await DemandeAchat.create({
      daNumber,
      requesterId,
      domain,
      requestDescription,
      purchaseType,
      daDate: new Date().toISOString().split('T')[0],
      domainDescription,
      deliveryDate,
      articleNature,
      beneficiaryName,
      beneficiaryEmail,
      beneficiaryPhone,
      isMagasinOutput: isMagasinOutput === 'true' || isMagasinOutput === true,
      linkedDocNumber,
      isForWorks: isForWorks === 'true' || isForWorks === true,
      nonRefArticles: typeof nonRefArticles === 'string' ? JSON.parse(nonRefArticles) : nonRefArticles || [],
      totalRefValue: parseFloat(totalRefValue) || 0,
      totalNonRefValue: parseFloat(totalNonRefValue) || 0,
      attachedDocuments,
      supplierId,
      status: 'draft',
    });

    // Charger la DA avec les infos du demandeur
    const daWithUser = await DemandeAchat.findByPk(newDa.id, {
      include: [{ model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] }]
    });

    res.status(201).json({ 
      success: true, 
      message: 'Demande d\'Achat créée avec succès.', 
      data: daWithUser 
    });

  } catch (error) {
    console.error('❌ Erreur création DemandeAchat:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la création de la Demande d\'Achat.' 
    });
  }
};

// ============================================
// 2. Récupérer toutes les Demandes d'Achat
// ============================================
export const getAllDemandesAchat = async (req, res) => {
  try {
    const isAdminOrAchat = req.user.role === 'admin' || req.user.role === 'achat';
    const whereClause = isAdminOrAchat ? {} : { requesterId: req.user.id };

    // Filtres optionnels
    const { status, search } = req.query;
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (search) {
      whereClause[Op.or] = [
        { daNumber: { [Op.iLike]: `%${search}%` } },
        { domain: { [Op.iLike]: `%${search}%` } },
        { requestDescription: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const demandes = await DemandeAchat.findAll({
      where: whereClause,
      include: [
        { 
          model: User, 
          as: 'requester', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'position'] 
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    // Convertir les Decimal en nombres pour éviter les erreurs frontend
    const formattedDemandes = demandes.map(demande => ({
      ...demande.toJSON(),
      totalRefValue: parseFloat(demande.totalRefValue) || 0,
      totalNonRefValue: parseFloat(demande.totalNonRefValue) || 0,
      nonRefArticles: (demande.nonRefArticles || []).map(article => ({
        ...article,
        total: parseFloat(article.total) || 0,
        unitPrice: parseFloat(article.unitPrice) || 0,
        quantity: parseFloat(article.quantity) || 0
      }))
    }));

    res.json({ success: true, data: formattedDemandes });

  } catch (error) {
    console.error('❌ Erreur récupération DemandesAchat:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la récupération des Demandes d\'Achat.' 
    });
  }
};

// ============================================
// 3. Récupérer une Demande d'Achat par ID
// ============================================
export const getDemandeAchatById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const demande = await DemandeAchat.findByPk(id, {
      include: [
        { 
          model: User, 
          as: 'requester', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'position'] 
        }
      ],
    });

    if (!demande) {
      return res.status(404).json({ 
        success: false, 
        message: 'Demande d\'Achat introuvable.' 
      });
    }

    const isAdminOrAchat = req.user.role === 'admin' || req.user.role === 'achat';
    if (!isAdminOrAchat && demande.requesterId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Non autorisé à consulter cette Demande d\'Achat.' 
      });
    }

    // Convertir les Decimal en nombres pour éviter les erreurs frontend
    const formattedDemande = {
      ...demande.toJSON(),
      totalRefValue: parseFloat(demande.totalRefValue) || 0,
      totalNonRefValue: parseFloat(demande.totalNonRefValue) || 0,
      nonRefArticles: (demande.nonRefArticles || []).map(article => ({
        ...article,
        total: parseFloat(article.total) || 0,
        unitPrice: parseFloat(article.unitPrice) || 0,
        quantity: parseFloat(article.quantity) || 0
      }))
    };

    res.json({ success: true, data: formattedDemande });

  } catch (error) {
    console.error('❌ Erreur récupération DemandeAchat par ID:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la récupération de la Demande d\'Achat.' 
    });
  }
};

// ============================================
// 4. Mettre à jour une Demande d'Achat
// ============================================
export const updateDemandeAchat = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const demande = await DemandeAchat.findByPk(id);

    if (!demande) {
      return res.status(404).json({ 
        success: false, 
        message: 'Demande d\'Achat introuvable.' 
      });
    }

    const isAdminOrAchat = req.user.role === 'admin' || req.user.role === 'achat';
    const canEdit = isAdminOrAchat || (demande.requesterId === req.user.id && demande.status === 'draft');

    if (!canEdit) {
      return res.status(403).json({ 
        success: false, 
        message: 'Non autorisé à modifier cette Demande d\'Achat.' 
      });
    }

    // Empêcher la modification des champs sensibles
    delete updateData.daNumber;
    delete updateData.requesterId;
    delete updateData.daDate;

    // Gestion des nouveaux fichiers
    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        uploadedAt: new Date()
      }));
      
      updateData.attachedDocuments = [
        ...(demande.attachedDocuments || []),
        ...newFiles
      ];
    }

    // Parser les champs JSON si nécessaire
    if (updateData.nonRefArticles && typeof updateData.nonRefArticles === 'string') {
      updateData.nonRefArticles = JSON.parse(updateData.nonRefArticles);
    }

    await demande.update(updateData);

    const updatedDemande = await DemandeAchat.findByPk(id, {
      include: [{ model: User, as: 'requester' }]
    });

    res.json({ 
      success: true, 
      message: 'Demande d\'Achat mise à jour avec succès.', 
      data: updatedDemande 
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour DemandeAchat:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la mise à jour de la Demande d\'Achat.' 
    });
  }
};

// ============================================
// 5. Mettre à jour le statut
// ============================================
export const updateDemandeAchatStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { newStatus } = req.body;

    const demande = await DemandeAchat.findByPk(id);

    if (!demande) {
      return res.status(404).json({ 
        success: false, 
        message: 'Demande d\'Achat introuvable.' 
      });
    }

    const isAdminOrAchat = req.user.role === 'admin' || req.user.role === 'achat';
    
    // Validation des transitions
    const allowedStatuses = ['draft', 'pending_approval', 'approved', 'rejected', 'in_progress', 'completed'];
    if (!allowedStatuses.includes(newStatus)) {
      return res.status(400).json({ success: false, message: 'Statut invalide.' });
    }

    // Seul le demandeur peut soumettre (draft -> pending)
    if (newStatus === 'pending_approval' && demande.status === 'draft') {
      if (demande.requesterId !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Seul le demandeur peut soumettre.' 
        });
      }
    }

    // Seuls admin/achat peuvent approuver/rejeter
    if (['approved', 'rejected', 'in_progress', 'completed'].includes(newStatus)) {
      if (!isAdminOrAchat) {
        return res.status(403).json({ 
          success: false, 
          message: 'Seuls les administrateurs ou le service achat peuvent modifier ce statut.' 
        });
      }
    }

    await demande.update({ status: newStatus });

    const updatedDemande = await DemandeAchat.findByPk(id, {
      include: [{ model: User, as: 'requester' }]
    });

    res.json({ 
      success: true, 
      message: `Statut mis à jour à ${newStatus}.`, 
      data: updatedDemande 
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour statut DemandeAchat:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la mise à jour du statut.' 
    });
  }
};

// ============================================
// 6. Supprimer une Demande d'Achat
// ============================================
export const deleteDemandeAchat = async (req, res) => {
  try {
    const { id } = req.params;
    const demande = await DemandeAchat.findByPk(id);

    if (!demande) {
      return res.status(404).json({ 
        success: false, 
        message: 'Demande d\'Achat introuvable.' 
      });
    }

    const isAdmin = req.user.role === 'admin';
    const canDelete = isAdmin || (demande.requesterId === req.user.id && demande.status === 'draft');

    if (!canDelete) {
      return res.status(403).json({ 
        success: false, 
        message: 'Non autorisé à supprimer cette Demande d\'Achat.' 
      });
    }

    // Supprimer les fichiers attachés
    if (demande.attachedDocuments && demande.attachedDocuments.length > 0) {
      for (const doc of demande.attachedDocuments) {
        try {
          await fs.unlink(doc.path);
        } catch (err) {
          console.error('Erreur suppression fichier:', err);
        }
      }
    }

    await demande.destroy();

    res.json({ success: true, message: 'Demande d\'Achat supprimée avec succès.' });

  } catch (error) {
    console.error('❌ Erreur suppression DemandeAchat:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la suppression de la Demande d\'Achat.' 
    });
  }
};