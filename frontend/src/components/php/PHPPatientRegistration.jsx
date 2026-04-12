// frontend/src/components/php/PHPPatientRegistration.jsx
// Enregistrement patient PHP :
//   • Auto-remplissage si le matricule existe déjà
//   • Mise en consultation directe sans naviguer ailleurs

import { useState, useEffect, useRef } from 'react';
import {
  X, UserPlus, AlertCircle, CheckCircle, FileText,
  Loader, Stethoscope, UserCheck, RefreshCw
} from 'lucide-react';
import { phpPatientAPI, phpReferenceAPI } from '../../services/phpService';
import PHPConsultationForm from './PHPConsultationForm';

// ─── Styles communs ────────────────────────────────────────────────────────────
const input = (extra = '') =>
  `w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${extra}`;
const label = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

// ─── Composant principal ───────────────────────────────────────────────────────
export default function PHPPatientRegistration({ onClose, onSuccess }) {

  /* ── état de recherche ──────────────────────────────────────────────────── */
  const [searchStatus, setSearchStatus] = useState('idle');
  // idle | searching | found | not_found | saved
  const [patientTrouve, setPatientTrouve]   = useState(null);
  const [searchError,   setSearchError]     = useState(null);
  const debounceRef = useRef(null);

  /* ── données de référence ───────────────────────────────────────────────── */
  const [secteurs,       setSecteurs]       = useState([]);
  const [servicesMed,    setServicesMed]    = useState([]);

  /* ── formulaire ─────────────────────────────────────────────────────────── */
  const [form, setForm] = useState({
    matricule:          '',
    nom:                '',
    prenom:             '',
    genre:              '',
    dateNaissance:      '',
    secteurId:          '',
    telephone:          '',
    genererBon:         true,
    serviceDestination: 'Consultation Médicale',
    motifVisite:        '',
  });
  const [infirmerieMapped, setInfirmerieMapped] = useState(null);

  /* ── soumission formulaire ──────────────────────────────────────────────── */
  const [loading, setLoading]   = useState(false);
  const [formError, setFormError] = useState(null);

  /* ── consultation directe ───────────────────────────────────────────────── */
  const [modeConsult, setModeConsult] = useState(false);
  const [patientPourConsult, setPatientPourConsult] = useState(null);

  // ── Chargement des référentiels ──────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      phpReferenceAPI.getSecteurs(),
      phpReferenceAPI.getServicesMedicaux(),
    ]).then(([secRes, svcRes]) => {
      setSecteurs(secRes.data.data || []);
      setServicesMed(svcRes.data.data || []);
    }).catch(console.error);
  }, []);

  // ── Recherche automatique par matricule (debounce 600 ms) ─────────────────
  const handleMatriculeChange = (val) => {
    const v = val.toUpperCase().trim();
    setForm(f => ({ ...f, matricule: v }));
    setSearchError(null);

    // Réinitialiser si champ vidé
    if (!v) {
      setSearchStatus('idle');
      setPatientTrouve(null);
      resetForm(v);
      return;
    }

    // Lancer la recherche dès 3 caractères
    if (v.length < 3) {
      setSearchStatus('idle');
      return;
    }

    clearTimeout(debounceRef.current);
    setSearchStatus('searching');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await phpPatientAPI.searchByMatricule(v);
        const patient = res.data.data;
        if (patient) {
          setPatientTrouve(patient);
          setSearchStatus('found');
          autoFillForm(patient);
        } else {
          setPatientTrouve(null);
          setSearchStatus('not_found');
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setPatientTrouve(null);
          setSearchStatus('not_found');
        } else {
          setSearchStatus('idle');
          setSearchError('Erreur réseau lors de la recherche');
        }
      }
    }, 600);
  };

  const autoFillForm = (p) => {
    setForm(f => ({
      ...f,
      nom:          p.nom        || '',
      prenom:       p.prenom     || '',
      genre:        p.genre      || '',
      dateNaissance:p.dateNaissance || '',
      secteurId:    p.secteur?.id || p.secteurId || '',
      telephone:    p.telephone  || '',
    }));
    if (p.infirmerie) setInfirmerieMapped(p.infirmerie);
  };

  const resetForm = (matricule = '') => {
    setForm({
      matricule,
      nom: '', prenom: '', genre: '', dateNaissance: '',
      secteurId: '', telephone: '',
      genererBon: true,
      serviceDestination: 'Consultation Médicale',
      motifVisite: '',
    });
    setInfirmerieMapped(null);
  };

  // ── Changement secteur → auto-map infirmerie ──────────────────────────────
  const handleSecteurChange = (id) => {
    setForm(f => ({ ...f, secteurId: id }));
    const s = secteurs.find(x => x.id === id);
    setInfirmerieMapped(s?.infirmerie || null);
  };

  // ── Enregistrement d'un nouveau patient ───────────────────────────────────
  const handleSubmit = async (e, goConsult = false) => {
    e.preventDefault();
    if (!form.matricule || !form.nom) {
      setFormError('Matricule et nom sont obligatoires');
      return;
    }
    setLoading(true);
    setFormError(null);
    try {
      const res = await phpPatientAPI.create(form);
      const patient = res.data.data;
      const bon     = res.data.bon;
      setSearchStatus('saved');
      setPatientTrouve(patient);
      if (goConsult) {
        setPatientPourConsult(patient);
        setModeConsult(true);
      } else {
        onSuccess(patient, bon);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setFormError('Ce matricule est déjà enregistré — cherchez-le ci-dessus');
      } else {
        setFormError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Mise en consultation directe d'un patient existant ────────────────────
  const lancerConsultationDirecte = () => {
    setPatientPourConsult(patientTrouve);
    setModeConsult(true);
  };

  // ── Fin de consultation ────────────────────────────────────────────────────
  const handleConsultationSuccess = () => {
    setModeConsult(false);
    onSuccess(patientPourConsult, null);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // MODE CONSULTATION DIRECTE — affiche le formulaire de consultation
  // ══════════════════════════════════════════════════════════════════════════
  if (modeConsult && patientPourConsult) {
    return (
      <PHPConsultationForm
        patient={patientPourConsult}
        onClose={() => setModeConsult(false)}
        onSuccess={handleConsultationSuccess}
      />
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ══════════════════════════════════════════════════════════════════════════
  const isFound    = searchStatus === 'found';
  const isNotFound = searchStatus === 'not_found';
  const isSaved    = searchStatus === 'saved';
  const isSearching= searchStatus === 'searching';
  const readOnly   = isFound; // champs en lecture seule si patient trouvé

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-2">
            {isFound
              ? <UserCheck className="text-green-600" size={20} />
              : <UserPlus  className="text-blue-600"  size={20} />
            }
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {isFound ? 'Patient trouvé — action rapide' : 'Enregistrer un patient PHP'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">

          {/* ── Champ matricule (toujours actif) ── */}
          <div>
            <label className={label}>
              Matricule <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.matricule}
                onChange={e => handleMatriculeChange(e.target.value)}
                placeholder="Ex: 100049"
                className={`${input('font-mono pr-10')} ${
                  isFound    ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20' :
                  isNotFound ? 'border-blue-300 dark:border-blue-700' : ''
                }`}
                autoFocus
              />
              {/* Indicateur d'état */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isSearching && <Loader size={15} className="animate-spin text-gray-400" />}
                {isFound     && <CheckCircle size={15} className="text-green-600" />}
                {isNotFound  && <UserPlus   size={15} className="text-blue-500" />}
              </div>
            </div>
            {searchError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={11} /> {searchError}
              </p>
            )}
          </div>

          {/* ══ BANNIÈRE : patient trouvé ══ */}
          {isFound && patientTrouve && (
            <div className="rounded-xl border-2 border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center text-green-700 dark:text-green-300 font-bold text-lg shrink-0">
                    {patientTrouve.nom?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      {patientTrouve.nom} {patientTrouve.prenom || ''}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Matricule : <span className="font-mono font-medium">{patientTrouve.matricule}</span>
                      {patientTrouve.infirmerie && (
                        <> · {patientTrouve.infirmerie.nom}</>
                      )}
                      {patientTrouve.secteur && (
                        <> · Secteur {patientTrouve.secteur.nom}</>
                      )}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200 font-medium">
                        ✓ Patient existant
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchStatus('idle');
                    setPatientTrouve(null);
                    resetForm('');
                  }}
                  title="Effacer et rechercher un autre patient"
                  className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded-lg transition-colors text-green-700 dark:text-green-400"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {/* Bouton mise en consultation directe — en évidence */}
              <button
                type="button"
                onClick={lancerConsultationDirecte}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-semibold text-sm shadow-sm"
              >
                <Stethoscope size={18} />
                Mettre en consultation directement
              </button>

              {/* Génération d'un nouveau bon seulement */}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const res = await phpPatientAPI.genererBon(patientTrouve.id, {
                        serviceDestination: form.serviceDestination,
                        motif: form.motifVisite,
                      });
                      onSuccess(patientTrouve, res.data.data);
                    } catch (err) {
                      setFormError(err.response?.data?.message || 'Erreur bon');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-xs bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <FileText size={13} />
                  {loading ? 'Génération...' : 'Nouveau bon seulement'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={13} />
                  Fermer
                </button>
              </div>
            </div>
          )}

          {/* ══ BANNIÈRE : nouveau patient ══ */}
          {isNotFound && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <UserPlus size={15} className="text-blue-600 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <span className="font-semibold">Nouveau patient</span> — Ce matricule n'existe pas encore. Remplissez le formulaire ci-dessous.
              </p>
            </div>
          )}

          {/* ══ FORMULAIRE NOUVEAU PATIENT (masqué si trouvé) ══ */}
          {!isFound && (
            <form
              onSubmit={handleSubmit}
              id="form-patient"
            >
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm mb-4">
                  <AlertCircle size={15} />
                  {formError}
                </div>
              )}

              {/* Identité */}
              <div className="mb-4">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Identité du patient
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Nom <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={form.nom}
                      onChange={e => setForm(f => ({ ...f, nom: e.target.value.toUpperCase() }))}
                      placeholder="NOM DE FAMILLE"
                      required
                      readOnly={readOnly}
                      className={input(readOnly ? 'opacity-70 cursor-not-allowed' : '')}
                    />
                  </div>
                  <div>
                    <label className={label}>Prénom(s)</label>
                    <input
                      type="text"
                      value={form.prenom}
                      onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                      placeholder="Prénom(s)"
                      readOnly={readOnly}
                      className={input(readOnly ? 'opacity-70 cursor-not-allowed' : '')}
                    />
                  </div>
                  <div>
                    <label className={label}>Genre</label>
                    <select
                      value={form.genre}
                      onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                      disabled={readOnly}
                      className={input(readOnly ? 'opacity-70 cursor-not-allowed' : '')}
                    >
                      <option value="">-- Sélectionner --</option>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </div>
                  <div>
                    <label className={label}>Date de naissance</label>
                    <input
                      type="date"
                      value={form.dateNaissance}
                      onChange={e => setForm(f => ({ ...f, dateNaissance: e.target.value }))}
                      readOnly={readOnly}
                      className={input(readOnly ? 'opacity-70 cursor-not-allowed' : '')}
                    />
                  </div>
                  <div>
                    <label className={label}>Téléphone</label>
                    <input
                      type="tel"
                      value={form.telephone}
                      onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                      placeholder="Ex: 6XXXXXXXX"
                      readOnly={readOnly}
                      className={input(readOnly ? 'opacity-70 cursor-not-allowed' : '')}
                    />
                  </div>
                </div>
              </div>

              {/* Affectation */}
              <div className="mb-4">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Affectation (secteur → infirmerie auto)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Secteur de travail</label>
                    <select
                      value={form.secteurId}
                      onChange={e => handleSecteurChange(e.target.value)}
                      disabled={readOnly}
                      className={input(readOnly ? 'opacity-70 cursor-not-allowed' : '')}
                    >
                      <option value="">-- Sélectionner un secteur --</option>
                      {secteurs.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nom} {s.infirmerie ? `(${s.infirmerie.nom})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={label}>Infirmerie (auto-mappée)</label>
                    <div className={`${input()} ${infirmerieMapped
                      ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                      : 'opacity-60'
                    }`}>
                      {infirmerieMapped ? (
                        <span className="flex items-center gap-1 text-green-700 dark:text-green-400 text-sm">
                          <CheckCircle size={13} />
                          {infirmerieMapped.nom}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Sélectionner un secteur d'abord</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bon de prise en charge */}
              <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={15} className="text-blue-600" />
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    Bon de prise en charge
                  </h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={form.genererBon}
                    onChange={e => setForm(f => ({ ...f, genererBon: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Générer automatiquement un bon de prise en charge
                  </span>
                </label>
                {form.genererBon && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={label}>Service de destination</label>
                      <select
                        value={form.serviceDestination}
                        onChange={e => setForm(f => ({ ...f, serviceDestination: e.target.value }))}
                        className={input()}
                      >
                        <option value="Consultation Médicale">Consultation Médicale</option>
                        {servicesMed.map(s => (
                          <option key={s.code || s.nom} value={s.nom}>{s.nom}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={label}>Motif de visite <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={form.motifVisite}
                        onChange={e => setForm(f => ({ ...f, motifVisite: e.target.value }))}
                        placeholder="Ex: Fièvre, douleur..."
                        required
                        className={input()}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Boutons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="sm:flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>

                {/* Enregistrer seulement */}
                <button
                  type="submit"
                  disabled={loading || searchStatus === 'idle'}
                  onClick={e => handleSubmit(e, false)}
                  className="sm:flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm border border-blue-400 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40 transition-colors font-medium"
                >
                  {loading ? <Loader size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  Enregistrer
                </button>

                {/* Enregistrer + mettre en consultation */}
                <button
                  type="button"
                  disabled={loading || searchStatus === 'idle'}
                  onClick={e => handleSubmit(e, true)}
                  className="sm:flex-[2] flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors font-semibold shadow-sm"
                >
                  {loading
                    ? <Loader size={14} className="animate-spin" />
                    : <Stethoscope size={14} />
                  }
                  Enregistrer & Consulter
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
