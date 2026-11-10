// frontend/src/pages/CaissePharmacie.jsx
// Finances › Caisse pharmacie (demande du 10/11/2026) : l'état de la caisse de
// vente de la pharmacie, tiré directement de Sage (lecture seule) — le même
// « Relevé de factures » que Sage (payeur CLIENT COMPTANT PHARMACIE) — puis
// envoyé en signature : Caissière → Comptable. Plus besoin d'imprimer en PDF
// depuis Sage puis de le déposer dans la GED.
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader, Pill, FileText, Send, AlertCircle, RefreshCw } from 'lucide-react';
import { caissePharmacieAPI } from '../services/phpService';

const today = () => new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 10);
const fmtNum = (n) => Number(n || 0).toLocaleString('fr-FR');
const fmtDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR') : '—');

export default function CaissePharmacie() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selections, setSelections] = useState({});
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const r = await caissePharmacieAPI.get(from, to); setData(r.data); }
    catch (e) { setError(e.response?.data?.message || t('Impossible de lire Sage.')); setData(null); }
    finally { setLoading(false); }
  }, [from, to, t]);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = async () => {
    const win = window.open('', '_blank');
    try {
      const r = await caissePharmacieAPI.pdf(from, to);
      const url = URL.createObjectURL(r.data);
      if (win) win.location.href = url; else window.location.href = url;
    } catch (e) { win?.close(); toast.error(t('Aperçu impossible.')); }
  };

  const send = async (force = false) => {
    setSending(true);
    try {
      const r = await caissePharmacieAPI.create({ from, to, selections, force });
      toast.success(r.data.message, { duration: 6000 });
      navigate(`/documents/${r.data.documentId}`);
    } catch (e) {
      const res = e.response?.data;
      if (e.response?.status === 409 && res?.documentId) {
        toast((tt) => (
          <span>
            {t('Un état de caisse existe déjà pour cette période.')}{' '}
            <button type="button" onClick={() => { toast.dismiss(tt.id); navigate(`/documents/${res.documentId}`); }} style={{ border: 'none', background: 'none', color: 'var(--brand)', fontWeight: 700, cursor: 'pointer' }}>{t('Ouvrir')}</button>
            <button type="button" onClick={() => { toast.dismiss(tt.id); send(true); }} style={{ border: 'none', background: 'none', color: 'var(--danger)', fontWeight: 700, cursor: 'pointer' }}>{t('En créer un nouveau')}</button>
          </span>
        ), { duration: 10000 });
      } else toast.error(res?.message || t('Erreur serveur.'));
    } finally { setSending(false); }
  };

  const input = { height: 36, padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 14 };
  const btn = (primary, disabled) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px', borderRadius: 'var(--radius-2)', fontSize: 13.5, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, border: primary ? 'none' : '1px solid var(--border)', background: primary ? 'var(--brand)' : 'var(--surface)', color: primary ? '#fff' : 'var(--fg)' });
  const steps = data?.circuit?.steps || [];
  const missingChoice = steps.some((s) => s.needsSelection && !selections[s.key]);
  const canSend = data && data.lignes.length > 0 && !data.circuit?.error && !missingChoice && !sending;

  return (
    <div className="animate-pageFade" style={{ maxWidth: 900, margin: '0 auto', padding: '8px 4px 40px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}><Pill size={20} /> {t('État de la caisse pharmacie')}</h1>
      <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
        {t('Le relevé des factures de la caisse de vente (client comptant pharmacie), lu directement dans Sage, puis envoyé en signature à la caissière et à la comptable.')}
      </div>

      <div className="ged-card" style={{ padding: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>{t('Du')}
          <input type="date" value={from} max={today()} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }} style={input} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>{t('Au')}
          <input type="date" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)} style={input} />
        </label>
        <button type="button" onClick={load} disabled={loading} style={btn(true, loading)}>
          {loading ? <Loader size={15} className="animate-spin" /> : <RefreshCw size={15} />} {t('Afficher')}
        </button>
        {data && <button type="button" onClick={preview} style={btn(false)}><FileText size={15} /> {t('Aperçu PDF')}</button>}
      </div>

      {error && <div className="ged-card" style={{ padding: 14, color: 'var(--danger)', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}><AlertCircle size={16} /> {error}</div>}

      {data && (
        <>
          <div className="ged-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <strong style={{ fontSize: 15 }}>{data.payeurNom}</strong>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('Payeur {{p}}', { p: data.payeur })} · {data.from === data.to ? fmtDate(data.from) : `${fmtDate(data.from)} → ${fmtDate(data.to)}`}</span>
              <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 800 }}>{fmtNum(data.totaux.net)} FCFA</span>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('{{n}} facture(s)', { n: data.totaux.count })}</span>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)', textAlign: 'left', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '7px 10px' }}>{t('Date')}</th><th style={{ padding: '7px 10px' }}>{t('N° facture')}</th><th style={{ padding: '7px 10px' }}>{t('Client')}</th>
                    <th style={{ padding: '7px 10px', textAlign: 'right' }}>{t('Total HT')}</th><th style={{ padding: '7px 10px', textAlign: 'right' }}>{t('Acomptes')}</th><th style={{ padding: '7px 10px', textAlign: 'right' }}>{t('Net à payer')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lignes.map((l) => (
                    <tr key={l.piece} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{fmtDate(l.date)}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{l.piece}</td>
                      <td style={{ padding: '6px 10px' }}>{l.client} <span style={{ color: 'var(--fg-subtle)' }}>{l.intitule}</span></td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmtNum(l.totalHT)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmtNum(l.acomptes)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>{fmtNum(l.net)}</td>
                    </tr>
                  ))}
                  {!data.lignes.length && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)' }}>{t('Aucune facture de la caisse pharmacie sur cette période.')}</td></tr>}
                </tbody>
                {data.lignes.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 800, background: 'var(--surface-2)' }}>
                      <td colSpan={3} style={{ padding: '8px 10px' }}>{t('TOTAL GÉNÉRAL')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmtNum(data.totaux.totalHT)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmtNum(data.totaux.acomptes)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmtNum(data.totaux.net)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="ged-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <strong style={{ fontSize: 14 }}>{t('Envoyer en signature')}</strong>
            {data.circuit?.error ? <div style={{ color: 'var(--danger)', fontSize: 13 }}>{data.circuit.error}</div> : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', fontSize: 13 }}>
                {steps.map((s, i) => (
                  <React.Fragment key={s.key}>
                    {i > 0 && <span style={{ color: 'var(--fg-subtle)' }}>→</span>}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--fg-muted)' }}>{t(s.label)} :</span>
                      {s.holders.length === 1 ? <strong>{s.holders[0].name}</strong> : (
                        <select value={selections[s.key] || ''} onChange={(e) => setSelections((p) => ({ ...p, [s.key]: e.target.value }))} style={{ ...input, height: 32, fontSize: 13 }}>
                          <option value="">{t('— choisir —')}</option>
                          {s.holders.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                      )}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
            {data.deja?.length > 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--warning)' }}>
                {t('Déjà envoyé pour cette période :')} {data.deja.map((d) => <a key={d.id} href={`/documents/${d.id}`} style={{ color: 'var(--brand)', marginRight: 8 }}>{new Date(d.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</a>)}
              </div>
            )}
            <div>
              <button type="button" onClick={() => send(false)} disabled={!canSend} style={btn(true, !canSend)}>
                {sending ? <Loader size={15} className="animate-spin" /> : <Send size={15} />} {t('Envoyer l’état de caisse en signature')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
