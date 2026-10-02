// frontend/src/pages/SageFacturesPHP.jsx
// Finances › Factures PHP (Sage) — tableau de bord des factures PHP arrêtées dans
// Sage (lecture directe), avec leur état dans la GED (import, circuit de
// signature), le contrôle du BPC, la liasse PDF de chaque facture et le relevé
// journalier à faire signer par le DG. Données : /api/sage-bl/factures.
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Loader, RefreshCw, Download, Search, FileText, AlertCircle, CheckCircle, Clock, XCircle, FileSignature, Eye, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { sageBlAPI, sageFactureAPI } from '../services/phpService';
import { useAuth } from '../contexts/AuthContext';

const fmtMoney = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
const fmtShort = (n) => { const v = Number(n || 0); return v >= 1e6 ? `${(v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M FCFA` : fmtMoney(v); };
const fmtDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR') : '—');
const iso = (d) => d.toISOString().slice(0, 10);
const PAGE_SIZE = 50;

const PERIODS = {
  today: () => { const d = iso(new Date()); return [d, d]; },
  week: () => { const t = new Date(); const f = new Date(t); f.setDate(t.getDate() - 6); return [iso(f), iso(t)]; },
  month: () => { const t = new Date(); return [iso(new Date(t.getFullYear(), t.getMonth(), 1, 12)), iso(t)]; },
  lastMonth: () => { const t = new Date(); return [iso(new Date(t.getFullYear(), t.getMonth() - 1, 1, 12)), iso(new Date(t.getFullYear(), t.getMonth(), 0, 12))]; },
};

const GED = {
  none:        { label: 'Non importée', color: 'var(--fg-muted)', bg: 'var(--surface-2)', icon: FileText },
  imported:    { label: 'Importée', color: 'var(--brand)', bg: 'var(--brand-soft)', icon: FileText },
  in_progress: { label: 'En signature', color: 'var(--warning)', bg: 'var(--warning-soft)', icon: Clock },
  approved:    { label: 'Signée', color: 'var(--success)', bg: 'var(--success-soft)', icon: CheckCircle },
  rejected:    { label: 'Rejetée', color: 'var(--danger)', bg: 'var(--danger-soft)', icon: XCircle },
  expired:     { label: 'Expirée', color: 'var(--danger)', bg: 'var(--danger-soft)', icon: XCircle },
};

