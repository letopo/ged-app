// backend/src/controllers/comptaController.js — Module Comptabilité (pièces de caisse)
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ComptaDoc, Document, User } from '../models/index.js';
import { extractComptaFields } from '../services/comptaExtractionService.js';

const resolveDocPath = (doc) => path.resolve(process.cwd(), doc.filePath);

const nextNumeroOrdre = async () => {
  const max = await ComptaDoc.max('numeroOrdre');
  return (Number.isFinite(max) ? max : 0) + 1;
};

// ── POST /api/compta/extract ─────────────────────────────────────────────────
export const extractFromUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu (champ « file »).' });

    const relPath = `uploads/${req.file.filename}`;
    const mimeType = req.file.mimetype;

    const document = await Document.create({
      title: req.file.originalname || 'Pièce comptable',
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: relPath,
      fileSize: req.file.size,
      fileType: mimeType,
      userId: req.user.id,
      category: 'Pièce comptable',
      status: 'approved',
    });

    let fields = null;
    let extractionError = null;
    try {
      fields = await extractComptaFields(resolveDocPath(document), mimeType);
    } catch (e) {
      extractionError = e.message;
      console.error('⚠️ Extraction pièce comptable échouée :', e.message);
    }

    res.status(201).json({
      documentId: document.id,
      fields,
      extractionError,
      suggestedNumeroOrdre: await nextNumeroOrdre(),
      dateReception: new Date().toISOString().slice(0, 10),
    });
  } catch (err) {
    console.error('Erreur extractFromUpload compta:', err);
    res.status(500).json({ message: "Erreur serveur lors de l'import/extraction." });
  }
};

// ── POST /api/compta/:documentId/reextract ───────────────────────────────────
export const reextract = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.documentId);
    if (!document) return res.status(404).json({ message: 'Document introuvable.' });
    const fields = await extractComptaFields(resolveDocPath(document), document.fileType);
    res.json({ fields });
  } catch (err) {
    console.error('Erreur reextract compta:', err);
    res.status(err.code === 'NO_API_KEY' ? 400 : 500).json({ message: err.message });
  }
};

// ── POST /api/compta ─────────────────────────────────────────────────────────
export const create = async (req, res) => {
  try {
    const {
      documentId, numeroOrdre, dateReception, libelle, datePiece,
      numeroPiece, numeroComptable, montant, devise, typeMouvement,
      statut, extraction, lignes,
    } = req.body;

    const baseNumero  = numeroOrdre || await nextNumeroOrdre();
    const baseDate    = dateReception || new Date().toISOString().slice(0, 10);
    const baseDevise  = devise || 'XAF';
    const baseType    = ['entree', 'sortie', 'inconnu'].includes(typeMouvement) ? typeMouvement : 'inconnu';
    const baseStatut  = statut || 'valide';

    // ── Pièce multi-lignes ────────────────────────────────────────────────────
    if (Array.isArray(lignes) && lignes.length > 1) {
      const groupId = uuidv4();
      const created = [];
      let currentNumero = baseNumero;

      for (let i = 0; i < lignes.length; i++) {
        const ligne = lignes[i];
        const doc = await ComptaDoc.create({
          documentId:      documentId || null,
          numeroOrdre:     currentNumero,
          dateReception:   baseDate,
          libelle:         ligne.libelle || `Ligne ${i + 1}`,
          datePiece:       datePiece || null,
          numeroPiece:     numeroPiece || null,
          numeroComptable: ligne.numeroComptable || numeroComptable || null,
          montant:         (ligne.montant === '' || ligne.montant == null) ? null : ligne.montant,
          devise:          baseDevise,
          typeMouvement:   baseType,
          statut:          baseStatut,
          extraction:      extraction || null,
          saisiPar:        req.user.id,
          groupId,
          ligneOrdre:      i + 1,
        });
        created.push(doc);
        currentNumero = await nextNumeroOrdre();
      }

      return res.status(201).json({ data: created, multiLignes: true, groupId });
    }

    // ── Pièce simple ──────────────────────────────────────────────────────────
    const doc = await ComptaDoc.create({
      documentId:      documentId || null,
      numeroOrdre:     baseNumero,
      dateReception:   baseDate,
      libelle:         libelle || null,
      datePiece:       datePiece || null,
      numeroPiece:     numeroPiece || null,
      numeroComptable: numeroComptable || null,
      montant:         (montant === '' || montant == null) ? null : montant,
      devise:          baseDevise,
      typeMouvement:   baseType,
      statut:          baseStatut,
      extraction:      extraction || null,
      saisiPar:        req.user.id,
      groupId:         null,
      ligneOrdre:      1,
    });

    res.status(201).json({ data: doc });
  } catch (err) {
    console.error('Erreur create compta:', err);
    res.status(500).json({ message: "Erreur serveur lors de l'enregistrement." });
  }
};

