// backend/src/controllers/listController.js
import Service from '../models/Service.js';
import Motif from '../models/Motif.js';

// ========== SERVICES ==========
export const getServices = async (req, res) => {
  try {
    const services = await Service.findAll({
      order: [['name', 'ASC']],
    });
    res.json({ success: true, data: services });
  } catch (error) {
    console.error('❌ Erreur récupération services:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

export const createService = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Le nom du service est requis.' });
    }
    const service = await Service.create({ name, code });
    res.status(201).json({ success: true, data: service, message: 'Service créé avec succès.' });
  } catch (error) {
    console.error('❌ Erreur création service:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ========== MOTIFS ==========
export const getMotifs = async (req, res) => {
  try {
    const { type } = req.params; // 'MG' ou 'Biomedical'
    
    if (!type || !['MG', 'Biomedical'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Type invalide. Utilisez MG ou Biomedical.' 
      });
    }

    const motifs = await Motif.findAll({
      where: { type },
      order: [['name', 'ASC']],
    });

    res.json({ success: true, data: motifs });
  } catch (error) {
    console.error('❌ Erreur récupération motifs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

export const createMotif = async (req, res) => {
  try {
    const { name, type } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le nom et le type sont requis.' 
      });
    }

    if (!['MG', 'Biomedical'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Type invalide. Utilisez MG ou Biomedical.' 
      });
    }

    const motif = await Motif.create({ name, type });
    res.status(201).json({ success: true, data: motif, message: 'Motif créé avec succès.' });
  } catch (error) {
    console.error('❌ Erreur création motif:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};