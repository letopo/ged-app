// backend/src/controllers/phpConsultationController.js - Module PHP
// Gestion des consultations, hospitalisations, repos, opérations

import {
  PatientPHP, ConsultationPHP, BonPriseEnCharge, HospitalisationPHP,
  ReposPHP, OperationPHP, DecesTransfertPHP, Infirmerie, Secteur, User
} from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../models/index.js';

// ============================================
// LISTER LES CONSULTATIONS
// ============================================
export const getConsultations = async (req, res) => {
  try {
    const {
      date, dateDebut, dateFin, resultat, serviceName,
      patientId, page = 1, limit = 50
    } = req.query;

    const where = {};
    if (patientId) where.patientId = patientId;
    if (resultat) where.resultat = resultat;
    if (serviceName) where.serviceName = { [Op.iLike]: `%${serviceName}%` };

    if (date) {
      where.dateConsultation = date;
    } else if (dateDebut || dateFin) {
      where.dateConsultation = {};
      if (dateDebut) where.dateConsultation[Op.gte] = dateDebut;
      if (dateFin) where.dateConsultation[Op.lte] = dateFin;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await ConsultationPHP.findAndCountAll({
      where,
      include: [
        {
          model: PatientPHP,
          as: 'patient',
          include: [
            { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] },
            { model: Secteur, as: 'secteur', attributes: ['id', 'code', 'nom'] }
          ]
        },
        { model: User, as: 'medecin', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'agentAccueil', attributes: ['id', 'firstName', 'lastName'] },
        { model: BonPriseEnCharge, as: 'bon', required: false },
        { model: HospitalisationPHP, as: 'hospitalisation', required: false },
        { model: ReposPHP, as: 'repos', required: false },
        { model: OperationPHP, as: 'operation', required: false }
      ],
      order: [['dateConsultation', 'DESC'], ['heureArrivee', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (err) {
    console.error('Erreur getConsultations:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// ENREGISTRER UNE CONSULTATION
// ============================================
export const createConsultation = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      patientId, bonPriseEnChargeId, dateConsultation, heureArrivee,
      heureDebutConsultation, heureFinConsultation,
      serviceName, medecinId, medecinNom, motif, notes
    } = req.body;

    if (!patientId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'patientId est requis' });
    }

    const patient = await PatientPHP.findByPk(patientId);
    if (!patient) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Patient non trouvé' });
    }

    // Calculer la durée d'attente
    let dureeAttenteMinutes = null;
    if (heureArrivee && heureDebutConsultation) {
      const [ha, ma] = heureArrivee.split(':').map(Number);
      const [hd, md] = heureDebutConsultation.split(':').map(Number);
      dureeAttenteMinutes = (hd * 60 + md) - (ha * 60 + ma);
      if (dureeAttenteMinutes < 0) dureeAttenteMinutes += 24 * 60; // passage minuit
    }

    const today = new Date().toISOString().split('T')[0];

    const consultation = await ConsultationPHP.create({
      patientId,
      bonPriseEnChargeId,
      dateConsultation: dateConsultation || today,
      heureArrivee,
      heureDebutConsultation,
      heureFinConsultation,
      dureeAttenteMinutes,
      serviceName,
      medecinId,
      medecinNom,
      motif,
      resultat: 'en_cours',
      agentAccueilId: req.user.id,
      notes
    }, { transaction: t });

    // Marquer le bon comme utilisé
    if (bonPriseEnChargeId) {
      await BonPriseEnCharge.update(
        { status: 'utilise' },
        { where: { id: bonPriseEnChargeId }, transaction: t }
      );
    }

    await t.commit();

    const fullConsultation = await ConsultationPHP.findByPk(consultation.id, {
      include: [
        { model: PatientPHP, as: 'patient',
          include: [
            { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] },
            { model: Secteur, as: 'secteur', attributes: ['id', 'code', 'nom'] }
          ]
        },
        { model: User, as: 'medecin', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    console.log(`✅ Consultation créée: ${consultation.id} - Patient ${patient.nom}`);
    res.status(201).json({ success: true, data: fullConsultation, message: 'Consultation enregistrée' });
  } catch (err) {
    await t.rollback();
    console.error('Erreur createConsultation:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// CLÔTURER UNE CONSULTATION (avec résultat)
// ============================================
export const cloturerConsultation = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      // Nouveau : tableau de parcours (multi-sélection)
      resultats,
      // Résultat principal (le plus prioritaire de la liste)
      resultat,
      diagnostic, ordonnance, medecinNom, medecinId,
      heureFinConsultation, notes,
      // Si hospitalisation
      serviceHospitalisation, numeroChambre, dateEntree,
      // Si repos maladie
      dateDebut, dateFin, motifRepos,
      // Si opération
      typeOperation, dateOperation, chirurgienNom,
      // Si décès/transfert
      dateDeces, causeDeces, destination, motifTransfert
    } = req.body;

    // Normaliser : si multi-sélection envoyée, l'utiliser ; sinon fallback mono
    const parcoursListe = Array.isArray(resultats) && resultats.length > 0
      ? resultats
      : (resultat ? [resultat] : []);

    const consultation = await ConsultationPHP.findByPk(id);
    if (!consultation) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Consultation non trouvée' });
    }

    // Calculer durée si heure de fin fournie
    let dureeAttenteMinutes = consultation.dureeAttenteMinutes;
    if (heureFinConsultation && consultation.heureArrivee) {
      const [ha, ma] = consultation.heureArrivee.split(':').map(Number);
      const [hf, mf] = heureFinConsultation.split(':').map(Number);
      dureeAttenteMinutes = (hf * 60 + mf) - (ha * 60 + ma);
    }

    const today = new Date().toISOString().split('T')[0];

    // Stocker le parcours complet (JSON) dans ordonnance pour l'affichage
    // Si spécialiste envoyé, ordonnance contient le nom de la spécialité — on enrichit
    const parcoursJson = JSON.stringify(parcoursListe);
    const ordonnanceFinal = ordonnance || (parcoursListe.length > 1 ? parcoursJson : null);

    // Résultat principal = premier de la liste par priorité
    const PRIORITE = ['hospitalisation', 'repos', 'operation', 'specialiste', 'radiologie', 'laboratoire', 'pharmacie', 'deces', 'transfert'];
    const resultatFinal = resultat
      || PRIORITE.find(p => parcoursListe.includes(p))
      || parcoursListe[0]
      || 'en_cours';

    // Mettre à jour la consultation
    await consultation.update({
      resultat: resultatFinal,
      diagnostic,
      ordonnance: ordonnanceFinal,
      notes,
      medecinNom: medecinNom || consultation.medecinNom,
      medecinId: medecinId || consultation.medecinId,
      heureFinConsultation,
      dureeAttenteMinutes
    }, { transaction: t });

    // Créer les entités pour CHAQUE parcours sélectionné qui le nécessite
    for (const parcours of parcoursListe) {
      switch (parcours) {
        case 'hospitalisation': {
          await HospitalisationPHP.create({
            patientId: consultation.patientId,
            consultationId: consultation.id,
            serviceHospitalisation,
            numeroChambre,
            dateEntree: dateEntree || today,
            diagnostic,
            status: 'en_cours'
          }, { transaction: t });
          break;
        }
        case 'repos': {
          if (dateDebut && dateFin) {
            const debut = new Date(dateDebut);
            const fin   = new Date(dateFin);
            const dureeJours = Math.round((fin - debut) / (1000 * 60 * 60 * 24)) + 1;
            await ReposPHP.create({
              patientId: consultation.patientId,
              consultationId: consultation.id,
              dateDebut,
              dateFin,
              dureeJours,
              motif: motifRepos || diagnostic,
              medecinId: medecinId || consultation.medecinId,
              medecinNom: medecinNom || consultation.medecinNom,
              status: 'en_cours'
            }, { transaction: t });
          }
          break;
        }
        case 'operation': {
          await OperationPHP.create({
            patientId: consultation.patientId,
            consultationId: consultation.id,
            typeOperation,
            dateOperation: dateOperation || today,
            chirurgienNom,
            diagnostic,
            status: 'planifiee'
          }, { transaction: t });
          break;
        }
        case 'deces': {
          await DecesTransfertPHP.create({
            patientId: consultation.patientId,
            consultationId: consultation.id,
            type: 'deces',
            date: dateDeces || today,
            causesDeces: causeDeces || diagnostic,
            motif: causeDeces,
            enregistreParId: req.user.id
          }, { transaction: t });
          await PatientPHP.update(
            { status: 'decede' },
            { where: { id: consultation.patientId }, transaction: t }
          );
          break;
        }
        case 'transfert': {
          await DecesTransfertPHP.create({
            patientId: consultation.patientId,
            consultationId: consultation.id,
            type: 'transfert',
            date: today,
            destination,
            motif: motifTransfert || diagnostic,
            enregistreParId: req.user.id
          }, { transaction: t });
          await PatientPHP.update(
            { status: 'transfere' },
            { where: { id: consultation.patientId }, transaction: t }
          );
          break;
        }
        // pharmacie, laboratoire, radiologie, specialiste :
        // pas d'entité distincte — stockés via resultat + ordonnance
        default: break;
      }
    }

    await t.commit();

    const fullConsultation = await ConsultationPHP.findByPk(consultation.id, {
      include: [
        { model: PatientPHP, as: 'patient',
          include: [
            { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] }
          ]
        },
        { model: HospitalisationPHP, as: 'hospitalisation', required: false },
        { model: ReposPHP, as: 'repos', required: false },
        { model: OperationPHP, as: 'operation', required: false }
      ]
    });

    console.log(`✅ Consultation clôturée: ${id} - Résultat: ${resultat}`);
    res.json({ success: true, data: fullConsultation, message: `Consultation clôturée : ${resultat}` });
  } catch (err) {
    await t.rollback();
    console.error('Erreur cloturerConsultation:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// HOSPITALISATION - Clôturer un séjour
// ============================================
export const cloturerHospitalisation = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateSortie, status, notes } = req.body;

    const hosp = await HospitalisationPHP.findByPk(id);
    if (!hosp) {
      return res.status(404).json({ success: false, message: 'Hospitalisation non trouvée' });
    }

    const sortie = dateSortie || new Date().toISOString().split('T')[0];
    const entree = new Date(hosp.dateEntree);
    const sortieDate = new Date(sortie);
    const dureeSejour = Math.round((sortieDate - entree) / (1000 * 60 * 60 * 24));

    await hosp.update({ dateSortie: sortie, dureeSejour, status: status || 'sorti', notes });

    res.json({ success: true, data: hosp, message: 'Hospitalisation clôturée' });
  } catch (err) {
    console.error('Erreur cloturerHospitalisation:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// REPOS - Prolonger un repos maladie
// ============================================
export const prolongerRepos = async (req, res) => {
  try {
    const { id } = req.params;
    const { nouvelleDate, motif } = req.body;

    const repos = await ReposPHP.findByPk(id, {
      include: [{ model: PatientPHP, as: 'patient' }]
    });
    if (!repos) {
      return res.status(404).json({ success: false, message: 'Repos non trouvé' });
    }

    const ancienneFin = repos.dateFin;
    const nouvelleFin = new Date(nouvelleDate);
    const ancienneFinDate = new Date(ancienneFin);
    const prolongationDuree = Math.round((nouvelleFin - ancienneFinDate) / (1000 * 60 * 60 * 24));

    const prolongations = repos.prolongations || [];
    prolongations.push({
      dateProlongation: new Date().toISOString().split('T')[0],
      ancienneFin,
      nouvelleFin: nouvelleDate,
      dureeJours: prolongationDuree,
      motif
    });

    const newTotalDuree = (repos.dureeJours || 0) + prolongationDuree;

    await repos.update({
      dateFin: nouvelleDate,
      dureeJours: newTotalDuree,
      status: 'prolonge',
      prolongations
    });

    console.log(`✅ Repos prolongé: ${id} jusqu'au ${nouvelleDate}`);
    res.json({ success: true, data: repos, message: `Repos prolongé jusqu'au ${nouvelleDate}` });
  } catch (err) {
    console.error('Erreur prolongerRepos:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// REPOS EN COURS (tableau de bord)
// ============================================
export const getReposEnCours = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const repos = await ReposPHP.findAll({
      where: {
        status: { [Op.in]: ['en_cours', 'prolonge'] },
        dateFin: { [Op.gte]: today }
      },
      include: [
        {
          model: PatientPHP,
          as: 'patient',
          include: [
            { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] },
            { model: Secteur, as: 'secteur', attributes: ['id', 'code', 'nom'] }
          ]
        }
      ],
      order: [['dateFin', 'ASC']]
    });

    res.json({ success: true, data: repos });
  } catch (err) {
    console.error('Erreur getReposEnCours:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// HOSPITALISATIONS EN COURS
// ============================================
export const getHospitalisationsEnCours = async (req, res) => {
  try {
    const hospitalisations = await HospitalisationPHP.findAll({
      where: { status: 'en_cours' },
      include: [
        {
          model: PatientPHP,
          as: 'patient',
          include: [
            { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] },
            { model: Secteur, as: 'secteur', attributes: ['id', 'code', 'nom'] }
          ]
        }
      ],
      order: [['dateEntree', 'DESC']]
    });

    res.json({ success: true, data: hospitalisations });
  } catch (err) {
    console.error('Erreur getHospitalisationsEnCours:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
