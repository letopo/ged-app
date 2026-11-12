// backend/src/controllers/caissePharmacieController.js
// État de la caisse de vente de la pharmacie (demande du 10/11/2026) : au lieu
// d'imprimer le « Relevé de factures » dans Sage puis de l'envoyer en PDF, le
// personnel de la pharmacie le tire depuis la GED (Sage en lecture seule) et
// l'envoie en signature : la personne de la pharmacie qui l'envoie (son nom sur
// la fiche) → Caissière → Comptable (retour du 10/11/2026 : trois signatures).
// Accès : personnel du service Pharmacie, poste « Caisse pharmacie », caissières,
// comptables, Finances, administrateurs.
import fs from 'fs/promises';
import path from 'path';
import { Op } from 'sequelize';
import { TenantIntegration, Document, User, AuditLog } from '../models/index.js';
import { decryptSecret } from '../utils/secretBox.js';
import { SAGE_DEFAULTS } from '../utils/integrations.js';
import { openSagePool } from '../utils/sageFactureSync.js';
import { CAISSE_PHARMACIE_PAYEUR, fetchCaisseFactures, totauxCaisse } from '../utils/caissePharmacie.js';
import { buildCaissePharmaciePdf, periodeLabel, caisseSignatureLabels } from '../utils/caissePharmaciePdf.js';
import { isPharmacieStaff } from '../utils/pieceDeCaisseChain.js';
import { getPosteHoldersForAssignment, getUserPosteCodes } from '../utils/posteResolver.js';
import { createWorkflowForDocument } from '../utils/workflowEngine.js';
import { canAccessSageBl } from './sageBlController.js';

export const CAISSE_CATEGORY = 'Caisse pharmacie';
// Poste « Caisse pharmacie » (12/11/2026) : accès au module et tenue de la caisse de permanence
export const CAISSE_POSTE = 'caisse_pharmacie';
const isoDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !Number.isNaN(Date.parse(v));
const today = () => new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 10); // Douala
const fullName = (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;

export async function canAccessCaissePharmacie(user, tenantId) {
  if (!user) return false;
  if (['superadmin', 'admin', 'caissier'].includes(user.role)) return true;
  const postes = await getUserPosteCodes(user.id);
  if (postes.includes('comptable') || postes.includes(CAISSE_POSTE)) return true;
  if (await isPharmacieStaff(user.id)) return true;
  return canAccessSageBl(user, tenantId);
}

const guard = (fn) => async (req, res) => {
  try {
    if (!(await canAccessCaissePharmacie(req.user, req.tenantId))) {
      return res.status(403).json({ success: false, message: 'Réservé au personnel de la pharmacie, aux caissières et à la comptabilité.' });
    }
    await fn(req, res);
  } catch (err) {
    console.error('Caisse pharmacie :', err);
    res.status(err.status || 502).json({ success: false, message: err.message || 'Sage injoignable.' });
  }
};

function period(q) {
  const to = isoDate(q.to) ? q.to : (isoDate(q.from) ? q.from : today());
  const from = isoDate(q.from) ? q.from : to;
  if (from > to) { const e = new Error('La date de début est après la date de fin.'); e.status = 400; throw e; }
  if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > 31) { const e = new Error('Période limitée à 31 jours.'); e.status = 400; throw e; }
  return { from, to };
}

async function readCaisse(tenantId, from, to) {
  const row = await TenantIntegration.findOne({ where: { tenantId, kind: 'sage' } });
  if (!row) { const e = new Error('Connexion Sage non réglée (Paramètres › Intégrations).'); e.status = 400; throw e; }
  const config = { ...SAGE_DEFAULTS, ...row.config };
  const payeur = String(config.caissePharmaciePayeur || CAISSE_PHARMACIE_PAYEUR).trim();
  const pool = await openSagePool(config, decryptSecret(row.secretEncrypted));
  try {
    const lignes = await fetchCaisseFactures(pool, payeur, from, to);
    const nom = lignes.find((l) => l.client === payeur)?.intitule || 'CLIENT COMPTANT PHARMACIE';
    return { payeur, payeurNom: nom, lignes };
  } finally { await pool.close().catch(() => {}); }
}

/** Circuit : la personne qui envoie (pharmacie), puis Caissière, puis Comptable (choix si plusieurs titulaires). */
async function resolveCircuit(sender, selections = {}) {
  const steps = [{ key: 'pharmacie', label: 'Pharmacie', holders: [{ id: sender.id, name: fullName(sender) }], chosenId: sender.id, needsSelection: false }];
  const caissiers = await User.findAll({ where: { role: 'caissier', isActive: true, isAbsent: false }, attributes: ['id', 'firstName', 'lastName', 'email'] });
  const comptables = await getPosteHoldersForAssignment('comptable');
  for (const [key, label, list, err] of [
    ['caissier', 'Caissière', caissiers, 'Aucune caissière active (rôle « caissier »).'],
    ['comptable', 'Comptable', comptables, 'Aucun titulaire pour le poste « Comptable » (Admin › Postes & Fonctions).'],
  ]) {
    if (!list.length) return { error: err };
    const holders = list.map((u) => ({ id: u.id, name: fullName(u) }));
    const chosenId = list.length === 1 ? list[0].id : (holders.some((h) => h.id === selections[key]) ? selections[key] : null);
    steps.push({ key, label, holders, chosenId, needsSelection: !chosenId });
  }
  return { steps };
}

