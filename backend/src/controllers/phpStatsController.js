// backend/src/controllers/phpStatsController.js - Module PHP
// Statistiques par jour ouvré, par infirmerie, par service

import { ConsultationPHP, PatientPHP, HospitalisationPHP, ReposPHP,
         OperationPHP, Infirmerie, Secteur, BonPriseEnCharge } from '../models/index.js';
import { Op, fn, col, literal } from 'sequelize';
import { sequelize } from '../models/index.js';

// ============================================
// HELPERS - Jours ouvrés
// ============================================
const isJourOuvre = (date) => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // Exclut dimanche (0) et samedi (6)
};

const getJoursOuvresDuMois = (year, month) => {
  const jours = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    if (isJourOuvre(date)) {
      jours.push(new Date(date).toISOString().split('T')[0]);
    }
    date.setDate(date.getDate() + 1);
  }
  return jours;
};

// ============================================
// DASHBOARD - Stats du jour en temps réel
// ============================================
export const getStatsDuJour = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      totalPatientsEnregistres,
      totalConsultations,
      consultationsEnCours,
      consultationsTerminees,
      hospitalisationsNouveaux,
      reposNouveaux,
      bonsEmis,
      statsParInfirmerie,
      statsParService,
      tempsAttenteMoyen
    ] = await Promise.all([
      // Patients enregistrés aujourd'hui
      PatientPHP.count({ where: { createdAt: { [Op.gte]: new Date(today) } } }),
      // Total consultations du jour
      ConsultationPHP.count({ where: { dateConsultation: today } }),
      // Consultations en cours
      ConsultationPHP.count({ where: { dateConsultation: today, resultat: 'en_cours' } }),
      // Consultations terminées
      ConsultationPHP.count({
        where: {
          dateConsultation: today,
          resultat: { [Op.notIn]: ['en_cours', 'non_presente'] }
        }
      }),
      // Nouvelles hospitalisations du jour
      HospitalisationPHP.count({ where: { dateEntree: today } }),
      // Repos accordés aujourd'hui
      ReposPHP.count({ where: { dateDebut: today } }),
      // Bons émis aujourd'hui
      BonPriseEnCharge.count({ where: { dateEmission: today } }),
      // Patients par infirmerie
      ConsultationPHP.findAll({
        attributes: [],
        include: [
          {
            model: PatientPHP,
            as: 'patient',
            attributes: [],
            include: [
              { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] }
            ]
          }
        ],
        where: { dateConsultation: today },
        group: ['patient.infirmerie.id', 'patient.infirmerie.code', 'patient.infirmerie.nom'],
        attributes: [
          [fn('COUNT', col('ConsultationPHP.id')), 'total']
        ],
        raw: true
      }),
      // Consultations par service
      ConsultationPHP.findAll({
        where: { dateConsultation: today, serviceName: { [Op.ne]: null } },
        attributes: [
          'serviceName',
          [fn('COUNT', col('id')), 'total']
        ],
        group: ['serviceName'],
        order: [[literal('"total"'), 'DESC']],
        raw: true
      }),
      // Temps d'attente moyen du jour
      ConsultationPHP.findOne({
        where: {
          dateConsultation: today,
          dureeAttenteMinutes: { [Op.ne]: null }
        },
        attributes: [[fn('AVG', col('duree_attente_minutes')), 'moyenne']],
        raw: true
      })
    ]);

    // Compter hospitalisations en cours total
    const hospitalisationsEnCours = await HospitalisationPHP.count({ where: { status: 'en_cours' } });
    const reposEnCours = await ReposPHP.count({ where: { status: { [Op.in]: ['en_cours', 'prolonge'] } } });

    res.json({
      success: true,
      data: {
        date: today,
        resume: {
          patientsEnregistres: totalPatientsEnregistres,
          bonsEmis,
          totalConsultations,
          consultationsEnCours,
          consultationsTerminees,
          hospitalisationsNouveaux,
          hospitalisationsEnCours,
          reposNouveaux,
          reposEnCours,
          tempsAttenteMoyenMinutes: Math.round(parseFloat(tempsAttenteMoyen?.moyenne) || 0)
        },
        statsParService: statsParService.map(s => ({
          service: s.serviceName,
          total: parseInt(s.total)
        })),
        statsParInfirmerie: statsParInfirmerie.map(s => ({
          code: s['patient.infirmerie.code'],
          nom: s['patient.infirmerie.nom'],
          total: parseInt(s.total)
        }))
      }
    });
  } catch (err) {
    console.error('Erreur getStatsDuJour:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// STATISTIQUES MENSUELLES PAR JOUR OUVRÉ
// Le rapport clé demandé par la direction
// ============================================
export const getStatsMensuelles = async (req, res) => {
  try {
    const {
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear()
    } = req.query;

    const m = parseInt(month);
    const y = parseInt(year);

    const joursOuvres = getJoursOuvresDuMois(y, m);
    const dateDebut = `${y}-${String(m).padStart(2, '0')}-01`;
    const dateFin = new Date(y, m, 0).toISOString().split('T')[0];

    // Récupérer toutes les infirmeries actives
    const infirmeries = await Infirmerie.findAll({
      where: { isActive: true },
      order: [['nom', 'ASC']]
    });

    // Récupérer toutes les consultations du mois avec patient + infirmerie
    const consultations = await ConsultationPHP.findAll({
      where: {
        dateConsultation: { [Op.between]: [dateDebut, dateFin] }
      },
      include: [
        {
          model: PatientPHP,
          as: 'patient',
          attributes: ['id', 'infirmerieId'],
          include: [
            { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] }
          ]
        },
        { model: HospitalisationPHP, as: 'hospitalisation', required: false }
      ],
      attributes: ['id', 'dateConsultation', 'resultat', 'dureeAttenteMinutes'],
      raw: false
    });

    // Récupérer les bons de prise en charge (patients reçus à l'hôpital)
    const bons = await BonPriseEnCharge.findAll({
      where: { dateEmission: { [Op.between]: [dateDebut, dateFin] } },
      attributes: ['dateEmission', 'status'],
      raw: true
    });

    // Récupérer les nouvelles hospitalisations
    const hospitalisations = await HospitalisationPHP.findAll({
      where: { dateEntree: { [Op.between]: [dateDebut, dateFin] } },
      attributes: ['dateEntree'],
      raw: true
    });

    // Construire le tableau par jour ouvré
    const tableauJournalier = joursOuvres.map(jour => {
      const consultsDuJour = consultations.filter(c => c.dateConsultation === jour);
      const bonsDuJour = bons.filter(b => b.dateEmission === jour);
      const hospDuJour = hospitalisations.filter(h => h.dateEntree === jour);

      // Par infirmerie
      const parInfirmerie = {};
      infirmeries.forEach(inf => {
        parInfirmerie[inf.code] = {
          code: inf.code,
          nom: inf.nom,
          consultations: 0
        };
      });
      consultsDuJour.forEach(c => {
        const code = c.patient?.infirmerie?.code;
        if (code && parInfirmerie[code]) {
          parInfirmerie[code].consultations += 1;
        }
      });

      // Temps d'attente moyen du jour
      const attentes = consultsDuJour
        .filter(c => c.dureeAttenteMinutes !== null && c.dureeAttenteMinutes > 0)
        .map(c => c.dureeAttenteMinutes);
      const attenteMoyenne = attentes.length > 0
        ? Math.round(attentes.reduce((a, b) => a + b, 0) / attentes.length)
        : 0;

      return {
        date: jour,
        // Nombre de patients reçus à l'hôpital (bons émis)
        patientsRecus: bonsDuJour.length,
        // Nombre de patients qui ont effectivement été en consultation
        patientsConsultes: consultsDuJour.length,
        // Nombre hospitalisés suite à la consultation
        hospitalisations: hospDuJour.length,
        // Résultats des consultations
        retourTravail: consultsDuJour.filter(c => c.resultat === 'retour_travail').length,
        repos: consultsDuJour.filter(c => c.resultat === 'repos').length,
        operations: consultsDuJour.filter(c => c.resultat === 'operation').length,
        transferts: consultsDuJour.filter(c => c.resultat === 'transfert').length,
        deces: consultsDuJour.filter(c => c.resultat === 'deces').length,
        enCours: consultsDuJour.filter(c => c.resultat === 'en_cours').length,
        // Temps d'attente
        attenteMoyenneMinutes: attenteMoyenne,
        // Par infirmerie
        parInfirmerie: Object.values(parInfirmerie)
      };
    });

    // Totaux du mois
    const totaux = {
      patientsRecus: tableauJournalier.reduce((s, j) => s + j.patientsRecus, 0),
      patientsConsultes: tableauJournalier.reduce((s, j) => s + j.patientsConsultes, 0),
      hospitalisations: tableauJournalier.reduce((s, j) => s + j.hospitalisations, 0),
      retourTravail: tableauJournalier.reduce((s, j) => s + j.retourTravail, 0),
      repos: tableauJournalier.reduce((s, j) => s + j.repos, 0),
      operations: tableauJournalier.reduce((s, j) => s + j.operations, 0),
      transferts: tableauJournalier.reduce((s, j) => s + j.transferts, 0),
      deces: tableauJournalier.reduce((s, j) => s + j.deces, 0),
      attenteMoyenneMinutes: Math.round(
        tableauJournalier.filter(j => j.attenteMoyenneMinutes > 0).reduce((s, j) => s + j.attenteMoyenneMinutes, 0) /
        (tableauJournalier.filter(j => j.attenteMoyenneMinutes > 0).length || 1)
      )
    };

    // Totaux par infirmerie pour le mois
    const totauxParInfirmerie = infirmeries.map(inf => {
      const total = tableauJournalier.reduce((s, j) => {
        const inf_j = j.parInfirmerie.find(i => i.code === inf.code);
        return s + (inf_j?.consultations || 0);
      }, 0);
      return { code: inf.code, nom: inf.nom, total };
    }).filter(i => i.total > 0);

    res.json({
      success: true,
      data: {
        mois: m,
        annee: y,
        joursOuvres: joursOuvres.length,
        tableau: tableauJournalier,
        totaux,
        infirmeries: infirmeries.map(i => ({ id: i.id, code: i.code, nom: i.nom })),
        totauxParInfirmerie
      }
    });
  } catch (err) {
    console.error('Erreur getStatsMensuelles:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// STATS TEMPS D'ATTENTE (analyse détaillée)
// ============================================
export const getStatsTempsAttente = async (req, res) => {
  try {
    const {
      dateDebut = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateFin = new Date().toISOString().split('T')[0]
    } = req.query;

    const consultations = await ConsultationPHP.findAll({
      where: {
        dateConsultation: { [Op.between]: [dateDebut, dateFin] },
        dureeAttenteMinutes: { [Op.ne]: null }
      },
      include: [
        {
          model: PatientPHP,
          as: 'patient',
          include: [
            { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] }
          ]
        }
      ],
      attributes: ['dateConsultation', 'dureeAttenteMinutes', 'serviceName'],
      raw: false
    });

    if (consultations.length === 0) {
      return res.json({
        success: true,
        data: { moyenne: 0, max: 0, min: 0, total: 0, distribution: [], parJour: [] }
      });
    }

    const attentes = consultations.map(c => c.dureeAttenteMinutes).filter(a => a >= 0);
    const moyenne = Math.round(attentes.reduce((a, b) => a + b, 0) / attentes.length);
    const max = Math.max(...attentes);
    const min = Math.min(...attentes);

    // Distribution par tranche
    const distribution = [
      { tranche: '< 30 min', count: attentes.filter(a => a < 30).length },
      { tranche: '30-60 min', count: attentes.filter(a => a >= 30 && a < 60).length },
      { tranche: '1-2h', count: attentes.filter(a => a >= 60 && a < 120).length },
      { tranche: '2-4h', count: attentes.filter(a => a >= 120 && a < 240).length },
      { tranche: '> 4h', count: attentes.filter(a => a >= 240).length },
      { tranche: '> 1 jour', count: attentes.filter(a => a >= 1440).length }
    ];

    // Par jour
    const parJourMap = {};
    consultations.forEach(c => {
      const d = c.dateConsultation;
      if (!parJourMap[d]) parJourMap[d] = [];
      parJourMap[d].push(c.dureeAttenteMinutes);
    });

    const parJour = Object.entries(parJourMap).map(([date, vals]) => ({
      date,
      moyenne: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      max: Math.max(...vals),
      total: vals.length
    })).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: { moyenne, max, min, total: attentes.length, distribution, parJour }
    });
  } catch (err) {
    console.error('Erreur getStatsTempsAttente:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// TABLEAU DE BORD GLOBAL
// ============================================
export const getDashboard = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0];

    const [
      totalPatientsActifs,
      totalConsultationsMois,
      consultationsDuJour,
      hospitalisationsEnCours,
      reposEnCours,
      derniersBons,
      dernieresConsultations
    ] = await Promise.all([
      PatientPHP.count({ where: { status: 'actif' } }),
      ConsultationPHP.count({
        where: { dateConsultation: { [Op.between]: [debutMois, today] } }
      }),
      ConsultationPHP.count({ where: { dateConsultation: today } }),
      HospitalisationPHP.count({ where: { status: 'en_cours' } }),
      ReposPHP.count({
        where: {
          status: { [Op.in]: ['en_cours', 'prolonge'] },
          dateFin: { [Op.gte]: today }
        }
      }),
      // Derniers bons émis
      BonPriseEnCharge.findAll({
        where: { dateEmission: today },
        include: [
          {
            model: PatientPHP,
            as: 'patient',
            attributes: ['id', 'matricule', 'nom', 'prenom'],
            include: [{ model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] }]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 10
      }),
      // Dernières consultations du jour
      ConsultationPHP.findAll({
        where: { dateConsultation: today },
        include: [
          {
            model: PatientPHP,
            as: 'patient',
            attributes: ['id', 'matricule', 'nom', 'prenom'],
            include: [{ model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] }]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 10
      })
    ]);

    res.json({
      success: true,
      data: {
        kpis: {
          totalPatientsActifs,
          totalConsultationsMois,
          consultationsDuJour,
          hospitalisationsEnCours,
          reposEnCours
        },
        derniersBons,
        dernieresConsultations,
        date: today
      }
    });
  } catch (err) {
    console.error('Erreur getDashboard:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// HELPERS RAPPORT
// ============================================

/** Trouve le lundi de la semaine d'une date donnée */
const getMondayOfWeek = (dateStr) => {
  const date = new Date(dateStr);
  const dow = date.getDay(); // 0=Dim, 1=Lun, ...
  const monday = new Date(date);
  monday.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1));
  return monday.toISOString().split('T')[0];
};

/** Regroupe les jours ouvrés par semaine calendaire (Lun→Ven) */
const grouperParSemaine = (joursOuvres) => {
  const weekMap = {};
  joursOuvres.forEach(d => {
    const monday = getMondayOfWeek(d);
    if (!weekMap[monday]) weekMap[monday] = [];
    weekMap[monday].push(d);
  });
  return Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, jours], idx) => ({ numero: idx + 1, jours: jours.sort() }));
};

/** Calcule les totaux (décl, reçus, hospi) pour un tableau de {parInfirmerie} */
const sumMetrics = (a, b) => ({
  declarations: (a.declarations || 0) + (b.declarations || 0),
  recus:        (a.recus        || 0) + (b.recus        || 0),
  hospi:        (a.hospi        || 0) + (b.hospi        || 0),
});

const zeroMetrics = () => ({ declarations: 0, recus: 0, hospi: 0 });

// ============================================
// RAPPORT MENSUEL (Format Excel journalier)
// ============================================
export const getRapportMensuel = async (req, res) => {
  try {
    const {
      month = new Date().getMonth() + 1,
      year  = new Date().getFullYear(),
    } = req.query;
    const m = parseInt(month), y = parseInt(year);

    const dateDebut = `${y}-${String(m).padStart(2, '0')}-01`;
    const dateFin   = new Date(y, m, 0).toISOString().split('T')[0];
    const joursOuvres = getJoursOuvresDuMois(y, m);

    const infirmeries = await Infirmerie.findAll({
      where: { isActive: true },
      order: [['nom', 'ASC']],
    });

    // ── Requêtes bulk ──────────────────────────────────────────────────────
    const [bons, consultations, hospitalisations, reposData, hospDiags] = await Promise.all([
      // DECLARATIONS = bons de prise en charge émis par infirmerie
      BonPriseEnCharge.findAll({
        where: { dateEmission: { [Op.between]: [dateDebut, dateFin] } },
        include: [{ model: PatientPHP, as: 'patient', attributes: ['infirmerieId'], required: false }],
        attributes: ['dateEmission'],
      }),
      // REÇUS HSJM = consultations par infirmerie par jour
      ConsultationPHP.findAll({
        where: { dateConsultation: { [Op.between]: [dateDebut, dateFin] } },
        include: [{ model: PatientPHP, as: 'patient', attributes: ['infirmerieId'], required: false }],
        attributes: ['dateConsultation'],
      }),
      // HOSPI = table HospitalisationPHP (source principale — dateEntree par infirmerie)
      HospitalisationPHP.findAll({
        where: { dateEntree: { [Op.between]: [dateDebut, dateFin] } },
        include: [{ model: PatientPHP, as: 'patient', attributes: ['infirmerieId'], required: false }],
        attributes: ['dateEntree'],
      }),
      // Repos maladie
      ReposPHP.findAll({
        where: { dateDebut: { [Op.between]: [dateDebut, dateFin] } },
        include: [{ model: PatientPHP, as: 'patient', attributes: ['infirmerieId'], required: false }],
        attributes: ['dateDebut', 'dureeJours'],
      }),
      // Motifs hospitalisation (diagnostic par infirmerie)
      HospitalisationPHP.findAll({
        where: { dateEntree: { [Op.between]: [dateDebut, dateFin] } },
        include: [{
          model: PatientPHP, as: 'patient', attributes: ['infirmerieId'],
          include: [{ model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] }],
          required: false,
        }],
        attributes: ['diagnostic'],
      }),
    ]);

    // ── Lookup id→code ─────────────────────────────────────────────────────
    const infMap  = {};                         // id → code
    infirmeries.forEach(i => { infMap[i.id] = i.code; });
    const getCode = (r) => infMap[r.patient?.infirmerieId] || null;

    // ── Construction des données journalières ─────────────────────────────
    const joursData = {};
    joursOuvres.forEach(date => {
      const byInf = {};
      infirmeries.forEach(i => { byInf[i.code] = zeroMetrics(); });
      joursData[date] = byInf;
    });

    bons.forEach(b => {
      if (!joursData[b.dateEmission]) return;
      const code = getCode(b);
      if (code && joursData[b.dateEmission][code]) joursData[b.dateEmission][code].declarations++;
    });

    consultations.forEach(c => {
      if (!joursData[c.dateConsultation]) return;
      const code = getCode(c);
      if (code && joursData[c.dateConsultation][code]) joursData[c.dateConsultation][code].recus++;
    });

    // HOSPI : source = table php_hospitalisations (dateEntree), indépendant du resultat consultation
    hospitalisations.forEach(h => {
      if (!joursData[h.dateEntree]) return;
      const code = getCode(h);
      if (code && joursData[h.dateEntree][code]) joursData[h.dateEntree][code].hospi++;
    });

    // ── Groupement par semaine ────────────────────────────────────────────
    const semaines = grouperParSemaine(joursOuvres).map(s => {
      const totParInf = {};
      infirmeries.forEach(i => { totParInf[i.code] = zeroMetrics(); });
      let globalSem = zeroMetrics();

      const joursDetail = s.jours.map(date => {
        const byInf = joursData[date];
        let totJour = zeroMetrics();

        Object.entries(byInf).forEach(([code, v]) => {
          totParInf[code] = sumMetrics(totParInf[code], v);
          totJour = sumMetrics(totJour, v);
        });
        globalSem = sumMetrics(globalSem, totJour);

        return {
          date,
          jourNum: parseInt(date.split('-')[2]),
          parInfirmerie: byInf,
          totaux: totJour,
        };
      });

      return {
        numero: s.numero,
        jours: joursDetail,
        totaux: { parInfirmerie: totParInf, global: globalSem },
      };
    });

    // ── Totaux mensuels ────────────────────────────────────────────────────
    const totParInfMois = {};
    infirmeries.forEach(i => { totParInfMois[i.code] = zeroMetrics(); });
    let globalMois = zeroMetrics();
    semaines.forEach(s => {
      Object.entries(s.totaux.parInfirmerie).forEach(([code, v]) => {
        totParInfMois[code] = sumMetrics(totParInfMois[code], v);
      });
      globalMois = sumMetrics(globalMois, s.totaux.global);
    });

    // ── Repos maladie par infirmerie ──────────────────────────────────────
    const reposMap = {};
    infirmeries.forEach(i => { reposMap[i.code] = { code: i.code, nom: i.nom, totalJours: 0, nbPersonnes: 0 }; });
    reposData.forEach(r => {
      const code = getCode(r);
      if (code && reposMap[code]) {
        reposMap[code].totalJours  += r.dureeJours || 0;
        reposMap[code].nbPersonnes += 1;
      }
    });

    // ── Motifs hospitalisation par infirmerie ─────────────────────────────
    const motifMap = {};
    hospDiags.forEach(h => {
      const code   = h.patient?.infirmerie?.code || getCode(h) || 'Inconnu';
      const motif  = (h.diagnostic || '').trim() || '(non renseigné)';
      const key    = `${code}|${motif}`;
      if (!motifMap[key]) motifMap[key] = { infirmerie: code, motif, count: 0 };
      motifMap[key].count++;
    });

    res.json({
      success: true,
      data: {
        mois: m,
        annee: y,
        infirmeries: infirmeries.map(i => ({ id: i.id, code: i.code, nom: i.nom })),
        semaines,
        totauxMois: { parInfirmerie: totParInfMois, global: globalMois },
        reposMaladie: Object.values(reposMap)
          .filter(r => r.totalJours > 0 || r.nbPersonnes > 0),
        motifHospi: Object.values(motifMap)
          .sort((a, b) => a.infirmerie.localeCompare(b.infirmerie) || b.count - a.count),
      },
    });
  } catch (err) {
    console.error('Erreur getRapportMensuel:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// RAPPORT TRIMESTRIEL  (format Excel Sheet 3)
// ============================================
export const getRapportTrimestriel = async (req, res) => {
  try {
    const now = new Date();
    const {
      trimestre = Math.ceil((now.getMonth() + 1) / 3),
      year      = now.getFullYear(),
    } = req.query;

    const t = parseInt(trimestre), y = parseInt(year);
    const moisDuTrimestre = [(t - 1) * 3 + 1, (t - 1) * 3 + 2, (t - 1) * 3 + 3];

    const infirmeries = await Infirmerie.findAll({
      where: { isActive: true },
      order: [['nom', 'ASC']],
    });
    const infMap = {};
    infirmeries.forEach(i => { infMap[i.id] = i.code; });
    const getCode = (r) => infMap[r.patient?.infirmerieId] || null;

    const NOMS_MOIS = ['', 'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
      'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];

    const parMois = {};
    for (const m of moisDuTrimestre) {
      const dateDebut = `${y}-${String(m).padStart(2, '0')}-01`;
      const dateFin   = new Date(y, m, 0).toISOString().split('T')[0];

      const [bons, consultations, hospsMois] = await Promise.all([
        BonPriseEnCharge.findAll({
          where: { dateEmission: { [Op.between]: [dateDebut, dateFin] } },
          include: [{ model: PatientPHP, as: 'patient', attributes: ['infirmerieId'], required: false }],
          attributes: ['dateEmission'],
        }),
        ConsultationPHP.findAll({
          where: { dateConsultation: { [Op.between]: [dateDebut, dateFin] } },
          include: [{ model: PatientPHP, as: 'patient', attributes: ['infirmerieId'], required: false }],
          attributes: ['dateConsultation'],
        }),
        HospitalisationPHP.findAll({
          where: { dateEntree: { [Op.between]: [dateDebut, dateFin] } },
          include: [{ model: PatientPHP, as: 'patient', attributes: ['infirmerieId'], required: false }],
          attributes: ['dateEntree'],
        }),
      ]);

      const byInf = {};
      infirmeries.forEach(i => { byInf[i.code] = zeroMetrics(); });

      bons.forEach(b => {
        const code = getCode(b);
        if (code && byInf[code]) byInf[code].declarations++;
      });
      consultations.forEach(c => {
        const code = getCode(c);
        if (code && byInf[code]) byInf[code].recus++;
      });
      hospsMois.forEach(h => {
        const code = getCode(h);
        if (code && byInf[code]) byInf[code].hospi++;
      });

      let global = zeroMetrics();
      Object.values(byInf).forEach(v => { global = sumMetrics(global, v); });

      parMois[m] = { label: NOMS_MOIS[m], parInfirmerie: byInf, global };
    }

    // Totaux trimestriels
    const totParInf = {};
    infirmeries.forEach(i => { totParInf[i.code] = zeroMetrics(); });
    let globalTrim = zeroMetrics();
    moisDuTrimestre.forEach(m => {
      Object.entries(parMois[m].parInfirmerie).forEach(([code, v]) => {
        totParInf[code] = sumMetrics(totParInf[code], v);
      });
      globalTrim = sumMetrics(globalTrim, parMois[m].global);
    });

    res.json({
      success: true,
      data: {
        trimestre: t,
        annee: y,
        mois: moisDuTrimestre,
        infirmeries: infirmeries.map(i => ({ id: i.id, code: i.code, nom: i.nom })),
        parMois,
        totauxTrimestre: { parInfirmerie: totParInf, global: globalTrim },
      },
    });
  } catch (err) {
    console.error('Erreur getRapportTrimestriel:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// PATHOLOGIES PAR INFIRMERIE
// ============================================
export const getPathologiesParInfirmerie = async (req, res) => {
  try {
    const {
      month = new Date().getMonth() + 1,
      year  = new Date().getFullYear(),
      top   = 10,
    } = req.query;
    const m = parseInt(month), y = parseInt(year);
    const dateDebut = `${y}-${String(m).padStart(2,'0')}-01`;
    const dateFin   = new Date(y, m, 0).toISOString().split('T')[0];

    const infirmeries = await Infirmerie.findAll({
      where: { isActive: true },
      order: [['nom', 'ASC']],
    });

    // Toutes les consultations du mois avec diagnostic non vide
    const consultations = await ConsultationPHP.findAll({
      where: {
        dateConsultation: { [Op.between]: [dateDebut, dateFin] },
        diagnostic: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
      },
      include: [{
        model: PatientPHP,
        as: 'patient',
        attributes: ['infirmerieId'],
        required: true,
      }],
      attributes: ['diagnostic'],
    });

    // Agréger par infirmerie → top diagnostics
    const infMap = {};
    infirmeries.forEach(i => { infMap[i.id] = i.code; });

    const aggr = {}; // infCode → { diag → count }
    infirmeries.forEach(i => { aggr[i.code] = {}; });

    consultations.forEach(c => {
      const code = infMap[c.patient?.infirmerieId];
      if (!code) return;
      const diag = (c.diagnostic || '').trim().toUpperCase();
      if (!diag || diag.length < 2) return;
      aggr[code][diag] = (aggr[code][diag] || 0) + 1;
    });

    // Construire le résultat : top N par infirmerie
    const n = parseInt(top) || 10;
    const result = infirmeries.map(inf => {
      const entries = Object.entries(aggr[inf.code] || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, n)
        .map(([diagnostic, count]) => ({ diagnostic, count }));

      const total = Object.values(aggr[inf.code] || {}).reduce((s, v) => s + v, 0);
      return { infirmerie: inf.code, nom: inf.nom, total, pathologies: entries };
    }).filter(r => r.total > 0);

    // Top global (toutes infirmeries confondues)
    const globalAggr = {};
    consultations.forEach(c => {
      const diag = (c.diagnostic || '').trim().toUpperCase();
      if (!diag || diag.length < 2) return;
      globalAggr[diag] = (globalAggr[diag] || 0) + 1;
    });
    const topGlobal = Object.entries(globalAggr)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .map(([diagnostic, count]) => ({ diagnostic, count }));

    res.json({
      success: true,
      data: {
        periode: { mois: m, annee: y, dateDebut, dateFin },
        topGlobal,
        parInfirmerie: result,
      },
    });
  } catch (err) {
    console.error('getPathologiesParInfirmerie:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
