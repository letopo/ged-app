// backend/src/controllers/phpFactureController.js — Module factures PHP (secrétaire)
import path from 'path';
import fs from 'fs/promises';
import { PhpFacture, Document, User } from '../models/index.js';
import { extractInvoiceFields } from '../services/invoiceExtractionService.js';

// Résout le chemin disque d'un document (filePath est relatif, ex: uploads/xxx)
const resolveDocPath = (doc) => path.resolve(process.cwd(), doc.filePath);

// Prochain numéro d'ordre (N° DATE) — max + 1
const nextNumeroOrdre = async () => {
  const max = await PhpFacture.max('numeroOrdre');
  return (Number.isFinite(max) ? max : 0) + 1;
};

// ── POST /api/php/factures/extract ───────────────────────────────────────────
// Importe la pièce scannée dans la GED (Document) PUIS lance l'extraction IA.
// Ne crée PAS encore la ligne de facture : la secrétaire valide/corrige d'abord.
// multipart/form-data, champ « file ».
export const extractFromUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier reçu (champ « file »).' });
    }

    const relPath = `uploads/${req.file.filename}`;
    const mimeType = req.file.mimetype;

    // 1) Archiver la pièce dans la GED
    const document = await Document.create({
      title: req.file.originalname || 'Facture prestataire',
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: relPath,
      fileSize: req.file.size,
      fileType: mimeType,
      userId: req.user.id,
      category: 'Facture PHP',
      status: 'approved',
    });

    // 2) Extraction IA
    let fields = null;
    let extractionError = null;
    try {
      fields = await extractInvoiceFields(resolveDocPath(document), mimeType);
    } catch (e) {
      extractionError = e.message;
      console.error('⚠️ Extraction facture échouée :', e.message);
    }

    const suggestedNumeroOrdre = await nextNumeroOrdre();

    res.status(201).json({
      documentId: document.id,
      fields,              // null si l'extraction a échoué (saisie manuelle possible)
      extractionError,     // message d'erreur éventuel (ex: clé API manquante)
      suggestedNumeroOrdre,
      dateReception: new Date().toISOString().slice(0, 10),
    });
  } catch (err) {
    console.error('Erreur extractFromUpload:', err);
    res.status(500).json({ message: 'Erreur serveur lors de l\'import/extraction.' });
  }
};

// ── POST /api/php/factures/:documentId/reextract ─────────────────────────────
// Relance l'extraction sur une pièce déjà importée (sans recréer le Document).
export const reextract = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.documentId);
    if (!document) return res.status(404).json({ message: 'Document introuvable.' });
    const fields = await extractInvoiceFields(resolveDocPath(document), document.fileType);
    res.json({ fields });
  } catch (err) {
    console.error('Erreur reextract:', err);
    const status = err.code === 'NO_API_KEY' ? 400 : 500;
    res.status(status).json({ message: err.message });
  }
};

// ── POST /api/php/factures ───────────────────────────────────────────────────
// Enregistre la ligne validée par la secrétaire.
export const create = async (req, res) => {
  try {
    const {
      documentId, numeroOrdre, dateReception, fournisseur, dateFacture,
      numeroFacture, numeroComptable, montant, devise, statut, extraction,
    } = req.body;

    const facture = await PhpFacture.create({
      documentId: documentId || null,
      numeroOrdre: numeroOrdre || await nextNumeroOrdre(),
      dateReception: dateReception || new Date().toISOString().slice(0, 10),
      fournisseur: fournisseur || null,
      dateFacture: dateFacture || null,
      numeroFacture: numeroFacture || null,
      numeroComptable: numeroComptable || null,
      montant: (montant === '' || montant == null) ? null : montant,
      devise: devise || 'XAF',
      statut: statut || 'valide',
      extraction: extraction || null,
      saisiPar: req.user.id,
    });

    res.status(201).json({ data: facture });
  } catch (err) {
    console.error('Erreur create facture PHP:', err);
    res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement.' });
  }
};

// ── GET /api/php/factures ────────────────────────────────────────────────────
export const list = async (req, res) => {
  try {
    const factures = await PhpFacture.findAll({
      order: [['numeroOrdre', 'DESC'], ['createdAt', 'DESC']],
      include: [
        { model: Document, as: 'document', attributes: ['id', 'title', 'fileName', 'filePath'] },
        { model: User, as: 'saisiParUser', attributes: ['id', 'firstName', 'lastName', 'username'] },
      ],
    });
    res.json({ data: factures });
  } catch (err) {
    console.error('Erreur list factures PHP:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ── GET /api/php/factures/:id ────────────────────────────────────────────────
export const getOne = async (req, res) => {
  try {
    const facture = await PhpFacture.findByPk(req.params.id, {
      include: [{ model: Document, as: 'document', attributes: ['id', 'title', 'fileName', 'filePath'] }],
    });
    if (!facture) return res.status(404).json({ message: 'Facture introuvable.' });
    res.json({ data: facture });
  } catch (err) {
    console.error('Erreur getOne facture PHP:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ── PUT /api/php/factures/:id ────────────────────────────────────────────────
export const update = async (req, res) => {
  try {
    const facture = await PhpFacture.findByPk(req.params.id);
    if (!facture) return res.status(404).json({ message: 'Facture introuvable.' });

    const fields = [
      'numeroOrdre', 'dateReception', 'fournisseur', 'dateFacture',
      'numeroFacture', 'numeroComptable', 'montant', 'devise', 'statut',
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        facture[f] = (req.body[f] === '' && f === 'montant') ? null : req.body[f];
      }
    }
    await facture.save();
    res.json({ data: facture });
  } catch (err) {
    console.error('Erreur update facture PHP:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ── DELETE /api/php/factures/:id ─────────────────────────────────────────────
export const remove = async (req, res) => {
  try {
    const facture = await PhpFacture.findByPk(req.params.id);
    if (!facture) return res.status(404).json({ message: 'Facture introuvable.' });
    await facture.destroy();
    res.json({ message: 'Facture supprimée.' });
  } catch (err) {
    console.error('Erreur remove facture PHP:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ── GET /api/php/factures/export.csv ─────────────────────────────────────────
// Export CSV compatible Excel FR (séparateur « ; », BOM UTF-8).
export const exportCsv = async (req, res) => {
  try {
    const factures = await PhpFacture.findAll({ order: [['numeroOrdre', 'ASC']] });
    const headers = ['N° DATE', 'DATE', 'DESIGNATION', 'DATE FACTURE', 'N° FACTURE', 'N° C', 'MONTANT'];
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = factures.map(f => [
      f.numeroOrdre ?? '', f.dateReception ?? '', f.fournisseur ?? '',
      f.dateFacture ?? '', f.numeroFacture ?? '', f.numeroComptable ?? '',
      f.montant ?? '',
    ].map(esc).join(';'));

    const csv = '﻿' + [headers.join(';'), ...rows].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="factures_php.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Erreur export CSV factures PHP:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export default { extractFromUpload, reextract, create, list, getOne, update, remove, exportCsv };
