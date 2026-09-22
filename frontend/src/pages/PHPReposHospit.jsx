// frontend/src/pages/PHPReposHospit.jsx
// Gestion des repos maladie et hospitalisations PHP

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BedDouble, RefreshCw, ArrowLeft, Clock, CheckCircle,
  AlertCircle, Calendar, ChevronRight, Timer, Activity,
  X, Plus
} from 'lucide-react';
import { phpConsultationAPI } from '../services/phpService';
import toast from 'react-hot-toast';
import i18n from '../i18n/config';

const BCP47_LOCALES = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA' };
const currentLocale = () => BCP47_LOCALES[i18n.language] || 'fr-FR';

export default function PHPReposHospit() {
  const { t } = useTranslation();
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
      toast(err.response?.data?.message || t('Erreur lors de la prolongation'));
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
      toast(err.response?.data?.message || t('Erreur lors de la clôture'));
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
    <div className="min-h-screen p-4 lg:p-6" style={{ background: 'var(--surface-2)' }}>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/php" className="p-1 rounded-lg transition-colors" style={{ color: 'var(--fg-muted)' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <BedDouble style={{ color: 'rgb(234,88,12)' }} size={22} />
              {t('Repos & Hospitalisations')}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              {t('{{repos}} repos en cours • {{hospit}} hospitalisation(s) en cours', { repos: repos.length, hospit: hospitalisations.length })}
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {t('Actualiser')}
        </button>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 rounded-xl p-1 mb-6 w-fit" style={{ background: 'var(--surface-3)' }}>
        <button
          onClick={() => setActiveTab('repos')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={activeTab === 'repos'
            ? { background: 'var(--surface)', color: 'var(--warning)', boxShadow: 'var(--shadow-1)' }
            : { color: 'var(--fg-muted)' }}
        >
          <Timer size={15} />
          {t('Repos maladie')}
          {repos.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
              {repos.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('hospit')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={activeTab === 'hospit'
            ? { background: 'var(--surface)', color: 'var(--danger)', boxShadow: 'var(--shadow-1)' }
            : { color: 'var(--fg-muted)' }}
        >
          <BedDouble size={15} />
          {t('Hospitalisations')}
          {hospitalisations.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
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
              icon={<Timer size={40} style={{ color: 'var(--fg-subtle)' }} />}
              message={t('Aucun repos maladie en cours')}
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
                    className="rounded-xl p-4 transition-colors"
                    style={{
                      background: expire  ? 'rgba(239,68,68,0.05)'  :
                                  urgence ? 'rgba(249,115,22,0.05)' :
                                  'var(--surface)',
                      border: expire  ? '1px solid var(--danger)'  :
                              urgence ? '1px solid rgba(249,115,22,0.5)' :
                              '1px solid var(--border)',
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        {/* Patient */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                            style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                            {r.patient?.nom?.[0] || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                              {r.patient?.nom} {r.patient?.prenom || ''}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                              {r.patient?.matricule}
                              {r.patient?.infirmerie && ` • ${r.patient.infirmerie.nom}`}
                            </p>
                          </div>
                        </div>

                        {/* Dates et durée */}
                        <div className="flex flex-wrap gap-3 text-xs">
                          <span className="flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                            <Calendar size={12} />
                            {t('Du {{start}} au {{end}}', { start: new Date(r.dateDebut).toLocaleDateString(currentLocale()), end: new Date(r.dateFin).toLocaleDateString(currentLocale()) })}
                          </span>
                          <span className="flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                            <Clock size={12} />
                            {t('{{count}} jour(s)', { count: r.dureeJours })}
                          </span>
                          {r.prolongations?.length > 0 && (
                            <span className="flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                              <Plus size={11} />
                              {t('{{count}} prolongation(s)', { count: r.prolongations.length })}
                            </span>
                          )}
                        </div>

                        {/* Statut */}
                        {expire ? (
                          <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: 'var(--danger)' }}>
                            <AlertCircle size={12} />
                            {t('Repos expiré depuis {{count}} jour(s)', { count: Math.abs(jours) })}
                          </div>
                        ) : urgence ? (
                          <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: 'var(--warning)' }}>
                            <AlertCircle size={12} />
                            {t('Expire dans {{count}} jour(s)', { count: jours })}
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: 'var(--success)' }}>
                            <CheckCircle size={12} />
                            {t('{{count}} jour(s) restant(s)', { count: jours })}
                          </div>
                        )}

                        {r.motif && (
                          <p className="mt-1 text-xs italic" style={{ color: 'var(--fg-muted)' }}>"{r.motif}"</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <button
                          onClick={() => { setSelectedRepos(r); setShowProlonger(true); }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors"
                          style={{ background: 'var(--brand-soft)', color: 'var(--brand)', border: '1px solid var(--brand)' }}
                        >
                          <Plus size={12} />
                          {t('Prolonger')}
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(t('Terminer le repos de {{name}} ?', { name: r.patient?.nom }))) return;
                            try {
                              await phpConsultationAPI.prolongerRepos(r.id, { terminer: true });
                              loadData();
                            } catch (err) {
                              toast(t('Erreur lors de la clôture'));
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors"
                          style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
                        >
                          <X size={12} />
                          {t('Terminer')}
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
              icon={<BedDouble size={40} style={{ color: 'var(--fg-subtle)' }} />}
              message={t('Aucune hospitalisation en cours')}
            />
          ) : (
            <div className="space-y-3">
              {hospitalisations.map(h => {
                const nbJours = joursDepuis(h.dateEntree);
                const longSejour = nbJours >= 7;

                return (
                  <div
                    key={h.id}
                    className="rounded-xl p-4 transition-colors"
                    style={{
                      background: longSejour ? 'rgba(249,115,22,0.05)' : 'var(--surface)',
                      border: longSejour ? '1px solid rgba(249,115,22,0.5)' : '1px solid var(--border)',
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                            style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                            {h.patient?.nom?.[0] || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                              {h.patient?.nom} {h.patient?.prenom || ''}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                              {h.patient?.matricule}
                              {h.patient?.infirmerie && ` • ${h.patient.infirmerie.nom}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs">
                          <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--danger)' }}>
                            <BedDouble size={12} />
                            {h.serviceHospitalisation || t('Service non précisé')}
                          </span>
                          <span className="flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                            <Calendar size={12} />
                            {t('Entrée le {{date}}', { date: new Date(h.dateEntree).toLocaleDateString(currentLocale()) })}
                          </span>
                          <span className="flex items-center gap-1 font-medium"
                            style={{ color: longSejour ? 'rgb(234,88,12)' : 'var(--fg-muted)' }}>
                            <Clock size={12} />
                            {t("{{count}} jour(s) d'hospitalisation", { count: nbJours })}
                            {longSejour && ' ⚠️'}
                          </span>
                        </div>

                        {h.notes && (
                          <p className="mt-1 text-xs italic" style={{ color: 'var(--fg-muted)' }}>"{h.notes}"</p>
                        )}
                      </div>

                      <button
                        onClick={() => { setSelectedHospit(h); setShowCloture(true); }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors shrink-0"
                        style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success)' }}
                      >
                        <CheckCircle size={12} />
                        {t('Sortie')}
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
        <div key={i} className="h-24 rounded-xl border animate-pulse"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
      ))}
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="rounded-xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="mx-auto mb-3 flex justify-center">{icon}</div>
      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{message}</p>
    </div>
  );
}

function ProlongerReposModal({ repos, loading, onClose, onSubmit }) {
  const { t } = useTranslation();
  const [dureeJours, setDureeJours] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dureeJours || dureeJours < 1) return;
    onSubmit({ dureeJours: Number(dureeJours), notes });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-2xl w-full max-w-sm" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-3)' }}>
        <div className="p-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <Plus size={18} style={{ color: 'var(--brand)' }} />
            {t('Prolonger le repos maladie')}
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
            {t('{{name}} {{firstName}} — actuellement {{count}} jour(s)', { name: repos.patient?.nom, firstName: repos.patient?.prenom, count: repos.dureeJours })}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg)' }}>
              {t('Durée de prolongation (jours)')} *
            </label>
            <input
              type="number"
              min="1"
              required
              value={dureeJours}
              onChange={(e) => setDureeJours(e.target.value)}
              style={inp}
              placeholder={t('Ex: 3')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg)' }}>
              {t('Motif de prolongation')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ ...inp, resize: 'none' }}
              placeholder={t('Motif médical...')}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm rounded-xl transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}>
              {t('Annuler')}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 text-sm rounded-xl disabled:opacity-50 transition-colors font-medium"
              style={{ background: 'var(--brand)', color: '#fff' }}>
              {loading ? t('Enregistrement...') : t('Prolonger')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SortieHospitalisationModal({ hospit, loading, onClose, onSubmit }) {
  const { t } = useTranslation();
  const [dateSortie, setDateSortie] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ dateSortie, notes });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-2xl w-full max-w-sm" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-3)' }}>
        <div className="p-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <CheckCircle size={18} style={{ color: 'var(--success)' }} />
            {t("Sortie d'hospitalisation")}
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
            {hospit.patient?.nom} {hospit.patient?.prenom} — {hospit.serviceHospitalisation || 'N/A'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg)' }}>
              {t('Date de sortie')} *
            </label>
            <input
              type="date"
              required
              value={dateSortie}
              onChange={(e) => setDateSortie(e.target.value)}
              style={inp}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg)' }}>
              {t('Notes de sortie')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ ...inp, resize: 'none' }}
              placeholder={t('Observations à la sortie...')}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm rounded-xl transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}>
              {t('Annuler')}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 text-sm rounded-xl disabled:opacity-50 transition-colors font-medium"
              style={{ background: 'var(--success)', color: '#fff' }}>
              {loading ? t('Enregistrement...') : t('Confirmer sortie')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
