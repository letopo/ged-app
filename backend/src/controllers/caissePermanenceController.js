// backend/src/controllers/caissePermanenceController.js
// Finances › Caisse pharmacie › onglet « Caisse de permanence » (11/11/2026) :
// remplace le classeur « CAISSE HSJM.xlsx ». Une séance par service (jour
// 7 h-16 h 30, nuit 16 h 30-7 h) : ouverture avec passation (montant reçu
// compté), mouvements (cautions, autres recettes, sorties ; espèces ou Orange
// Money), clôture avec comptage des espèces et écart.
// Lecture : accès Caisse pharmacie ; saisie : personnel du service Pharmacie, superadmin.
import { Op } from 'sequelize';
import { CaisseSeance, CaisseMouvement, AuditLog } from '../models/index.js';
import { isPharmacieStaff } from '../utils/pieceDeCaisseChain.js';
import { canAccessCaissePharmacie } from './caissePharmacieController.js';
import {
  TYPES, MODES, LIBELLES, periodeAt, seanceKey, nextSeance, seancesSautees,
  totauxSeance, soldesCourants, totalBilletage, parseMontant,
} from '../utils/caissePermanence.js';

const fullName = (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || u.username;
const isoDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !Number.isNaN(Date.parse(v));
const clean = (v, n) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s ? s.slice(0, n) : null; };
const httpError = (status, message) => Object.assign(new Error(message), { status });

export async function canWritePermanence(user) {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return isPharmacieStaff(user.id);
}

const guard = (fn, { write = false } = {}) => async (req, res) => {
  try {
    if (!(await canAccessCaissePharmacie(req.user, req.tenantId))) {
      return res.status(403).json({ success: false, message: 'Réservé au personnel de la pharmacie, aux caissières et à la comptabilité.' });
    }
    if (write && !(await canWritePermanence(req.user))) {
      return res.status(403).json({ success: false, message: 'Seul le personnel de la pharmacie peut tenir la caisse de permanence.' });
    }
    await fn(req, res);
  } catch (err) {
    if (!err.status) console.error('Caisse de permanence :', err);
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Erreur serveur.' });
  }
};

const audit = (req, action, details) => AuditLog.create({
  userId: req.user.id, userEmail: req.user.email, userName: fullName(req.user), action, resource: 'caisse_permanence',
  resourceId: details.seanceId, details, tenantId: req.tenantId,
}).catch(() => {});

function mouvementJson(m, solde) {
  return {
    id: m.id, type: m.type, mode: m.mode, libelle: m.libelle, patientNom: m.patientNom, montant: Number(m.montant),
    heure: m.createdAt, saisiParNom: m.saisiParNom, annule: m.annule, motifAnnulation: m.motifAnnulation,
    annuleParNom: m.annuleParNom, annuleAt: m.annuleAt, solde,
  };
}

function seanceJson(s, mouvements = null) {
  const out = {
    id: s.id, date: s.date, periode: s.periode, statut: s.statut, caissiereId: s.caissiereId, caissiereNom: s.caissiereNom,
    soldeOuverture: Number(s.soldeOuverture), montantRecu: s.montantRecu == null ? null : Number(s.montantRecu),
    ecartReception: s.ecartReception == null ? null : Number(s.ecartReception), noteOuverture: s.noteOuverture,
    especesComptees: s.especesComptees == null ? null : Number(s.especesComptees), billetage: s.billetage,
    soldeTheorique: s.soldeTheorique == null ? null : Number(s.soldeTheorique),
    ecartCloture: s.ecartCloture == null ? null : Number(s.ecartCloture), noteCloture: s.noteCloture,
    ouverteAt: s.createdAt, clotureeAt: s.clotureeAt,
  };
  if (mouvements) {
    const ordered = [...mouvements].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const soldes = soldesCourants(s.soldeOuverture, ordered);
    out.mouvements = ordered.map((m, i) => mouvementJson(m, soldes[i]));
    out.totaux = totauxSeance(s.soldeOuverture, ordered);
  }
  return out;
}

