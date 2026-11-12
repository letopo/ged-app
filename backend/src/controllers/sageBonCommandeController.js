// backend/src/controllers/sageBonCommandeController.js
// Bons de commande fournisseurs (12/11/2026) : la personne qui a préparé le bon
// dans Sage (Major de la pharmacie, labo, économat…) saisit son numéro dans la
// GED ; la GED lit la pièce (lecture seule), produit le PDF au format Sage et
// l'envoie en signature : Émetteur → DG ou DGA → Comptable (pour paiement).
// Accès : poste « Bons de commande », administrateurs.
import fs from 'fs/promises';
import path from 'path';
import { Op } from 'sequelize';
import { TenantIntegration, Document, AuditLog } from '../models/index.js';
import { decryptSecret } from '../utils/secretBox.js';
import { SAGE_DEFAULTS } from '../utils/integrations.js';
import { openSagePool } from '../utils/sageFactureSync.js';
import { getPosteHoldersForAssignment, getUserPosteCodes } from '../utils/posteResolver.js';
import { createWorkflowForDocument } from '../utils/workflowEngine.js';
import { fetchBonCommande, listBonsCommande, listDepots, normPiece, isPieceValide } from '../utils/sageBonCommande.js';
import { buildBonCommandePdf, bonCommandeSignatureLabels, bonCommandeTitre } from '../utils/bonCommandePdf.js';

export const BC_CATEGORY = 'Bon de commande Sage';
export const BC_POSTE = 'bons_commande';
const fullName = (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
const isoDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !Number.isNaN(Date.parse(v));
const today = () => new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 10); // Douala
const httpError = (status, message) => Object.assign(new Error(message), { status });

export async function canAccessBonsCommande(user) {
  if (!user) return false;
  if (['superadmin', 'admin'].includes(user.role)) return true;
  return (await getUserPosteCodes(user.id)).includes(BC_POSTE);
}

const guard = (fn) => async (req, res) => {
  try {
    if (!(await canAccessBonsCommande(req.user))) {
      return res.status(403).json({ success: false, message: 'Réservé au poste « Bons de commande » (Admin › Postes & Fonctions).' });
    }
    await fn(req, res);
  } catch (err) {
    if (!err.status) console.error('Bons de commande Sage :', err);
    res.status(err.status || 502).json({ success: false, message: err.status ? err.message : (err.message || 'Sage injoignable.') });
  }
};

async function withSage(tenantId, fn) {
  const row = await TenantIntegration.findOne({ where: { tenantId, kind: 'sage' } });
  if (!row) throw httpError(400, 'Connexion Sage non réglée (Paramètres › Intégrations).');
  const pool = await openSagePool({ ...SAGE_DEFAULTS, ...row.config }, decryptSecret(row.secretEncrypted));
  try { return await fn(pool); } finally { await pool.close().catch(() => {}); }
}

async function readBc(tenantId, pieceInput) {
  const piece = normPiece(pieceInput);
  if (!isPieceValide(piece)) throw httpError(400, 'Numéro de pièce invalide (ex. BCF0000003331).');
  const bc = await withSage(tenantId, (pool) => fetchBonCommande(pool, piece));
  if (!bc) throw httpError(404, `La pièce ${piece} n’existe pas dans Sage (achats). Vérifiez le numéro, et qu’elle a bien été enregistrée (bouton OK dans Sage).`);
  return bc;
}

const docsDeLaPiece = (tenantId, piece) => Document.findAll({
  where: { tenantId, category: BC_CATEGORY, metadata: { sourceType: 'sage_bon_commande', piece } },
  attributes: ['id', 'title', 'status', 'createdAt'], order: [['createdAt', 'DESC']], limit: 5,
});

/** Circuit : la personne qui envoie → DG ou DGA → Comptable (choix si plusieurs titulaires). */
async function resolveCircuit(sender, selections = {}) {
  const steps = [{ key: 'emetteur', label: 'Émetteur', holders: [{ id: sender.id, name: fullName(sender) }], chosenId: sender.id, needsSelection: false }];
  const direction = [...await getPosteHoldersForAssignment('dg'), ...await getPosteHoldersForAssignment('dga')]
    .filter((u, i, a) => a.findIndex((x) => x.id === u.id) === i);
  const comptables = await getPosteHoldersForAssignment('comptable');
  for (const [key, label, list, err] of [
    ['direction', 'DG ou DGA', direction, 'Aucun titulaire pour les postes « Directeur Général » / « DGA » (Admin › Postes & Fonctions).'],
    ['comptable', 'Comptable', comptables, 'Aucun titulaire pour le poste « Comptable » (Admin › Postes & Fonctions).'],
  ]) {
    if (!list.length) return { error: err };
    const holders = list.map((u) => ({ id: u.id, name: fullName(u) }));
    const chosenId = holders.length === 1 ? holders[0].id : (holders.some((h) => h.id === selections[key]) ? selections[key] : null);
    steps.push({ key, label, holders, chosenId, needsSelection: !chosenId });
  }
  return { steps };
}

