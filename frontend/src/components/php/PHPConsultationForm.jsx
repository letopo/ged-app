// frontend/src/components/php/PHPConsultationForm.jsx
// Enregistrement arrivée en consultation — Étape 1 uniquement
// La clôture (résultat) se fait séparément depuis la liste des consultations

import { useState, useEffect } from 'react';
import { X, Stethoscope, Clock, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { phpConsultationAPI, phpReferenceAPI } from '../../services/phpService';

const inputStyle = {
  width: '100%', padding: '8px 12px', fontSize: 13,
  border: '1.5px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface)', color: 'var(--fg)', outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 4 };

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
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 448 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Stethoscope size={20} style={{ color: 'var(--success)' }} />
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 2px' }}>
                Enregistrer l'arrivée en consultation
              </h2>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
                {patient.nom} {patient.prenom || ''} •{' '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>{patient.matricule}</span>
                {patient.infirmerie && ` • ${patient.infirmerie.nom}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', borderRadius: 'var(--radius-2)', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 16 }}>
          {/* Succès */}
          {success && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={32} style={{ color: 'var(--success)' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>Arrivée enregistrée !</p>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
                {patient.nom} est en attente de consultation — service {form.serviceName}
              </p>
              <p style={{ fontSize: 12, color: 'var(--success)', margin: 0 }}>
                La clôture se fera depuis la liste des consultations
              </p>
            </div>
          )}

          {/* Formulaire */}
          {!success && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-2)', color: 'var(--danger)', fontSize: 13 }}>
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>
                    <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                    Heure d'arrivée
                  </label>
                  <input type="time" value={form.heureArrivee}
                    onChange={e => setForm(f => ({ ...f, heureArrivee: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Service <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select value={form.serviceName}
                    onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))}
                    required style={inputStyle}>
                    <option value="">-- Choisir --</option>
                    {servicesMedicaux.map(s => (
                      <option key={s.code || s.nom} value={s.nom}>{s.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Motif de consultation <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="text" value={form.motif}
                  onChange={e => setForm(f => ({ ...f, motif: e.target.value }))}
                  placeholder="Ex: Fièvre, céphalées, douleur abdominale..."
                  required style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Notes <span style={{ color: 'var(--fg-subtle)', fontWeight: 400 }}>(optionnel)</span></label>
                <textarea value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Observations supplémentaires..."
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-2)' }}>
                <Clock size={13} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: '#b45309', margin: 0 }}>
                  La consultation reste <strong>ouverte</strong> jusqu'à clôture manuelle ou clôture automatique en fin de journée (Retour au travail).
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button type="button" onClick={onClose}
                  style={{ flex: 1, padding: '8px 16px', fontSize: 13, border: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--surface-2)', borderRadius: 'var(--radius-2)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
                >
                  Annuler
                </button>
                <button type="submit" disabled={loading}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 16px', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-2)', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? <Loader size={15} className="animate-spin" /> : <Stethoscope size={15} />}
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
