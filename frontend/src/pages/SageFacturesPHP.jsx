// frontend/src/pages/SageFacturesPHP.jsx — Supervision des factures patient
// PHP importées automatiquement depuis Sage (voir backend utils/sageFactureSync.js).
// Ne gère PAS l'approbation (elle se fait dans "Mes tâches", chaque facture
// crée un Workflow standard) — juste une vue d'ensemble toutes étapes
// confondues + l'export du fichier de paiement pour la CCG.
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, ArrowLeft, Search, Download, Loader, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { sageFactureAPI } from '../services/phpService';

const fmtMontant = (v) => {
  if (v == null || v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('fr-FR').replace(/ /g, ' ') : v;
};

const STATUS_BADGE = {
  approved: { label: 'Validée', color: '#16a34a', bg: '#dcfce7', Icon: CheckCircle2 },
  rejected: { label: 'Rejetée', color: '#dc2626', bg: '#fee2e2', Icon: XCircle },
  en_cours: { label: 'En cours', color: '#d97706', bg: '#fef3c7', Icon: Clock },
};

export default function SageFacturesPHP() {
  const { user } = useAuth();
  const canExport = ['admin', 'superadmin'].includes(user?.role);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patient, setPatient] = useState('');

  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sageFactureAPI.list(patient ? { patient } : {});
      setItems(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement.');
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await sageFactureAPI.exportPaiement(from, to);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fichier_paiement_php_${from}_${to}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'export.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link to="/" style={{ color: 'var(--fg-muted)' }}><ArrowLeft size={20} /></Link>
        <FileSpreadsheet size={22} />
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Factures PHP (Sage)</h1>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
          <input
            value={patient}
            onChange={e => setPatient(e.target.value)}
            placeholder="Rechercher un patient..."
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, border: '1px solid var(--border)' }}
          />
        </div>

        {canExport && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
            <span style={{ color: 'var(--fg-muted)' }}>à</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#fff', cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.7 : 1 }}
            >
              {exporting ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
              Fichier de paiement
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 8, background: '#fee2e2', color: '#dc2626', marginBottom: 16 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
          <Loader size={24} color="var(--fg-muted)" className="animate-spin" />
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>Chargement…</p>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--fg-muted)' }}>Aucune facture PHP importée pour l'instant.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: 8 }}>Pièce Sage</th>
                <th style={{ padding: 8 }}>Patient</th>
                <th style={{ padding: 8 }}>Montant TTC</th>
                <th style={{ padding: 8 }}>Étape en cours</th>
                <th style={{ padding: 8 }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const badge = STATUS_BADGE[it.circuitStatus] || STATUS_BADGE.en_cours;
                const BadgeIcon = badge.Icon;
                return (
                  <tr key={it.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>{it.sageDocPiece}</td>
                    <td style={{ padding: 8 }}>{it.patientNom || '—'}</td>
                    <td style={{ padding: 8 }}>{fmtMontant(it.montantTTC)} FCFA</td>
                    <td style={{ padding: 8 }}>{it.etapeEnCours?.label || '—'}</td>
                    <td style={{ padding: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.color, fontSize: 12, fontWeight: 600 }}>
                        <BadgeIcon size={12} /> {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
