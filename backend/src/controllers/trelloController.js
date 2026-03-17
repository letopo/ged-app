// backend/src/controllers/trelloController.js - VERSION FINALE (Auto-Create + Sync)

import { 
  TrelloBoard, TrelloList, TrelloCard, TrelloComment, 
  TrelloAttachment, TrelloActivityLog, User, Document,
  Service, ServiceMember // ✅ Assurez-vous d'importer Service et ServiceMember
} from '../models/index.js';
import { getIO } from '../utils/socketManager.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import fs from 'fs/promises'; // ✅ NOUVEAU : pour supprimer les fichiers
import path from 'path';      // ✅ NOUVEAU


// ==========================================
// HELPER: Enregistrer une activité
// ==========================================
const logActivity = async (userId, cardId, actionType, actionData, transaction) => {
  await TrelloActivityLog.create({
    userId,
    cardId,
    actionType,
    actionData
  }, { transaction });
};

// ==========================================
// 1. Récupérer un tableau (AVEC AUTO-CRÉATION)
// ==========================================
export const getBoardByService = async (req, res) => {
  try {
    const { serviceType } = req.params; // ex: 'MG', 'Biomedical', 'Informatique'

    // 1. Tenter de récupérer le tableau existant
    let board = await TrelloBoard.findOne({
      where: { serviceType },
      include: [
        {
          model: TrelloList,
          as: 'lists',
          where: { isArchived: false },
          required: false,
          include: [
            {
              model: TrelloCard,
              as: 'cards',
              where: { isArchived: false },
              required: false,
              include: [
                { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'signaturePath'] },
                { model: Document, as: 'workRequest', attributes: ['id', 'title', 'category', 'status', 'filePath', 'fileType', 'metadata'] },
                { model: TrelloAttachment, as: 'attachments' },
                { model: TrelloComment, as: 'comments', include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName'] }] }
              ]
            }
          ]
        }
      ],
      order: [
        [{ model: TrelloList, as: 'lists' }, 'position', 'ASC'],
        [{ model: TrelloList, as: 'lists' }, { model: TrelloCard, as: 'cards' }, 'position', 'ASC']
      ]
    });

    // 2. SI LE TABLEAU N'EXISTE PAS => ON LE CRÉE
    if (!board) {
      console.log(`⚠️ Tableau ${serviceType} introuvable. Création automatique...`);
      
      const newBoard = await TrelloBoard.create({
        name: serviceType === 'MG' ? 'Moyens Généraux' : serviceType,
        serviceType: serviceType,
        description: `Tableau de suivi pour ${serviceType}`,
        settings: {}
      });

      const defaultLists = [
        { name: '📝 À faire', position: 0, color: '#E8E8E8' },
        { name: '🚧 En cours', position: 1, color: '#FEF3C7' },
        { name: '⏸️ Bloqué', position: 2, color: '#FEE2E2' },
        { name: '✅ Terminé', position: 3, color: '#D1FAE5' }
      ];

      for (const list of defaultLists) {
        await TrelloList.create({
          boardId: newBoard.id,
          name: list.name,
          position: list.position,
          color: list.color
        });
      }

      console.log('✅ Tableau et colonnes créés avec succès !');
      return getBoardByService(req, res);
    }

    res.json({ success: true, data: board });
  } catch (error) {
    console.error('❌ Erreur getBoard:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ==========================================
// 2. Créer une nouvelle carte
// ==========================================
export const createCard = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { listId, title, description, priority, assignedTo, dueDate, linkedWorkRequestId } = req.body;
    const userId = req.user.id;

    const maxPos = await TrelloCard.max('position', { where: { listId }, transaction: t });
    const position = (maxPos || 0) + 1000; 

    const card = await TrelloCard.create({
      listId,
      title,
      description,
      priority,
      assignedTo,
      dueDate,
      linkedWorkRequestId,
      createdBy: userId,
      position,
      status: 'todo'
    }, { transaction: t });

    await logActivity(userId, card.id, 'card_created', { title }, t);
    await t.commit();

    const fullCard = await TrelloCard.findByPk(card.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName'] },
        { model: Document, as: 'workRequest', attributes: ['id', 'title', 'filePath', 'fileType', 'metadata', 'category', 'status'] }
      ]
    });

    const io = getIO();
    if (io) io.emit('trello_card_created', fullCard);

    res.status(201).json({ success: true, data: fullCard });
  } catch (error) {
    await t.rollback();
    console.error('❌ Erreur createCard:', error);
    res.status(500).json({ success: false, message: 'Erreur création carte.' });
  }
};

