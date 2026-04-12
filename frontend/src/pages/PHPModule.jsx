// frontend/src/pages/PHPModule.jsx - Dashboard principal Module PHP
// Point focal PHP : enregistrement patients, bons, consultations, statistiques

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, FileText, Activity, Clock, Hospital,
  BedDouble, Stethoscope, TrendingUp, Search, Plus,
  RefreshCw, AlertCircle, CheckCircle, ChevronRight,
  ClipboardList, BarChart3, Timer, ArrowRight, CalendarDays, X, Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { phpStatsAPI, phpPatientAPI, phpRendezVousAPI } from '../services/phpService';
import PHPPatientRegistration from '../components/php/PHPPatientRegistration';
import PHPConsultationForm from '../components/php/PHPConsultationForm';
import PHPBonPrint from '../components/php/PHPBonPrint';

export default function PHPModule() {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [statsJour, setStatsJour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modales
  const [showRegistration, setShowRegistration] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedBon, setSelectedBon] = useState(null);
  const [showBonPrint, setShowBonPrint] = useState(false);

  // Recherche rapide
  const [searchMatricule, setSearchMatricule] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Gestion RDV
  const [showRdvModal, setShowRdvModal] = useState(false);
  const [rdvList, setRdvList] = useState([]);
  const [rdvLoading, setRdvLoading] = useState(false);

  const loadRdv = useCallback(async (params = {}) => {
    setRdvLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await phpRendezVousAPI.getAll({ dateDebut: today, ...params });
      setRdvList(res.data.data || []);
    } catch (err) {
      console.error('Erreur RDV:', err);
    } finally {
      setRdvLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, jourRes] = await Promise.all([
        phpStatsAPI.getDashboard(),
        phpStatsAPI.getStatsDuJour()
      ]);
      setDashboard(dashRes.data.data);
      setStatsJour(jourRes.data.data);
    } catch (err) {
      console.error('Erreur chargement PHP dashboard:', err);
      setError('Impossible de charger le tableau de bord PHP');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSearchMatricule = async (e) => {
    e.preventDefault();
    if (!searchMatricule.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      const res = await phpPatientAPI.searchByMatricule(searchMatricule.trim());
      setSearchResult(res.data.data);
    } catch (err) {
      setSearchError(err.response?.data?.message || 'Patient non trouvé');
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePatientRegistered = (patient, bon) => {
    setShowRegistration(false);
    if (bon) {
      setSelectedBon({ bon, patient });
      setShowBonPrint(true);
    }
    loadData();
  };

  const handleOpenConsultation = (patient) => {
    setSelectedPatient(patient);
    setShowConsultation(true);
    setSearchResult(null);
    setSearchMatricule('');
  };

  const handleConsultationSaved = () => {
    setShowConsultation(false);
    setSelectedPatient(null);
    loadData();
  };

  const kpis = dashboard?.kpis || {};
  const statsResume = statsJour?.resume || {};

  const formatMinutes = (min) => {
    if (!min || min === 0) return '–';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  };

  const getAttenteColor = (min) => {
    if (!min || min === 0) return 'text-gray-500';
    if (min <= 30) return 'text-green-600';
    if (min <= 60) return 'text-yellow-600';
    if (min <= 120) return 'text-orange-500';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="text-blue-600" size={28} />
            Module PHP — Point Focal Hôpital
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Protection Hygiène du Personnel • {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={() => setShowRegistration(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <UserPlus size={16} />
            Nouveau Patient
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <KPICard
          icon={<Users size={20} />}
          label="Patients actifs"
          value={kpis.totalPatientsActifs ?? '–'}
          color="blue"
          loading={loading}
        />
        <KPICard
          icon={<ClipboardList size={20} />}
          label="Consultations ce mois"
          value={kpis.totalConsultationsMois ?? '–'}
          color="indigo"
          loading={loading}
        />
        <KPICard
          icon={<Stethoscope size={20} />}
          label="Consultations auj."
          value={kpis.consultationsDuJour ?? '–'}
          color="green"
          loading={loading}
        />
        <KPICard
          icon={<BedDouble size={20} />}
          label="Hospitalisations en cours"
          value={kpis.hospitalisationsEnCours ?? '–'}
          color="orange"
          loading={loading}
        />
        <KPICard
          icon={<Timer size={20} />}
          label="Repos maladie actifs"
          value={kpis.reposEnCours ?? '–'}
          color="purple"
          loading={loading}
        />
      </div>

      {/* Stats du jour */}
      {statsResume && Object.keys(statsResume).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-500" />
            Résumé du jour
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBadge label="Bons émis" value={statsResume.bonsEmis ?? 0} color="blue" />
            <StatBadge label="Consultés" value={statsResume.totalConsultations ?? 0} color="green" />
            <StatBadge label="En cours" value={statsResume.consultationsEnCours ?? 0} color="yellow" />
            <StatBadge label="Hospitalisés" value={statsResume.hospitalisationsNouveaux ?? 0} color="red" />
          </div>
          {statsResume.tempsAttenteMoyenMinutes !== undefined && (
            <div className="mt-3 flex items-center gap-2">
              <Clock size={15} className="text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Temps d'attente moyen aujourd'hui :
              </span>
              <span className={`text-sm font-bold ${getAttenteColor(statsResume.tempsAttenteMoyenMinutes)}`}>
                {formatMinutes(statsResume.tempsAttenteMoyenMinutes)}
              </span>
              {statsResume.tempsAttenteMoyenMinutes > 60 && (
                <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                  <AlertCircle size={11} />
                  Attente élevée
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recherche rapide patient */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Search size={16} className="text-blue-500" />
            Recherche patient par matricule
          </h2>
          <form onSubmit={handleSearchMatricule} className="flex gap-2">
            <input
              type="text"
              value={searchMatricule}
              onChange={(e) => setSearchMatricule(e.target.value.toUpperCase())}
              placeholder="Ex: 100049"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {searchLoading ? '...' : 'Chercher'}
            </button>
          </form>

          {searchError && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={14} />
              {searchError}
              <button
                onClick={() => setShowRegistration(true)}
                className="ml-auto text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Enregistrer
              </button>
            </div>
          )}

          {searchResult && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {searchResult.nom} {searchResult.prenom || ''}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Matricule : <span className="font-mono font-medium">{searchResult.matricule}</span>
                    {searchResult.infirmerie && ` • ${searchResult.infirmerie.nom}`}
                    {searchResult.secteur && ` • ${searchResult.secteur.nom}`}
                  </p>
                  {searchResult.bons?.length > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Bon N° {searchResult.bons[0].numeroBon} en attente
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleOpenConsultation(searchResult)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors ml-2 shrink-0"
                >
                  <Stethoscope size={13} />
                  Consulter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dernières consultations du jour */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Stethoscope size={16} className="text-green-500" />
              Dernières consultations
            </h2>
            <Link to="/php/consultations" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Tout voir <ChevronRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />)}
            </div>
          ) : dashboard?.dernieresConsultations?.length > 0 ? (
            <div className="space-y-2">
              {dashboard.dernieresConsultations.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {c.patient?.nom} {c.patient?.prenom || ''}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {c.patient?.infirmerie?.nom || '–'} • {c.serviceName || 'N/A'}
                    </p>
                  </div>
                  <ResultatBadge resultat={c.resultat} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
              Aucune consultation aujourd'hui
            </p>
          )}
        </div>

        {/* Derniers bons émis */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <FileText size={16} className="text-purple-500" />
              Bons émis aujourd'hui
            </h2>
            <Link to="/php/patients" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Patients <ChevronRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />)}
            </div>
          ) : dashboard?.derniersBons?.length > 0 ? (
            <div className="space-y-2">
              {dashboard.derniersBons.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {b.patient?.nom} {b.patient?.prenom || ''}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Bon N° <span className="font-mono">{b.numeroBon}</span>
                      {b.patient?.infirmerie && ` • ${b.patient.infirmerie.nom}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    b.status === 'emis' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    b.status === 'utilise' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {b.status === 'emis' ? 'En attente' : b.status === 'utilise' ? 'Utilisé' : 'Annulé'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
              Aucun bon émis aujourd'hui
            </p>
          )}
        </div>

        {/* Stats par service (aujourd'hui) */}
        {statsJour?.statsParService?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Hospital size={16} className="text-indigo-500" />
              Consultations par service — aujourd'hui
            </h2>
            <div className="space-y-2">
              {statsJour.statsParService.map((s, i) => {
                const max = statsJour.statsParService[0]?.total || 1;
                const pct = Math.round((s.total / max) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{s.service}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{s.total}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Liens rapides */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <QuickLink to="/php/patients" icon={<Users size={18} />} label="Patients" color="blue" />
        <QuickLink to="/php/consultations" icon={<Stethoscope size={18} />} label="Consultations" color="green" />
        <QuickLink to="/php/statistiques" icon={<BarChart3 size={18} />} label="Statistiques" color="indigo" />
        <QuickLink to="/php/repos" icon={<BedDouble size={18} />} label="Repos / Hospit." color="orange" />
        <button
          onClick={() => { setShowRdvModal(true); loadRdv(); }}
          className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 hover:shadow-md transition-all text-center"
        >
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            <CalendarDays size={18} />
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Rendez-vous</span>
        </button>
      </div>

      {/* Modales */}
      {showRegistration && (
        <PHPPatientRegistration
          onClose={() => setShowRegistration(false)}
          onSuccess={handlePatientRegistered}
        />
      )}

      {showConsultation && selectedPatient && (
        <PHPConsultationForm
          patient={selectedPatient}
          onClose={() => { setShowConsultation(false); setSelectedPatient(null); }}
          onSuccess={handleConsultationSaved}
        />
      )}

      {showBonPrint && selectedBon && (
        <PHPBonPrint
          bon={selectedBon.bon}
          patient={selectedBon.patient}
          onClose={() => { setShowBonPrint(false); setSelectedBon(null); }}
        />
      )}

      {/* Modal Rendez-vous */}
      {showRdvModal && (
        <RendezVousModal
          rdvList={rdvList}
          loading={rdvLoading}
          onRefresh={() => loadRdv()}
          onLoadAll={() => loadRdv({ dateDebut: undefined })}
          onUpdateStatus={async (id, status) => {
            await phpRendezVousAPI.updateStatus(id, { status });
            loadRdv();
          }}
          onDelete={async (id) => {
            if (!window.confirm('Supprimer ce rendez-vous ?')) return;
            await phpRendezVousAPI.delete(id);
            loadRdv();
          }}
          onClose={() => setShowRdvModal(false)}
        />
      )}
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function KPICard({ icon, label, value, color, loading }) {
  const colors = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <div className={`inline-flex p-2 rounded-lg ${colors[color]} mb-2`}>{icon}</div>
      {loading ? (
        <div className="h-7 w-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mt-1" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function StatBadge({ label, value, color }) {
  const colors = {
    blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    red:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return (
    <div className={`rounded-lg p-3 ${colors[color]}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs mt-0.5">{label}</p>
    </div>
  );
}

function ResultatBadge({ resultat }) {
  const map = {
    retour_travail:  { label: 'Retour', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    repos:           { label: 'Repos', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    hospitalisation: { label: 'Hospitalisé', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    operation:       { label: 'Opération', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    transfert:       { label: 'Transféré', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    en_cours:        { label: 'En cours', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    deces:           { label: 'Décès', color: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-400' },
  };
  const { label, color } = map[resultat] || { label: resultat, color: 'bg-gray-100 text-gray-600' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}</span>;
}

function QuickLink({ to, icon, label, color }) {
  const colors = {
    blue:   'border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    green:  'border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400',
    indigo: 'border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
    orange: 'border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-700 dark:text-orange-400',
  };
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border ${colors[color]} transition-colors`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
      <ArrowRight size={14} className="ml-auto" />
    </Link>
  );
}

// ── Modal Rendez-vous ─────────────────────────────────────────────────────────
const STATUS_RDV = {
  planifie:  { label: 'Planifié',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  honore:    { label: 'Honoré',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  annule:    { label: 'Annulé',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  reporte:   { label: 'Reporté',   cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
};

function RendezVousModal({ rdvList, loading, onRefresh, onLoadAll, onUpdateStatus, onDelete, onClose }) {
  const [filter, setFilter] = useState('planifie');
  const [showAll, setShowAll] = useState(false);

  const filtered = rdvList.filter(r => filter === 'tous' || r.status === filter);

  const fmtDate = (d) => {
    if (!d) return '–';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const fmtHeure = (h) => h ? h.slice(0, 5) : '';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CalendarDays className="text-blue-600" size={20} />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Rendez-vous médicaux</h2>
            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
              {filtered.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Filtres */}
        <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 flex-wrap">
          {Object.entries(STATUS_RDV).map(([key, v]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${filter === key ? v.cls + ' ring-1 ring-current' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {v.label}
            </button>
          ))}
          <button onClick={() => setFilter('tous')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${filter === 'tous' ? 'bg-gray-700 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
            Tous
          </button>
          <button onClick={() => { setShowAll(!showAll); onLoadAll(); }}
            className="ml-auto text-xs text-blue-600 hover:underline">
            {showAll ? 'À partir d\'aujourd\'hui' : 'Voir tout'}
          </button>
          <button onClick={onRefresh} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <RefreshCw size={20} className="animate-spin text-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <CalendarDays size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucun rendez-vous {filter !== 'tous' ? STATUS_RDV[filter]?.label?.toLowerCase() : ''}</p>
            </div>
          ) : (
            filtered.map(rdv => {
              const st = STATUS_RDV[rdv.status] || STATUS_RDV.planifie;
              const p = rdv.patient;
              return (
                <div key={rdv.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 flex items-start gap-3 border border-gray-100 dark:border-gray-700">
                  {/* Date */}
                  <div className="shrink-0 w-14 text-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-1.5">
                    <p className="text-[10px] text-gray-400 uppercase">{fmtDate(rdv.dateRdv).split(' ')[0]}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{new Date(rdv.dateRdv + 'T00:00:00').getDate()}</p>
                    <p className="text-[10px] text-gray-500">{fmtHeure(rdv.heureRdv) || '–'}</p>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {p?.nom} {p?.prenom}
                      </p>
                      <span className="font-mono text-[11px] text-gray-400">{p?.matricule}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                    </div>
                    {rdv.service && <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{rdv.service}</p>}
                    {rdv.motif  && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{rdv.motif}</p>}
                    {p?.infirmerie && <p className="text-[10px] text-gray-400 mt-1">{p.infirmerie.code}</p>}
                  </div>
                  {/* Actions */}
                  {rdv.status === 'planifie' && (
                    <div className="shrink-0 flex flex-col gap-1">
                      <button
                        onClick={() => onUpdateStatus(rdv.id, 'honore')}
                        className="text-[10px] px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                      >✓ Honoré</button>
                      <button
                        onClick={() => onUpdateStatus(rdv.id, 'annule')}
                        className="text-[10px] px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-red-100 hover:text-red-700"
                      >Annuler</button>
                    </div>
                  )}
                  <button onClick={() => onDelete(rdv.id)} className="shrink-0 p-1 hover:text-red-500 text-gray-300 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
