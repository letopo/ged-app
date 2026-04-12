// frontend/src/pages/PHPPatients.jsx
// Gestion complète des patients PHP — liste, recherche, fiche détail, édition, suppression

import { useState, useEffect, useCallback } from 'react';
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

// ─── Labels / couleurs statuts ────────────────────────────────────────────────
const STATUS_LABELS = { actif: 'Actif', decede: 'Décédé', transfere: 'Transféré', inactif: 'Inactif' };
const STATUS_COLORS = {
  actif:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  decede:   'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  transfere:'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  inactif:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function PHPPatients() {
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
      toast(err.response?.data?.message || 'Erreur génération bon');
    }
  };

  const handleEditSaved = (updatedPatient) => {
    setShowEdit(false);
    setEditPatient(null);
    loadPatients();
    // Mettre à jour la fiche si c'est le patient actuellement sélectionné
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
      toast(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">

      {/* ── En-tête ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/php" className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronLeft size={18} className="text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="text-blue-600" size={22} />
              Patients PHP
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {pagination.total} patient{pagination.total !== 1 ? 's' : ''} enregistré{pagination.total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadPatients}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowRegistration(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
            <Plus size={16} /> Nouveau patient
          </button>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher par nom, prénom ou matricule..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={filterInfirmerie} onChange={e => { setFilterInfirmerie(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Toutes les infirmeries</option>
            {infirmeries.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tous les statuts</option>
            <option value="actif">Actifs</option>
            <option value="inactif">Inactifs</option>
            <option value="decede">Décédés</option>
            <option value="transfere">Transférés</option>
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
                <div key={i} className="h-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse" />
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Users size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Aucun patient trouvé</p>
              <button onClick={() => setShowRegistration(true)}
                className="mt-3 text-sm text-blue-600 hover:underline flex items-center gap-1 mx-auto">
                <Plus size={14} /> Enregistrer un patient
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {patients.map(p => (
                  <div key={p.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl border transition-all p-3 ${
                      selectedPatient?.id === p.id
                        ? 'border-blue-500 ring-1 ring-blue-500'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Infos — cliquable pour ouvrir la fiche */}
                      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => loadPatientDetail(p)}>
                        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold shrink-0">
                          {p.nom?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {p.nom} {p.prenom || ''}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            <span className="font-mono">{p.matricule}</span>
                            {p.infirmerie && ` • ${p.infirmerie.nom}`}
                            {p.secteur && ` • ${p.secteur.nom}`}
                          </p>
                        </div>
                      </div>

                      {/* Actions rapides */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                        {/* Modifier */}
                        <button
                          onClick={e => { e.stopPropagation(); setEditPatient(p); setShowEdit(true); }}
                          title="Modifier ce patient"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        {/* Supprimer */}
                        <button
                          onClick={e => { e.stopPropagation(); setDeletePatient_(p); setShowDelete(true); }}
                          title="Supprimer ce patient"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                        <ChevronRight size={14} className="text-gray-300" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    {((page-1)*25)+1}–{Math.min(page*25, pagination.total)} sur {pagination.total}
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
        </div>

        {/* ── Fiche détail patient ── */}
        {selectedPatient && (
          <div className="w-full lg:w-1/2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header fiche */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-lg font-bold">
                  {selectedPatient.nom?.[0] || '?'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {selectedPatient.nom} {selectedPatient.prenom || ''}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{selectedPatient.matricule}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selectedPatient.status]}`}>
                    {STATUS_LABELS[selectedPatient.status]}
                  </span>
                </div>
              </div>
              {/* Boutons fiche */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditPatient(selectedPatient); setShowEdit(true); }}
                  title="Modifier"
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => { setDeletePatient_(selectedPatient); setShowDelete(true); }}
                  title="Supprimer"
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
                <button onClick={() => setSelectedPatient(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors lg:hidden">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-280px)]">
              {/* Infos */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Building2 size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Infirmerie</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPatient.infirmerie?.nom || '–'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Secteur</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPatient.secteur?.nom || '–'}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => handleGenererBon(selectedPatient)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition-colors">
                  <FileText size={13} /> Générer bon
                </button>
                <button onClick={() => setShowConsultation(true)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 transition-colors">
                  <Stethoscope size={13} /> Consultation
                </button>
              </div>

              {/* Historique consultations */}
              {selectedPatient.consultations?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Historique consultations ({selectedPatient.consultations.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedPatient.consultations.slice(0, 5).map(c => (
                      <div key={c.id} className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-medium text-gray-900 dark:text-white">
                              {new Date(c.dateConsultation).toLocaleDateString('fr-FR')} • {c.serviceName || '–'}
                            </p>
                            {c.diagnostic && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.diagnostic}</p>}
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ml-2 ${
                            c.resultat === 'retour_travail' ? 'bg-green-100 text-green-700' :
                            c.resultat === 'repos' ? 'bg-yellow-100 text-yellow-700' :
                            c.resultat === 'hospitalisation' ? 'bg-red-100 text-red-700' :
                            c.resultat === 'en_cours' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {c.resultat?.replace('_', ' ') || '–'}
                          </span>
                        </div>
                        {c.dureeAttenteMinutes > 0 && (
                          <p className={`text-xs flex items-center gap-1 mt-1 ${c.dureeAttenteMinutes > 120 ? 'text-red-500' : 'text-gray-400'}`}>
                            <Clock size={11} />
                            Attente : {c.dureeAttenteMinutes < 60
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
                  <h3 className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-2">Repos maladie en cours</h3>
                  {selectedPatient.repos.filter(r => r.status !== 'termine').map(r => (
                    <div key={r.id} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs">
                      <p className="font-medium text-yellow-800 dark:text-yellow-300">
                        Du {new Date(r.dateDebut).toLocaleDateString('fr-FR')} au {new Date(r.dateFin).toLocaleDateString('fr-FR')}
                        {' '}({r.dureeJours} jour{r.dureeJours !== 1 ? 's' : ''})
                      </p>
                      {r.motif && <p className="text-yellow-700 dark:text-yellow-400 mt-0.5">{r.motif}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Hospitalisations en cours */}
              {selectedPatient.hospitalisations?.filter(h => h.status === 'en_cours').length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Hospitalisation en cours</h3>
                  {selectedPatient.hospitalisations.filter(h => h.status === 'en_cours').map(h => (
                    <div key={h.id} className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs">
                      <p className="font-medium text-red-800 dark:text-red-300">
                        {h.serviceHospitalisation || 'Service non précisé'} • Entrée le {new Date(h.dateEntree).toLocaleDateString('fr-FR')}
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

  // Charger les secteurs de l'infirmerie sélectionnée
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
    if (!form.nom.trim())    { setErreur('Le nom est obligatoire'); return; }
    if (!form.matricule.trim()) { setErreur('Le matricule est obligatoire'); return; }

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
      setErreur(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Pencil size={16} className="text-blue-600" />
            Modifier le patient
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="p-8 flex flex-col items-center gap-3 text-green-600">
            <CheckCircle size={40} />
            <p className="font-semibold">Modifications enregistrées !</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">

            {/* Identité */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Matricule <span className="text-red-500">*</span></label>
                <input type="text" value={form.matricule}
                  onChange={e => setForm(f => ({ ...f, matricule: e.target.value }))}
                  className={inp} placeholder="Ex: 801636" />
              </div>
              <div>
                <label className={lbl}>Statut</label>
                <select value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className={inp}>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="transfere">Transféré</option>
                  <option value="decede">Décédé</option>
                </select>
              </div>
            </div>

            <div>
              <label className={lbl}>Nom <span className="text-red-500">*</span></label>
              <input type="text" value={form.nom}
                onChange={e => setForm(f => ({ ...f, nom: e.target.value.toUpperCase() }))}
                className={inp} placeholder="NOM DE FAMILLE" />
            </div>

            <div>
              <label className={lbl}>Prénom(s)</label>
              <input type="text" value={form.prenom}
                onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                className={inp} placeholder="Prénom(s) du patient" />
            </div>

            {/* Affectation */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl space-y-3">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                Affectation
              </p>
              <div>
                <label className={lbl}>Infirmerie</label>
                <select value={form.infirmerieId} onChange={handleInfChange} className={inp}>
                  <option value="">-- Choisir l'infirmerie --</option>
                  {infirmeries.map(i => (
                    <option key={i.id} value={i.id}>{i.nom} ({i.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Secteur</label>
                <select value={form.secteurId}
                  onChange={e => setForm(f => ({ ...f, secteurId: e.target.value }))}
                  disabled={!form.infirmerieId || secteurs.length === 0}
                  className={`${inp} disabled:opacity-50 disabled:cursor-not-allowed`}>
                  <option value="">-- Choisir le secteur --</option>
                  {secteurs.map(s => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
                {form.infirmerieId && secteurs.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Aucun secteur pour cette infirmerie</p>
                )}
              </div>
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
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors font-semibold">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
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
  const [confirming, setConfirming] = useState(false);
  const [mode, setMode]             = useState('desactiver'); // 'desactiver' | 'supprimer'

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm(mode);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Trash2 size={16} className="text-red-500" />
            Supprimer le patient
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Info patient */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
              {patient.nom?.[0] || '?'}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{patient.nom} {patient.prenom || ''}</p>
              <p className="text-xs text-gray-500 font-mono">{patient.matricule}</p>
              <p className="text-xs text-gray-400">{patient.infirmerie?.nom} {patient.secteur ? `• ${patient.secteur.nom}` : ''}</p>
            </div>
          </div>

          {/* Choix du mode */}
          <div className="space-y-2">
            {/* Option 1 : Désactiver */}
            <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
              mode === 'desactiver'
                ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
            }`}>
              <input type="radio" name="mode" value="desactiver"
                checked={mode === 'desactiver'} onChange={() => setMode('desactiver')}
                className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Désactiver (recommandé)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Le patient passe en statut <strong>Inactif</strong>. Son historique (consultations, repos, hospitalisations) est conservé. Réversible à tout moment via "Modifier".
                </p>
              </div>
            </label>

            {/* Option 2 : Supprimer définitivement */}
            <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
              mode === 'supprimer'
                ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
            }`}>
              <input type="radio" name="mode" value="supprimer"
                checked={mode === 'supprimer'} onChange={() => setMode('supprimer')}
                className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Supprimer définitivement</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  ⚠️ <strong>Irréversible.</strong> Le patient <em>et tout son historique</em> (consultations, bons, repos, hospitalisations) seront définitivement supprimés de la base de données.
                </p>
              </div>
            </label>
          </div>

          {/* Avertissement suppression définitive */}
          {mode === 'supprimer' && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <TriangleAlert size={16} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400">
                Cette action est <strong>définitive et irréversible</strong>. Toutes les consultations, bons de prise en charge, repos maladie et hospitalisations associés à ce patient seront également supprimés.
              </p>
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className={`flex-[2] flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl font-semibold transition-colors disabled:opacity-60 ${
                mode === 'supprimer'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              }`}
            >
              {confirming
                ? <RefreshCw size={14} className="animate-spin" />
                : mode === 'supprimer' ? <Trash2 size={14} /> : null
              }
              {confirming ? 'Traitement...' : mode === 'supprimer' ? 'Supprimer définitivement' : 'Désactiver le patient'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
