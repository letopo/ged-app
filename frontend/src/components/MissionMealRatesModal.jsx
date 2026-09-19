// frontend/src/components/MissionMealRatesModal.jsx
// Barème des indemnités de repas de mission (par catégorie) + seuils horaires
// qui conditionnent le petit-déjeuner et le dîner. Réservé à la comptabilité,
// au DG et aux administrateurs (contrôlé côté serveur).
import React, { useState, useEffect } from 'react';
import { missionMealAPI } from '../services/api';
import { X, Coffee, Sun, Moon, Plus, Trash2, Loader, ShieldAlert, Car, BedDouble } from 'lucide-react';
import toast from 'react-hot-toast';

const inputStyle = {
  width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-2)',
  border: '1.5px solid var(--border)', background: 'var(--surface)',
  color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

export default function MissionMealRatesModal({ isOpen, onClose }) {
  const [rates, setRates] = useState([]);
  const [thresholds, setThresholds] = useState({
    heureLimitePetitDejeuner: '07:30',
    heureDejeunerDebut: '12:00', heureDejeunerFin: '14:00',
    heureDinerDebut: '18:00', heureLimiteDiner: '20:00',
    montantPrimeSecurite: 5000, montantPeageChauffeur: 1000,
  });
  const [loading, setLoading] = useState(true);
  const [newCategorie, setNewCategorie] = useState('');

  useEffect(() => { if (isOpen) loadData(); }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await missionMealAPI.get();
      const { rates: r, thresholds: t } = res.data.data;
      setRates(r || []);
      setThresholds({
        heureLimitePetitDejeuner: (t?.heureLimitePetitDejeuner || '07:30:00').slice(0, 5),
        heureDejeunerDebut: (t?.heureDejeunerDebut || '12:00:00').slice(0, 5),
        heureDejeunerFin: (t?.heureDejeunerFin || '14:00:00').slice(0, 5),
        heureDinerDebut: (t?.heureDinerDebut || '18:00:00').slice(0, 5),
        heureLimiteDiner: (t?.heureLimiteDiner || '20:00:00').slice(0, 5),
        montantPrimeSecurite: t?.montantPrimeSecurite ?? 5000,
        montantPeageChauffeur: t?.montantPeageChauffeur ?? 1000,
      });
    } catch {
      toast.error('Erreur chargement du barème');
    } finally {
      setLoading(false);
    }
  };

  const saveRate = async (rate) => {
    try {
      await missionMealAPI.upsertRate(rate);
      toast.success(`Barème "${rate.categorie}" enregistré`);
      loadData();
    } catch {
      toast.error('Erreur enregistrement');
    }
  };

  const addCategorie = () => {
    if (!newCategorie.trim()) return;
    setRates(prev => [...prev, { categorie: newCategorie.trim(), montantPetitDejeuner: 0, montantDejeuner: 0, montantDiner: 0, montantHebergement: 0 }]);
    setNewCategorie('');
  };

  const removeRate = async (rate) => {
    if (rate.id) {
      try { await missionMealAPI.deleteRate(rate.id); } catch { toast.error('Erreur suppression'); return; }
    }
    setRates(prev => prev.filter(r => r !== rate));
  };

  const updateField = (idx, field, value) => {
    setRates(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const saveThresholds = async () => {
    try {
      await missionMealAPI.updateThresholds(thresholds);
      toast.success('Seuils horaires enregistrés');
    } catch {
      toast.error('Erreur enregistrement des seuils');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 9999 }}>
      <div className="animate-fadeIn" style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)',
        width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>Indemnités de mission</h2>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>Barème par catégorie + règles horaires (repas, prime de sécurité, hébergement, péage)</p>
          </div>
          <button onClick={onClose} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><Loader className="animate-spin" size={28} color="var(--brand)" /></div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, padding: 16, background: 'var(--surface-2)', borderRadius: 'var(--radius-3)' }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Coffee size={13} /> Petit-déjeuner si départ ≤
                    </label>
                    <input type="time" value={thresholds.heureLimitePetitDejeuner} onChange={e => setThresholds(t => ({ ...t, heureLimitePetitDejeuner: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Sun size={13} /> Déjeuner si la mission couvre
                    </label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="time" value={thresholds.heureDejeunerDebut} onChange={e => setThresholds(t => ({ ...t, heureDejeunerDebut: e.target.value }))} style={inputStyle} />
                      <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>→</span>
                      <input type="time" value={thresholds.heureDejeunerFin} onChange={e => setThresholds(t => ({ ...t, heureDejeunerFin: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Moon size={13} /> Dîner si la mission couvre
                    </label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="time" value={thresholds.heureDinerDebut} onChange={e => setThresholds(t => ({ ...t, heureDinerDebut: e.target.value }))} style={inputStyle} />
                      <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>→</span>
                      <input type="time" value={thresholds.heureLimiteDiner} onChange={e => setThresholds(t => ({ ...t, heureLimiteDiner: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <ShieldAlert size={13} /> Prime de sécurité (par personne) si retour ≥ {thresholds.heureLimiteDiner || '20:00'}
                    </label>
                    <input type="number" step="1" value={thresholds.montantPrimeSecurite} onChange={e => setThresholds(t => ({ ...t, montantPrimeSecurite: e.target.value }))} placeholder="Montant (FCFA)" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Car size={13} /> Péage chauffeur (auto si conducteur désigné)
                    </label>
                    <input type="number" step="1" value={thresholds.montantPeageChauffeur} onChange={e => setThresholds(t => ({ ...t, montantPeageChauffeur: e.target.value }))} placeholder="Montant (FCFA)" style={inputStyle} />
                  </div>
                  <button onClick={saveThresholds} style={{ height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Enregistrer
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 8 }}>
                Montants par catégorie <span style={{ fontWeight: 400, textTransform: 'none' }}>(hébergement versé au missionnaire et au chauffeur si la mission dure plus d'une journée)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr auto auto', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', padding: '0 2px' }}>
                  <span>Catégorie</span><span>P. déj.</span><span>Déjeuner</span><span>Dîner</span><span><BedDouble size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />Hébergt</span><span /><span />
                </div>
                {rates.map((r, idx) => (
                  <div key={r.id || `new-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr auto auto', gap: 8, alignItems: 'center' }}>
                    <input type="text" value={r.categorie} onChange={e => updateField(idx, 'categorie', e.target.value)} placeholder="Catégorie" style={inputStyle} />
                    <input type="number" step="0.01" value={r.montantPetitDejeuner} onChange={e => updateField(idx, 'montantPetitDejeuner', e.target.value)} placeholder="P. déj." style={inputStyle} />
                    <input type="number" step="0.01" value={r.montantDejeuner} onChange={e => updateField(idx, 'montantDejeuner', e.target.value)} placeholder="Déjeuner" style={inputStyle} />
                    <input type="number" step="0.01" value={r.montantDiner} onChange={e => updateField(idx, 'montantDiner', e.target.value)} placeholder="Dîner" style={inputStyle} />
                    <input type="number" step="0.01" value={r.montantHebergement} onChange={e => updateField(idx, 'montantHebergement', e.target.value)} placeholder="Hébergt" style={inputStyle} />
                    <button onClick={() => saveRate(r)} title="Enregistrer" style={{ height: 32, padding: '0 10px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--success-soft)', color: 'var(--success)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>OK</button>
                    <button onClick={() => removeRate(r)} title="Supprimer" style={{ height: 32, width: 32, borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--danger-soft)', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input type="text" value={newCategorie} onChange={e => setNewCategorie(e.target.value)} placeholder="Nouvelle catégorie..." style={inputStyle} onKeyDown={e => e.key === 'Enter' && addCategorie()} />
                <button onClick={addCategorie} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <Plus size={14} /> Ajouter
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', cursor: 'pointer' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
