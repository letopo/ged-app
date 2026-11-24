// backend/src/utils/phpRdvDme.js
// Rendez-vous du DME pour les patients PHP (24/11/2026).
// Pour chaque patient que l'agent PHP a inscrit en consultation (12 derniers
// mois), la GED lit en direct dans le DME :
//  - rdv_specialistes : rendez-vous chez les spécialistes (date, heure, motif,
//    spécialiste, statut EN_ATTENTE → TERMINE / NON_HONORE…) ;
//  - suivis_consultation.prochain_rdv : prochain suivi fixé par le médecin
//    (maladie chronique, résultats, grossesse…) ;
//  - agenda_medical : rendez-vous de suivi de l'agenda.
// Un rendez-vous resté « en attente » dans le DME alors que sa date est
// passée devient « honoré » si le patient est passé au DME ce jour-là
// (consultation ou suivi), sinon « date passée ». Lecture seule, en direct.
import { Op } from 'sequelize';
import { ConsultationPHP, PatientPHP, PhpPatientCompteSage, Infirmerie } from '../models/index.js';
import RendezVousPHP from '../models/RendezVousPHP.js';
import { rechercherDansDme } from './dmePatientSearch.js';
import { dmeIndisponible, ouvrirDmeTenant, indexDuTenant } from './dmeIndex.js';
import { chargerLiens } from './phpPatientDme.js';
import { todayLocal } from './phpSuiviDme.js';

const SPECIALITES = {
  GASTRO_ENTEROLOGUE: 'Gastro-entérologue', CHIRURGIEN_PEDIATRE: 'Chirurgien pédiatre', ORL: 'ORL',
};
export const libelleSpecialite = (s) => {
  if (!s) return null;
  if (SPECIALITES[s]) return SPECIALITES[s];
  const t = String(s).toLowerCase().replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};
// Nom du spécialiste sans « Dr » ni mots génériques (le DME a des fiches
// « Dr Dentiste » / « Dr Spécialiste ») ; null s'il ne reste rien
const sansAccents = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function nomSpecialiste(s, specialite) {
  const generiques = new Set(['dr', 'dr.', 'docteur', 'specialiste', sansAccents(specialite), ...sansAccents(specialite).split(/[\s-]+/)]);
  const mots = [s?.prenom, s?.nom].join(' ').split(/\s+/).filter((m) => m && !generiques.has(sansAccents(m)));
  return mots.length ? `Dr ${mots.join(' ')}` : null;
}
const SUIVIS = { MALADIE_CHRONIQUE: 'maladie chronique', RESULTATS: 'résultats d’examens', GROSSESSE: 'grossesse', CHECKUP: 'bilan de santé' };

// Statuts du DME → vocabulaire de la GED
const STATUTS_RDV = {
  EN_ATTENTE: 'planifie', CONFIRME: 'confirme', EN_COURS: 'en_cours', TERMINE: 'honore',
  ANNULE: 'annule', REPORTE: 'reporte', NON_HONORE: 'non_honore',
};
const STATUTS_AGENDA = { planifie: 'planifie', confirme: 'confirme', en_cours: 'en_cours', termine: 'honore', annule: 'annule', reporte: 'reporte', non_honore: 'non_honore' };

const day = (s) => (s ? String(s).slice(0, 10) : null);
const hm = (s) => (s ? String(s).slice(0, 5) : null);

/**
 * Statut affiché : celui du DME, corrigé quand la date est passée sans que le
 * DME ait clôturé le rendez-vous.
 */
export function statutFinal(status, { date, today, passe }) {
  if (date >= today || !['planifie', 'confirme', 'en_cours'].includes(status)) return { status, detail: null };
  if (passe) return { status: 'honore', detail: 'Passé au DME ce jour-là' };
  if (status === 'en_cours') return { status: 'honore', detail: null };
  return { status: 'depasse', detail: 'Date passée · pas clôturé dans le DME' };
}

/**
 * Rendez-vous du DME → lignes de la GED. Pur (testé) :
 *  rows = { rdvs, suivis, agenda, specialistes, passages: Set('dmeId|AAAA-MM-JJ') }
 *  patientsParDme = Map(dmeId → { patient, dossier })
 *  gedRdvs = [{ id, patientId, dateRdv }] pour repérer ceux déjà saisis dans la GED
 */
