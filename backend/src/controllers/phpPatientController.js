// backend/src/controllers/phpPatientController.js - Module PHP
// Gestion complète des patients PHP

import { PatientPHP, Infirmerie, Secteur, ConsultationPHP, BonPriseEnCharge,
         HospitalisationPHP, ReposPHP, OperationPHP, User } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../models/index.js';

// ============================================
// LISTER PATIENTS (avec filtres)
// ============================================
export const getPatients = async (req, res) => {
  try {
    const {
      search, infirmerieId, secteurId, status,
      page = 1, limit = 50
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (infirmerieId) where.infirmerieId = infirmerieId;
    if (secteurId) where.secteurId = secteurId;

    if (search) {
      where[Op.or] = [
        { nom: { [Op.iLike]: `%${search}%` } },
        { prenom: { [Op.iLike]: `%${search}%` } },
        { matricule: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await PatientPHP.findAndCountAll({
      where,
      include: [
        { model: Secteur, as: 'secteur', attributes: ['id', 'code', 'nom'] },
        { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Erreur getPatients:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// DÉTAIL PATIENT (avec historique complet)
// ============================================
export const getPatientById = async (req, res) => {
  try {
    const patient = await PatientPHP.findByPk(req.params.id, {
      include: [
        { model: Secteur, as: 'secteur', attributes: ['id', 'code', 'nom'] },
        { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] },
        {
          model: ConsultationPHP,
          as: 'consultations',
          include: [
            { model: User, as: 'medecin', attributes: ['id', 'firstName', 'lastName'] },
            {
              model: HospitalisationPHP, as: 'hospitalisation',
              required: false
            },
            { model: ReposPHP, as: 'repos', required: false },
            { model: OperationPHP, as: 'operation', required: false }
          ],
          order: [['dateConsultation', 'DESC']]
        },
        { model: BonPriseEnCharge, as: 'bons', order: [['dateEmission', 'DESC']] },
        { model: HospitalisationPHP, as: 'hospitalisations' },
        { model: ReposPHP, as: 'repos' }
      ]
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient non trouvé' });
    }

    res.json({ success: true, data: patient });
  } catch (err) {
    console.error('Erreur getPatientById:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// CRÉER UN PATIENT + BON DE PRISE EN CHARGE
// ============================================
export const createPatient = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      matricule, nom, prenom, genre, dateNaissance,
      secteurId, telephone, adresse, notes,
      // Option: générer automatiquement un bon de prise en charge
      genererBon = true,
      serviceDestination, motifVisite
    } = req.body;

    if (!matricule || !nom) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Matricule et nom sont requis' });
    }

    // Vérifier si le patient existe déjà
    const existingPatient = await PatientPHP.findOne({ where: { matricule } });
    if (existingPatient) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: 'Un patient avec ce matricule existe déjà',
        data: existingPatient
      });
    }

    // Récupérer l'infirmerie depuis le secteur (auto-mapping)
    let infirmerieId = null;
    if (secteurId) {
      const secteur = await Secteur.findByPk(secteurId, {
        include: [{ model: Infirmerie, as: 'infirmerie' }]
      });
      if (secteur) {
        infirmerieId = secteur.infirmerieId;
      }
    }

    // Créer le patient
    const patient = await PatientPHP.create({
      matricule: matricule.toUpperCase(),
      nom: nom.toUpperCase(),
      prenom,
      genre,
      dateNaissance,
      secteurId,
      infirmerieId,
      telephone,
      adresse,
      notes,
      createdByUserId: req.user.id
    }, { transaction: t });

    let bon = null;

    // Générer automatiquement un bon de prise en charge
    if (genererBon) {
      const numeroBon = await BonPriseEnCharge.generateNumeroBon();
      const now = new Date();
      const heure = now.toTimeString().split(' ')[0];

      bon = await BonPriseEnCharge.create({
        numeroBon,
        patientId: patient.id,
        dateEmission: now.toISOString().split('T')[0],
        heureEmission: heure,
        serviceDestination: serviceDestination || 'Consultation Médicale',
        motifVisite,
        agentEmetteurId: req.user.id,
        status: 'emis'
      }, { transaction: t });
    }

    await t.commit();

    // Charger le patient complet
    const fullPatient = await PatientPHP.findByPk(patient.id, {
      include: [
        { model: Secteur, as: 'secteur', attributes: ['id', 'code', 'nom'] },
        { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] },
        { model: BonPriseEnCharge, as: 'bons' }
      ]
    });

    console.log(`✅ Patient PHP créé: ${patient.matricule} - ${patient.nom} ${patient.prenom || ''}`);

    res.status(201).json({
      success: true,
      data: fullPatient,
      bon,
      message: `Patient enregistré avec succès${bon ? ` - Bon N° ${bon.numeroBon} généré` : ''}`
    });
  } catch (err) {
    await t.rollback();
    console.error('Erreur createPatient:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// METTRE À JOUR UN PATIENT
// ============================================
export const updatePatient = async (req, res) => {
  try {
    const patient = await PatientPHP.findByPk(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient non trouvé' });
    }

    // Re-mapper l'infirmerie si le secteur change
    if (req.body.secteurId && req.body.secteurId !== patient.secteurId) {
      const secteur = await Secteur.findByPk(req.body.secteurId);
      if (secteur) req.body.infirmerieId = secteur.infirmerieId;
    }

    await patient.update(req.body);

    const updated = await PatientPHP.findByPk(patient.id, {
      include: [
        { model: Secteur, as: 'secteur', attributes: ['id', 'code', 'nom'] },
        { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] }
      ]
    });

    res.json({ success: true, data: updated, message: 'Patient mis à jour avec succès' });
  } catch (err) {
    console.error('Erreur updatePatient:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// RECHERCHE RAPIDE PATIENT PAR MATRICULE
// ============================================
export const searchByMatricule = async (req, res) => {
  try {
    const { matricule } = req.params;

    const patient = await PatientPHP.findOne({
      where: { matricule: { [Op.iLike]: matricule } },
      include: [
        { model: Secteur, as: 'secteur', attributes: ['id', 'code', 'nom'] },
        { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] },
        {
          model: BonPriseEnCharge,
          as: 'bons',
          where: { status: 'emis' },
          required: false,
          order: [['dateEmission', 'DESC']],
          limit: 1
        }
      ]
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Aucun patient avec ce matricule' });
    }

    res.json({ success: true, data: patient });
  } catch (err) {
    console.error('Erreur searchByMatricule:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// GÉNÉRER UN BON DE PRISE EN CHARGE
// ============================================
export const genererBon = async (req, res) => {
  try {
    const patient = await PatientPHP.findByPk(req.params.id, {
      include: [
        { model: Secteur, as: 'secteur' },
        { model: Infirmerie, as: 'infirmerie' }
      ]
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient non trouvé' });
    }

    const { serviceDestination, motifVisite, ticketId } = req.body;
    const numeroBon = await BonPriseEnCharge.generateNumeroBon();
    const now = new Date();

    const bon = await BonPriseEnCharge.create({
      numeroBon,
      patientId: patient.id,
      dateEmission: now.toISOString().split('T')[0],
      heureEmission: now.toTimeString().split(' ')[0],
      serviceDestination: serviceDestination || 'Consultation Médicale',
      motifVisite,
      agentEmetteurId: req.user.id,
      ticketId,
      status: 'emis'
    });

    const fullBon = await BonPriseEnCharge.findByPk(bon.id, {
      include: [
        { model: PatientPHP, as: 'patient',
          include: [
            { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] },
            { model: Secteur, as: 'secteur', attributes: ['id', 'code', 'nom'] }
          ]
        },
        { model: User, as: 'agentEmetteur', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    console.log(`✅ Bon généré: ${numeroBon} pour ${patient.nom}`);

    res.status(201).json({
      success: true,
      data: fullBon,
      message: `Bon de prise en charge N° ${numeroBon} généré`
    });
  } catch (err) {
    console.error('Erreur genererBon:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// HISTORIQUE COMPLET DU PATIENT
// ============================================
export const getHistoriquePatient = async (req, res) => {
  try {
    const patient = await PatientPHP.findByPk(req.params.id, {
      include: [
        { model: Secteur, as: 'secteur' },
        { model: Infirmerie, as: 'infirmerie' },
        {
          model: ConsultationPHP,
          as: 'consultations',
          include: [
            { model: User, as: 'medecin', attributes: ['id', 'firstName', 'lastName'] },
            { model: HospitalisationPHP, as: 'hospitalisation', required: false },
            { model: ReposPHP, as: 'repos', required: false },
            { model: OperationPHP, as: 'operation', required: false }
          ]
        },
        { model: BonPriseEnCharge, as: 'bons' },
        { model: ReposPHP, as: 'repos' },
        { model: HospitalisationPHP, as: 'hospitalisations' }
      ]
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient non trouvé' });
    }

    res.json({ success: true, data: patient });
  } catch (err) {
    console.error('Erreur getHistoriquePatient:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// SUPPRIMER UN PATIENT
// ============================================
export const deletePatient = async (req, res) => {
  try {
    const patient = await PatientPHP.findByPk(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient non trouvé' });
    }

    const { mode = 'desactiver' } = req.query; // 'desactiver' | 'supprimer'

    if (mode === 'supprimer') {
      // Suppression physique — cascade sur consultations, repos, hospit, etc.
      await patient.destroy();
      return res.json({ success: true, message: 'Patient supprimé définitivement' });
    } else {
      // Soft delete : passer en inactif
      await patient.update({ status: 'inactif' });
      return res.json({ success: true, message: 'Patient désactivé', data: patient });
    }
  } catch (err) {
    console.error('Erreur deletePatient:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
