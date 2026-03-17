// backend/src/controllers/scheduleController.js
import { 
  Schedule, 
  ScheduleAssignment, 
  ScheduleValidation,
  ScheduleChangeLog,
  User, 
  Employee,
  Department,
  ShiftType,
  ServiceMember
} from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Créer un nouveau planning
 */
export const createSchedule = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { title, scheduleType, departmentId, month, year, startDate, endDate, notes } = req.body;
    
    // Vérifier si un planning existe déjà pour cette période
    const existing = await Schedule.findOne({
      where: {
        scheduleType,
        month,
        year,
        isActive: true
      }
    });
    
    if (existing) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: 'Un planning existe déjà pour cette période' 
      });
    }
    
    // Déterminer le workflow de validation selon le type
    const validationWorkflow = Schedule.getValidationWorkflow(scheduleType);
    
    // Créer le planning
    const schedule = await Schedule.create({
      title,
      scheduleType,
      departmentId: departmentId || null,
      month,
      year,
      startDate,
      endDate,
      createdByUserId: req.user.id,
      status: 'draft',
      validationWorkflow: { roles: validationWorkflow },
      notes
    }, { transaction });
    
    // Créer les étapes de validation
    for (let i = 0; i < validationWorkflow.length; i++) {
      await ScheduleValidation.create({
        scheduleId: schedule.id,
        validatorRole: validationWorkflow[i],
        validationOrder: i + 1,
        status: 'pending'
      }, { transaction });
    }
    
    // Logger la création DANS la transaction
    await ScheduleChangeLog.logChange({
        scheduleId: schedule.id,
        userId: req.user.id,
        changeType: 'create',
        description: `Planning créé: ${title}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    }, transaction);  // <-- Passer la transaction ici

    await transaction.commit();

    // Recharger avec les relations
    const createdSchedule = await Schedule.findByPk(schedule.id, {
    include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
        { model: Department, as: 'department' },
        { model: ScheduleValidation, as: 'validations' }
    ]
    });

    // ✅ NORMALISER AVANT D'ENVOYER
    const result = createdSchedule.toJSON();
    result.validations = Array.isArray(result.validations) ? result.validations : [];
    result.assignments = [];

    res.status(201).json(result);
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur création planning:', error);
    res.status(500).json({ message: 'Erreur lors de la création du planning' });
  }
};

/**
 * Obtenir tous les plannings (avec filtres)
 */
export const getSchedules = async (req, res) => {
  try {
    const { scheduleType, month, year, status, departmentId } = req.query;
    
    const where = { isActive: true };
    
    if (scheduleType) where.scheduleType = scheduleType;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    
    const schedules = await Schedule.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'publisher', attributes: ['id', 'firstName', 'lastName'] },
        { model: Department, as: 'department' },
        { 
          model: ScheduleValidation, 
          as: 'validations',
          include: [
            { model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName'] }
          ],
          order: [['validationOrder', 'ASC']]
        }
      ],
      order: [['year', 'DESC'], ['month', 'DESC'], ['createdAt', 'DESC']]
    });
    
    // ✅ NORMALISER
    const normalized = schedules.map(s => {
      const json = s.toJSON();
      json.validations = Array.isArray(json.validations) ? json.validations : [];
      json.assignments = Array.isArray(json.assignments) ? json.assignments : [];
      return json;
    });

    res.json(normalized);
    
  } catch (error) {
    console.error('Erreur récupération plannings:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des plannings' });
  }
};

/**
 * Obtenir un planning par ID avec ses affectations
 */
export const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await Schedule.findByPk(id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'publisher', attributes: ['id', 'firstName', 'lastName'] },
        { model: Department, as: 'department' },
        { 
          model: ScheduleValidation, 
          as: 'validations',
          include: [
            { model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName', 'email', 'signaturePath', 'stampPath'] }
          ],
          order: [['validationOrder', 'ASC']]
        },
        {
          model: ScheduleAssignment,
          as: 'assignments',
          include: [
            { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
            { model: Employee, as: 'employee' },
            { model: ShiftType, as: 'shiftType' },
            { model: Department, as: 'department' }
          ],
          order: [['assignmentDate', 'ASC']]
        }
      ]
    });
    
    if (!schedule) {
      return res.status(404).json({ message: 'Planning non trouvé' });
    }
    
    // ✅ CORRECTION CRITIQUE: Garantir que assignments et validations sont toujours des tableaux
    const result = schedule.toJSON();
    result.assignments = Array.isArray(result.assignments) ? result.assignments : [];
    result.validations = Array.isArray(result.validations) ? result.validations : [];

    res.json(result);
    
  } catch (error) {
    console.error('Erreur récupération planning:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du planning' });
  }
};

/**
 * Ajouter/Mettre à jour des affectations en masse
 */
export const bulkUpsertAssignments = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { scheduleId } = req.params;
    const { assignments } = req.body; // Array d'affectations
    
    // 1. Validation de base
    if (!assignments || !Array.isArray(assignments)) {
       await transaction.rollback();
       return res.status(400).json({ message: 'Format invalide: assignments doit être un tableau' });
    }

    // 2. Vérifier que le planning existe et est modifiable
    const schedule = await Schedule.findByPk(scheduleId);
    
    if (!schedule) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Planning non trouvé' });
    }
    
    if (schedule.status === 'approved' || schedule.status === 'archived') {
      await transaction.rollback();
      return res.status(400).json({ 
        message: 'Impossible de modifier un planning validé ou archivé' 
      });
    }
    
    const createdAssignments = [];
    
    for (const assignment of assignments) {
      // Extraction sécurisée avec valeurs par défaut
      const { 
        userId, 
        employeeId, 
        employeeName,
        assignmentDate, 
        shiftTypeId, 
        shiftCode,
        departmentId,
        position,
        notes 
      } = assignment;
      
      // Validation minimale obligatoire
      if (!assignmentDate || !shiftCode) {
          console.warn('⚠️ Affectation ignorée (date ou code manquant):', assignment);
          continue;
      }

      // Vérifier si une affectation existe déjà pour cette date/personne
      const whereClause = {
        scheduleId,
        assignmentDate
      };
      
      // Il faut soit un userId, soit un employeeId
      if (employeeId) {
          whereClause.employeeId = employeeId;
      } else if (userId) {
          whereClause.userId = userId;
      } else {
          console.warn('⚠️ Affectation ignorée (ni userId ni employeeId):', assignment);
          continue;
      }

      const existing = await ScheduleAssignment.findOne({ where: whereClause });
      
      if (existing) {
        // Mettre à jour
        const oldValue = existing.toJSON();
        
        await existing.update({
          shiftTypeId: shiftTypeId || null, // Peut être null si on envoie juste le code
          shiftCode,
          departmentId: departmentId || schedule.departmentId || null,
          position: position || null,
          notes: notes || null,
          employeeName: employeeName || existing.employeeName // Garder l'ancien nom si pas fourni
        }, { transaction });
        
        // Logger la modification (uniquement si le shift change)
        if (oldValue.shiftCode !== shiftCode) {
            await ScheduleChangeLog.logChange({
            scheduleId,
            assignmentId: existing.id,
            userId: req.user.id,
            changeType: 'update',
            affectedDate: assignmentDate,
            affectedEmployee: employeeName || 'Employé',
            oldValue: { shiftCode: oldValue.shiftCode },
            newValue: { shiftCode },
            description: `Modification shift: ${oldValue.shiftCode} → ${shiftCode}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
            }, transaction);
        }
        
        createdAssignments.push(existing);
      } else {
        // Créer nouvelle affectation
        const newAssignment = await ScheduleAssignment.create({
          scheduleId,
          userId: userId || null,
          employeeId: employeeId || null,
          employeeName: employeeName || 'Inconnu', // Valeur par défaut pour éviter le crash NOT NULL
          assignmentDate,
          shiftTypeId: shiftTypeId || null,
          shiftCode,
          departmentId: departmentId || schedule.departmentId || null,
          position: position || null,
          notes: notes || null
        }, { transaction });
        
        // Logger la création
        await ScheduleChangeLog.logChange({
          scheduleId,
          assignmentId: newAssignment.id,
          userId: req.user.id,
          changeType: 'create',
          affectedDate: assignmentDate,
          affectedEmployee: employeeName || 'Employé',
          newValue: { shiftCode },
          description: `Affectation créée: ${shiftCode}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }, transaction);
        
        createdAssignments.push(newAssignment);
      }
    }
    
    await transaction.commit();
    
    res.json({ 
      message: 'Affectations enregistrées avec succès',
      count: createdAssignments.length,
      assignments: createdAssignments
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur enregistrement affectations:', error);
    // On renvoie l'erreur exacte pour le debug côté frontend
    res.status(500).json({ 
        message: 'Erreur lors de l\'enregistrement des affectations',
        error: error.message 
    });
  }
};

/**
 * Soumettre un planning pour validation
 */
export const submitForValidation = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    const schedule = await Schedule.findByPk(id, {
      include: [{ model: ScheduleValidation, as: 'validations' }]
    });
    
    if (!schedule) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Planning non trouvé' });
    }
    
    if (schedule.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({ 
        message: 'Seuls les plannings en brouillon peuvent être soumis' 
      });
    }
    
    // Vérifier qu'il y a des affectations
    const assignmentsCount = await ScheduleAssignment.count({
      where: { scheduleId: id }
    });
    
    if (assignmentsCount === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: 'Le planning doit contenir au moins une affectation' 
      });
    }
    
    // Déterminer le premier statut selon le workflow
    const firstValidation = schedule.validations
      .sort((a, b) => a.validationOrder - b.validationOrder)[0];
    
    const statusMap = {
      'dds': 'pending_dds',
      'medical_chief': 'pending_medical',
      'dg': 'pending_dg'
    };
    
    const newStatus = statusMap[firstValidation.validatorRole] || 'pending_dg';
    
    await schedule.update({ status: newStatus }, { transaction });
    
    // Logger
    await ScheduleChangeLog.logChange({
      scheduleId: id,
      userId: req.user.id,
      changeType: 'status_change',
      oldValue: { status: 'draft' },
      newValue: { status: newStatus },
      description: `Planning soumis pour validation`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }, transaction);
    
    await transaction.commit();
    
    // ✅ NOUVEAU: Trouver le validateur selon sa fonction dans ServiceMember
    try {
      let validator = null;
      let fonctionRecherchee = '';
      
      switch (firstValidation.validatorRole) {
        case 'dds':
          fonctionRecherchee = 'Directrice Des Soins';
          break;
        case 'medical_chief':
          fonctionRecherchee = 'Médecin Chef';
          break;
        case 'dg':
          fonctionRecherchee = 'Directeur Général';
          break;
      }
      
      if (fonctionRecherchee) {
        // Importer ServiceMember si pas déjà fait
        const { ServiceMember } = await import('../models/index.js');
        
        validator = await User.findOne({
          include: [{
            model: ServiceMember,
            as: 'serviceMemberships',
            where: { 
              fonction: fonctionRecherchee,
              isActive: true
            },
            required: true
          }]
        });
        
        if (validator) {
          console.log(`✅ Validateur trouvé: ${validator.firstName} ${validator.lastName} (${validator.email}) - Fonction: ${fonctionRecherchee}`);
          
          // TODO: Envoyer notification par email ou push
          // await sendEmailNotification(validator.email, {
          //   subject: `Nouveau planning à valider: ${schedule.title}`,
          //   planningId: schedule.id,
          //   planningTitle: schedule.title,
          //   validatorName: `${validator.firstName} ${validator.lastName}`
          // });
        } else {
          console.warn(`⚠️ Aucun utilisateur trouvé avec la fonction: ${fonctionRecherchee}`);
        }
      }
      
    } catch (notifError) {
      console.error('❌ Erreur recherche validateur:', notifError);
      // Ne pas bloquer si la recherche échoue
    }
    
    res.json({ 
      message: 'Planning soumis pour validation',
      schedule 
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur soumission planning:', error);
    res.status(500).json({ message: 'Erreur lors de la soumission du planning' });
  }
};

/**
 * Valider ou rejeter un planning
 */
export const validateSchedule = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { action, comments, rejectionReason } = req.body; // action: 'approve' | 'reject'
    
    const schedule = await Schedule.findByPk(id, {
      include: [{ 
        model: ScheduleValidation, 
        as: 'validations',
        order: [['validationOrder', 'ASC']]
      }]
    });
    
    if (!schedule) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Planning non trouvé' });
    }
    
    // ✅ NOUVELLE LOGIQUE: Vérifier la fonction de l'utilisateur dans ServiceMember
    console.log(`\n🔍 === VÉRIFICATION DES AUTORISATIONS ===`);
    console.log(`👤 Utilisateur connecté: ${req.user.firstName} ${req.user.lastName} (ID: ${req.user.id})`);
    
    // Recharger l'utilisateur avec ses fonctions
    const userWithFunctions = await User.findByPk(req.user.id, {
      include: [{
        model: ServiceMember,
        as: 'serviceMemberships',
        where: { isActive: true },
        required: false
      }]
    });
    
    if (!userWithFunctions) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    const userFonctions = userWithFunctions.serviceMemberships.map(m => m.fonction);
    console.log(`📋 Fonctions trouvées (${userFonctions.length}):`, userFonctions);
    
    if (userFonctions.length === 0) {
      console.log(`⚠️ ATTENTION: L'utilisateur n'a aucune fonction assignée dans ServiceMember`);
      await transaction.rollback();
      return res.status(403).json({ 
        message: 'Vous n\'avez aucune fonction assignée. Contactez l\'administrateur.',
        debug: {
          userId: req.user.id,
          email: req.user.email
        }
      });
    }
    
    // Mapper les rôles de validation aux fonctions requises
    const fonctionRequiseMap = {
      'dds': 'Directrice Des Soins',
      'medical_chief': 'Médecin Chef',
      'dg': 'Directeur Général'
    };
    
    // Trouver la validation en attente
    const currentValidation = schedule.validations.find(v => v.status === 'pending');
    
    if (!currentValidation) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: 'Aucune validation en attente pour ce planning' 
      });
    }
    
    console.log(`📌 Validation en attente: ${currentValidation.validatorRole} (ordre: ${currentValidation.validationOrder})`);
    
    // Vérifier si l'utilisateur a la fonction requise
    const fonctionRequise = fonctionRequiseMap[currentValidation.validatorRole];
    console.log(`✅ Fonction requise: "${fonctionRequise}"`);
    console.log(`📊 Fonctions de l'utilisateur:`, userFonctions);

    // ✅ CORRECTION: Comparer en normalisant les caractères
    const normalizeString = (str) => {
      return str
        .normalize('NFD') // Décomposer les caractères accentués
        .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
        .toLowerCase()
        .trim();
    };

    const fonctionRequiseNormalized = normalizeString(fonctionRequise);
    const userFonctionsNormalized = userFonctions.map(f => normalizeString(f));

    console.log(`🔍 Comparaison normalisée:`);
    console.log(`  - Requise: "${fonctionRequiseNormalized}"`);
    console.log(`  - Utilisateur:`, userFonctionsNormalized);

    const hasRequiredFunction = userFonctionsNormalized.includes(fonctionRequiseNormalized);
    console.log(`🔐 A la fonction requise? ${hasRequiredFunction ? '✅ OUI' : '❌ NON'}`);
    
    if (!hasRequiredFunction) {
      await transaction.rollback();
      console.log(`❌ REFUS: Utilisateur n'a pas la fonction "${fonctionRequise}"`);
      return res.status(403).json({ 
        message: `Vous n'êtes pas autorisé à valider ce planning. Fonction requise: ${fonctionRequise}`,
        debug: {
          fonctionRequise,
          vosFonctions: userFonctions
        }
      });
    }
    
    console.log(`✅ === AUTORISATION ACCORDÉE ===\n`);
    
    if (action === 'reject') {
      // Rejeter le planning
      await currentValidation.update({
        status: 'rejected',
        validatorUserId: req.user.id,
        validatedAt: new Date(),
        rejectionReason,
        comments
      }, { transaction });
      
      await schedule.update({ status: 'rejected' }, { transaction });
      
      // Logger
      await ScheduleChangeLog.logChange({
        scheduleId: id,
        userId: req.user.id,
        changeType: 'validation',
        newValue: { status: 'rejected', reason: rejectionReason },
        description: `Planning rejeté par ${ScheduleValidation.getRoleLabel(currentValidation.validatorRole)}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }, transaction);
      
    } else if (action === 'approve') {
      // Approuver cette étape
      await currentValidation.update({
        status: 'approved',
        validatorUserId: req.user.id,
        validatedAt: new Date(),
        comments
      }, { transaction });
      
      // Vérifier s'il reste des validations
      const remainingValidations = schedule.validations.filter(v => 
        v.validationOrder > currentValidation.validationOrder && v.status === 'pending'
      );
      
      if (remainingValidations.length === 0) {
        // Toutes les validations sont terminées - publier le planning
        await schedule.update({ 
          status: 'approved',
          publishedAt: new Date(),
          publishedByUserId: req.user.id
        }, { transaction });
        
        // Logger
        await ScheduleChangeLog.logChange({
          scheduleId: id,
          userId: req.user.id,
          changeType: 'publish',
          description: `Planning validé et publié`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }, transaction);
        
        console.log(`🎉 Planning ${schedule.title} validé et publié !`);
        
      } else {
        // Passer à l'étape suivante
        const nextValidation = remainingValidations[0];
        const statusMap = {
          'dds': 'pending_dds',
          'medical_chief': 'pending_medical',
          'dg': 'pending_dg'
        };
        
        await schedule.update({ 
          status: statusMap[nextValidation.validatorRole] 
        }, { transaction });
        
        // Logger
        await ScheduleChangeLog.logChange({
          scheduleId: id,
          userId: req.user.id,
          changeType: 'validation',
          description: `Validation approuvée par ${ScheduleValidation.getRoleLabel(currentValidation.validatorRole)}, en attente de ${ScheduleValidation.getRoleLabel(nextValidation.validatorRole)}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }, transaction);
        
        console.log(`➡️ Planning passe à l'étape suivante: ${nextValidation.validatorRole}`);
      }
    }
    
    await transaction.commit();
    
    // Recharger le planning
    const updatedSchedule = await Schedule.findByPk(id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'publisher', attributes: ['id', 'firstName', 'lastName'] },
        { 
          model: ScheduleValidation, 
          as: 'validations',
          include: [
            { model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName'] }
          ]
        }
      ]
    });
    
    res.json({ 
      message: action === 'approve' ? 'Validation approuvée' : 'Planning rejeté',
      schedule: updatedSchedule
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur validation planning:', error);
    res.status(500).json({ message: 'Erreur lors de la validation du planning' });
  }
};

