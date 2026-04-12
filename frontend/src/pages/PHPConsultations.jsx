// frontend/src/pages/PHPConsultations.jsx
// Liste et gestion des consultations PHP

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope, Search, RefreshCw, ChevronLeft, ChevronRight,
  Filter, Clock, AlertCircle, CheckCircle, ArrowLeft,
  Calendar, Building2, User, ClipboardList, Timer
} from 'lucide-react';
import { phpConsultationAPI, phpReferenceAPI, phpRendezVousAPI } from '../services/phpService';
import PHPConsultationForm from '../components/php/PHPConsultationForm';
import toast from 'react-hot-toast';

const RESULTATS = [
  { value: '',               label: 'Tous les résultats' },
  { value: 'en_cours',       label: 'En cours' },
  { value: 'pharmacie',      label: 'Pharmacie' },
  { value: 'laboratoire',    label: 'Laboratoire' },
  { value: 'radiologie',     label: 'Radiologie' },
  { value: 'specialiste',    label: 'Spécialiste' },
  { value: 'repos',          label: 'Repos maladie' },
  { value: 'hospitalisation', label: 'Hospitalisé' },
  { value: 'retour_travail', label: 'Retour travail (historique)' },
  { value: 'operation',      label: 'Opération' },
  { value: 'transfert',      label: 'Transfert' },
  { value: 'deces',          label: 'Décès' },
];

const RESULTAT_STYLE = {
  en_cours:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pharmacie:       'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  laboratoire:     'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  radiologie:      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  specialiste:     'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  repos:           'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  hospitalisation: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  retour_travail:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  operation:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  transfert:       'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  deces:           'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
};

const RESULTAT_LABEL = {
  en_cours:        'En cours',
  pharmacie:       'Pharmacie',
  laboratoire:     'Laboratoire',
  radiologie:      'Radiologie',
  specialiste:     'Spécialiste',
  repos:           'Repos',
  hospitalisation: 'Hospitalisé',
  retour_travail:  'Retour travail',
  operation:       'Opération',
  transfert:       'Transféré',
  deces:           'Décès',
};

