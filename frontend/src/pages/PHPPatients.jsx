// frontend/src/pages/PHPPatients.jsx
// Gestion complète des patients PHP — liste, recherche, fiche détail, édition, suppression

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users, Search, Plus, ChevronRight, RefreshCw,
  UserCircle, MapPin, Building2, FileText, Stethoscope,
  ChevronLeft, AlertCircle, Clock, Pencil, Trash2, X,
  CheckCircle, TriangleAlert, Save
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { phpPatientAPI, phpReferenceAPI } from '../services/phpService';
import PHPPatientRegistration from '../components/php/PHPPatientRegistration';
import PHPConsultationForm from '../components/php/PHPConsultationForm';
import PHPBonPrint from '../components/php/PHPBonPrint';
import toast from 'react-hot-toast';
import i18n from '../i18n/config';

const BCP47_LOCALES = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA' };

// ─── Labels / styles statuts ──────────────────────────────────────────────────
const getStatusLabels = (t) => ({ actif: t('Actif'), decede: t('Décédé'), transfere: t('Transféré'), inactif: t('Inactif') });
const STATUS_STYLES = {
  actif:    { background: 'var(--success-soft)', color: 'var(--success)' },
  decede:   { background: 'var(--surface-3)', color: 'var(--fg-muted)' },
  transfere:{ background: 'rgba(249,115,22,0.1)', color: 'rgb(234,88,12)' },
  inactif:  { background: 'var(--danger-soft)', color: 'var(--danger)' },
};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function PHPPatients() {
  const { t } = useTranslation();
  const STATUS_LABELS = getStatusLabels(t);
  const [patients, setPatients]     = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading]       = useState(true);
  const [infirmeries, setInfirmeries] = useState([]);

  // Filtres
  const [search, setSearch]                   = useState('');
  const [filterInfirmerie, setFilterInfirmerie] = useState('');
  const [filterStatus, setFilterStatus]         = useState('actif');
  const [page, setPage]                         = useState(1);

  // Détail patient sélectionné
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detailLoading, setDetailLoading]     = useState(false);

  // Modales
  const [showRegistration, setShowRegistration] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);
  const [showBonPrint, setShowBonPrint]         = useState(false);
  const [bonData, setBonData]                   = useState(null);

  // Modal édition
  const [showEdit, setShowEdit]         = useState(false);
  const [editPatient, setEditPatient]   = useState(null);

  // Modal suppression
  const [showDelete, setShowDelete]       = useState(false);
  const [deletePatient_, setDeletePatient_] = useState(null);

  // ── Chargement ──────────────────────────────────────────────────────────────
  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await phpPatientAPI.getAll({
        search: search || undefined,
        infirmerieId: filterInfirmerie || undefined,
        status: filterStatus || undefined,
        page, limit: 25,
      });
      setPatients(res.data.data || []);
      setPagination(res.data.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch (err) {
      console.error('Erreur chargement patients:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterInfirmerie, filterStatus, page]);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  useEffect(() => {
    phpReferenceAPI.getInfirmeries()
      .then(res => setInfirmeries(res.data.data || []))
      .catch(console.error);
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const loadPatientDetail = async (patient) => {
    setDetailLoading(true);
    try {
      const res = await phpPatientAPI.getHistorique(patient.id);
      setSelectedPatient(res.data.data);
    } catch {
      setSelectedPatient(patient);
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePatientRegistered = (patient, bon) => {
    setShowRegistration(false);
    if (bon) { setBonData({ bon, patient }); setShowBonPrint(true); }
    loadPatients();
  };

  const handleGenererBon = async (patient) => {
    try {
      const res = await phpPatientAPI.genererBon(patient.id, { serviceDestination: 'Consultation Médicale' });
      setBonData({ bon: res.data.data, patient });
      setShowBonPrint(true);
    } catch (err) {
      toast(err.response?.data?.message || t('Erreur génération bon'));
    }
  };

  const handleEditSaved = (updatedPatient) => {
    setShowEdit(false);
    setEditPatient(null);
    loadPatients();
    if (selectedPatient?.id === updatedPatient.id) {
      setSelectedPatient(prev => ({ ...prev, ...updatedPatient }));
    }
  };

  const handleDeleteConfirm = async (mode) => {
    try {
      await phpPatientAPI.delete(deletePatient_.id, mode);
      setShowDelete(false);
      setDeletePatient_(null);
      if (selectedPatient?.id === deletePatient_.id) setSelectedPatient(null);
      loadPatients();
    } catch (err) {
      toast(err.response?.data?.message || t('Erreur lors de la suppression'));
    }
  };

  const inputStyle = {
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-2)',
    background: 'var(--surface)',
    color: 'var(--fg)',
    outline: 'none',
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ background: 'var(--surface-2)' }}>

      {/* ── En-tête ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/php" className="p-1 rounded-lg transition-colors" style={{ color: 'var(--fg-muted)' }}>
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <Users style={{ color: 'var(--brand)' }} size={22} />
              {t('Patients PHP')}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              {t('{{count}} patient(s) enregistré(s)', { count: pagination.total })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadPatients}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowRegistration(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors font-medium"
            style={{ background: 'var(--brand)', color: '#fff', boxShadow: 'var(--shadow-1)' }}>
            <Plus size={16} /> {t('Nouveau patient')}
          </button>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="rounded-xl p-3 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-subtle)' }} />
            <input
              type="text" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('Rechercher par nom, prénom ou matricule...')}
              style={{ ...inputStyle, paddingLeft: '2.25rem', width: '100%' }}
            />
          </div>
          <select value={filterInfirmerie} onChange={e => { setFilterInfirmerie(e.target.value); setPage(1); }}
            style={inputStyle}>
            <option value="">{t('Toutes les infirmeries')}</option>
            {infirmeries.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            style={inputStyle}>
            <option value="">{t('Tous les statuts')}</option>
            <option value="actif">{t('Actifs')}</option>
            <option value="inactif">{t('Inactifs')}</option>
            <option value="decede">{t('Décédés')}</option>
            <option value="transfere">{t('Transférés')}</option>
          </select>
        </div>
      </div>

      {/* ── Layout liste + fiche ── */}
      <div className="flex gap-4">

        {/* ── Liste patients ── */}
        <div className={`${selectedPatient ? 'hidden lg:block lg:w-1/2' : 'w-full'}`}>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-16 rounded-xl border animate-pulse"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Users size={40} className="mx-auto mb-3" style={{ color: 'var(--fg-subtle)' }} />
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{t('Aucun patient trouvé')}</p>
              <button onClick={() => setShowRegistration(true)}
                className="mt-3 text-sm flex items-center gap-1 mx-auto hover:underline" style={{ color: 'var(--brand)' }}>
                <Plus size={14} /> {t('Enregistrer un patient')}
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {patients.map(p => (
                  <div key={p.id}
                    className="rounded-xl border transition-all p-3"
                    style={{
                      background: 'var(--surface)',
                      border: selectedPatient?.id === p.id
                        ? '1px solid var(--brand)'
                        : '1px solid var(--border)',
                      boxShadow: selectedPatient?.id === p.id ? '0 0 0 1px var(--brand)' : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      {/* Infos — cliquable pour ouvrir la fiche */}
                      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => loadPatientDetail(p)}>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                          {p.nom?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>
                            {p.nom} {p.prenom || ''}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{p.matricule}</span>
                            {p.infirmerie && ` • ${p.infirmerie.nom}`}
                            {p.secteur && ` • ${p.secteur.nom}`}
                          </p>
                        </div>
                      </div>

                      {/* Actions rapides */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={STATUS_STYLES[p.status] || { background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                        {/* Modifier */}
                        <button
                          onClick={e => { e.stopPropagation(); setEditPatient(p); setShowEdit(true); }}
                          title={t('Modifier ce patient')}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--fg-subtle)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--brand)'; e.currentTarget.style.background = 'var(--brand-soft)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-subtle)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Pencil size={13} />
                        </button>
                        {/* Supprimer */}
                        <button
                          onClick={e => { e.stopPropagation(); setDeletePatient_(p); setShowDelete(true); }}
                          title={t('Supprimer ce patient')}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--fg-subtle)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-soft)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-subtle)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Trash2 size={13} />
                        </button>
                        <ChevronRight size={14} style={{ color: 'var(--fg-subtle)' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm">
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                    {t('{{from}}–{{to}} sur {{total}}', { from: ((page-1)*25)+1, to: Math.min(page*25, pagination.total), total: pagination.total })}
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
        </div>

        {/* ── Fiche détail patient ── */}
        {selectedPatient && (
          <div className="w-full lg:w-1/2 rounded-xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {/* Header fiche */}
            <div className="p-4 flex items-start justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                  {selectedPatient.nom?.[0] || '?'}
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--fg)' }}>
                    {selectedPatient.nom} {selectedPatient.prenom || ''}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{selectedPatient.matricule}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={STATUS_STYLES[selectedPatient.status] || { background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
                    {STATUS_LABELS[selectedPatient.status]}
                  </span>
                </div>
              </div>
              {/* Boutons fiche */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditPatient(selectedPatient); setShowEdit(true); }}
                  title={t('Modifier')}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--brand)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-soft)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => { setDeletePatient_(selectedPatient); setShowDelete(true); }}
                  title={t('Supprimer')}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--danger)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-soft)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Trash2 size={15} />
                </button>
                <button onClick={() => setSelectedPatient(null)}
                  className="p-2 rounded-lg transition-colors lg:hidden"
                  style={{ color: 'var(--fg-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-280px)]">
              {/* Infos */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                  <Building2 size={14} style={{ color: 'var(--fg-subtle)' }} className="shrink-0" />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{t('Infirmerie')}</p>
                    <p className="font-medium" style={{ color: 'var(--fg)' }}>{selectedPatient.infirmerie?.nom || '–'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                  <MapPin size={14} style={{ color: 'var(--fg-subtle)' }} className="shrink-0" />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{t('Secteur')}</p>
                    <p className="font-medium" style={{ color: 'var(--fg)' }}>{selectedPatient.secteur?.nom || '–'}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => handleGenererBon(selectedPatient)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs rounded-lg hover:opacity-90 transition-colors"
                  style={{ background: 'rgba(99,102,241,0.1)', color: 'rgb(99,102,241)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <FileText size={13} /> {t('Générer bon')}
                </button>
                <button onClick={() => setShowConsultation(true)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs rounded-lg hover:opacity-90 transition-colors"
                  style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success)' }}>
                  <Stethoscope size={13} /> {t('Consultation')}
                </button>
              </div>

              {/* Historique consultations */}
              {selectedPatient.consultations?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>
                    {t('Historique consultations ({{count}})', { count: selectedPatient.consultations.length })}
                  </h3>
                  <div className="space-y-2">
                    {selectedPatient.consultations.slice(0, 5).map(c => (
                      <div key={c.id} className="p-2 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--fg)' }}>
                              {new Date(c.dateConsultation).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR')} • {c.serviceName || '–'}
                            </p>
                            {c.diagnostic && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{c.diagnostic}</p>}
                          </div>
                          <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0 ml-2" style={
                            c.resultat === 'retour_travail' ? { background: 'var(--success-soft)', color: 'var(--success)' } :
                            c.resultat === 'repos' ? { background: 'var(--warning-soft)', color: 'var(--warning)' } :
                            c.resultat === 'hospitalisation' ? { background: 'var(--danger-soft)', color: 'var(--danger)' } :
                            c.resultat === 'en_cours' ? { background: 'var(--brand-soft)', color: 'var(--brand)' } :
                            { background: 'var(--surface-3)', color: 'var(--fg-muted)' }
                          }>
                            {c.resultat?.replace('_', ' ') || '–'}
                          </span>
                        </div>
                        {c.dureeAttenteMinutes > 0 && (
                          <p className="text-xs flex items-center gap-1 mt-1"
                            style={{ color: c.dureeAttenteMinutes > 120 ? 'var(--danger)' : 'var(--fg-subtle)' }}>
                            <Clock size={11} />
                            {t('Attente')} : {c.dureeAttenteMinutes < 60
                              ? `${c.dureeAttenteMinutes} min`
                              : `${Math.floor(c.dureeAttenteMinutes/60)}h${String(c.dureeAttenteMinutes%60).padStart(2,'0')}`}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Repos en cours */}
              {selectedPatient.repos?.filter(r => r.status !== 'termine').length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--warning)' }}>
                    {t('Repos maladie en cours')}
                  </h3>
                  {selectedPatient.repos.filter(r => r.status !== 'termine').map(r => (
                    <div key={r.id} className="p-2 rounded-lg text-xs"
                      style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}>
                      <p className="font-medium" style={{ color: 'var(--warning)' }}>
                        {t('Du {{start}} au {{end}}', { start: new Date(r.dateDebut).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR'), end: new Date(r.dateFin).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR') })}
                        {' '}({t('{{count}} jour(s)', { count: r.dureeJours })})
                      </p>
                      {r.motif && <p className="mt-0.5" style={{ color: 'var(--warning)' }}>{r.motif}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Hospitalisations en cours */}
              {selectedPatient.hospitalisations?.filter(h => h.status === 'en_cours').length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--danger)' }}>
                    {t('Hospitalisation en cours')}
                  </h3>
                  {selectedPatient.hospitalisations.filter(h => h.status === 'en_cours').map(h => (
                    <div key={h.id} className="p-2 rounded-lg text-xs"
                      style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}>
                      <p className="font-medium" style={{ color: 'var(--danger)' }}>
                        {h.serviceHospitalisation || t('Service non précisé')} • {t('Entrée le {{date}}', { date: new Date(h.dateEntree).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR') })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modales ── */}
      {showRegistration && (
        <PHPPatientRegistration
          onClose={() => setShowRegistration(false)}
          onSuccess={handlePatientRegistered}
        />
      )}

      {showConsultation && selectedPatient && (
        <PHPConsultationForm
          patient={selectedPatient}
          onClose={() => setShowConsultation(false)}
          onSuccess={() => { setShowConsultation(false); loadPatients(); loadPatientDetail(selectedPatient); }}
        />
      )}

      {showBonPrint && bonData && (
        <PHPBonPrint
          bon={bonData.bon}
          patient={bonData.patient}
          onClose={() => { setShowBonPrint(false); setBonData(null); }}
        />
      )}

      {showEdit && editPatient && (
        <EditPatientModal
          patient={editPatient}
          infirmeries={infirmeries}
          onClose={() => { setShowEdit(false); setEditPatient(null); }}
          onSaved={handleEditSaved}
        />
      )}

      {showDelete && deletePatient_ && (
        <DeletePatientModal
          patient={deletePatient_}
          onClose={() => { setShowDelete(false); setDeletePatient_(null); }}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

// ─── Modal Édition Patient ─────────────────────────────────────────────────────
function EditPatientModal({ patient, infirmeries, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    nom:          patient.nom || '',
    prenom:       patient.prenom || '',
    matricule:    patient.matricule || '',
    infirmerieId: patient.infirmerieId || patient.infirmerie?.id || '',
    secteurId:    patient.secteurId   || patient.secteur?.id    || '',
    status:       patient.status || 'actif',
  });
  const [secteurs, setSecteurs]   = useState([]);
  const [saving, setSaving]       = useState(false);
  const [erreur, setErreur]       = useState('');
  const [success, setSuccess]     = useState(false);

  useEffect(() => {
    if (!form.infirmerieId) { setSecteurs([]); return; }
    phpReferenceAPI.getSecteurs({ infirmerieId: form.infirmerieId })
      .then(res => setSecteurs(res.data.data || []))
      .catch(console.error);
  }, [form.infirmerieId]);

  const handleInfChange = (e) => {
    setForm(f => ({ ...f, infirmerieId: e.target.value, secteurId: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    if (!form.nom.trim())    { setErreur(t('Le nom est obligatoire')); return; }
    if (!form.matricule.trim()) { setErreur(t('Le matricule est obligatoire')); return; }

    setSaving(true);
    try {
      const res = await phpPatientAPI.update(patient.id, {
        nom:          form.nom.trim().toUpperCase(),
        prenom:       form.prenom.trim() || null,
        matricule:    form.matricule.trim(),
        infirmerieId: form.infirmerieId || null,
        secteurId:    form.secteurId    || null,
        status:       form.status,
      });
      setSuccess(true);
      setTimeout(() => {
        onSaved(res.data.data);
      }, 800);
    } catch (err) {
      setErreur(err.response?.data?.message || t('Erreur lors de la mise à jour'));
    } finally {
      setSaving(false);
    }
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
      <div className="rounded-2xl w-full max-w-md" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-3)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <Pencil size={16} style={{ color: 'var(--brand)' }} />
            {t('Modifier le patient')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg"
            style={{ color: 'var(--fg-muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="p-8 flex flex-col items-center gap-3" style={{ color: 'var(--success)' }}>
            <CheckCircle size={40} />
            <p className="font-semibold">{t('Modifications enregistrées !')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">

            {/* Identité */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg)' }}>
                  {t('Matricule')} <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input type="text" value={form.matricule}
                  onChange={e => setForm(f => ({ ...f, matricule: e.target.value }))}
                  style={inp} placeholder={t('Ex: 801636')} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg)' }}>{t('Statut')}</label>
                <select value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={inp}>
                  <option value="actif">{t('Actif')}</option>
                  <option value="inactif">{t('Inactif')}</option>
                  <option value="transfere">{t('Transféré')}</option>
                  <option value="decede">{t('Décédé')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg)' }}>
                {t('Nom')} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input type="text" value={form.nom}
                onChange={e => setForm(f => ({ ...f, nom: e.target.value.toUpperCase() }))}
                style={inp} placeholder={t('NOM DE FAMILLE')} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg)' }}>{t('Prénom(s)')}</label>
              <input type="text" value={form.prenom}
                onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                style={inp} placeholder={t('Prénom(s) du patient')} />
            </div>

            {/* Affectation */}
            <div className="p-3 rounded-xl space-y-3"
              style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)' }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--brand)' }}>
                {t('Affectation')}
              </p>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg)' }}>{t('Infirmerie')}</label>
                <select value={form.infirmerieId} onChange={handleInfChange} style={inp}>
                  <option value="">{t("-- Choisir l'infirmerie --")}</option>
                  {infirmeries.map(i => (
                    <option key={i.id} value={i.id}>{i.nom} ({i.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg)' }}>{t('Secteur')}</label>
                <select value={form.secteurId}
                  onChange={e => setForm(f => ({ ...f, secteurId: e.target.value }))}
                  disabled={!form.infirmerieId || secteurs.length === 0}
                  style={{ ...inp, opacity: (!form.infirmerieId || secteurs.length === 0) ? 0.5 : 1, cursor: (!form.infirmerieId || secteurs.length === 0) ? 'not-allowed' : 'default' }}>
                  <option value="">{t('-- Choisir le secteur --')}</option>
                  {secteurs.map(s => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
                {form.infirmerieId && secteurs.length === 0 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--fg-subtle)' }}>{t('Aucun secteur pour cette infirmerie')}</p>
                )}
              </div>
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
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2 text-sm rounded-xl transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}>
                {t('Annuler')}
              </button>
              <button type="submit" disabled={saving}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl disabled:opacity-60 transition-colors font-semibold"
                style={{ background: 'var(--brand)', color: '#fff' }}>
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? t('Enregistrement...') : t('Enregistrer les modifications')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Modal Suppression Patient ────────────────────────────────────────────────
function DeletePatientModal({ patient, onClose, onConfirm }) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [mode, setMode]             = useState('desactiver');

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm(mode);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-2xl w-full max-w-md" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-3)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <Trash2 size={16} style={{ color: 'var(--danger)' }} />
            {t('Supprimer le patient')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg"
            style={{ color: 'var(--fg-muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Info patient */}
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
              {patient.nom?.[0] || '?'}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{patient.nom} {patient.prenom || ''}</p>
              <p className="text-xs" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{patient.matricule}</p>
              <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{patient.infirmerie?.nom} {patient.secteur ? `• ${patient.secteur.nom}` : ''}</p>
            </div>
          </div>

          {/* Choix du mode */}
          <div className="space-y-2">
            {/* Option 1 : Désactiver */}
            <label className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors"
              style={mode === 'desactiver'
                ? { borderColor: 'var(--warning)', background: 'var(--warning-soft)' }
                : { borderColor: 'var(--border)', background: 'transparent' }}>
              <input type="radio" name="mode" value="desactiver"
                checked={mode === 'desactiver'} onChange={() => setMode('desactiver')}
                className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{t('Désactiver (recommandé)')}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                  {t('Le patient passe en statut')} <strong>{t('Inactif')}</strong>. {t('Son historique (consultations, repos, hospitalisations) est conservé. Réversible à tout moment via "Modifier".')}
                </p>
              </div>
            </label>

            {/* Option 2 : Supprimer définitivement */}
            <label className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors"
              style={mode === 'supprimer'
                ? { borderColor: 'var(--danger)', background: 'var(--danger-soft)' }
                : { borderColor: 'var(--border)', background: 'transparent' }}>
              <input type="radio" name="mode" value="supprimer"
                checked={mode === 'supprimer'} onChange={() => setMode('supprimer')}
                className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>{t('Supprimer définitivement')}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                  ⚠️ <strong>{t('Irréversible.')}</strong> {t('Le patient et tout son historique (consultations, bons, repos, hospitalisations) seront définitivement supprimés de la base de données.')}
                </p>
              </div>
            </label>
          </div>

          {/* Avertissement suppression définitive */}
          {mode === 'supprimer' && (
            <div className="flex items-start gap-2 p-3 rounded-xl"
              style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}>
              <TriangleAlert size={16} style={{ color: 'var(--danger)' }} className="shrink-0 mt-0.5" />
              <p className="text-xs" style={{ color: 'var(--danger)' }}>
                {t('Cette action est')} <strong>{t('définitive et irréversible')}</strong>. {t('Toutes les consultations, bons de prise en charge, repos maladie et hospitalisations associés à ce patient seront également supprimés.')}
              </p>
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm rounded-xl transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}>
              {t('Annuler')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-[2] flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl font-semibold transition-colors disabled:opacity-60"
              style={mode === 'supprimer'
                ? { background: 'var(--danger)', color: '#fff' }
                : { background: 'var(--warning)', color: '#fff' }}
            >
              {confirming
                ? <RefreshCw size={14} className="animate-spin" />
                : mode === 'supprimer' ? <Trash2 size={14} /> : null
              }
              {confirming ? t('Traitement...') : mode === 'supprimer' ? t('Supprimer définitivement') : t('Désactiver le patient')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
