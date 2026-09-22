// frontend/src/pages/PHPConsultations.jsx
// Liste et gestion des consultations PHP

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Stethoscope, Search, RefreshCw, ChevronLeft, ChevronRight,
  Filter, Clock, AlertCircle, CheckCircle, ArrowLeft,
  Calendar, Building2, User, ClipboardList, Timer
} from 'lucide-react';
import { phpConsultationAPI, phpReferenceAPI, phpRendezVousAPI } from '../services/phpService';
import PHPConsultationForm from '../components/php/PHPConsultationForm';
import toast from 'react-hot-toast';
import i18n from '../i18n/config';

const BCP47_LOCALES = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA' };

const getResultats = (t) => [
  { value: '',               label: t('Tous les résultats') },
  { value: 'en_cours',       label: t('En cours') },
  { value: 'pharmacie',      label: t('Pharmacie') },
  { value: 'laboratoire',    label: t('Laboratoire') },
  { value: 'radiologie',     label: t('Radiologie') },
  { value: 'specialiste',    label: t('Spécialiste') },
  { value: 'repos',          label: t('Repos maladie') },
  { value: 'hospitalisation', label: t('Hospitalisé') },
  { value: 'retour_travail', label: t('Retour travail (historique)') },
  { value: 'operation',      label: t('Opération') },
  { value: 'transfert',      label: t('Transfert') },
  { value: 'deces',          label: t('Décès') },
];

// Inline style maps replacing Tailwind color classes
const RESULTAT_STYLE_OBJ = {
  en_cours:        { background: 'var(--brand-soft)', color: 'var(--brand)' },
  pharmacie:       { background: 'rgba(6,182,212,0.12)', color: 'rgb(14,116,144)' },
  laboratoire:     { background: 'rgba(20,184,166,0.12)', color: 'rgb(15,118,110)' },
  radiologie:      { background: 'rgba(99,102,241,0.12)', color: 'rgb(67,56,202)' },
  specialiste:     { background: 'rgba(139,92,246,0.12)', color: 'rgb(109,40,217)' },
  repos:           { background: 'var(--warning-soft)', color: 'var(--warning)' },
  hospitalisation: { background: 'var(--danger-soft)', color: 'var(--danger)' },
  retour_travail:  { background: 'var(--success-soft)', color: 'var(--success)' },
  operation:       { background: 'rgba(139,92,246,0.12)', color: 'rgb(109,40,217)' },
  transfert:       { background: 'rgba(249,115,22,0.12)', color: 'rgb(194,65,12)' },
  deces:           { background: 'var(--surface-3)', color: 'var(--fg-muted)' },
};

const getResultatLabel = (t) => ({
  en_cours:        t('En cours'),
  pharmacie:       t('Pharmacie'),
  laboratoire:     t('Laboratoire'),
  radiologie:      t('Radiologie'),
  specialiste:     t('Spécialiste'),
  repos:           t('Repos'),
  hospitalisation: t('Hospitalisé'),
  retour_travail:  t('Retour travail'),
  operation:       t('Opération'),
  transfert:       t('Transféré'),
  deces:           t('Décès'),
});

