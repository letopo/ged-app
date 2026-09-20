// frontend/src/pages/PHPModule.jsx - Dashboard principal Module PHP
// Point focal PHP : enregistrement patients, bons, consultations, statistiques

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, FileText, Activity, Clock, Hospital,
  BedDouble, Stethoscope, TrendingUp, Search, Plus,
  RefreshCw, AlertCircle, CheckCircle, ChevronRight,
  ClipboardList, BarChart3, Timer, ArrowRight, CalendarDays, X, Trash2, Receipt
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
    if (!min || min === 0) return 'var(--fg-muted)';
    if (min <= 30) return 'var(--success)';
    if (min <= 60) return 'var(--warning)';
    if (min <= 120) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ background: 'var(--surface-2)' }}>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <Activity style={{ color: 'var(--brand)' }} size={28} />
            Module PHP — Point Focal Hôpital
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Protection Hygiène du Personnel • {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={() => setShowRegistration(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors font-medium"
            style={{ background: 'var(--brand)', color: '#fff', boxShadow: 'var(--shadow-1)' }}
          >
            <UserPlus size={16} />
            Nouveau Patient
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-lg text-sm"
          style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <KPICard icon={<Users size={20} />} label="Patients actifs" value={kpis.totalPatientsActifs ?? '–'} color="blue" loading={loading} />
        <KPICard icon={<ClipboardList size={20} />} label="Consultations ce mois" value={kpis.totalConsultationsMois ?? '–'} color="indigo" loading={loading} />
        <KPICard icon={<Stethoscope size={20} />} label="Consultations auj." value={kpis.consultationsDuJour ?? '–'} color="green" loading={loading} />
        <KPICard icon={<BedDouble size={20} />} label="Hospitalisations en cours" value={kpis.hospitalisationsEnCours ?? '–'} color="orange" loading={loading} />
        <KPICard icon={<Timer size={20} />} label="Repos maladie actifs" value={kpis.reposEnCours ?? '–'} color="purple" loading={loading} />
      </div>

      {/* Stats du jour */}
      {statsResume && Object.keys(statsResume).length > 0 && (
        <div className="rounded-xl p-4 mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <BarChart3 size={16} style={{ color: 'var(--brand)' }} />
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
              <Clock size={15} style={{ color: 'var(--fg-subtle)' }} />
              <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                Temps d'attente moyen aujourd'hui :
              </span>
              <span className="text-sm font-bold" style={{ color: getAttenteColor(statsResume.tempsAttenteMoyenMinutes) }}>
                {formatMinutes(statsResume.tempsAttenteMoyenMinutes)}
              </span>
              {statsResume.tempsAttenteMoyenMinutes > 60 && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}>
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
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <Search size={16} style={{ color: 'var(--brand)' }} />
            Recherche patient par matricule
          </h2>
          <form onSubmit={handleSearchMatricule} className="flex gap-2">
            <input
              type="text"
              value={searchMatricule}
              onChange={(e) => setSearchMatricule(e.target.value.toUpperCase())}
              placeholder="Ex: 100049"
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-2)',
                background: 'var(--surface)',
                color: 'var(--fg)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="px-4 py-2 text-sm rounded-lg disabled:opacity-50 transition-colors"
              style={{ background: 'var(--brand)', color: '#fff' }}
            >
              {searchLoading ? '...' : 'Chercher'}
            </button>
          </form>

          {searchError && (
            <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--danger)' }}>
              <AlertCircle size={14} />
              {searchError}
              <button
                onClick={() => setShowRegistration(true)}
                className="ml-auto flex items-center gap-1 hover:underline"
                style={{ color: 'var(--brand)' }}
              >
                <Plus size={14} /> Enregistrer
              </button>
            </div>
          )}

          {searchResult && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>
                    {searchResult.nom} {searchResult.prenom || ''}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                    Matricule : <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{searchResult.matricule}</span>
                    {searchResult.infirmerie && ` • ${searchResult.infirmerie.nom}`}
                    {searchResult.secteur && ` • ${searchResult.secteur.nom}`}
                  </p>
                  {searchResult.bons?.length > 0 && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--success)' }}>
                      <CheckCircle size={12} />
                      Bon N° {searchResult.bons[0].numeroBon} en attente
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleOpenConsultation(searchResult)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ml-2 shrink-0"
                  style={{ background: 'var(--brand)', color: '#fff' }}
                >
                  <Stethoscope size={13} />
                  Consulter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dernières consultations du jour */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <Stethoscope size={16} style={{ color: 'var(--success)' }} />
              Dernières consultations
            </h2>
            <Link to="/php/consultations" className="text-xs flex items-center gap-1 hover:underline" style={{ color: 'var(--brand)' }}>
              Tout voir <ChevronRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 rounded animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
            </div>
          ) : dashboard?.dernieresConsultations?.length > 0 ? (
            <div className="space-y-2">
              {dashboard.dernieresConsultations.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                      {c.patient?.nom} {c.patient?.prenom || ''}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                      {c.patient?.infirmerie?.nom || '–'} • {c.serviceName || 'N/A'}
                    </p>
                  </div>
                  <ResultatBadge resultat={c.resultat} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--fg-subtle)' }}>
              Aucune consultation aujourd'hui
            </p>
          )}
        </div>

        {/* Derniers bons émis */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <FileText size={16} style={{ color: 'rgb(168,85,247)' }} />
              Bons émis aujourd'hui
            </h2>
            <Link to="/php/patients" className="text-xs flex items-center gap-1 hover:underline" style={{ color: 'var(--brand)' }}>
              Patients <ChevronRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 rounded animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
            </div>
          ) : dashboard?.derniersBons?.length > 0 ? (
            <div className="space-y-2">
              {dashboard.derniersBons.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center justify-between p-2 rounded-lg transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                      {b.patient?.nom} {b.patient?.prenom || ''}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                      Bon N° <span style={{ fontFamily: 'var(--font-mono)' }}>{b.numeroBon}</span>
                      {b.patient?.infirmerie && ` • ${b.patient.infirmerie.nom}`}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={
                    b.status === 'emis'    ? { background: 'var(--warning-soft)', color: 'var(--warning)' } :
                    b.status === 'utilise' ? { background: 'var(--success-soft)', color: 'var(--success)' } :
                    { background: 'var(--surface-2)', color: 'var(--fg-muted)' }
                  }>
                    {b.status === 'emis' ? 'En attente' : b.status === 'utilise' ? 'Utilisé' : 'Annulé'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--fg-subtle)' }}>
              Aucun bon émis aujourd'hui
            </p>
          )}
        </div>

        {/* Stats par service (aujourd'hui) */}
        {statsJour?.statsParService?.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <Hospital size={16} style={{ color: 'rgb(99,102,241)' }} />
              Consultations par service — aujourd'hui
            </h2>
            <div className="space-y-2">
              {statsJour.statsParService.map((s, i) => {
                const max = statsJour.statsParService[0]?.total || 1;
                const pct = Math.round((s.total / max) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--fg)' }}>{s.service}</span>
                      <span className="font-medium" style={{ color: 'var(--fg)' }}>{s.total}</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ background: 'var(--surface-3)' }}>
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: 'rgb(99,102,241)' }}
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
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-6 gap-3">
        <QuickLink to="/php/patients" icon={<Users size={18} />} label="Patients" color="blue" />
        <QuickLink to="/php/consultations" icon={<Stethoscope size={18} />} label="Consultations" color="green" />
        <QuickLink to="/php/statistiques" icon={<BarChart3 size={18} />} label="Statistiques" color="indigo" />
        <QuickLink to="/php/repos" icon={<BedDouble size={18} />} label="Repos / Hospit." color="orange" />
        <QuickLink to="/php/factures" icon={<Receipt size={18} />} label="Factures" color="green" />
        <button
          onClick={() => { setShowRdvModal(true); loadRdv(); }}
          className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = 'var(--shadow-1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div className="p-2 rounded-lg" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
            <CalendarDays size={18} />
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>Rendez-vous</span>
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
  const colorStyles = {
    blue:   { background: 'var(--brand-soft)', color: 'var(--brand)' },
    indigo: { background: 'rgba(99,102,241,0.1)', color: 'rgb(99,102,241)' },
    green:  { background: 'var(--success-soft)', color: 'var(--success)' },
    orange: { background: 'rgba(249,115,22,0.1)', color: 'rgb(234,88,12)' },
    purple: { background: 'rgba(168,85,247,0.1)', color: 'rgb(147,51,234)' },
  };
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="inline-flex p-2 rounded-lg mb-2" style={colorStyles[color]}>{icon}</div>
      {loading ? (
        <div className="h-7 w-16 rounded animate-pulse mt-1" style={{ background: 'var(--surface-2)' }} />
      ) : (
        <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{value}</p>
      )}
      <p className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--fg-muted)' }}>{label}</p>
    </div>
  );
}

