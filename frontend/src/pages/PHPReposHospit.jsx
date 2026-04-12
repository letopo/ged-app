// frontend/src/pages/PHPReposHospit.jsx
// Gestion des repos maladie et hospitalisations PHP

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble, RefreshCw, ArrowLeft, Clock, CheckCircle,
  AlertCircle, Calendar, ChevronRight, Timer, Activity,
  X, Plus
} from 'lucide-react';
import { phpConsultationAPI } from '../services/phpService';
import toast from 'react-hot-toast';

export default function PHPReposHospit() {
  const [activeTab, setActiveTab] = useState('repos');
  const [repos, setRepos] = useState([]);
  const [hospitalisations, setHospitalisations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal prolonger repos
  const [selectedRepos, setSelectedRepos] = useState(null);
  const [showProlonger, setShowProlonger] = useState(false);
  const [prolongLoading, setProlongLoading] = useState(false);

  // Modal clore hospitalisation
  const [selectedHospit, setSelectedHospit] = useState(null);
  const [showCloture, setShowCloture] = useState(false);
  const [clotureLoading, setClotureLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reposRes, hospitRes] = await Promise.all([
        phpConsultationAPI.getReposEnCours(),
        phpConsultationAPI.getHospitalisationsEnCours(),
      ]);
      setRepos(reposRes.data.data || []);
      setHospitalisations(hospitRes.data.data || []);
    } catch (err) {
      console.error('Erreur chargement repos/hospit:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleProlonger = async ({ dureeJours, notes }) => {
    if (!selectedRepos) return;
    setProlongLoading(true);
    try {
      await phpConsultationAPI.prolongerRepos(selectedRepos.id, { dureeJours, notes });
      setShowProlonger(false);
      setSelectedRepos(null);
      loadData();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la prolongation');
    } finally {
      setProlongLoading(false);
    }
  };

  const handleCloturerHospit = async ({ notes, dateSortie }) => {
    if (!selectedHospit) return;
    setClotureLoading(true);
    try {
      await phpConsultationAPI.cloturerHospitalisation(selectedHospit.id, { notes, dateSortie });
      setShowCloture(false);
      setSelectedHospit(null);
      loadData();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la clôture');
    } finally {
      setClotureLoading(false);
    }
  };

  const joursRestants = (dateFin) => {
    const fin = new Date(dateFin);
    const now = new Date();
    const diff = Math.ceil((fin - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const joursDepuis = (dateEntree) => {
    const debut = new Date(dateEntree);
    const now = new Date();
    return Math.ceil((now - debut) / (1000 * 60 * 60 * 24));
  };

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
              <BedDouble className="text-orange-600" size={22} />
              Repos & Hospitalisations
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {repos.length} repos en cours • {hospitalisations.length} hospitalisation{hospitalisations.length !== 1 ? 's' : ''} en cours
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab('repos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'repos'
              ? 'bg-white dark:bg-gray-700 text-yellow-700 dark:text-yellow-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Timer size={15} />
          Repos maladie
          {repos.length > 0 && (
            <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs px-1.5 py-0.5 rounded-full font-semibold">
              {repos.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('hospit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'hospit'
              ? 'bg-white dark:bg-gray-700 text-red-700 dark:text-red-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <BedDouble size={15} />
          Hospitalisations
          {hospitalisations.length > 0 && (
            <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs px-1.5 py-0.5 rounded-full font-semibold">
              {hospitalisations.length}
            </span>
          )}
        </button>
      </div>

      {/* ===== ONGLET REPOS ===== */}
      {activeTab === 'repos' && (
        <>
          {loading ? (
            <LoadingSkeleton />
          ) : repos.length === 0 ? (
            <EmptyState
              icon={<Timer size={40} className="text-gray-300 dark:text-gray-600" />}
              message="Aucun repos maladie en cours"
            />
          ) : (
            <div className="space-y-3">
              {repos.map(r => {
                const jours = joursRestants(r.dateFin);
                const expire = jours <= 0;
                const urgence = jours >= 0 && jours <= 2;

                return (
                  <div
                    key={r.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl border transition-colors ${
                      expire    ? 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10' :
                      urgence   ? 'border-orange-300 dark:border-orange-700 bg-orange-50/30 dark:bg-orange-900/10' :
                                  'border-gray-200 dark:border-gray-700'
                    } p-4`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        {/* Patient */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-700 dark:text-yellow-400 text-sm font-bold shrink-0">
                            {r.patient?.nom?.[0] || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {r.patient?.nom} {r.patient?.prenom || ''}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {r.patient?.matricule}
                              {r.patient?.infirmerie && ` • ${r.patient.infirmerie.nom}`}
                            </p>
                          </div>
                        </div>

                        {/* Dates et durée */}
                        <div className="flex flex-wrap gap-3 text-xs">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Calendar size={12} />
                            Du {new Date(r.dateDebut).toLocaleDateString('fr-FR')}
                            {' '}au {new Date(r.dateFin).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Clock size={12} />
                            {r.dureeJours} jour{r.dureeJours !== 1 ? 's' : ''}
                          </span>
                          {r.prolongations?.length > 0 && (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <Plus size={11} />
                              {r.prolongations.length} prolongation{r.prolongations.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Statut */}
                        {expire ? (
                          <div className="mt-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={12} />
                            Repos expiré depuis {Math.abs(jours)} jour{Math.abs(jours) !== 1 ? 's' : ''}
                          </div>
                        ) : urgence ? (
                          <div className="mt-2 flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                            <AlertCircle size={12} />
                            Expire dans {jours} jour{jours !== 1 ? 's' : ''}
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle size={12} />
                            {jours} jour{jours !== 1 ? 's' : ''} restant{jours !== 1 ? 's' : ''}
                          </div>
                        )}

                        {r.motif && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">"{r.motif}"</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <button
                          onClick={() => { setSelectedRepos(r); setShowProlonger(true); }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                        >
                          <Plus size={12} />
                          Prolonger
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Terminer le repos de ${r.patient?.nom} ?`)) return;
                            try {
                              await phpConsultationAPI.prolongerRepos(r.id, { terminer: true });
                              loadData();
                            } catch (err) {
                              toast('Erreur lors de la clôture');
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <X size={12} />
                          Terminer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== ONGLET HOSPITALISATIONS ===== */}
      {activeTab === 'hospit' && (
        <>
          {loading ? (
            <LoadingSkeleton />
          ) : hospitalisations.length === 0 ? (
            <EmptyState
              icon={<BedDouble size={40} className="text-gray-300 dark:text-gray-600" />}
              message="Aucune hospitalisation en cours"
            />
          ) : (
            <div className="space-y-3">
              {hospitalisations.map(h => {
                const nbJours = joursDepuis(h.dateEntree);
                const longSejour = nbJours >= 7;

                return (
                  <div
                    key={h.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl border p-4 transition-colors ${
                      longSejour
                        ? 'border-orange-300 dark:border-orange-700 bg-orange-50/20 dark:bg-orange-900/10'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-700 dark:text-red-400 text-sm font-bold shrink-0">
                            {h.patient?.nom?.[0] || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {h.patient?.nom} {h.patient?.prenom || ''}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {h.patient?.matricule}
                              {h.patient?.infirmerie && ` • ${h.patient.infirmerie.nom}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs">
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                            <BedDouble size={12} />
                            {h.serviceHospitalisation || 'Service non précisé'}
                          </span>
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Calendar size={12} />
                            Entrée le {new Date(h.dateEntree).toLocaleDateString('fr-FR')}
                          </span>
                          <span className={`flex items-center gap-1 font-medium ${longSejour ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>
                            <Clock size={12} />
                            {nbJours} jour{nbJours !== 1 ? 's' : ''} d'hospitalisation
                            {longSejour && ' ⚠️'}
                          </span>
                        </div>

                        {h.notes && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">"{h.notes}"</p>
                        )}
                      </div>

                      <button
                        onClick={() => { setSelectedHospit(h); setShowCloture(true); }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors shrink-0"
                      >
                        <CheckCircle size={12} />
                        Sortie
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Prolonger repos */}
      {showProlonger && selectedRepos && (
        <ProlongerReposModal
          repos={selectedRepos}
          loading={prolongLoading}
          onClose={() => { setShowProlonger(false); setSelectedRepos(null); }}
          onSubmit={handleProlonger}
        />
      )}

      {/* Modal Sortie hospitalisation */}
      {showCloture && selectedHospit && (
        <SortieHospitalisationModal
          hospit={selectedHospit}
          loading={clotureLoading}
          onClose={() => { setShowCloture(false); setSelectedHospit(null); }}
          onSubmit={handleCloturerHospit}
        />
      )}
    </div>
  );
}

// ── Sous-composants ────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="h-24 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
      <div className="mx-auto mb-3 flex justify-center">{icon}</div>
      <p className="text-gray-500 dark:text-gray-400 text-sm">{message}</p>
    </div>
  );
}

function ProlongerReposModal({ repos, loading, onClose, onSubmit }) {
  const [dureeJours, setDureeJours] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dureeJours || dureeJours < 1) return;
    onSubmit({ dureeJours: Number(dureeJours), notes });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus size={18} className="text-blue-600" />
            Prolonger le repos maladie
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {repos.patient?.nom} {repos.patient?.prenom} — actuellement {repos.dureeJours} jour{repos.dureeJours !== 1 ? 's' : ''}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Durée de prolongation (jours) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={dureeJours}
              onChange={(e) => setDureeJours(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: 3"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Motif de prolongation
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Motif médical..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">
              {loading ? 'Enregistrement...' : 'Prolonger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SortieHospitalisationModal({ hospit, loading, onClose, onSubmit }) {
  const [dateSortie, setDateSortie] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ dateSortie, notes });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            Sortie d'hospitalisation
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {hospit.patient?.nom} {hospit.patient?.prenom} — {hospit.serviceHospitalisation || 'N/A'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date de sortie *
            </label>
            <input
              type="date"
              required
              value={dateSortie}
              onChange={(e) => setDateSortie(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes de sortie
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Observations à la sortie..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors font-medium">
              {loading ? 'Enregistrement...' : 'Confirmer sortie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