function formatMinutes(min) {
  if (!min || min === 0) return '–';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export default function PHPConsultations() {
  const [consultations, setConsultations] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [infirmeries, setInfirmeries] = useState([]);

  // Filtres
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterResultat, setFilterResultat] = useState('');
  const [filterInfirmerie, setFilterInfirmerie] = useState('');
  const [page, setPage] = useState(1);

  // Consultation sélectionnée pour clôture
  const [selectedConsult, setSelectedConsult] = useState(null);
  const [showConsultForm, setShowConsultForm] = useState(false);
  const [cloturantId, setCloturantId] = useState(null);
  const [showCloture, setShowCloture] = useState(false);

  const loadConsultations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await phpConsultationAPI.getAll({
        search: search || undefined,
        date: filterDate || undefined,
        resultat: filterResultat || undefined,
        infirmerieId: filterInfirmerie || undefined,
        page,
        limit: 20,
      });
      setConsultations(res.data.data || []);
      setPagination(res.data.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch (err) {
      console.error('Erreur chargement consultations:', err);
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  }, [search, filterDate, filterResultat, filterInfirmerie, page]);

  useEffect(() => { loadConsultations(); }, [loadConsultations]);
  useEffect(() => {
    phpReferenceAPI.getInfirmeries()
      .then(r => setInfirmeries(r.data.data || []))
      .catch(console.error);
  }, []);

  const handleCloturer = async (consult, formData) => {
    try {
      setCloturantId(consult.id);
      const result = await phpConsultationAPI.cloturer(consult.id, formData);
      // Créer le RDV si sélectionné
      if (formData.resultats?.includes('rendez_vous') || formData.rdvDate) {
        await phpRendezVousAPI.create({
          patientId:      consult.patientId || consult.patient?.id,
          consultationId: consult.id,
          dateRdv:   formData.rdvDate,
          heureRdv:  formData.rdvHeure  || null,
          service:   formData.rdvService || null,
          motif:     formData.diagnostic || null,
        });
      }
      setShowCloture(false);
      setSelectedConsult(null);
      loadConsultations();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la clôture');
    } finally {
      setCloturantId(null);
    }
  };

  const todayISO = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/php" className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Stethoscope className="text-green-600" size={22} />
              Consultations PHP
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {pagination.total} consultation{pagination.total !== 1 ? 's' : ''}
              {filterDate && ` — ${new Date(filterDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
            </p>
          </div>
        </div>
        <button
          onClick={loadConsultations}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Recherche */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Nom, matricule..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {/* Date */}
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {/* Résultat */}
          <select
            value={filterResultat}
            onChange={(e) => { setFilterResultat(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {RESULTATS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {/* Infirmerie */}
          <select
            value={filterInfirmerie}
            onChange={(e) => { setFilterInfirmerie(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Toutes les infirmeries</option>
            {infirmeries.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}
          </select>
        </div>
        {/* Raccourcis date */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => { setFilterDate(todayISO); setPage(1); }}
            className={`text-xs px-2 py-1 rounded-full transition-colors ${filterDate === todayISO ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => { setFilterDate(''); setPage(1); }}
            className={`text-xs px-2 py-1 rounded-full transition-colors ${filterDate === '' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            Toutes les dates
          </button>
        </div>
      </div>

      {/* Tableau des consultations */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse" />
          ))}
        </div>
      ) : consultations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
          <Stethoscope size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune consultation trouvée</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Modifiez les filtres ou enregistrez un nouveau patient</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">Patient</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">Infirmerie</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">Service</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">Date</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">Attente</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">Résultat</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map((c, i) => (
                    <tr
                      key={c.id}
                      className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40 dark:bg-gray-700/20' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {c.patient?.nom} {c.patient?.prenom || ''}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{c.patient?.matricule}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {c.patient?.infirmerie?.nom || '–'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {c.serviceName || '–'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {c.dateConsultation
                          ? new Date(c.dateConsultation).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '–'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.dureeAttenteMinutes > 0 ? (
                          <span className={`text-xs font-medium ${
                            c.dureeAttenteMinutes > 1440 ? 'text-red-600 dark:text-red-400' :
                            c.dureeAttenteMinutes > 60  ? 'text-orange-500 dark:text-orange-400' :
                            'text-green-600 dark:text-green-400'
                          }`}>
                            {formatMinutes(c.dureeAttenteMinutes)}
                            {c.dureeAttenteMinutes > 1440 && (
                              <AlertCircle size={11} className="inline ml-1 text-red-500" />
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {/* Afficher le/les parcours — multi si ordonnance contient JSON */}
                        {(() => {
                          let parcours = [];
                          try {
                            const parsed = JSON.parse(c.ordonnance || '');
                            if (Array.isArray(parsed)) parcours = parsed;
                          } catch {}
                          if (parcours.length > 1) {
                            return (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {parcours.map(p => (
                                  <span key={p} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${RESULTAT_STYLE[p] || 'bg-gray-100 text-gray-600'}`}>
                                    {PARCOURS_BTNS.find(b => b.value === p)?.icon} {RESULTAT_LABEL[p] || p}
                                  </span>
                                ))}
                              </div>
                            );
                          }
                          return (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${RESULTAT_STYLE[c.resultat] || 'bg-gray-100 text-gray-600'}`}>
                              {PARCOURS_BTNS.find(b => b.value === c.resultat)?.icon} {RESULTAT_LABEL[c.resultat] || c.resultat || '–'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.resultat === 'en_cours' ? (
                          <button
                            onClick={() => { setSelectedConsult(c); setShowCloture(true); }}
                            className="text-xs px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                          >
                            Clôturer
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">–</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                {((page-1)*20)+1}–{Math.min(page*20, pagination.total)} sur {pagination.total}
              </p>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p-1)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p+1)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal clôture consultation */}
      {showCloture && selectedConsult && (
        <CloturerConsultationModal
          consultation={selectedConsult}
          loading={cloturantId === selectedConsult.id}
          onClose={() => { setShowCloture(false); setSelectedConsult(null); }}
          onSubmit={(data) => handleCloturer(selectedConsult, data)}
        />
      )}
    </div>
  );
}

// ── Modal clôture ─────────────────────────────────────────────────────────────
const PARCOURS_BTNS = [
  { value: 'pharmacie',       label: 'Pharmacie',       icon: '💊', activeClass: 'bg-cyan-600 border-cyan-600 text-white',     desc: 'Médicaments prescrits'    },
  { value: 'laboratoire',     label: 'Laboratoire',     icon: '🔬', activeClass: 'bg-teal-600 border-teal-600 text-white',     desc: 'Analyses biologiques'     },
  { value: 'radiologie',      label: 'Radiologie',      icon: '🩻', activeClass: 'bg-indigo-600 border-indigo-600 text-white', desc: 'Imagerie médicale'        },
  { value: 'specialiste',     label: 'Spécialiste',     icon: '👨‍⚕️', activeClass: 'bg-violet-600 border-violet-600 text-white', desc: 'Référé à un spécialiste'  },
  { value: 'hospitalisation', label: 'Hospitalisation', icon: '🏥', activeClass: 'bg-red-600 border-red-600 text-white',       desc: 'Admission en service'     },
  { value: 'repos',           label: 'Repos maladie',   icon: '🛌', activeClass: 'bg-yellow-500 border-yellow-500 text-white', desc: 'Certificat de repos'      },
  { value: 'rendez_vous',     label: 'Rendez-vous',     icon: '📅', activeClass: 'bg-blue-600 border-blue-600 text-white',     desc: 'Prochain RDV médical'     },
];

const SPECIALITES = ['Gynécologie','Chirurgie','Ophtalmologie','Dentiste','Urologie','UPEC','Kinésithérapie','Autres'];

// Ordre de priorité pour le résultat "principal" stocké en DB (stats)
const PRIORITE_RESULTAT = ['hospitalisation','repos','specialiste','radiologie','laboratoire','pharmacie','rendez_vous'];

function CloturerConsultationModal({ consultation, loading, onClose, onSubmit }) {
  // Multi-sélection : Set des parcours cochés
  const [selection, setSelection] = useState(new Set());

  // Champs détaillés par parcours
  const [serviceHospitalisation, setServiceHospitalisation] = useState('');
  const [dateDebut, setDateDebut]   = useState(new Date().toISOString().split('T')[0]);
  const [dateFin, setDateFin]       = useState('');
  const [specialite, setSpecialite] = useState('');
  const [specialiteAutre, setSpecialiteAutre] = useState('');
  const [diagnostic, setDiagnostic] = useState('');
  // RDV
  const [rdvDate, setRdvDate]       = useState('');
  const [rdvHeure, setRdvHeure]     = useState('');
  const [rdvService, setRdvService] = useState('');

  const [servicesMed, setServicesMed] = useState([]);
  const [erreur, setErreur]           = useState('');

  useEffect(() => {
    phpReferenceAPI.getServicesMedicaux()
      .then(res => setServicesMed(res.data.data || []))
      .catch(console.error);
  }, []);

  // Toggle un parcours
  const toggle = (val) => {
    setErreur('');
    setSelection(prev => {
      const next = new Set(prev);
      if (next.has(val)) {
        next.delete(val);
        // Réinitialiser les champs si on décoche
        if (val === 'hospitalisation') setServiceHospitalisation('');
        if (val === 'repos') { setDateFin(''); }
        if (val === 'specialiste') { setSpecialite(''); setSpecialiteAutre(''); }
        if (val === 'rendez_vous') { setRdvDate(''); setRdvHeure(''); setRdvService(''); }
      } else {
        next.add(val);
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErreur('');

    if (selection.size === 0) {
      setErreur('Veuillez sélectionner au moins une étape du parcours.'); return;
    }
    if (selection.has('hospitalisation') && !serviceHospitalisation) {
      setErreur('Veuillez choisir le service d\'hospitalisation.'); return;
    }
    if (selection.has('repos') && !dateFin) {
      setErreur('Veuillez indiquer la date de fin de repos.'); return;
    }
    if (selection.has('specialiste') && !specialite) {
      setErreur('Veuillez choisir la spécialité.'); return;
    }
    if (selection.has('specialiste') && specialite === 'Autres' && !specialiteAutre.trim()) {
      setErreur('Veuillez préciser la spécialité.'); return;
    }
    if (selection.has('rendez_vous') && !rdvDate) {
      setErreur('Veuillez indiquer la date du rendez-vous.'); return;
    }

    // Résultat principal = le plus prioritaire parmi la sélection
    const resultats = Array.from(selection);
    const resultatPrincipal = PRIORITE_RESULTAT.find(p => selection.has(p)) || resultats[0];
    const specialiteFinal = specialite === 'Autres' ? specialiteAutre.trim() : specialite;

    onSubmit({
      resultats,
      resultat: resultatPrincipal,
      diagnostic,
      ...(selection.has('hospitalisation') && { serviceHospitalisation }),
      ...(selection.has('repos') && { dateDebut, dateFin }),
      ...(selection.has('specialiste') && { ordonnance: specialiteFinal }),
      ...(selection.has('rendez_vous') && { rdvDate, rdvHeure, rdvService }),
    });
  };

  const inp = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500';
  const lbl = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* En-tête */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            Clôturer — Parcours patient
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {consultation.patient?.nom} {consultation.patient?.prenom}
            </span>
            <span className="font-mono ml-1.5 text-gray-400">({consultation.patient?.matricule})</span>
            {consultation.serviceName && (
              <span className="ml-1.5 text-gray-500">— {consultation.serviceName}</span>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">

          {/* ── Choix multi-sélection ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide">
              Suite du parcours <span className="text-red-500">*</span>
            </label>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">
              Vous pouvez sélectionner plusieurs étapes simultanément
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PARCOURS_BTNS.map(btn => {
                const isOn = selection.has(btn.value);
                return (
                  <button
                    key={btn.value}
                    type="button"
                    onClick={() => toggle(btn.value)}
                    className={`relative flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                      isOn
                        ? `${btn.activeClass} shadow-md scale-[1.02]`
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-400 hover:shadow-sm'
                    }`}
                  >
                    {/* Coche */}
                    {isOn && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-white/30 rounded-full flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                    <span className="text-xl">{btn.icon}</span>
                    <span className="font-semibold">{btn.label}</span>
                    <span className={`text-[10px] text-center leading-tight ${isOn ? 'opacity-80' : 'text-gray-400 dark:text-gray-500'}`}>
                      {btn.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Récapitulatif sélection */}
            {selection.size > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from(selection).map(v => {
                  const b = PARCOURS_BTNS.find(x => x.value === v);
                  return b ? (
                    <span key={v} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${b.activeClass}`}>
                      {b.icon} {b.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* ── Blocs détail — s'affichent si l'option est cochée ── */}

          {/* HOSPITALISATION */}
          {selection.has('hospitalisation') && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300">🏥 Service d'hospitalisation</p>
              <select
                value={serviceHospitalisation}
                onChange={e => setServiceHospitalisation(e.target.value)}
                className={`${inp} border-red-300 dark:border-red-700 focus:ring-red-500`}
              >
                <option value="">-- Choisir le service --</option>
                {servicesMed.length > 0
                  ? servicesMed.map(s => (
                      <option key={s.code || s.nom} value={s.nom}>{s.nom}</option>
                    ))
                  : <>
                      <option value="MEDECINE">MÉDECINE</option>
                      <option value="CHIRURGIE">CHIRURGIE</option>
                      <option value="GYNECOLOGIE">GYNÉCOLOGIE</option>
                      <option value="PMI">PMI</option>
                      <option value="UROLOGIE">UROLOGIE</option>
                      <option value="CARDIOLOGIE">CARDIOLOGIE</option>
                      <option value="GASTROENTEROLOGIE">GASTROENTÉROLOGIE</option>
                      <option value="ORL">ORL</option>
                      <option value="OPHTALMOLOGIE">OPHTALMOLOGIE</option>
                      <option value="KINESITHERAPIE">KINÉSITHÉRAPIE</option>
                      <option value="SAU">SAU (Urgences)</option>
                      <option value="UPEC">UPEC</option>
                      <option value="ANESTHESIE">ANESTHÉSIE</option>
                    </>
                }
              </select>
            </div>
          )}

          {/* REPOS MALADIE */}
          {selection.has('repos') && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">🛌 Certificat de repos maladie</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`${lbl} text-yellow-700 dark:text-yellow-400`}>Date début <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={e => setDateDebut(e.target.value)}
                    className={`${inp} border-yellow-300 dark:border-yellow-700 focus:ring-yellow-500`}
                  />
                </div>
                <div>
                  <label className={`${lbl} text-yellow-700 dark:text-yellow-400`}>Date fin <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    min={dateDebut}
                    value={dateFin}
                    onChange={e => setDateFin(e.target.value)}
                    className={`${inp} border-yellow-300 dark:border-yellow-700 focus:ring-yellow-500`}
                  />
                </div>
              </div>
              {dateDebut && dateFin && (
                <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                  → {Math.max(0, Math.round((new Date(dateFin) - new Date(dateDebut)) / 86400000) + 1)} jour(s) de repos
                </p>
              )}
            </div>
          )}

          {/* SPÉCIALISTE */}
          {selection.has('specialiste') && (
            <div className="p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">👨‍⚕️ Choisir la spécialité</p>
              <div className="grid grid-cols-2 gap-2">
                {SPECIALITES.map(sp => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => { setSpecialite(sp); setSpecialiteAutre(''); }}
                    className={`px-2 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                      specialite === sp
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-violet-400'
                    }`}
                  >
                    {sp}
                  </button>
                ))}
              </div>
              {specialite === 'Autres' && (
                <input
                  type="text"
                  autoFocus
                  placeholder="Préciser la spécialité..."
                  value={specialiteAutre}
                  onChange={e => setSpecialiteAutre(e.target.value)}
                  className={`${inp} border-violet-300 dark:border-violet-700 focus:ring-violet-500`}
                />
              )}
            </div>
          )}

          {/* RENDEZ-VOUS */}
          {selection.has('rendez_vous') && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">📅 Rendez-vous médical</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`${lbl} text-blue-700 dark:text-blue-400`}>Date RDV <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={rdvDate}
                    onChange={e => setRdvDate(e.target.value)}
                    className={`${inp} border-blue-300 dark:border-blue-700 focus:ring-blue-500`}
                  />
                </div>
                <div>
                  <label className={`${lbl} text-blue-700 dark:text-blue-400`}>Heure</label>
                  <input
                    type="time"
                    value={rdvHeure}
                    onChange={e => setRdvHeure(e.target.value)}
                    className={`${inp} border-blue-300 dark:border-blue-700 focus:ring-blue-500`}
                  />
                </div>
              </div>
              <div>
                <label className={`${lbl} text-blue-700 dark:text-blue-400`}>Service / Spécialité</label>
                <input
                  type="text"
                  value={rdvService}
                  onChange={e => setRdvService(e.target.value)}
                  placeholder="Ex: Cardiologie, Gynécologie..."
                  className={`${inp} border-blue-300 dark:border-blue-700 focus:ring-blue-500`}
                />
              </div>
            </div>
          )}

          {/* DIAGNOSTIC */}
          <div>
            <label className={lbl}>Diagnostic / Observation</label>
            <textarea
              value={diagnostic}
              onChange={e => setDiagnostic(e.target.value)}
              rows={2}
              className={`${inp} resize-none`}
              placeholder="Diagnostic médical..."
            />
          </div>

          {/* Erreur */}
          {erreur && (
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{erreur}</p>
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || selection.size === 0}
              className="flex-[2] flex items-center justify-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {loading
                ? 'Enregistrement...'
                : selection.size === 0
                  ? '← Sélectionner le parcours'
                  : `✓ Confirmer (${selection.size} étape${selection.size > 1 ? 's' : ''})`
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
