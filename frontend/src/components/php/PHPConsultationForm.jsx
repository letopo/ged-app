// frontend/src/components/php/PHPConsultationForm.jsx
// Enregistrement arrivée en consultation — Étape 1 uniquement
// La clôture (résultat) se fait séparément depuis la liste des consultations

import { useState, useEffect } from 'react';
import { X, Stethoscope, Clock, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { phpConsultationAPI, phpReferenceAPI } from '../../services/phpService';

export default function PHPConsultationForm({ patient, onClose, onSuccess }) {
  const [loading, setLoading]             = useState(false);
  const [error,   setError]               = useState(null);
  const [success, setSuccess]             = useState(false);
  const [servicesMedicaux, setServicesMedicaux] = useState([]);

  const now           = new Date();
  const heureActuelle = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const today         = now.toISOString().split('T')[0];

  const [form, setForm] = useState({
    heureArrivee: heureActuelle,
    serviceName:  '',
    motif:        '',
    notes:        '',
  });

  useEffect(() => {
    phpReferenceAPI.getServicesMedicaux()
      .then(res => setServicesMedicaux(res.data.data || []))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.serviceName) { setError('Veuillez sélectionner un service'); return; }
    if (!form.motif.trim()) { setError('Le motif de consultation est obligatoire'); return; }

    setLoading(true);
    setError(null);
    try {
      await phpConsultationAPI.create({
        patientId:           patient.id,
        bonPriseEnChargeId:  patient.bons?.[0]?.id || null,
        dateConsultation:    today,
        heureArrivee:        form.heureArrivee,
        serviceName:         form.serviceName,
        motif:               form.motif,
        notes:               form.notes,
      });
      setSuccess(true);
      // Fermeture auto après 1,5 s pour laisser voir le succès
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Stethoscope className="text-green-600" size={20} />
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Enregistrer l'arrivée en consultation
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {patient.nom} {patient.prenom || ''} •{' '}
                <span className="font-mono">{patient.matricule}</span>
                {patient.infirmerie && ` • ${patient.infirmerie.nom}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          {/* Succès */}
          {success && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Arrivée enregistrée !
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {patient.nom} est en attente de consultation — service {form.serviceName}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                La clôture se fera depuis la liste des consultations
              </p>
            </div>
          )}

          {/* Formulaire */}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {/* Heure + Service */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>
                    <Clock size={11} className="inline mr-1" />
                    Heure d'arrivée
                  </label>
                  <input
                    type="time"
                    value={form.heureArrivee}
                    onChange={e => setForm(f => ({ ...f, heureArrivee: e.target.value }))}
                    className={inp}
                  />
                </div>
                <div>
                  <label className={lbl}>
                    Service <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.serviceName}
                    onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))}
                    required
                    className={inp}
                  >
                    <option value="">-- Choisir --</option>
                    {servicesMedicaux.map(s => (
                      <option key={s.code || s.nom} value={s.nom}>{s.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Motif — obligatoire */}
              <div>
                <label className={lbl}>
                  Motif de consultation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.motif}
                  onChange={e => setForm(f => ({ ...f, motif: e.target.value }))}
                  placeholder="Ex: Fièvre, céphalées, douleur abdominale..."
                  required
                  className={inp}
                />
              </div>

              {/* Notes optionnelles */}
              <div>
                <label className={lbl}>Notes <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Observations supplémentaires..."
                  className={`${inp} resize-none`}
                />
              </div>

              {/* Info auto-clôture */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <Clock size={13} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  La consultation reste <strong>ouverte</strong> jusqu'à clôture manuelle ou clôture automatique en fin de journée (Retour au travail).
                </p>
              </div>

              {/* Boutons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-semibold"
                >
                  {loading
                    ? <Loader size={15} className="animate-spin" />
                    : <Stethoscope size={15} />
                  }
                  {loading ? 'Enregistrement...' : 'Enregistrer l\'arrivée'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