const lastSeance = (tenantId, where = {}) => CaisseSeance.findOne({
  where: { tenantId, ...where }, order: [['date', 'DESC'], ['periode', 'DESC']], // « nuit » > « jour »
});

async function loadSeance(req, id) {
  const s = await CaisseSeance.findOne({ where: { id, tenantId: req.tenantId }, include: [{ model: CaisseMouvement, as: 'mouvements' }] });
  if (!s) throw httpError(404, 'Séance introuvable.');
  return s;
}

const canEditSeance = (req, s) => req.user.role === 'superadmin' || s.caissiereId === req.user.id;

// GET /api/caisse-pharmacie/permanence — séance ouverte, ou ce qu'il faut pour en ouvrir une
export const getEtat = guard(async (req, res) => {
  const canWrite = await canWritePermanence(req.user);
  const ouverte = await CaisseSeance.findOne({ where: { tenantId: req.tenantId, statut: 'ouverte' }, include: [{ model: CaisseMouvement, as: 'mouvements' }] });
  const derniere = await lastSeance(req.tenantId, { statut: 'cloturee' });
  const courante = periodeAt();
  let proposition = null;
  if (!ouverte) {
    const suite = derniere ? nextSeance(derniere) : courante;
    // On propose la séance en cours si elle est après la dernière, sinon la suivante
    const choix = derniere && seanceKey(courante) <= seanceKey(derniere) ? suite : courante;
    proposition = {
      ...choix,
      premiere: !derniere,
      soldeOuverture: derniere ? Number(derniere.especesComptees) : null,
      sautees: derniere ? seancesSautees(derniere, choix) : 0,
      precedente: derniere ? { date: derniere.date, periode: derniere.periode, caissiereNom: derniere.caissiereNom } : null,
    };
  }
  res.json({
    success: true, canWrite, me: req.user.id, courante, libelles: LIBELLES,
    ouverte: ouverte ? seanceJson(ouverte, ouverte.mouvements) : null,
    derniere: derniere ? seanceJson(derniere) : null,
    proposition,
  });
});

// POST /api/caisse-pharmacie/permanence/seances { date, periode, montantRecu, soldeInitial?, note? }
export const ouvrirSeance = guard(async (req, res) => {
  const { date, periode } = req.body || {};
  if (!isoDate(date) || !['jour', 'nuit'].includes(periode)) throw httpError(400, 'Date ou service invalide.');
  if (seanceKey({ date, periode }) > seanceKey(periodeAt())) throw httpError(400, 'Impossible d’ouvrir une séance future.');
  if (await CaisseSeance.findOne({ where: { tenantId: req.tenantId, statut: 'ouverte' } })) {
    throw httpError(409, 'Une séance est déjà ouverte : elle doit être clôturée avant d’en ouvrir une autre.');
  }
  const derniere = await lastSeance(req.tenantId);
  let soldeOuverture;
  if (derniere) {
    if (seanceKey({ date, periode }) <= seanceKey(derniere)) throw httpError(400, 'Cette séance est antérieure ou égale à la dernière séance enregistrée.');
    soldeOuverture = Number(derniere.especesComptees) || 0;
  } else {
    soldeOuverture = parseMontant(req.body.soldeInitial, { allowZero: true });
    if (soldeOuverture == null) throw httpError(400, 'Première séance : saisissez le solde de départ (espèces en caisse).');
  }
  const montantRecu = parseMontant(req.body.montantRecu, { allowZero: true });
  if (montantRecu == null) throw httpError(400, 'Saisissez le montant reçu, compté à la prise de service.');
  const ecart = montantRecu - soldeOuverture;
  const note = clean(req.body.note, 500);
  if (ecart !== 0 && !note) throw httpError(400, `Le montant reçu diffère de ${ecart.toLocaleString('fr-FR')} FCFA du solde transmis : expliquez l’écart.`);

  const s = await CaisseSeance.create({
    tenantId: req.tenantId, date, periode, statut: 'ouverte', caissiereId: req.user.id, caissiereNom: fullName(req.user),
    precedenteId: derniere?.id || null, soldeOuverture, montantRecu, ecartReception: ecart, noteOuverture: note,
  });
  audit(req, 'CAISSE_PERMANENCE_OUVERTURE', { seanceId: s.id, date, periode, soldeOuverture, montantRecu });
  res.status(201).json({ success: true, seance: seanceJson(s, []) });
}, { write: true });

