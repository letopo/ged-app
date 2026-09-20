// backend/src/controllers/sageFactureController.js — Supervision des factures
// patient PHP importées automatiquement depuis Sage (voir utils/sageFactureSync.js)
// + export du fichier de paiement pour la CCG.
//
// Ne pas confondre avec phpFactureController.js (factures FOURNISSEURS
// scannées par la secrétaire — module totalement différent).

import { Op } from 'sequelize';
import { SageFactureImport, Document, Workflow, User } from '../models/index.js';

// ── GET /api/sage-factures ───────────────────────────────────────────────────
// Liste de supervision toutes étapes confondues (complète "Mes tâches", qui
// ne montre que ce qui est en attente pour l'utilisateur connecté).
export const list = async (req, res) => {
  try {
    const { patient, from, to } = req.query;

    const where = {};
    if (patient) where.patientNom = { [Op.iLike]: `%${patient}%` };
    if (from || to) {
      where.importedAt = {};
      if (from) where.importedAt[Op.gte] = new Date(from);
      if (to) where.importedAt[Op.lte] = new Date(`${to}T23:59:59`);
    }

    const imports = await SageFactureImport.findAll({
      where,
      order: [['importedAt', 'DESC']],
      include: [{
        model: Document,
        as: 'document',
        attributes: ['id', 'title', 'status', 'filePath'],
        include: [{
          model: Workflow,
          as: 'workflows',
          attributes: ['id', 'step', 'status', 'validatorId'],
          include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName'] }],
        }],
      }],
    });

    const data = imports.map(imp => {
      const plain = imp.toJSON();
      const workflows = (plain.document?.workflows || []).sort((a, b) => a.step - b.step);
      const currentStep = workflows.find(w => w.status === 'pending' || w.status === 'queued');
      const fullyApproved = workflows.length > 0 && workflows.every(w => w.status === 'approved');
      const rejected = workflows.some(w => w.status === 'rejected');
      return {
        ...plain,
        circuitStatus: rejected ? 'rejected' : fullyApproved ? 'approved' : 'en_cours',
        etapeEnCours: currentStep ? { label: currentStep.validator ? `${currentStep.validator.firstName} ${currentStep.validator.lastName}` : null, step: currentStep.step } : null,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('Erreur list sage-factures:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── GET /api/sage-factures/export-paiement?from=&to= ─────────────────────────
// Fichier de paiement CCG : décompte des factures entièrement validées sur la
// période + total de la liasse. CSV compatible Excel FR (même pattern que
// phpFactureController.exportCsv).
export const exportPaiement = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'Paramètres from/to (dates) requis.' });
    }

    const imports = await SageFactureImport.findAll({
      where: {
        importedAt: { [Op.gte]: new Date(from), [Op.lte]: new Date(`${to}T23:59:59`) },
      },
      include: [{
        model: Document,
        as: 'document',
        attributes: ['id'],
        include: [{ model: Workflow, as: 'workflows', attributes: ['status'] }],
      }],
      order: [['sageDocPiece', 'ASC']],
    });

    const approved = imports.filter(imp => {
      const workflows = imp.document?.workflows || [];
      return workflows.length > 0 && workflows.every(w => w.status === 'approved');
    });

    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = ['N° Pièce Sage', 'Patient', 'Montant HT', 'Montant TTC'];
    const rows = approved.map(imp => [
      imp.sageDocPiece, imp.patientNom ?? '', imp.montantHT ?? '', imp.montantTTC ?? '',
    ].map(esc).join(';'));

    const total = approved.reduce((sum, imp) => sum + (Number(imp.montantTTC) || 0), 0);
    rows.push(['', '', '', ''].map(esc).join(';'));
    rows.push(['TOTAL LIASSE', '', '', esc(total)].join(';'));

    const csv = '﻿' + [headers.join(';'), ...rows].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="fichier_paiement_php_${from}_${to}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Erreur export paiement sage-factures:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

export default { list, exportPaiement };