// GET /api/caisse-pharmacie?from=&to= — factures de la caisse + totaux + circuit
export const getCaisse = guard(async (req, res) => {
  const { from, to } = period(req.query);
  const { payeur, payeurNom, lignes } = await readCaisse(req.tenantId, from, to);
  const deja = await Document.findAll({
    where: { tenantId: req.tenantId, category: CAISSE_CATEGORY, metadata: { caisseFrom: from, caisseTo: to } },
    attributes: ['id', 'title', 'status', 'createdAt'], order: [['createdAt', 'DESC']], limit: 3,
  });
  const circuit = await resolveCircuit(req.user);
  res.json({ success: true, from, to, payeur, payeurNom, lignes, totaux: totauxCaisse(lignes), deja, circuit });
});

// GET /api/caisse-pharmacie/pdf?from=&to= — aperçu (rien n'est créé)
export const getCaissePdf = guard(async (req, res) => {
  const { from, to } = period(req.query);
  const data = await readCaisse(req.tenantId, from, to);
  const { buffer } = await buildCaissePharmaciePdf({ from, to, ...data, labels: caisseSignatureLabels(fullName(req.user)) });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="caisse-pharmacie-${from}${to !== from ? `-${to}` : ''}.pdf"`);
  res.send(buffer);
});

// POST /api/caisse-pharmacie { from, to, selections: { caissier, comptable }, force }
export const createCaisse = guard(async (req, res) => {
  const { from, to } = period(req.body || {});
  const existing = await Document.findOne({ where: { tenantId: req.tenantId, category: CAISSE_CATEGORY, metadata: { caisseFrom: from, caisseTo: to }, status: { [Op.ne]: 'rejected' } } });
  if (existing && !req.body?.force) {
    return res.status(409).json({ success: false, message: 'Un état de caisse existe déjà pour cette période.', documentId: existing.id });
  }
  const circuit = await resolveCircuit(req.user, req.body?.selections || {});
  if (circuit.error) return res.status(400).json({ success: false, message: circuit.error });
  const missing = circuit.steps.find((s) => s.needsSelection);
  if (missing) return res.status(400).json({ success: false, message: `Choisissez le titulaire pour « ${missing.label} ».`, circuit });

  const data = await readCaisse(req.tenantId, from, to);
  if (!data.lignes.length) return res.status(400).json({ success: false, message: 'Aucune facture de la caisse pharmacie sur cette période.' });
  const pdf = await buildCaissePharmaciePdf({ from, to, ...data, labels: caisseSignatureLabels(fullName(req.user)) });
  const fileName = `caisse-pharmacie-${from}${to !== from ? `-${to}` : ''}-${Date.now()}.pdf`;
  await fs.writeFile(path.resolve(process.cwd(), 'uploads', fileName), pdf.buffer);
  const title = `État de caisse pharmacie ${periodeLabel(from, to)}`;
  const document = await Document.create({
    title, fileName, originalName: fileName, filePath: `uploads/${fileName}`, fileSize: pdf.buffer.length, fileType: 'application/pdf',
    userId: req.user.id, category: CAISSE_CATEGORY, status: 'pending_validation',
    metadata: {
      sourceType: 'caisse_pharmacie', caisseFrom: from, caisseTo: to, payeur: data.payeur,
      nbFactures: pdf.totaux.count, montantTotal: pdf.totaux.net, factures: data.lignes.map((l) => l.piece),
      signatureZones: pdf.signatureZones, signaturePage: pdf.signaturePage,
      zonesParEtape: true, // Pharmacie → cadre 1, Caissière → cadre 2, Comptable → cadre 3
      envoyePar: fullName(req.user),
    },
    tenantId: req.tenantId,
  });
  try {
    await createWorkflowForDocument(document, circuit.steps.map((s) => s.chosenId), req.tenantId);
  } catch (err) {
    await document.destroy({ force: true }).catch(() => {});
    await fs.unlink(path.resolve(process.cwd(), 'uploads', fileName)).catch(() => {});
    return res.status(400).json({ success: false, message: err.message });
  }
  await AuditLog.log(req, 'UPLOAD', 'document', document.id, { title, caissePharmacie: true, factures: pdf.totaux.count, montant: pdf.totaux.net });
  res.status(201).json({
    success: true, documentId: document.id,
    message: `État de caisse envoyé en signature (${pdf.totaux.count} factures, ${pdf.totaux.net.toLocaleString('fr-FR')} FCFA) : ${circuit.steps.map((s) => s.holders.find((h) => h.id === s.chosenId)?.name).join(' → ')}.`,
  });
});