// ==========================================
// 3. Déplacer une carte
// ==========================================
export const moveCard = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { cardId } = req.params;
    const { newListId, newPosition } = req.body;
    const userId = req.user.id;

    const card = await TrelloCard.findByPk(cardId, { transaction: t });
    if (!card) throw new Error('Carte introuvable');

    const oldListId = card.listId;
    
    await card.update({
      listId: newListId,
      position: newPosition
    }, { transaction: t });

    await logActivity(userId, card.id, 'card_moved', { fromList: oldListId, toList: newListId }, t);
    await t.commit();

    const io = getIO();
    if (io) {
      io.emit('trello_card_moved', {
        cardId,
        oldListId,
        newListId,
        newPosition,
        updatedAt: new Date()
      });
    }

    res.json({ success: true, data: card });
  } catch (error) {
    await t.rollback();
    console.error('❌ Erreur moveCard:', error);
    res.status(500).json({ success: false, message: 'Erreur déplacement carte.' });
  }
};

// ==========================================
// 4. Mettre à jour une carte (AVEC HISTORIQUE DE DATE)
// ==========================================
export const updateCard = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { cardId } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    const card = await TrelloCard.findByPk(cardId, { transaction: t });
    if (!card) throw new Error('Carte introuvable');

    // --- LOGIQUE DE GESTION DE L'HISTORIQUE DES DATES ---
    if (updates.dueDate) {
        const newDate = new Date(updates.dueDate);
        const oldDate = card.dueDate ? new Date(card.dueDate) : null;

        // Si une ancienne date existait et qu'elle est différente de la nouvelle
        if (oldDate && newDate.getTime() !== oldDate.getTime()) {
            const currentHistory = card.dateHistory || [];
            
            // On crée l'entrée d'historique
            const historyEntry = {
                previousDate: oldDate,
                changedAt: new Date(),
                changedBy: userId
            };

            // On ajoute à l'historique existant
            updates.dateHistory = [...currentHistory, historyEntry];
        }
    }
    // ----------------------------------------------------

    if (updates.status && updates.status !== card.status) {
      await logActivity(userId, card.id, 'status_changed', { old: card.status, new: updates.status }, t);
    }

    await card.update(updates, { transaction: t });
    await t.commit();

    const updatedCard = await TrelloCard.findByPk(cardId, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName'] },
        { 
            model: Document, 
            as: 'workRequest',
            attributes: ['id', 'title', 'filePath', 'fileType', 'metadata', 'category', 'status'] 
        }
      ]
    });

    const io = getIO();
    if (io) io.emit('trello_card_updated', updatedCard);

    res.json({ success: true, data: updatedCard });
  } catch (error) {
    await t.rollback();
    console.error('❌ Erreur updateCard:', error);
    res.status(500).json({ success: false, message: 'Erreur mise à jour.' });
  }
};

// ==========================================
// 5. Ajouter un commentaire
// ==========================================
export const addComment = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const comment = await TrelloComment.create({ cardId, userId, content });

    const fullComment = await TrelloComment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'signaturePath'] }]
    });

     // ✅ CONVERTIR LE COMMENTAIRE POUR L'AFFICHAGE FRONTEND
     const commentForFrontend = {
      ...fullComment.toJSON(), // Convertir l'objet Sequelize en objet simple
      type: 'comment',         // AJOUTER LA PROPRIÉTÉ MANQUANTE
      text: fullComment.content, // AJOUTER L'ALIAS 'text' que le frontend utilise
      authorName: `${fullComment.author.firstName} ${fullComment.author.lastName}` // AJOUTER L'ALIAS 'authorName'
  };


    const io = getIO();
    if (io) io.emit('trello_comment_added', fullComment);

    res.status(201).json({ success: true, data: fullComment });
  } catch (error) {
    console.error('❌ Erreur addComment:', error);
    res.status(500).json({ success: false, message: 'Erreur ajout commentaire.' });
  }
};

// ==========================================
// 5.1. Mettre à jour un commentaire
// ==========================================
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // 1. Trouver le commentaire et vérifier les droits (l'utilisateur est-il l'auteur ?)
    const comment = await TrelloComment.findByPk(commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Commentaire introuvable.' });
    }
    
    // Vérification des droits : seul l'auteur peut modifier
    if (comment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Non autorisé à modifier ce commentaire.' });
    }

    // 2. Mettre à jour le contenu et marquer comme édité
    await comment.update({
      content: content,
      isEdited: true,
      // La colonne editedAt (ajoutée à TrelloComment.js) n'existe pas encore dans ce modèle que j'ai vu, 
      // mais on peut utiliser un champ temporaire ou s'appuyer sur updatedAt. Pour être cohérent
      // avec le plan, nous allons utiliser un champ que nous allons ajouter à TrelloComment.js :
      // editedAt: new Date() // Si la migration pour TrelloComment a réussi
    });

    // 3. Recharger pour inclure l'auteur (nécessaire pour la MAJ temps réel)
    const updatedComment = await TrelloComment.findByPk(commentId, {
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName'] }]
    });

    // 4. Enregistrer l'activité
    await logActivity(userId, comment.cardId, 'comment_edited', { newContent: content });
    
    // 5. Notifier les clients via Socket.IO
    const io = getIO();
    if (io) io.emit('trello_comment_updated', updatedComment); 

    res.json({ success: true, data: updatedComment });
  } catch (error) {
    console.error('❌ Erreur updateComment:', error);
    res.status(500).json({ success: false, message: 'Erreur modification commentaire.' });
  }
};