function formatMinutes(min) {
  if (!min || min === 0) return '–';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export default function PHPConsultations() {
  const { t } = useTranslation();
  const RESULTATS = getResultats(t);
  const RESULTAT_LABEL = getResultatLabel(t);
  const PARCOURS_BTNS = getParcoursBtns(t);
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
      toast(err.response?.data?.message || t('Erreur lors de la clôture'));
    } finally {
      setCloturantId(null);
    }
  };

  const todayISO = new Date().toISOString().split('T')[0];

  const inputStyle = {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-2)',
    background: 'var(--surface)',
    color: 'var(--fg)',
    fontSize: '0.875rem',
    padding: '0.5rem 0.75rem',
    width: '100%',
    outline: 'none',
  };

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ background: 'var(--surface-2)' }}>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/php" className="p-1 rounded-lg transition-colors" style={{ color: 'var(--fg-muted)' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <Stethoscope style={{ color: 'var(--success)' }} size={22} />
              {t('Consultations PHP')}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              {t('{{count}} consultation(s)', { count: pagination.total })}
              {filterDate && ` — ${new Date(filterDate + 'T12:00:00').toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
            </p>
          </div>
        </div>
        <button
          onClick={loadConsultations}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {t('Actualiser')}
        </button>
      </div>

      {/* Filtres */}
      <div className="rounded-xl p-3 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Recherche */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-subtle)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('Nom, matricule...')}
              style={{ ...inputStyle, paddingLeft: '2.25rem' }}
            />
          </div>
          {/* Date */}
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-subtle)' }} />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
              style={{ ...inputStyle, paddingLeft: '2.25rem' }}
            />
          </div>
          {/* Résultat */}
          <select
            value={filterResultat}
            onChange={(e) => { setFilterResultat(e.target.value); setPage(1); }}
            style={inputStyle}
          >
            {RESULTATS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {/* Infirmerie */}
          <select
            value={filterInfirmerie}
            onChange={(e) => { setFilterInfirmerie(e.target.value); setPage(1); }}
            style={inputStyle}
          >
            <option value="">{t('Toutes les infirmeries')}</option>
            {infirmeries.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}
          </select>
        </div>
        {/* Raccourcis date */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => { setFilterDate(todayISO); setPage(1); }}
            className="text-xs px-2 py-1 rounded-full transition-colors"
            style={filterDate === todayISO
              ? { background: 'var(--success-soft)', color: 'var(--success)' }
              : { background: 'var(--surface-2)', color: 'var(--fg-muted)' }}
          >
            {t("Aujourd'hui")}
          </button>
          <button
            onClick={() => { setFilterDate(''); setPage(1); }}
            className="text-xs px-2 py-1 rounded-full transition-colors"
            style={filterDate === ''
              ? { background: 'var(--success-soft)', color: 'var(--success)' }
              : { background: 'var(--surface-2)', color: 'var(--fg-muted)' }}
          >
            {t('Toutes les dates')}
          </button>
        </div>
      </div>

      {/* Tableau des consultations */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 rounded-xl border animate-pulse" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
          ))}
        </div>
      ) : consultations.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Stethoscope size={40} className="mx-auto mb-3" style={{ color: 'var(--fg-subtle)' }} />
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{t('Aucune consultation trouvée')}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--fg-subtle)' }}>{t('Modifiez les filtres ou enregistrez un nouveau patient')}</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>{t('Patient')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>{t('Infirmerie')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>{t('Service')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>{t('Date')}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>{t('Attente')}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>{t('Résultat')}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>{t('Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map((c, i) => (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: i % 2 === 1 ? 'var(--surface-2)' : 'var(--surface)',
                      }}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm" style={{ color: 'var(--fg)' }}>
                          {c.patient?.nom} {c.patient?.prenom || ''}
                        </p>
                        <p className="text-xs font-mono" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{c.patient?.matricule}</p>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {c.patient?.infirmerie?.nom || '–'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {c.serviceName || '–'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {c.dateConsultation
                          ? new Date(c.dateConsultation).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '–'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.dureeAttenteMinutes > 0 ? (
                          <span className="text-xs font-medium" style={{
                            color: c.dureeAttenteMinutes > 1440 ? 'var(--danger)' :
                                   c.dureeAttenteMinutes > 60  ? 'var(--warning)' :
                                   'var(--success)'
                          }}>
                            {formatMinutes(c.dureeAttenteMinutes)}
                            {c.dureeAttenteMinutes > 1440 && (
                              <AlertCircle size={11} className="inline ml-1" style={{ color: 'var(--danger)' }} />
                            )}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
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
                                  <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                    style={RESULTAT_STYLE_OBJ[p] || { background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
                                    {PARCOURS_BTNS.find(b => b.value === p)?.icon} {RESULTAT_LABEL[p] || p}
                                  </span>
                                ))}
                              </div>
                            );
                          }
                          return (
                            <span className="text-xs px-2 py-1 rounded-full font-medium"
                              style={RESULTAT_STYLE_OBJ[c.resultat] || { background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
                              {PARCOURS_BTNS.find(b => b.value === c.resultat)?.icon} {RESULTAT_LABEL[c.resultat] || c.resultat || '–'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.resultat === 'en_cours' ? (
                          <button
                            onClick={() => { setSelectedConsult(c); setShowCloture(true); }}
                            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                            style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success)' }}
                          >
                            {t('Clôturer')}
                          </button>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>–</span>
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
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                {t('{{from}}–{{to}} sur {{total}}', { from: ((page-1)*20)+1, to: Math.min(page*20, pagination.total), total: pagination.total })}
              </p>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p-1)}
                  className="px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}>
                  <ChevronLeft size={14} />
                </button>
                <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p+1)}
                  className="px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}>
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
const getParcoursBtns = (t) => [
  { value: 'pharmacie',       label: t('Pharmacie'),       icon: '💊', activeStyle: { background: 'rgb(8,145,178)', border: '2px solid rgb(8,145,178)', color: '#fff' },     desc: t('Médicaments prescrits')    },
  { value: 'laboratoire',     label: t('Laboratoire'),     icon: '🔬', activeStyle: { background: 'rgb(15,118,110)', border: '2px solid rgb(15,118,110)', color: '#fff' },   desc: t('Analyses biologiques')     },
  { value: 'radiologie',      label: t('Radiologie'),      icon: '🩻', activeStyle: { background: 'rgb(67,56,202)', border: '2px solid rgb(67,56,202)', color: '#fff' },     desc: t('Imagerie médicale')        },
  { value: 'specialiste',     label: t('Spécialiste'),     icon: '👨‍⚕️', activeStyle: { background: 'rgb(109,40,217)', border: '2px solid rgb(109,40,217)', color: '#fff' }, desc: t('Référé à un spécialiste')  },
  { value: 'hospitalisation', label: t('Hospitalisation'), icon: '🏥', activeStyle: { background: 'var(--danger)', border: '2px solid var(--danger)', color: '#fff' },       desc: t('Admission en service')     },
  { value: 'repos',           label: t('Repos maladie'),   icon: '🛌', activeStyle: { background: 'var(--warning)', border: '2px solid var(--warning)', color: '#fff' },    desc: t('Certificat de repos')      },
  { value: 'rendez_vous',     label: t('Rendez-vous'),     icon: '📅', activeStyle: { background: 'var(--brand)', border: '2px solid var(--brand)', color: '#fff' },        desc: t('Prochain RDV médical')     },
];

const SPECIALITES = ['Gynécologie','Chirurgie','Ophtalmologie','Dentiste','Urologie','UPEC','Kinésithérapie','Autres'];

// Ordre de priorité pour le résultat "principal" stocké en DB (stats)
const PRIORITE_RESULTAT = ['hospitalisation','repos','specialiste','radiologie','laboratoire','pharmacie','rendez_vous'];

function CloturerConsultationModal({ consultation, loading, onClose, onSubmit }) {
  const { t } = useTranslation();
  const PARCOURS_BTNS = getParcoursBtns(t);
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
      setErreur(t('Veuillez sélectionner au moins une étape du parcours.')); return;
    }
    if (selection.has('hospitalisation') && !serviceHospitalisation) {
      setErreur(t("Veuillez choisir le service d'hospitalisation.")); return;
    }
    if (selection.has('repos') && !dateFin) {
      setErreur(t('Veuillez indiquer la date de fin de repos.')); return;
    }
    if (selection.has('specialiste') && !specialite) {
      setErreur(t('Veuillez choisir la spécialité.')); return;
    }
    if (selection.has('specialiste') && specialite === 'Autres' && !specialiteAutre.trim()) {
      setErreur(t('Veuillez préciser la spécialité.')); return;
    }
    if (selection.has('rendez_vous') && !rdvDate) {
      setErreur(t('Veuillez indiquer la date du rendez-vous.')); return;
    }

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

  const inp = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-2)',
    background: 'var(--surface)',
    color: 'var(--fg)',
    outline: 'none',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" style={{ background: 'var(--surface)' }}>

        {/* En-tête */}
        <div className="p-4 sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <CheckCircle size={18} style={{ color: 'var(--success)' }} />
            {t('Clôturer — Parcours patient')}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--fg)' }}>
              {consultation.patient?.nom} {consultation.patient?.prenom}
            </span>
            <span className="ml-1.5" style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-subtle)' }}>({consultation.patient?.matricule})</span>
            {consultation.serviceName && (
              <span className="ml-1.5" style={{ color: 'var(--fg-muted)' }}>— {consultation.serviceName}</span>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">

          {/* ── Choix multi-sélection ── */}
          <div>
            <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: 'var(--fg)' }}>
              {t('Suite du parcours')} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <p className="text-[11px] mb-2" style={{ color: 'var(--fg-subtle)' }}>
              {t('Vous pouvez sélectionner plusieurs étapes simultanément')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PARCOURS_BTNS.map(btn => {
                const isOn = selection.has(btn.value);
                return (
                  <button
                    key={btn.value}
                    type="button"
                    onClick={() => toggle(btn.value)}
                    className="relative flex flex-col items-center gap-1 px-2 py-3 rounded-xl text-xs font-medium transition-all"
                    style={isOn
                      ? { ...btn.activeStyle, boxShadow: 'var(--shadow-1)', transform: 'scale(1.02)' }
                      : { background: 'var(--surface)', border: '2px solid var(--border)', color: 'var(--fg)' }}
                  >
                    {isOn && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                        style={{ background: 'rgba(255,255,255,0.3)' }}>
                        ✓
                      </span>
                    )}
                    <span className="text-xl">{btn.icon}</span>
                    <span className="font-semibold">{btn.label}</span>
                    <span className="text-[10px] text-center leading-tight" style={{ color: isOn ? 'rgba(255,255,255,0.8)' : 'var(--fg-subtle)' }}>
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
                    <span key={v} className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={b.activeStyle}>
                      {b.icon} {b.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* HOSPITALISATION */}
          {selection.has('hospitalisation') && (
            <div className="p-3 rounded-xl space-y-2"
              style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>🏥 {t("Service d'hospitalisation")}</p>
              <select value={serviceHospitalisation} onChange={e => setServiceHospitalisation(e.target.value)}
                style={{ ...inp, border: '1px solid var(--danger)' }}>
                <option value="">{t('-- Choisir le service --')}</option>
                {servicesMed.length > 0
                  ? servicesMed.map(s => (
                      <option key={s.code || s.nom} value={s.nom}>{s.nom}</option>
                    ))
                  : <>
                      <option value="MEDECINE">{t('MÉDECINE')}</option>
                      <option value="CHIRURGIE">{t('CHIRURGIE')}</option>
                      <option value="GYNECOLOGIE">{t('GYNÉCOLOGIE')}</option>
                      <option value="PMI">{t('PMI')}</option>
                      <option value="UROLOGIE">{t('UROLOGIE')}</option>
                      <option value="CARDIOLOGIE">{t('CARDIOLOGIE')}</option>
                      <option value="GASTROENTEROLOGIE">{t('GASTROENTÉROLOGIE')}</option>
                      <option value="ORL">{t('ORL')}</option>
                      <option value="OPHTALMOLOGIE">{t('OPHTALMOLOGIE')}</option>
                      <option value="KINESITHERAPIE">{t('KINÉSITHÉRAPIE')}</option>
                      <option value="SAU">{t('SAU (Urgences)')}</option>
                      <option value="UPEC">{t('UPEC')}</option>
                      <option value="ANESTHESIE">{t('ANESTHÉSIE')}</option>
                    </>
                }
              </select>
            </div>
          )}

          {/* REPOS MALADIE */}
          {selection.has('repos') && (
            <div className="p-3 rounded-xl space-y-2"
              style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>🛌 {t('Certificat de repos maladie')}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warning)' }}>
                    {t('Date début')} <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                    style={{ ...inp, border: '1px solid var(--warning)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warning)' }}>
                    {t('Date fin')} <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input type="date" min={dateDebut} value={dateFin} onChange={e => setDateFin(e.target.value)}
                    style={{ ...inp, border: '1px solid var(--warning)' }} />
                </div>
              </div>
              {dateDebut && dateFin && (
                <p className="text-xs font-medium" style={{ color: 'var(--warning)' }}>
                  → {t('{{count}} jour(s) de repos', { count: Math.max(0, Math.round((new Date(dateFin) - new Date(dateDebut)) / 86400000) + 1) })}
                </p>
              )}
            </div>
          )}

          {/* SPÉCIALISTE */}
          {selection.has('specialiste') && (
            <div className="p-3 rounded-xl space-y-2"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.4)' }}>
              <p className="text-xs font-semibold" style={{ color: 'rgb(109,40,217)' }}>👨‍⚕️ {t('Choisir la spécialité')}</p>
              <div className="grid grid-cols-2 gap-2">
                {SPECIALITES.map(sp => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => { setSpecialite(sp); setSpecialiteAutre(''); }}
                    className="px-2 py-1.5 text-xs rounded-lg font-medium transition-colors"
                    style={specialite === sp
                      ? { background: 'rgb(109,40,217)', border: '1px solid rgb(109,40,217)', color: '#fff' }
                      : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                  >
                    {t(sp)}
                  </button>
                ))}
              </div>
              {specialite === 'Autres' && (
                <input
                  type="text"
                  autoFocus
                  placeholder={t('Préciser la spécialité...')}
                  value={specialiteAutre}
                  onChange={e => setSpecialiteAutre(e.target.value)}
                  style={{ ...inp, border: '1px solid rgba(139,92,246,0.6)' }}
                />
              )}
            </div>
          )}

          {/* RENDEZ-VOUS */}
          {selection.has('rendez_vous') && (
            <div className="p-3 rounded-xl space-y-2"
              style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>📅 {t('Rendez-vous médical')}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--brand)' }}>
                    {t('Date RDV')} <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input type="date" min={new Date().toISOString().split('T')[0]} value={rdvDate}
                    onChange={e => setRdvDate(e.target.value)}
                    style={{ ...inp, border: '1px solid var(--brand)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--brand)' }}>{t('Heure')}</label>
                  <input type="time" value={rdvHeure} onChange={e => setRdvHeure(e.target.value)}
                    style={{ ...inp, border: '1px solid var(--brand)' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--brand)' }}>{t('Service / Spécialité')}</label>
                <input type="text" value={rdvService} onChange={e => setRdvService(e.target.value)}
                  placeholder={t('Ex: Cardiologie, Gynécologie...')}
                  style={{ ...inp, border: '1px solid var(--brand)' }} />
              </div>
            </div>
          )}

          {/* DIAGNOSTIC */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg)' }}>{t('Diagnostic / Observation')}</label>
            <textarea
              value={diagnostic}
              onChange={e => setDiagnostic(e.target.value)}
              rows={2}
              style={{ ...inp, resize: 'none' }}
              placeholder={t('Diagnostic médical...')}
            />
          </div>

          {/* Erreur */}
          {erreur && (
            <div className="flex items-center gap-2 p-2 rounded-lg"
              style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}>
              <AlertCircle size={14} style={{ color: 'var(--danger)' }} className="shrink-0" />
              <p className="text-xs" style={{ color: 'var(--danger)' }}>{erreur}</p>
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm rounded-xl transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}
            >
              {t('Annuler')}
            </button>
            <button
              type="submit"
              disabled={loading || selection.size === 0}
              className="flex-[2] flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              style={{ background: 'var(--success)', color: '#fff' }}
            >
              {loading
                ? t('Enregistrement...')
                : selection.size === 0
                  ? t('← Sélectionner le parcours')
                  : t('✓ Confirmer ({{count}} étape(s))', { count: selection.size })
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