/**
 * Obtenir l'historique des modifications
 */
export const getScheduleChangesLog = async (req, res) => {
  try {
    const { id } = req.params;
    
    const logs = await ScheduleChangeLog.findAll({
      where: { scheduleId: id },
      include: [
        { model: User, as: 'changedBy', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(logs);
    
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique' });
  }
};

/**
 * Supprimer un planning
 */
export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findByPk(id);

    if (!schedule) {
      return res.status(404).json({ message: 'Planning non trouvé' });
    }

    // ✅ NOUVELLE LOGIQUE DE PERMISSIONS
    const isAdmin = ['admin', 'dg'].includes(req.user.role);
    const isCreator = schedule.createdBy === req.user.id;
    const isDraft = schedule.status === 'draft';

    // Admin peut tout supprimer
    // Créateur peut supprimer uniquement les brouillons
    if (!isAdmin && (!isCreator || !isDraft)) {
      return res.status(403).json({ 
        message: 'Vous n\'avez pas les permissions pour supprimer ce planning' 
      });
    }

    // ✅ Si le planning est validé, seul un admin peut le supprimer
    if (schedule.status === 'validated' && !isAdmin) {
      return res.status(403).json({ 
        message: 'Seul un administrateur peut supprimer un planning validé' 
      });
    }

    // Supprimer toutes les affectations liées
    await ScheduleAssignment.destroy({
      where: { scheduleId: id }
    });

    // Supprimer les validations liées
    await ScheduleValidation.destroy({
      where: { scheduleId: id }
    });

    // Supprimer le planning
    await schedule.destroy();

    res.json({ 
      message: 'Planning supprimé avec succès',
      scheduleId: id
    });

  } catch (error) {
    console.error('Erreur suppression planning:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du planning',
      error: error.message 
    });
  }
};