// ==========================================
// 5.2. Supprimer un commentaire
// ==========================================
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    
    // 1. Trouver le commentaire et vérifier les droits
    const comment = await TrelloComment.findByPk(commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Commentaire introuvable.' });
    }
    
    // Vérification des droits : seul l'auteur peut supprimer
    if (comment.userId !== userId) {
        return res.status(403).json({ success: false, message: 'Non autorisé à supprimer ce commentaire.' });
    }

    const cardId = comment.cardId; // Garder l'ID de la carte pour le log
    
    // 2. Supprimer de la BDD
    await comment.destroy();

    // 3. Enregistrer l'activité
    await logActivity(userId, cardId, 'comment_deleted', { content: comment.content });
    
    // 4. Notifier les clients via Socket.IO
    const io = getIO();
    if (io) io.emit('trello_comment_deleted', { commentId: commentId, cardId: cardId }); 

    res.json({ success: true, message: 'Commentaire supprimé.' });
  } catch (error) {
    console.error('❌ Erreur deleteComment:', error);
    res.status(500).json({ success: false, message: 'Erreur suppression commentaire.' });
  }
};

// ==========================================
// 6. Ajouter une pièce jointe
// ==========================================
export const addAttachment = async (req, res) => {
  try {
    const { cardId } = req.params;
    const userId = req.user.id;
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier fourni' });

    const attachment = await TrelloAttachment.create({
      cardId,
      uploadedBy: userId,
      fileName: req.file.originalname,
      filePath: req.file.path.replace(/\\/g, "/"),
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      attachmentType: req.body.attachmentType || 'other'
    });

    const fullAttachment = await TrelloAttachment.findByPk(attachment.id, {
        include: [{ model: User, as: 'uploader', attributes: ['id', 'firstName', 'lastName'] }]
    });

    const io = getIO();
    if (io) io.emit('trello_attachment_added', fullAttachment);

    res.status(201).json({ success: true, data: fullAttachment });
  } catch (error) {
    console.error('❌ Erreur addAttachment:', error);
    res.status(500).json({ success: false, message: 'Erreur upload.' });
  }
};

// ==========================================
// 7. SYNCHRONISATION RÉTROACTIVE DES DTs
// ==========================================
export const syncOldDocuments = async (req, res) => {
  try {
    console.log('🔄 Démarrage de la synchronisation des DTs...');
    
    // Récupérer les DTs validées ou en cours
    const documents = await Document.findAll({
      where: {
        category: 'Demande de travaux',
        status: { [Op.in]: ['approved', 'in_progress', 'pending_validation'] }
      }
    });

    let createdCount = 0;

    for (const doc of documents) {
      // Vérifier si une carte existe déjà pour cette DT
      const existingCard = await TrelloCard.findOne({
        where: { linkedWorkRequestId: doc.id }
      });

      if (!existingCard) {
        // Déterminer le type de service depuis les métadonnées
        let serviceType = 'MG';
        if (doc.metadata && doc.metadata.type) {
          if (doc.metadata.type === 'Biomedical') serviceType = 'Biomedical';
          else if (doc.metadata.type === 'Informatique') serviceType = 'Informatique';
        }

        // Trouver ou créer le tableau correspondant
        let board = await TrelloBoard.findOne({ where: { serviceType } });
        if (!board) {
            // Logique de création de board simplifiée ici si nécessaire, 
            // mais getBoardByService devrait être appelé avant idéalement.
            // On skip si le board n'existe pas encore pour éviter les erreurs
            continue; 
        }
        
        if (board) {
          // Trouver la liste "À faire"
          const todoList = await TrelloList.findOne({
            where: { boardId: board.id, name: '📝 À faire' }
          }) || await TrelloList.findOne({ where: { boardId: board.id }, order: [['position', 'ASC']] });

          if (todoList) {
            await TrelloCard.create({
              listId: todoList.id,
              title: doc.title || `DT #${doc.id.slice(0, 8)}`,
              description: `
                **Importé depuis l'historique**
                Demandeur: ${doc.metadata?.demandeur || 'Inconnu'}
                Service: ${doc.metadata?.service || 'Non spécifié'}
                Motif: ${doc.metadata?.motif || 'Non spécifié'}
              `,
              priority: 'medium',
              linkedWorkRequestId: doc.id,
              createdBy: doc.uploadedBy || req.user.id,
              position: 65535,
              status: 'todo',
              dueDate: doc.createdAt
            });
            createdCount++;
          }
        }
      }
    }

    const io = getIO();
    if (io) io.emit('trello_refresh_needed');

    res.json({ 
      success: true, 
      message: `${createdCount} anciennes demandes ont été synchronisées.`,
      count: createdCount 
    });

  } catch (error) {
    console.error('❌ Erreur synchronisation:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la synchronisation.' });
  }
};

