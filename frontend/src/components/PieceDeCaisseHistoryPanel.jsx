// frontend/src/components/PieceDeCaisseHistoryPanel.jsx
// Historique des pièces de caisse payées par la caissière courante, avec filtres
// de période rapides (semaine/mois/trimestre) — pour son rapport de fin de journée.
import React, { useState, useEffect, useCallback } from 'react';
import { documentsAPI } from '../services/api';
import { History, Loader } from 'lucide-react';

const PERIODS = [
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'quarter', label: 'Ce trimestre' },
  { key: 'all', label: 'Tout' },
];

function periodBounds(key) {
  const now = new Date();
  if (key === 'all') return {};
  const from = new Date(now);
  if (key === 'week') {
    const day = (now.getDay() + 6) % 7; // lundi = 0
    from.setDate(now.getDate() - day);
  } else if (key === 'month') {
    from.setDate(1);
  } else if (key === 'quarter') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    from.setMonth(quarterStartMonth, 1);
  }
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

export default function PieceDeCaisseHistoryPanel() {
  const [period, setPeriod] = useState('week');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    documentsAPI.getPieceDeCaisseHistory(periodBounds(period))
      .then(res => { setRows(res.data.data || []); setTotal(res.data.total || 0); })
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="rounded-lg shadow-lg p-6 mt-6" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-2)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <History className="w-5 h-5" /> Historique des pièces de caisse
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '6px 12px', borderRadius: 'var(--radius-2)', fontSize: 12, fontWeight: 500,
                border: `1px solid ${period === p.key ? 'var(--brand)' : 'var(--border)'}`,
                background: period === p.key ? 'var(--brand-soft)' : 'var(--surface)',
                color: period === p.key ? 'var(--brand)' : 'var(--fg-muted)', cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <Loader className="animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center', padding: '24px 0' }}>
          Aucune pièce de caisse payée sur cette période.
        </p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--fg-muted)' }}>
                  <th style={{ padding: '8px 6px' }}>Payée le</th>
                  <th style={{ padding: '8px 6px' }}>Bénéficiaire</th>
                  <th style={{ padding: '8px 6px' }}>Concerne</th>
                  <th style={{ padding: '8px 6px' }}>Origine</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 6px', color: 'var(--fg-muted)' }}>{r.payeAt ? new Date(r.payeAt).toLocaleDateString('fr-FR') : '—'}</td>
                    <td style={{ padding: '8px 6px', color: 'var(--fg)' }}>{r.nom || '—'}</td>
                    <td style={{ padding: '8px 6px', color: 'var(--fg-muted)' }}>{r.concerne || r.title}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: r.origine === 'OM' ? 'var(--brand-soft)' : 'var(--surface-2)', color: r.origine === 'OM' ? 'var(--brand)' : 'var(--fg-muted)' }}>
                        {r.origine === 'OM' ? 'Ordre de mission' : 'Simple'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--fg)' }}>{r.montant.toLocaleString('fr-FR')} FCFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>
            <span>{rows.length} pièce(s) traitée(s)</span>
            <span>{total.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </>
      )}
    </div>
  );
}
