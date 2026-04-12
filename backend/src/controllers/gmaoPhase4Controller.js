// backend/src/controllers/gmaoPhase4Controller.js
// Phase 4: Contrats, Pièces, Acquisitions, Budget
import { Op } from 'sequelize';
import Contrat from '../models/Contrat.js';
import PieceRechange from '../models/PieceRechange.js';
import MouvementPiece from '../models/MouvementPiece.js';
import DemandeAcquisition from '../models/DemandeAcquisition.js';
import BudgetLigne from '../models/BudgetLigne.js';
import BudgetDepense from '../models/BudgetDepense.js';
import Equipement from '../models/Equipement.js';
import User from '../models/User.js';

// ─── CONTRATS ─────────────────────────────────────────────────────────────────

export const getContrats = async (req, res) => {
  try {
    const { statut, search } = req.query;
    const where = {};
    if (statut) where.statut = statut;
    if (search) where.prestataire = { [Op.iLike]: `%${search}%` };

    const contrats = await Contrat.findAll({ where, order: [['date_fin', 'ASC']] });

    // Flag contrats expirant bientôt
    const today = new Date();
    const data = contrats.map(c => {
      const fin = new Date(c.date_fin);
      const joursRestants = Math.ceil((fin - today) / (1000 * 60 * 60 * 24));
      return {
        ...c.toJSON(),
        joursRestants,
        expirationProche: joursRestants <= (c.alerte_renouvellement || 30) && joursRestants > 0,
        expire: joursRestants <= 0,
      };
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createContrat = async (req, res) => {
  try {
    const contrat = await Contrat.create({ ...req.body, created_by: req.user?.id });
    res.status(201).json({ success: true, data: contrat });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateContrat = async (req, res) => {
  try {
    const contrat = await Contrat.findByPk(req.params.id);
    if (!contrat) return res.status(404).json({ success: false, message: 'Contrat introuvable' });
    await contrat.update(req.body);
    res.json({ success: true, data: contrat });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteContrat = async (req, res) => {
  try {
    const contrat = await Contrat.findByPk(req.params.id);
    if (!contrat) return res.status(404).json({ success: false, message: 'Contrat introuvable' });
    await contrat.destroy();
    res.json({ success: true, message: 'Contrat supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PIÈCES DE RECHANGE ───────────────────────────────────────────────────────

export const getPieces = async (req, res) => {
  try {
    const { categorie, search, alerte_stock } = req.query;
    const where = {};
    if (categorie) where.categorie = categorie;
    if (search) {
      where[Op.or] = [
        { designation: { [Op.iLike]: `%${search}%` } },
        { reference: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const pieces = await PieceRechange.findAll({ where, order: [['designation', 'ASC']] });

    const data = pieces.map(p => ({
      ...p.toJSON(),
      stockCritique: p.quantite_stock <= p.quantite_min,
      stockOk: p.quantite_stock > p.quantite_min,
    }));

    const filtered = alerte_stock === 'true' ? data.filter(p => p.stockCritique) : data;
    res.json({ success: true, data: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createPiece = async (req, res) => {
  try {
    const piece = await PieceRechange.create(req.body);
    res.status(201).json({ success: true, data: piece });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updatePiece = async (req, res) => {
  try {
    const piece = await PieceRechange.findByPk(req.params.id);
    if (!piece) return res.status(404).json({ success: false, message: 'Pièce introuvable' });
    await piece.update(req.body);
    res.json({ success: true, data: piece });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deletePiece = async (req, res) => {
  try {
    const piece = await PieceRechange.findByPk(req.params.id);
    if (!piece) return res.status(404).json({ success: false, message: 'Pièce introuvable' });
    await piece.destroy();
    res.json({ success: true, message: 'Pièce supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── MOUVEMENTS DE STOCK ──────────────────────────────────────────────────────

export const getMouvements = async (req, res) => {
  try {
    const { piece_id, type, date_debut, date_fin } = req.query;
    const where = {};
    if (piece_id) where.piece_id = parseInt(piece_id);
    if (type) where.type = type;
    if (date_debut || date_fin) {
      where.date = {};
      if (date_debut) where.date[Op.gte] = date_debut;
      if (date_fin) where.date[Op.lte] = date_fin;
    }

    const mouvements = await MouvementPiece.findAll({
      where,
      include: [
        { model: PieceRechange, as: 'piece', attributes: ['id','reference','designation','unite'] },
        { model: User, as: 'auteur', attributes: ['id','firstName','lastName'] },
      ],
      order: [['date', 'DESC'], ['created_at', 'DESC']],
      limit: 200,
    });
    res.json({ success: true, data: mouvements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createMouvement = async (req, res) => {
  try {
    const { piece_id, type, quantite, date, motif, prix_unitaire, intervention_id } = req.body;
    if (!piece_id || !type || !quantite || !date) {
      return res.status(400).json({ success: false, message: 'piece_id, type, quantite, date requis' });
    }

    const piece = await PieceRechange.findByPk(piece_id);
    if (!piece) return res.status(404).json({ success: false, message: 'Pièce introuvable' });

    // Update stock
    let newStock = piece.quantite_stock;
    if (type === 'entree' || type === 'retour') newStock += parseInt(quantite);
    else if (type === 'sortie') {
      if (piece.quantite_stock < parseInt(quantite)) {
        return res.status(400).json({ success: false, message: 'Stock insuffisant' });
      }
      newStock -= parseInt(quantite);
    } else if (type === 'ajustement') {
      newStock = parseInt(quantite); // absolute value for adjustment
    }

    await piece.update({ quantite_stock: newStock });

    const mouvement = await MouvementPiece.create({
      piece_id, type,
      quantite: parseInt(quantite),
      date, motif, prix_unitaire, intervention_id,
      created_by: req.user?.id,
    });

    res.status(201).json({ success: true, data: { mouvement, newStock } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── DEMANDES D'ACQUISITION ───────────────────────────────────────────────────

export const getAcquisitions = async (req, res) => {
  try {
    const { statut, priorite, search } = req.query;
    const where = {};
    if (statut) where.statut = statut;
    if (priorite) where.priorite = priorite;
    if (search) where.designation = { [Op.iLike]: `%${search}%` };

    const acquisitions = await DemandeAcquisition.findAll({
      where,
      include: [
        { model: User, as: 'demandeur', attributes: ['id','firstName','lastName'], required: false },
        { model: Equipement, as: 'equipement', attributes: ['id','nom','service'], required: false },
      ],
      order: [['date_demande', 'DESC']],
    });
    res.json({ success: true, data: acquisitions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createAcquisition = async (req, res) => {
  try {
    // Auto-generate reference
    const count = await DemandeAcquisition.count();
    const reference = `ACQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const acquisition = await DemandeAcquisition.create({
      ...req.body,
      reference,
      date_demande: req.body.date_demande || new Date().toISOString().split('T')[0],
      demandeur_id: req.user?.id,
      demandeur_nom: req.body.demandeur_nom || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
    });
    res.status(201).json({ success: true, data: acquisition });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateAcquisition = async (req, res) => {
  try {
    const acq = await DemandeAcquisition.findByPk(req.params.id);
    if (!acq) return res.status(404).json({ success: false, message: 'Demande introuvable' });

    // Auto-set dates based on statut changes
    const updates = { ...req.body };
    const today = new Date().toISOString().split('T')[0];
    if (updates.statut === 'approuvee' && !acq.date_approbation) updates.date_approbation = today;
    if (updates.statut === 'commandee' && !acq.date_commande) updates.date_commande = today;
    if (updates.statut === 'receptionnee' && !acq.date_reception) updates.date_reception = today;

    await acq.update(updates);
    res.json({ success: true, data: acq });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteAcquisition = async (req, res) => {
  try {
    const acq = await DemandeAcquisition.findByPk(req.params.id);
    if (!acq) return res.status(404).json({ success: false, message: 'Demande introuvable' });
    await acq.destroy();
    res.json({ success: true, message: 'Demande supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── BUDGET ───────────────────────────────────────────────────────────────────

export const getBudget = async (req, res) => {
  try {
    const annee = parseInt(req.query.annee) || new Date().getFullYear();
    const [lignes, depenses] = await Promise.all([
      BudgetLigne.findAll({ where: { annee }, order: [['categorie', 'ASC']] }),
      BudgetDepense.findAll({ where: { annee }, order: [['date', 'DESC']] }),
    ]);
    const achats   = depenses.filter(d => d.type === 'achat');
    const factures = depenses.filter(d => d.type === 'facture');
    res.json({ success: true, data: { annee, lignes, achats, factures } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createBudgetLigne = async (req, res) => {
  try {
    const ligne = await BudgetLigne.create({ ...req.body, created_by: req.user?.id });
    res.status(201).json({ success: true, data: ligne });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteBudgetLigne = async (req, res) => {
  try {
    const ligne = await BudgetLigne.findByPk(req.params.id);
    if (!ligne) return res.status(404).json({ success: false, message: 'Ligne introuvable' });
    await ligne.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createBudgetDepense = async (req, res) => {
  try {
    const depense = await BudgetDepense.create({ ...req.body, created_by: req.user?.id });
    res.status(201).json({ success: true, data: depense });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteBudgetDepense = async (req, res) => {
  try {
    const dep = await BudgetDepense.findByPk(req.params.id);
    if (!dep) return res.status(404).json({ success: false, message: 'Dépense introuvable' });
    await dep.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── MIGRATION localStorage → BDD ────────────────────────────────────────────
// POST /gmao/budget/migrate — import localStorage data in bulk
export const migrateBudget = async (req, res) => {
  try {
    const { annee, lignes = [], achats = [], factures = [] } = req.body;
    if (!annee) return res.status(400).json({ success: false, message: 'annee requis' });

    // Clear existing data for this year before reimporting
    await BudgetLigne.destroy({ where: { annee } });
    await BudgetDepense.destroy({ where: { annee } });

    // Import lignes
    if (lignes.length > 0) {
      await BudgetLigne.bulkCreate(lignes.map(l => ({
        annee, categorie: l.categorie, montant: parseFloat(l.montant) || 0,
        description: l.description || null, created_by: req.user?.id
      })));
    }

    // Import achats
    if (achats.length > 0) {
      await BudgetDepense.bulkCreate(achats.map(a => ({
        annee, type: 'achat',
        date: a.date || new Date().toISOString().split('T')[0],
        description: a.description, categorie: a.categorie,
        montant: parseFloat(a.montant) || 0, fournisseur: a.fournisseur || null,
        created_by: req.user?.id
      })));
    }

    // Import factures
    if (factures.length > 0) {
      await BudgetDepense.bulkCreate(factures.map(f => ({
        annee, type: 'facture',
        date: f.date_facture || new Date().toISOString().split('T')[0],
        description: f.prestataire, fournisseur: f.prestataire,
        numero_facture: f.numero || null,
        montant: parseFloat(f.montant_ttc) || 0,
        montant_ht: parseFloat(f.montant_ht) || null,
        tva: parseFloat(f.tva) || null,
        statut_facture: f.statut || 'en_attente',
        created_by: req.user?.id
      })));
    }

    const totalImported = lignes.length + achats.length + factures.length;
    res.json({ success: true, message: `Migration OK : ${totalImported} entrées importées pour ${annee}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