// POST /api/caisse-pharmacie/permanence/seances/:id/mouvements
export const ajouterMouvement = guard(async (req, res) => {
  const s = await loadSeance(req, req.params.id);
  if (s.statut !== 'ouverte') throw httpError(400, 'Séance clôturée : aucun mouvement ne peut être ajouté.');
  if (!canEditSeance(req, s)) throw httpError(403, `Seule ${s.caissiereNom} (caissière de cette séance) peut saisir.`);
  const { type } = req.body || {};
  if (!TYPES.includes(type)) throw httpError(400, 'Type de mouvement invalide.');
  const mode = type === 'sortie' ? 'especes' : (MODES.includes(req.body.mode) ? req.body.mode : 'especes');
  const montant = parseMontant(req.body.montant);
  if (montant == null) throw httpError(400, 'Montant invalide (nombre entier de FCFA).');
  const libelle = clean(req.body.libelle, 120) || LIBELLES[type][0];
  const patientNom = clean(req.body.patientNom, 150);
  if (type === 'caution' && !patientNom) throw httpError(400, 'Indiquez le nom du patient pour une caution.');
  if (type === 'sortie') {
    const t = totauxSeance(s.soldeOuverture, s.mouvements);
    if (montant > t.especesTheoriques) throw httpError(400, `Sortie impossible : il n’y a que ${t.especesTheoriques.toLocaleString('fr-FR')} FCFA d’espèces en caisse.`);
  }
  await CaisseMouvement.create({
    tenantId: req.tenantId, seanceId: s.id, type, mode, libelle, patientNom, montant,
    saisiPar: req.user.id, saisiParNom: fullName(req.user),
  });
  const fresh = await loadSeance(req, s.id);
  res.status(201).json({ success: true, seance: seanceJson(fresh, fresh.mouvements) });
}, { write: true });

// POST /api/caisse-pharmacie/permanence/mouvements/:id/annuler { motif }
export const annulerMouvement = guard(async (req, res) => {
  const m = await CaisseMouvement.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!m) throw httpError(404, 'Mouvement introuvable.');
  const s = await loadSeance(req, m.seanceId);
  if (s.statut !== 'ouverte') throw httpError(400, 'Séance clôturée : le mouvement ne peut plus être annulé.');
  if (!canEditSeance(req, s)) throw httpError(403, `Seule ${s.caissiereNom} (caissière de cette séance) peut annuler.`);
  if (m.annule) throw httpError(400, 'Mouvement déjà annulé.');
  const motif = clean(req.body?.motif, 300);
  if (!motif) throw httpError(400, 'Indiquez le motif de l’annulation.');
  await m.update({ annule: true, motifAnnulation: motif, annuleParNom: fullName(req.user), annuleAt: new Date() });
  audit(req, 'CAISSE_PERMANENCE_ANNULATION', { seanceId: s.id, mouvementId: m.id, montant: Number(m.montant), motif });
  const fresh = await loadSeance(req, s.id);
  res.json({ success: true, seance: seanceJson(fresh, fresh.mouvements) });
}, { write: true });