const openPdf = async (fn, t) => {
  try {
    const res = await fn();
    window.open(URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank');
  } catch (err) {
    let msg = t('PDF indisponible.');
    try { msg = JSON.parse(await err.response.data.text()).message || msg; } catch { /* non JSON */ }
    toast.error(msg);
  }
};

function Kpi({ label, value, sub, color = 'var(--fg)', active, onClick, icon: Icon }) {
  return (
    <button type="button" onClick={onClick} className="ged-card" style={{ textAlign: 'left', padding: '14px 16px', minWidth: 0, cursor: onClick ? 'pointer' : 'default', border: active ? '1.5px solid var(--brand)' : undefined, background: 'var(--surface)', font: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)', fontWeight: 500, marginBottom: 6 }}>{Icon && <Icon size={14} style={{ color }} />}{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>{sub}</div>}
    </button>
  );
}

export default function SageFacturesPHP() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);
  const [period, setPeriod] = useState('month');
  const [[from, to], setRange] = useState(PERIODS.month());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [sage, setSage] = useState('all');
  const [bpc, setBpc] = useState('all');
  const [ged, setGed] = useState('all');
  const [page, setPage] = useState(1);
  const [releveDate, setReleveDate] = useState(iso(new Date()));
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { const r = await sageBlAPI.factures(from, to); setData(r.data); }
    catch (e) { setError(e.response?.data?.message || t('Impossible de lire Sage.')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const choosePeriod = (p) => { setPeriod(p); if (PERIODS[p]) setRange(PERIODS[p]()); };
  const factures = data?.factures || [];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return factures.filter(f =>
      (type === 'all' || f.patient.type === type)
      && (sage === 'all' || (sage === 'posted') === f.comptabilisee)
      && (bpc === 'all' || (bpc === 'out') === f.horsBpc)
      && (ged === 'all' || (f.ged?.state || 'none') === ged || (ged === 'rejected' && f.ged?.state === 'expired'))
      && (!needle || [f.piece, f.patient.nom, f.patient.compteTiers, f.patient.matricule, f.patient.secteur].some(v => (v || '').toLowerCase().includes(needle))));
  }, [factures, q, type, sage, bpc, ged]);
  useEffect(() => setPage(1), [q, type, sage, bpc, ged, from, to]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const k = data?.kpis;

  const exportCsv = () => {
    const rows = [[t('Facture'), t('Date'), t('Patient'), t('Compte tiers'), t('Type'), t('Matricule'), t('Secteur'), t('BL'), t('Premier BL'), t('Dernier BL'), t('Écart (j)'), t('État Sage'), t('État GED'), t('Montant TTC')]];
    filtered.forEach(f => rows.push([f.piece, fmtDate(f.date), f.patient.nom, f.patient.compteTiers, f.patient.type || '', f.patient.matricule || '', f.patient.secteur || '', f.nbBl, fmtDate(f.premierBl), fmtDate(f.dernierBl), f.ecartJours, f.comptabilisee ? t('Comptabilisée') : t('Non comptabilisée'), t(GED[f.ged?.state || 'none'].label), f.total]));
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `factures-php-${from}-${to}.csv`;
    a.click();
  };

  const exportPaiement = async () => {
    setBusy('paiement');
    try {
      const res = await sageFactureAPI.exportPaiement(from, to);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
      a.download = `fichier_paiement_php_${from}_${to}.csv`;
      a.click();
    } catch (e) { toast.error(e.response?.data?.message || t('Erreur lors de l’export.')); }
    finally { setBusy(null); }
  };

  const createReleve = async (force = false) => {
    setBusy('releve');
    try {
      const r = await sageBlAPI.createReleve(releveDate, force);
      toast.success(r.data.message, { duration: 6000 });
    } catch (e) {
      const d = e.response?.data;
      if (e.response?.status === 409 && d?.documentId) {
        if (window.confirm(t('Un relevé existe déjà pour cette journée. En créer un nouveau ?'))) return createReleve(true);
      } else toast.error(d?.message || t('Erreur'));
    } finally { setBusy(null); }
  };

  const sel = { height: 34, padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, maxWidth: '100%' };
  const btn = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' };

  return (
    <div className="stats-page animate-pageFade">
      <div className="stats-header">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 4px' }}>{t('Factures PHP (Sage)')}</h1>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Factures des employés et familles PHP arrêtées dans Sage, leur liasse et leur circuit de signature. Lecture directe de Sage.')}</div>
        </div>
        <div className="stats-actions" style={{ flexWrap: 'wrap' }}>
          {isAdmin && <button style={btn} onClick={exportPaiement} disabled={busy === 'paiement'}>{busy === 'paiement' ? <Loader size={14} className="animate-spin" /> : <Download size={14} />} {t('Fichier de paiement')}</button>}
          <button style={btn} onClick={exportCsv} disabled={!filtered.length}><Download size={14} /> {t('Exporter')}</button>
          <button style={btn} onClick={load} disabled={loading}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t('Actualiser')}</button>
        </div>
      </div>

      {/* Période */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        {[['today', t('Aujourd’hui')], ['week', t('7 derniers jours')], ['month', t('Ce mois')], ['lastMonth', t('Mois dernier')]].map(([id, label]) => (
          <button key={id} onClick={() => choosePeriod(id)} style={{ ...btn, height: 32, background: period === id ? 'var(--brand-soft)' : 'var(--surface)', color: period === id ? 'var(--brand)' : 'var(--fg)', borderColor: period === id ? 'var(--brand)' : 'var(--border)' }}>{label}</button>
        ))}
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>
          <input type="date" value={from} max={to} onChange={e => { setPeriod('custom'); setRange([e.target.value, to]); }} style={sel} />
          {t('au')}
          <input type="date" value={to} min={from} onChange={e => { setPeriod('custom'); setRange([from, e.target.value]); }} style={sel} />
        </span>
      </div>

      {error && <div className="ged-card" style={{ padding: 16, marginBottom: 16, color: 'var(--danger)', display: 'flex', gap: 8, alignItems: 'center' }}><AlertCircle size={16} /> {error}</div>}
      {!data && loading && <div style={{ padding: 60, textAlign: 'center' }}><Loader size={24} className="animate-spin" color="var(--fg-muted)" /></div>}

      {k && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 14, opacity: loading ? 0.6 : 1 }}>
            <Kpi icon={FileText} label={t('Factures')} value={k.factures.toLocaleString('fr-FR')} sub={`${fmtShort(k.montant)} · ${t('{{e}} employés, {{f}} familles', { e: k.employes.n, f: k.familles.n })}`} />
            <Kpi icon={Clock} label={t('Non comptabilisées')} value={k.nonComptabilisees} sub={t('dans Sage')} color="var(--warning)" active={sage === 'draft'} onClick={() => setSage(sage === 'draft' ? 'all' : 'draft')} />
            <Kpi icon={AlertCircle} label={t('BL hors période BPC')} value={k.horsBpc} sub={t('BL étalés sur plus de 3 jours')} color={k.horsBpc ? 'var(--danger)' : 'var(--success)'} active={bpc === 'out'} onClick={() => setBpc(bpc === 'out' ? 'all' : 'out')} />
            <Kpi icon={FileSignature} label={t('En signature (GED)')} value={k.ged.enCircuit} sub={t('{{v}} signées · {{n}} non importées', { v: k.ged.validees, n: k.ged.nonImportees })} color="var(--brand)" active={ged === 'in_progress'} onClick={() => setGed(ged === 'in_progress' ? 'all' : 'in_progress')} />
          </div>

          {/* Relevé journalier */}
          <div className="ged-card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <FileSignature size={18} style={{ color: 'var(--brand)' }} />
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 650 }}>{t('Relevé journalier des factures arrêtées')}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('Liste des factures PHP du jour, à faire signer par le DG en fin de journée.')}</div>
            </div>
            <input type="date" value={releveDate} max={iso(new Date())} onChange={e => setReleveDate(e.target.value)} style={sel} />
            <button style={btn} onClick={() => openPdf(() => sageBlAPI.relevePdf(releveDate), t)}><Eye size={14} /> {t('Aperçu')}</button>
            <button style={{ ...btn, background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' }} onClick={() => createReleve(false)} disabled={busy === 'releve'}>
              {busy === 'releve' ? <Loader size={14} className="animate-spin" /> : <Send size={14} />} {t('Créer et envoyer en signature')}
            </button>
          </div>

          {/* Filtres */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Facture, patient, compte, matricule, secteur…')} style={{ ...sel, width: '100%', paddingLeft: 30, boxSizing: 'border-box' }} />
            </div>
            <select value={type} onChange={e => setType(e.target.value)} style={sel}>
              <option value="all">{t('Employés et familles')}</option>
              <option value="Employé PHP">{t('Employé PHP')}</option>
              <option value="Famille PHP">{t('Famille PHP')}</option>
            </select>
            <select value={sage} onChange={e => setSage(e.target.value)} style={sel}>
              <option value="all">{t('Tous les états Sage')}</option>
              <option value="draft">{t('Non comptabilisée')}</option>
              <option value="posted">{t('Comptabilisée')}</option>
            </select>
            <select value={bpc} onChange={e => setBpc(e.target.value)} style={sel}>
              <option value="all">{t('Contrôle BPC : tous')}</option>
              <option value="out">{t('BL hors période')}</option>
              <option value="ok">{t('BPC respecté')}</option>
            </select>
            <select value={ged} onChange={e => setGed(e.target.value)} style={sel}>
              <option value="all">{t('Tous les états GED')}</option>
              {['none', 'in_progress', 'approved', 'rejected'].map(s => <option key={s} value={s}>{t(GED[s].label)}</option>)}
            </select>
          </div>

          <div className="ged-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', fontSize: 12.5, color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)' }}>
              {t('{{n}} facture(s) · {{m}}', { n: filtered.length.toLocaleString('fr-FR'), m: fmtMoney(filtered.reduce((s, f) => s + f.total, 0)) })}
            </div>
            {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(f => {
              const g = GED[f.ged?.state || 'none'];
              const GIcon = g.icon;
              return (
                <div key={f.piece} className="fphp-row">
                  <span className="fphp-piece">
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{f.piece}</strong>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--fg-subtle)' }}>{fmtDate(f.date)} · <span style={{ color: f.comptabilisee ? 'var(--fg-subtle)' : 'var(--warning)' }}>{f.comptabilisee ? t('Comptabilisée') : t('Non comptabilisée')}</span></span>
                  </span>
                  <span className="fphp-patient">
                    <span style={{ fontWeight: 600 }}>{f.patient.nom}</span>{' '}
                    {f.patient.type && <span style={{ padding: '1px 7px', borderRadius: 999, fontSize: 11, background: f.patient.type === 'Employé PHP' ? 'var(--brand-soft)' : 'var(--success-soft)', color: f.patient.type === 'Employé PHP' ? 'var(--brand)' : 'var(--success)' }}>{t(f.patient.type)}</span>}
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--fg-subtle)' }}>{f.patient.compteTiers}{f.patient.matricule ? ` · ${t('Mat.')} ${f.patient.matricule}` : ''}{f.patient.secteur ? ` · ${f.patient.secteur}` : ''}</span>
                  </span>
                  <span className="fphp-bl" style={{ color: f.horsBpc ? 'var(--danger)' : 'var(--fg-muted)' }}>
                    {t('{{n}} BL', { n: f.nbBl })}
                    <span style={{ display: 'block', fontSize: 11.5 }}>{f.premierBl ? `${fmtDate(f.premierBl)} → ${fmtDate(f.dernierBl)}` : '—'}{f.horsBpc ? ` · ${t('{{n}} j', { n: f.ecartJours })}` : ''}</span>
                  </span>
                  <span className="fphp-ged">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: g.color, background: g.bg }}><GIcon size={12} /> {t(g.label)}</span>
                    {f.ged?.state === 'in_progress' && f.ged.chez && <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-subtle)' }}>{t('Étape {{s}}/{{n}} · {{who}}', { s: f.ged.step, n: f.ged.steps, who: f.ged.chez })}</span>}
                  </span>
                  <span className="fphp-amount">{fmtMoney(f.total)}</span>
                  <span className="fphp-actions">
                    <button style={{ ...btn, height: 30, padding: '0 9px' }} title={t('Liasse PDF')} onClick={() => openPdf(() => sageBlAPI.facturePdf(f.piece), t)}><FileText size={14} /> {t('Liasse')}</button>
                    {f.ged?.documentId && <Link to={`/documents/${f.ged.documentId}`} style={{ ...btn, height: 30, padding: '0 9px', textDecoration: 'none' }} title={t('Ouvrir dans la GED')}><Eye size={14} /></Link>}
                  </span>
                </div>
              );
            })}
            {!filtered.length && !loading && <div style={{ padding: 30, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>{t('Aucune facture ne correspond.')}</div>}
            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12.5, color: 'var(--fg-muted)' }}>
                <span>{t('Page {{page}} sur {{pages}}', { page, pages })}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button style={btn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('Précédent')}</button>
                  <button style={btn} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>{t('Suivant')}</button>
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