function StatBadge({ label, value, color }) {
  const styles = {
    blue:   { background: 'var(--brand-soft)', color: 'var(--brand)' },
    green:  { background: 'var(--success-soft)', color: 'var(--success)' },
    yellow: { background: 'var(--warning-soft)', color: 'var(--warning)' },
    red:    { background: 'var(--danger-soft)', color: 'var(--danger)' },
  };
  return (
    <div className="rounded-lg p-3" style={styles[color]}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs mt-0.5">{label}</p>
    </div>
  );
}

function ResultatBadge({ resultat }) {
  const map = {
    retour_travail:  { label: 'Retour',     style: { background: 'var(--success-soft)', color: 'var(--success)' } },
    repos:           { label: 'Repos',      style: { background: 'var(--warning-soft)', color: 'var(--warning)' } },
    hospitalisation: { label: 'Hospitalisé',style: { background: 'var(--danger-soft)',  color: 'var(--danger)' } },
    operation:       { label: 'Opération',  style: { background: 'rgba(168,85,247,0.1)', color: 'rgb(147,51,234)' } },
    transfert:       { label: 'Transféré',  style: { background: 'rgba(249,115,22,0.1)', color: 'rgb(234,88,12)' } },
    en_cours:        { label: 'En cours',   style: { background: 'var(--brand-soft)',   color: 'var(--brand)' } },
    deces:           { label: 'Décès',      style: { background: 'var(--surface-3)',    color: 'var(--fg-muted)' } },
  };
  const entry = map[resultat] || { label: resultat, style: { background: 'var(--surface-2)', color: 'var(--fg-muted)' } };
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={entry.style}>{entry.label}</span>;
}