// POST /api/caisse-pharmacie/permanence/seances/:id/cloturer { especesComptees, billetage?, note? }
export const cloturerSeance = guard(async (req, res) => {
  const s = await loadSeance(req, req.params.id);
  if (s.statut !== 'ouverte') throw httpError(400, 'Séance déjà clôturée.');
  if (!canEditSeance(req, s)) throw httpError(403, `Seule ${s.caissiereNom} (caissière de cette séance) peut clôturer.`);
  let especes = parseMontant(req.body?.especesComptees, { allowZero: true });
  const billetage = req.body?.billetage && typeof req.body.billetage === 'object' ? req.body.billetage : null;
  if (billetage) {
    const total = totalBilletage(billetage);
    if (Number.isNaN(total)) throw httpError(400, 'Billetage invalide.');
    if (especes == null) especes = total;
    else if (total !== especes) throw httpError(400, `Le billetage (${total.toLocaleString('fr-FR')} FCFA) ne correspond pas aux espèces comptées.`);
  }
  if (especes == null) throw httpError(400, 'Saisissez les espèces comptées dans la caisse.');
  const t = totauxSeance(s.soldeOuverture, s.mouvements);
  const ecart = especes - t.especesTheoriques;
  const note = clean(req.body?.note, 500);
  if (ecart !== 0 && !note) throw httpError(400, `Écart de ${ecart.toLocaleString('fr-FR')} FCFA avec le solde attendu : expliquez-le avant de clôturer.`);
  await s.update({ statut: 'cloturee', especesComptees: especes, billetage, soldeTheorique: t.especesTheoriques, ecartCloture: ecart, noteCloture: note, clotureeAt: new Date() });
  audit(req, 'CAISSE_PERMANENCE_CLOTURE', { seanceId: s.id, especes, theorique: t.especesTheoriques, ecart });
  const fresh = await loadSeance(req, s.id);
  res.json({ success: true, seance: seanceJson(fresh, fresh.mouvements) });
}, { write: true });

// GET /api/caisse-pharmacie/permanence/seances?from=&to= — historique avec totaux
export const listSeances = guard(async (req, res) => {
  const to = isoDate(req.query.to) ? req.query.to : periodeAt().date;
  const from = isoDate(req.query.from) ? req.query.from : to;
  if (from > to || (Date.parse(to) - Date.parse(from)) / 86_400_000 > 92) throw httpError(400, 'Période invalide (3 mois au plus).');
  const rows = await CaisseSeance.findAll({
    where: { tenantId: req.tenantId, date: { [Op.between]: [from, to] } },
    include: [{ model: CaisseMouvement, as: 'mouvements' }],
    order: [['date', 'DESC'], ['periode', 'DESC']],
  });
  const seances = rows.map((s) => { const j = seanceJson(s, s.mouvements); delete j.mouvements; return j; });
  const sum = (k) => seances.reduce((a, s) => a + (s.totaux?.[k] || 0), 0);
  res.json({
    success: true, from, to, seances,
    totaux: {
      seances: seances.length, cautions: sum('cautions'), recettes: sum('recettes'), sorties: sum('sorties'), orangeMoney: sum('orangeMoney'),
      ecarts: seances.reduce((a, s) => a + (s.ecartCloture || 0), 0),
    },
  });
});

// GET /api/caisse-pharmacie/permanence/seances/:id — détail d'une séance
export const getSeance = guard(async (req, res) => {
  const s = await loadSeance(req, req.params.id);
  res.json({ success: true, seance: seanceJson(s, s.mouvements), canEdit: canEditSeance(req, s) && s.statut === 'ouverte' });
});

// GET /api/caisse-pharmacie/permanence/recherche?q= — retrouver une caution par nom de patient
export const rechercher = guard(async (req, res) => {
  const q = clean(req.query.q, 60);
  if (!q || q.length < 2) return res.json({ success: true, resultats: [] });
  const rows = await CaisseMouvement.findAll({
    where: { tenantId: req.tenantId, patientNom: { [Op.iLike]: `%${q}%` } },
    include: [{ model: CaisseSeance, as: 'seance', attributes: ['id', 'date', 'periode', 'caissiereNom'] }],
    order: [['createdAt', 'DESC']], limit: 50,
  });
  res.json({ success: true, resultats: rows.map((m) => ({ ...mouvementJson(m), seance: m.seance && { id: m.seance.id, date: m.seance.date, periode: m.seance.periode, caissiereNom: m.seance.caissiereNom } })) });
});