export function rdvDepuisDme(rows, { patientsParDme, gedRdvs = [], today }) {
  const specs = new Map((rows.specialistes || []).map((s) => [s.id, s]));
  const ged = new Map(gedRdvs.map((g) => [`${g.patientId}|${day(g.dateRdv)}`, g.id]));
  const passages = rows.passages || new Set();
  const items = [];
  const push = (origine, r, dmeId, date, base) => {
    const lien = patientsParDme.get(dmeId);
    if (!lien || !date) return;
    const { status, detail } = statutFinal(base.status, { date, today, passe: passages.has(`${dmeId}|${date}`) });
    items.push({
      id: `dme-${origine}-${r.id}`, source: 'dme', origine, dmePatientId: dmeId, dossier: lien.dossier || null,
      dateRdv: date, heureRdv: base.heure || null, service: base.service || null, motif: base.motif || null,
      status, detail, gedRdvId: ged.get(`${lien.patient.id}|${date}`) || null, patient: lien.patient,
    });
  };
  for (const r of rows.rdvs || []) {
    const s = specs.get(r.specialiste_id);
    const specialite = libelleSpecialite(s?.specialite || r.specialite);
    push('specialiste', r, r.patient_id, day(r.date_rdv), {
      status: STATUTS_RDV[r.statut] || 'planifie', heure: hm(r.heure_rdv),
      service: [specialite || 'Spécialiste', nomSpecialiste(s, specialite)].filter(Boolean).join(' · '),
      motif: r.motif ? String(r.motif).trim().slice(0, 200) : null,
    });
  }
  for (const r of rows.suivis || []) {
    const type = SUIVIS[r.prochain_type_suivi];
    push('suivi', r, r.patient_id, day(r.prochain_rdv), { status: 'planifie', service: `Suivi${type ? ` · ${type}` : ''}` });
  }
  for (const r of rows.agenda || []) {
    const h = hm(String(r.date_debut || '').slice(11));
    push('agenda', r, r.patient_id, day(r.date_debut), {
      status: STATUTS_AGENDA[r.statut] || 'planifie', heure: h === '00:00' ? null : h,
      service: ['Suivi', r.salle ? String(r.salle).trim() : null].filter(Boolean).join(' · '),
      motif: r.titre ? String(r.titre).trim().slice(0, 200) : null,
    });
  }
  return items.sort((a, b) => a.dateRdv.localeCompare(b.dateRdv) || String(a.heureRdv || '99').localeCompare(String(b.heureRdv || '99')));
}

const lireTable = async (conn, sql, params) => {
  try { const [rows] = await conn.query(sql, params); return { rows, etat: 'ok' }; } catch (err) {
    console.warn('⚠️ Rendez-vous DME :', err.code || err.message);
    return { rows: [], etat: err.code === 'ER_TABLEACCESS_DENIED_ERROR' ? 'droit_manquant' : 'erreur' };
  }
};

/**
 * Rendez-vous du DME entre `from` et `to` pour les patients PHP inscrits en
 * consultation. Jamais d'exception pour un DME injoignable : `erreur`.
 */