// ── GET /api/compta ──────────────────────────────────────────────────────────
export const list = async (req, res) => {
  try {
    const docs = await ComptaDoc.findAll({
      order: [['numeroOrdre', 'DESC'], ['createdAt', 'DESC']],
      include: [
        { model: Document, as: 'document', attributes: ['id', 'title', 'fileName', 'filePath'] },
        { model: User, as: 'saisiParUser', attributes: ['id', 'firstName', 'lastName', 'username'] },
      ],
    });
    res.json({ data: docs });
  } catch (err) {
    console.error('Erreur list compta:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ── GET /api/compta/:id ──────────────────────────────────────────────────────
export const getOne = async (req, res) => {
  try {
    const doc = await ComptaDoc.findByPk(req.params.id, {
      include: [{ model: Document, as: 'document', attributes: ['id', 'title', 'fileName', 'filePath'] }],
    });
    if (!doc) return res.status(404).json({ message: 'Pièce introuvable.' });
    res.json({ data: doc });
  } catch (err) {
    console.error('Erreur getOne compta:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ── PUT /api/compta/:id ──────────────────────────────────────────────────────
export const update = async (req, res) => {
  try {
    const doc = await ComptaDoc.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Pièce introuvable.' });

    const fields = ['numeroOrdre', 'dateReception', 'libelle', 'datePiece', 'numeroPiece', 'numeroComptable', 'montant', 'devise', 'typeMouvement', 'statut'];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        doc[f] = (req.body[f] === '' && f === 'montant') ? null : req.body[f];
      }
    }
    await doc.save();
    res.json({ data: doc });
  } catch (err) {
    console.error('Erreur update compta:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ── DELETE /api/compta/:id ───────────────────────────────────────────────────
export const remove = async (req, res) => {
  try {
    const doc = await ComptaDoc.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Pièce introuvable.' });
    await doc.destroy();
    res.json({ message: 'Pièce supprimée.' });
  } catch (err) {
    console.error('Erreur remove compta:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ── GET /api/compta/export.csv ───────────────────────────────────────────────
export const exportCsv = async (req, res) => {
  try {
    const docs = await ComptaDoc.findAll({ order: [['numeroOrdre', 'ASC']] });
    const headers = ['N° ORDRE', 'DATE RÉCEPTION', 'LIBELLÉ', 'DATE PIÈCE', 'N° RÉFÉRENCE', 'N° COMPTABLE', 'MONTANT', 'TYPE'];
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const typeLabel = (t) => t === 'entree' ? 'Entrée' : t === 'sortie' ? 'Sortie' : '';
    const rows = docs.map(d => [
      d.numeroOrdre ?? '', d.dateReception ?? '', d.libelle ?? '',
      d.datePiece ?? '', d.numeroPiece ?? '', d.numeroComptable ?? '',
      d.montant ?? '', typeLabel(d.typeMouvement),
    ].map(esc).join(';'));

    const csv = '﻿' + [headers.join(';'), ...rows].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="comptabilite_pieces.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Erreur export CSV compta:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export default { extractFromUpload, reextract, create, list, getOne, update, remove, exportCsv };
