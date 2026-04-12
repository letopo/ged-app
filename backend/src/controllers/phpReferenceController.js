// backend/src/controllers/phpReferenceController.js - Module PHP
// Gestion des données de référence : Infirmeries, Secteurs, Services

import { Infirmerie, Secteur } from '../models/index.js';
import { Op } from 'sequelize';

// ============================================
// INFIRMERIES
// ============================================

export const getInfirmeries = async (req, res) => {
  try {
    const infirmeries = await Infirmerie.findAll({
      where: { isActive: true },
      include: [
        {
          model: Secteur,
          as: 'secteurs',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'code', 'nom']
        }
      ],
      order: [['nom', 'ASC']]
    });

    res.json({ success: true, data: infirmeries });
  } catch (err) {
    console.error('Erreur getInfirmeries:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getInfirmerieById = async (req, res) => {
  try {
    const infirmerie = await Infirmerie.findByPk(req.params.id, {
      include: [{ model: Secteur, as: 'secteurs', where: { isActive: true }, required: false }]
    });

    if (!infirmerie) {
      return res.status(404).json({ success: false, message: 'Infirmerie non trouvée' });
    }

    res.json({ success: true, data: infirmerie });
  } catch (err) {
    console.error('Erreur getInfirmerieById:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createInfirmerie = async (req, res) => {
  try {
    const { code, nom, localisation, responsable, telephone } = req.body;

    if (!code || !nom) {
      return res.status(400).json({ success: false, message: 'Code et nom sont requis' });
    }

    const existing = await Infirmerie.findOne({ where: { code: code.toUpperCase() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Ce code infirmerie existe déjà' });
    }

    const infirmerie = await Infirmerie.create({
      code: code.toUpperCase(),
      nom,
      localisation,
      responsable,
      telephone
    });

    res.status(201).json({ success: true, data: infirmerie, message: 'Infirmerie créée avec succès' });
  } catch (err) {
    console.error('Erreur createInfirmerie:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateInfirmerie = async (req, res) => {
  try {
    const infirmerie = await Infirmerie.findByPk(req.params.id);
    if (!infirmerie) {
      return res.status(404).json({ success: false, message: 'Infirmerie non trouvée' });
    }

    await infirmerie.update(req.body);
    res.json({ success: true, data: infirmerie, message: 'Infirmerie mise à jour' });
  } catch (err) {
    console.error('Erreur updateInfirmerie:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// SECTEURS
// ============================================

export const getSecteurs = async (req, res) => {
  try {
    const { infirmerieId } = req.query;
    const where = { isActive: true };
    if (infirmerieId) where.infirmerieId = infirmerieId;

    const secteurs = await Secteur.findAll({
      where,
      include: [
        {
          model: Infirmerie,
          as: 'infirmerie',
          attributes: ['id', 'code', 'nom']
        }
      ],
      order: [['nom', 'ASC']]
    });

    res.json({ success: true, data: secteurs });
  } catch (err) {
    console.error('Erreur getSecteurs:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSecteur = async (req, res) => {
  try {
    const { code, nom, infirmerieId } = req.body;

    if (!code || !nom || !infirmerieId) {
      return res.status(400).json({ success: false, message: 'Code, nom et infirmerieId sont requis' });
    }

    const infirmerie = await Infirmerie.findByPk(infirmerieId);
    if (!infirmerie) {
      return res.status(404).json({ success: false, message: 'Infirmerie introuvable' });
    }

    const existing = await Secteur.findOne({ where: { code: code.toUpperCase() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Ce code secteur existe déjà' });
    }

    const secteur = await Secteur.create({ code: code.toUpperCase(), nom, infirmerieId });

    const full = await Secteur.findByPk(secteur.id, {
      include: [{ model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] }]
    });

    res.status(201).json({ success: true, data: full, message: 'Secteur créé avec succès' });
  } catch (err) {
    console.error('Erreur createSecteur:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSecteur = async (req, res) => {
  try {
    const secteur = await Secteur.findByPk(req.params.id);
    if (!secteur) {
      return res.status(404).json({ success: false, message: 'Secteur non trouvé' });
    }
    await secteur.update(req.body);
    res.json({ success: true, data: secteur, message: 'Secteur mis à jour' });
  } catch (err) {
    console.error('Erreur updateSecteur:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// SERVICES MÉDICAUX PHP (liste statique enrichie)
// ============================================

export const getServicesMedicaux = async (req, res) => {
  try {
    // Lire depuis la table php_services_medicaux si elle existe
    const [rows] = await (await import('../config/database.js')).default.query(
      "SELECT code, nom FROM php_services_medicaux WHERE actif = true ORDER BY nom"
    );
    if (rows && rows.length > 0) {
      return res.json({ success: true, data: rows });
    }
  } catch (_) {
    // Fallback statique si la table n'existe pas encore
  }

  // Fallback statique complet incluant PMI et SAU
  const services = [
    { code: 'MEDECINE',       nom: 'Médecine Générale' },
    { code: 'CHIRURGIE',      nom: 'Chirurgie' },
    { code: 'GYNECOLOGIE',    nom: 'Gynécologie / Maternité' },
    { code: 'PMI',            nom: 'PMI' },
    { code: 'SAU',            nom: 'SAU (Urgences)' },
    { code: 'UROLOGIE',       nom: 'Urologie' },
    { code: 'CARDIOLOGIE',    nom: 'Cardiologie' },
    { code: 'ORL',            nom: 'ORL' },
    { code: 'OPHTALMOLOGIE',  nom: 'Ophtalmologie' },
    { code: 'KINESITHERAPIE', nom: 'Kinésithérapie' },
    { code: 'GASTROENTERO',   nom: 'Gastroentérologie' },
    { code: 'UPEC',           nom: 'UPEC' },
    { code: 'ANESTHESIE',     nom: 'Anesthésie / Réanimation' },
    { code: 'NEUROLOGIE',     nom: 'Neurologie' },
    { code: 'DERMATOLOGIE',   nom: 'Dermatologie' },
    { code: 'DENTISTERIE',    nom: 'Dentisterie' },
    { code: 'RADIOLOGIE',     nom: 'Radiologie / Imagerie' },
  ];
  res.json({ success: true, data: services });
};