export async function rdvDmePhp({ tenantId, from, to }) {
  const today = todayLocal();
  const base = { from, to, today, items: [], droits: {} };
  const raison = await dmeIndisponible(tenantId);
  if (raison) return { ...base, disponible: false, raison };

  // Patients que l'agent PHP a inscrits en consultation depuis un an
  const depuis = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const consults = await ConsultationPHP.findAll({
    where: { dateConsultation: { [Op.gte]: depuis } }, attributes: ['patientId'], raw: true,
    include: [{ model: PatientPHP, as: 'patient', attributes: [], where: { tenantId }, required: true }],
  });
  const patientIds = [...new Set(consults.map((c) => c.patientId))];
  if (!patientIds.length) return { ...base, disponible: true };
  const patients = await PatientPHP.findAll({
    where: { id: { [Op.in]: patientIds }, tenantId }, attributes: ['id', 'matricule', 'nom', 'prenom', 'infirmerieId'],
    include: [{ model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] }],
  });

  let conn;
  try {
    conn = await ouvrirDmeTenant(tenantId);
    const index = await indexDuTenant(tenantId, conn);
    const liens = await chargerLiens(tenantId, patientIds);
    const comptes = await PhpPatientCompteSage.findAll({ where: { tenantId, patientId: { [Op.in]: patientIds }, statut: 'confirme' }, attributes: ['patientId', 'compteTiers'], raw: true });
    // Fiche DME → patient PHP : lien confirmé, sinon rapprochement sûr
    // (matricule, compte Sage). Une fiche revendiquée par 2 patients est ignorée.
    const candidats = new Map();
    for (const p of patients) {
      const plain = p.get({ plain: true });
      const l = liens.get(p.id);
      const ids = l?.confirmes?.length ? l.confirmes : (() => {
        const m = rechercherDansDme({ ...plain, comptes: comptes.filter((c) => c.patientId === p.id).map((c) => c.compteTiers), liens: l }, index);
        return m.confiance === 'sure' ? m.fiches.map((f) => f.id) : [];
      })();
      const patient = { id: plain.id, matricule: plain.matricule, nom: plain.nom, prenom: plain.prenom, infirmerie: plain.infirmerie || null };
      for (const id of ids) {
        const dossier = index.parId?.get(id)?.f?.dossier_numero || null;
        candidats.set(id, candidats.has(id) ? null : { patient, dossier });
      }
    }
    const patientsParDme = new Map([...candidats].filter(([, v]) => v));

    const range = [from, to];
    const [rdvs, specialistes, suivis, agenda] = await Promise.all([
      lireTable(conn, `SELECT id, patient_id, specialiste_id, specialite, date_rdv, heure_rdv, motif, statut FROM rdv_specialistes
        WHERE date_rdv BETWEEN ? AND ?`, range),
      lireTable(conn, 'SELECT id, nom, prenom, specialite FROM specialistes'),
      lireTable(conn, `SELECT id, patient_id, prochain_rdv, prochain_type_suivi FROM suivis_consultation
        WHERE prochain_rdv BETWEEN ? AND ?`, range),
      lireTable(conn, `SELECT id, patient_id, date_debut, statut, titre, salle FROM agenda_medical
        WHERE date_debut >= ? AND date_debut < DATE_ADD(?, INTERVAL 1 DAY)`, range),
    ]);
    const garder = (rs) => rs.filter((r) => patientsParDme.has(r.patient_id));
    const rows = { rdvs: garder(rdvs.rows), specialistes: specialistes.rows, suivis: garder(suivis.rows), agenda: garder(agenda.rows) };

    // Passages au DME (consultation ou suivi) les jours de rendez-vous passés
    const ids = [...new Set([...rows.rdvs, ...rows.suivis, ...rows.agenda].map((r) => r.patient_id))];
    rows.passages = new Set();
    if (ids.length && from < today) {
      const inIds = ids.map(() => '?').join(', ');
      const [c, s] = await Promise.all([
        lireTable(conn, `SELECT DISTINCT patient_id, DATE(date_consultation) AS d FROM consultations
          WHERE patient_id IN (${inIds}) AND date_consultation >= ? AND date_consultation < ? AND statut <> 'annulee'`, [...ids, from, today]),
        lireTable(conn, `SELECT DISTINCT patient_id, DATE(date_suivi) AS d FROM suivis_consultation
          WHERE patient_id IN (${inIds}) AND date_suivi >= ? AND date_suivi < ?`, [...ids, from, today]),
      ]);
      for (const r of [...c.rows, ...s.rows]) rows.passages.add(`${r.patient_id}|${day(r.d)}`);
    }

    const gedRdvs = await RendezVousPHP.findAll({
      where: { patientId: { [Op.in]: [...new Set([...patientsParDme.values()].map((v) => v.patient.id))] }, dateRdv: { [Op.between]: range } },
      attributes: ['id', 'patientId', 'dateRdv'], raw: true,
    });
    const items = rdvDepuisDme(rows, { patientsParDme, gedRdvs, today });
    return { ...base, disponible: true, items, droits: { specialistes: rdvs.etat, suivis: suivis.etat, agenda: agenda.etat } };
  } catch (err) {
    return { ...base, disponible: true, erreur: err.message };
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}
