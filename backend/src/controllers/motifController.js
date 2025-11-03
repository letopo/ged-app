// src/controllers/motifController.js

import { Motif } from '../models/index.js';
import { Op } from 'sequelize';

// GET /api/lists/motifs
export const getMotifs = async (req, res, next) => {
  try {
    const { type } = req.query;
    if (!type || !['MG', 'Biomedical'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Le type ('MG' ou 'Biomedical') est requis."
      });
    }
    const motifs = await Motif.findAll({
      where: { type },
      order: [['name', 'ASC']]
    });
    res.status(200).json({ success: true, data: motifs });
  } catch (error) {
    next(error);
  }
};

// POST /api/lists/motifs
export const createMotif = async (req, res, next) => {
  try {
    const { name, type } = req.body;
    if (!name || !type || !['MG', 'Biomedical'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Le nom et le type sont requis."
      });
    }
    const existingMotif = await Motif.findOne({
      where: { name: { [Op.iLike]: name }, type }
    });
    if (existingMotif) {
      return res.status(200).json({
        success: true,
        data: existingMotif,
        message: "Le motif existe déjà."
      });
    }
    const newMotif = await Motif.create({ name, type });
    res.status(201).json({
      success: true,
      data: newMotif,
      message: 'Motif créé avec succès.'
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/lists/motifs/:motifId
export const updateMotif = async (req, res, next) => {
  // TODO: Implémenter la logique de mise à jour d'un motif
  res.status(501).json({ message: 'Fonction non implémentée.' });
};

// DELETE /api/lists/motifs/:motifId
export const deleteMotif = async (req, res, next) => {
  // TODO: Implémenter la logique de suppression d'un motif
  res.status(501).json({ message: 'Fonction non implémentée.' });
};