function QuickLink({ to, icon, label, color }) {
  const styles = {
    blue:   { color: 'var(--brand)' },
    green:  { color: 'var(--success)' },
    indigo: { color: 'rgb(99,102,241)' },
    orange: { color: 'rgb(234,88,12)' },
  };
  return (
    <Link
      to={to}
      className="flex items-center gap-2 p-3 rounded-xl transition-colors"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: styles[color].color, textDecoration: 'none' }}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
      <ArrowRight size={14} className="ml-auto" />
    </Link>
  );
}

// ── Modal Rendez-vous ─────────────────────────────────────────────────────────
const STATUS_RDV = {
  planifie:  { label: 'Planifié',  style: { background: 'var(--brand-soft)', color: 'var(--brand)' } },
  honore:    { label: 'Honoré',    style: { background: 'var(--success-soft)', color: 'var(--success)' } },
  annule:    { label: 'Annulé',    style: { background: 'var(--danger-soft)', color: 'var(--danger)' } },
  reporte:   { label: 'Reporté',   style: { background: 'var(--warning-soft)', color: 'var(--warning)' } },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-3)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <CalendarDays style={{ color: 'var(--brand)' }} size={20} />
            <h2 className="text-base font-bold" style={{ color: 'var(--fg)' }}>Rendez-vous médicaux</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
              {filtered.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg"
            style={{ color: 'var(--fg-muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X size={18} />
          </button>
        </div>

        {/* Filtres */}
        <div className="px-4 py-2 flex items-center gap-2 flex-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
          {Object.entries(STATUS_RDV).map(([key, v]) => (
            <button key={key} onClick={() => setFilter(key)}
              className="text-xs px-3 py-1 rounded-full font-medium transition-colors"
              style={filter === key
                ? { ...v.style, outline: '1px solid currentColor' }
                : { background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
              {v.label}
            </button>
          ))}
          <button onClick={() => setFilter('tous')}
            className="text-xs px-3 py-1 rounded-full font-medium transition-colors"
            style={filter === 'tous'
              ? { background: 'var(--fg)', color: 'var(--surface)' }
              : { background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
            Tous
          </button>
          <button onClick={() => { setShowAll(!showAll); onLoadAll(); }}
            className="ml-auto text-xs hover:underline" style={{ color: 'var(--brand)' }}>
            {showAll ? 'À partir d\'aujourd\'hui' : 'Voir tout'}
          </button>
          <button onClick={onRefresh} className="p-1 rounded"
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} style={{ color: 'var(--fg-muted)' }} />
          </button>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--brand)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10" style={{ color: 'var(--fg-subtle)' }}>
              <CalendarDays size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucun rendez-vous {filter !== 'tous' ? STATUS_RDV[filter]?.label?.toLowerCase() : ''}</p>
            </div>
          ) : (
            filtered.map(rdv => {
              const st = STATUS_RDV[rdv.status] || STATUS_RDV.planifie;
              const p = rdv.patient;
              return (
                <div key={rdv.id} className="rounded-xl p-3 flex items-start gap-3"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  {/* Date */}
                  <div className="shrink-0 w-14 text-center rounded-lg p-1.5"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p className="text-[10px] uppercase" style={{ color: 'var(--fg-subtle)' }}>{fmtDate(rdv.dateRdv).split(' ')[0]}</p>
                    <p className="text-lg font-bold leading-none" style={{ color: 'var(--fg)' }}>{new Date(rdv.dateRdv + 'T00:00:00').getDate()}</p>
                    <p className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{fmtHeure(rdv.heureRdv) || '–'}</p>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                        {p?.nom} {p?.prenom}
                      </p>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--fg-subtle)' }}>{p?.matricule}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={st.style}>{st.label}</span>
                    </div>
                    {rdv.service && <p className="text-xs mt-0.5" style={{ color: 'var(--brand)' }}>{rdv.service}</p>}
                    {rdv.motif  && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--fg-muted)' }}>{rdv.motif}</p>}
                    {p?.infirmerie && <p className="text-[10px] mt-1" style={{ color: 'var(--fg-subtle)' }}>{p.infirmerie.code}</p>}
                  </div>
                  {/* Actions */}
                  {rdv.status === 'planifie' && (
                    <div className="shrink-0 flex flex-col gap-1">
                      <button
                        onClick={() => onUpdateStatus(rdv.id, 'honore')}
                        className="text-[10px] px-2 py-1 rounded-lg font-medium"
                        style={{ background: 'var(--success)', color: '#fff' }}
                      >✓ Honoré</button>
                      <button
                        onClick={() => onUpdateStatus(rdv.id, 'annule')}
                        className="text-[10px] px-2 py-1 rounded-lg"
                        style={{ background: 'var(--surface-3)', color: 'var(--fg-muted)' }}
                      >Annuler</button>
                    </div>
                  )}
                  <button onClick={() => onDelete(rdv.id)} className="shrink-0 p-1 transition-colors"
                    style={{ color: 'var(--fg-subtle)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-subtle)'}>
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