// ==========================================
// 8. Supprimer une pièce jointe
// ==========================================
export const deleteAttachment = async (req, res) => {
  try {
    const { cardId, attachmentId } = req.params;
    
    // 1. Trouver la pièce jointe
    const attachment = await TrelloAttachment.findOne({
      where: { id: attachmentId, cardId }
    });

    if (!attachment) {
      return res.status(404).json({ message: "Pièce jointe introuvable" });
    }

    // 2. Supprimer le fichier physique (si il existe)
    try {
      const fullPath = path.resolve(process.cwd(), attachment.filePath);
      await fs.unlink(fullPath);
    } catch (err) {
      console.warn(`⚠️ Fichier physique introuvable ou déjà supprimé : ${attachment.filePath}`);
    }

    // 3. Supprimer de la BDD
    await attachment.destroy();

    // 4. Notifier via Socket
    const io = getIO();
    if (io) io.emit('trello_attachment_added'); // On réutilise le même event pour rafraîchir

    res.json({ success: true, message: "Pièce jointe supprimée" });

  } catch (error) {
    console.error('❌ Erreur deleteAttachment:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
  }
};

// ==========================================
// 9. Récupérer les assignataires (STRICTEMENT les membres du service)
// ==========================================
export const getAssignees = async (req, res) => {
  try {
    const { serviceType } = req.params; // 'MG', 'Biomedical', 'Informatique'
    
    // 1. Définir des mots-clés pour trouver le(s) service(s) correspondant(s)
    let searchTerms = [];
    if (serviceType === 'MG') searchTerms = ['Moyens Généraux', 'MG', 'Technique', 'Maintenance'];
    else if (serviceType === 'Biomedical') searchTerms = ['Biomédical', 'Biomedical', 'Bio'];
    else if (serviceType === 'Informatique') searchTerms = ['Informatique', 'IT', 'SI', 'Numérique'];
    
    // 2. Trouver TOUS les services qui matchent (ex: "Service Info" et "Cellule Info")
    const services = await Service.findAll({
      where: {
        name: { [Op.or]: searchTerms.map(term => ({ [Op.iLike]: `%${term}%` })) }
      }
    });

    if (!services || services.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const serviceIds = services.map(s => s.id);

    // 3. Récupérer UNIQUEMENT les membres liés à ces services
    // On retire la logique qui ajoutait automatiquement tous les Admins/Directeurs
    const members = await ServiceMember.findAll({
      where: { 
        serviceId: { [Op.in]: serviceIds }, 
        isActive: true 
      },
      include: [{
        model: User,
        as: 'user',
        where: { isActive: true }, // On s'assure que l'utilisateur est actif
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }]
    });

    // 4. Extraire les utilisateurs
    const users = members.map(m => m.user).filter(u => u !== null);

    // 5. Dédoublonner (au cas où un user est dans deux sous-services trouvés)
    const uniqueUsers = Array.from(new Map(users.map(item => [item.id, item])).values());

    // 6. Trier par nom
    uniqueUsers.sort((a, b) => a.firstName.localeCompare(b.firstName));

    console.log(`👥 ${uniqueUsers.length} membres stricts trouvés pour ${serviceType}`);

    res.json({ success: true, data: uniqueUsers });

  } catch (error) {
    console.error('❌ Erreur getAssignees:', error);
    res.status(500).json({ success: false, message: 'Erreur récupération membres.' });
  }
};

// ... (Reste de l'export default inchangé)
export default {
    getBoardByService,
    createCard,
    moveCard,
    updateCard,
    addComment,
    updateComment,     // ✅ NOUVEL EXPORT
    deleteComment,     // ✅ NOUVEL EXPORT
    addAttachment,
    syncOldDocuments,
    deleteAttachment,
    getAssignees // ✅ Assurez-vous qu'il est bien exporté
};