// GET /api/sage-bons-commande?from=&to=&depot=&q= — pièces d'achat récentes + envois GED
export const listBc = guard(async (req, res) => {
  const to = isoDate(req.query.to) ? req.query.to : today();
  const from = isoDate(req.query.from) ? req.query.from : new Date(Date.parse(to) - 14 * 86_400_000).toISOString().slice(0, 10);
  if (from > to || (Date.parse(to) - Date.parse(from)) / 86_400_000 > 92) throw httpError(400, 'Période invalide (3 mois au plus).');
  const { pieces, depots } = await withSage(req.tenantId, async (pool) => ({
    pieces: await listBonsCommande(pool, { from, to, depot: req.query.depot || null, q: req.query.q }),
    depots: await listDepots(pool),
  }));
  const docs = pieces.length ? await Document.findAll({
    where: { tenantId: req.tenantId, category: BC_CATEGORY, metadata: { sourceType: 'sage_bon_commande', piece: { [Op.in]: pieces.map((p) => p.piece) } }, status: { [Op.ne]: 'rejected' } },
    attributes: ['id', 'status', 'metadata'],
  }) : [];
  const byPiece = new Map(docs.map((d) => [d.metadata?.piece, { id: d.id, status: d.status }]));
  res.json({ success: true, from, to, depots, pieces: pieces.map((p) => ({ ...p, document: byPiece.get(p.piece) || null })) });
});

// GET /api/sage-bons-commande/:piece — la pièce avec ses lignes, le circuit et les envois déjà faits
export const getBc = guard(async (req, res) => {
  const bc = await readBc(req.tenantId, req.params.piece);
  const deja = await docsDeLaPiece(req.tenantId, bc.piece);
  res.json({ success: true, bc, deja, circuit: await resolveCircuit(req.user) });
});

// GET /api/sage-bons-commande/:piece/pdf — aperçu (rien n'est créé)
export const getBcPdf = guard(async (req, res) => {
  const bc = await readBc(req.tenantId, req.params.piece);
  const { buffer } = await buildBonCommandePdf(bc, { labels: bonCommandeSignatureLabels(fullName(req.user)) });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${bc.piece}.pdf"`);
  res.send(buffer);
});

// POST /api/sage-bons-commande/:piece { selections: { direction, comptable }, force }
export const sendBc = guard(async (req, res) => {
  const bc = await readBc(req.tenantId, req.params.piece);
  if (!bc.lignes.length) throw httpError(400, `La pièce ${bc.piece} n’a aucune ligne dans Sage.`);
  const existing = (await docsDeLaPiece(req.tenantId, bc.piece)).find((d) => d.status !== 'rejected');
  if (existing && !req.body?.force) {
    return res.status(409).json({ success: false, message: `${bc.piece} a déjà été envoyé en signature.`, documentId: existing.id });
  }
  const circuit = await resolveCircuit(req.user, req.body?.selections || {});
  if (circuit.error) throw httpError(400, circuit.error);
  const missing = circuit.steps.find((s) => s.needsSelection);
  if (missing) return res.status(400).json({ success: false, message: `Choisissez le titulaire pour « ${missing.label} ».`, circuit });

  const pdf = await buildBonCommandePdf(bc, { labels: bonCommandeSignatureLabels(fullName(req.user)) });
  const fileName = `${bc.piece}-${Date.now()}.pdf`;
  await fs.writeFile(path.resolve(process.cwd(), 'uploads', fileName), pdf.buffer);
  const title = bonCommandeTitre(bc);
  const document = await Document.create({
    title, fileName, originalName: `${bc.piece}.pdf`, filePath: `uploads/${fileName}`, fileSize: pdf.buffer.length, fileType: 'application/pdf',
    userId: req.user.id, category: BC_CATEGORY, status: 'pending_validation',
    metadata: {
      sourceType: 'sage_bon_commande', piece: bc.piece, typePiece: bc.type, datePiece: bc.date,
      fournisseur: bc.fournisseur.numero, fournisseurNom: bc.fournisseur.intitule, depot: bc.depot.intitule,
      emetteurSage: bc.emetteur, montant: bc.totaux.netAPayer, nbLignes: bc.totaux.nbLignes,
      signatureZones: pdf.signatureZones, signaturePage: pdf.signaturePage,
      zonesParEtape: true, // Émetteur → cadre 1, DG/DGA → cadre 2, Comptable → cadre 3
      envoyePar: fullName(req.user),
    },
    tenantId: req.tenantId,
  });
  try {
    await createWorkflowForDocument(document, circuit.steps.map((s) => s.chosenId), req.tenantId);
  } catch (err) {
    await document.destroy({ force: true }).catch(() => {});
    await fs.unlink(path.resolve(process.cwd(), 'uploads', fileName)).catch(() => {});
    throw httpError(400, err.message);
  }
  await AuditLog.log(req, 'UPLOAD', 'document', document.id, { title, bonCommandeSage: bc.piece, montant: bc.totaux.netAPayer });
  res.status(201).json({
    success: true, documentId: document.id,
    message: `${bc.piece} envoyé en signature (${bc.totaux.netAPayer.toLocaleString('fr-FR')} FCFA) : ${circuit.steps.map((s) => s.holders.find((h) => h.id === s.chosenId)?.name).join(' → ')}.`,
  });
});
