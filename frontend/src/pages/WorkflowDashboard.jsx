// frontend/src/pages/WorkflowDashboard.jsx — Workflow : flux de validation et indicateurs
// Données calculées par le serveur sur les vrais circuits (GET /api/workflows/flow-stats),
// périmètre selon le rôle : toute l'organisation pour l'administration et la direction,
// sinon les documents accessibles à l'utilisateur.
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { workflowAPI } from '../services/api';
import ValidationFlowChart, { formatHours } from '../components/ValidationFlowChart';
import {
  AlertCircle, Loader, Download,
  ChevronDown, ArrowUpRight, ArrowDownRight, Minus, Check, X as XIcon,
} from 'lucide-react';

// ── Dropdown component ────────────────────────────────────────────────────────
function FilterDropdown({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = value === 'all' ? null : options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          height: 30, padding: '0 12px', borderRadius: 'var(--radius-2)',
          border: '1px solid var(--border)', background: open ? 'var(--surface-3)' : 'var(--surface-2)',
          color: selected ? 'var(--brand)' : 'var(--fg-muted)', fontSize: 12, cursor: 'pointer',
          fontWeight: selected ? 500 : 400,
        }}
      >
        {selected ? selected.label : label} <ChevronDown size={12} />
      </button>
      {open && (
        <div className="wf-filter-menu" style={{
          position: 'absolute', top: 'calc(100% + 4px)', zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)',
          minWidth: 180, overflow: 'hidden',
        }}>
          <div
            onClick={() => { onChange('all'); setOpen(false); }}
            style={{
              padding: '8px 12px', fontSize: 13, cursor: 'pointer',
              color: value === 'all' ? 'var(--brand)' : 'var(--fg)',
              background: value === 'all' ? 'var(--brand-soft)' : 'transparent',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {value === 'all' && <Check size={13} />} {label}
          </div>
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                color: value === opt.value ? 'var(--brand)' : 'var(--fg)',
                background: value === opt.value ? 'var(--brand-soft)' : 'transparent',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = 'transparent'; }}
            >
              {value === opt.value && <Check size={13} />}
              <span style={{ marginLeft: value === opt.value ? 0 : 21 }}>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, sublabel, value, delta, deltaLabel, urgent, urgentColor = 'var(--warning)' }) {
  const isUp   = delta > 0;
  const isDown = delta < 0;
  const DeltaIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const deltaColor = isUp ? 'var(--success)' : isDown ? 'var(--danger)' : 'var(--fg-muted)';

  return (
    <div className="ged-card stats-kpi">
      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 6, fontWeight: 500 }}>
        {label}
        {sublabel && <span style={{ color: 'var(--fg-subtle)', fontWeight: 400 }}> · {sublabel}</span>}
      </div>
      <div className="stats-kpi-value" style={{ fontWeight: 700, color: 'var(--fg)', letterSpacing: '-1px', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        {delta !== null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, color: deltaColor, fontWeight: 500 }}>
            <DeltaIcon size={13} />{deltaLabel}
          </span>
        )}
        {urgent && (
          <span style={{ fontSize: 11, color: urgentColor, fontWeight: 500 }}>{urgent}</span>
        )}
      </div>
    </div>
  );
}

// ── Goulot : temps moyen de traitement d'une étape, par type de document ─────
function BottleneckBar({ label, hours, maxHours, documents, rejected }) {
  const { t } = useTranslation();
  const pct   = Math.min(100, (hours / (maxHours || 1)) * 100);
  const color = hours >= 72 ? 'var(--danger)' : hours >= 24 ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--fg)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {t('{{d}} / étape', { d: formatHours(hours, t) })}
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .6s ease' }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 3 }}>
        {t('{{count}} document(s)', { count: documents })}{rejected ? ` · ${t('{{count}} rejeté(s)', { count: rejected })}` : ''}
      </div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 34 }) {
  const colors = ['#1B3A6B','#1A7A4A','#8A5C00','#C0392B','#1557A0','#5B89D6'];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: colors[idx], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize: size*0.38, fontWeight:700, flexShrink:0 }}>
      {initials}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function WorkflowDashboard() {
  const { t } = useTranslation();
  const [data, setData]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [period, setPeriod]               = useState('30');
  const [filterService, setFilterService] = useState('all');
  const [filterType, setFilterType]       = useState('all');

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const params = { period };
      if (filterType !== 'all') params.category = filterType;
      if (filterService !== 'all') params.serviceId = filterService;
      const res = await workflowAPI.getFlowStats(params);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('Erreur lors du chargement'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [period, filterService, filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  const periodLabel = period === 'all' ? t('tout l’historique') : t('{{count}} derniers jours', { count: period });
  const hasActiveFilter = filterService !== 'all' || filterType !== 'all';
  const serviceOptions = (data?.filters?.services || []).map(s => ({ value: s.id, label: s.name }));
  const typeOptions = (data?.filters?.categories || []).map(c => ({ value: c, label: c }));
  const totals = data?.totals;

  // Export CSV : un document par ligne, avec son issue (mêmes filtres que l'écran)
  const exportCSV = () => {
    const OUT = { approved: t('Validé'), rejected: t('Rejeté'), expired: t('Expiré'), in_progress: t('En cours') };
    const fmt = (v) => (v ? new Date(v).toLocaleDateString('fr-FR') : '');
    const rows = [[t('Document'), t('Type'), t('Service'), t('Issue'), t('Étape'), t('Nombre d’étapes'), t('Soumis le'), t('Clôturé le')]];
    (data?.documents || []).forEach(d => rows.push([d.title || '', d.category || '', d.service || '', OUT[d.outcome] || d.outcome, d.atStep, d.totalSteps, fmt(d.startedAt), fmt(d.closedAt)]));
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `flux-validation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading && !data) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <Loader size={24} color="var(--fg-muted)" className="animate-spin" />
    </div>
  );
  if (error && !data) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:8, color:'var(--danger)' }}>
      <AlertCircle size={18} /> {error}
      <button onClick={load} style={{ marginLeft:8, padding:'4px 10px', borderRadius:'var(--radius-2)', border:'1px solid var(--danger)', background:'transparent', color:'var(--danger)', fontSize:12, cursor:'pointer' }}>{t('Réessayer')}</button>
    </div>
  );

  const blocked = (totals?.rejected || 0) + (totals?.expired || 0);
  const maxBottleneck = Math.max(1, ...(data?.bottlenecks || []).map(b => b.avgStepHours || 0));

  return (
    <div className="stats-page animate-pageFade">

      {/* ── En-tête ───────────────────────────────────────────────────────── */}
      <div className="stats-header">
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'var(--fg)', margin:'0 0 4px', letterSpacing:'-0.3px' }}>{t('Workflow')}</h1>
          <div style={{ fontSize:13, color:'var(--fg-muted)' }}>
            {data?.scope === 'organisation'
              ? t('Circuits de validation de toute l’organisation')
              : t('Circuits de validation des documents auxquels vous avez accès')}
          </div>
        </div>
        <div className="stats-actions">
          <div style={{ position:'relative' }}>
            <select value={period} onChange={e => setPeriod(e.target.value)} aria-label={t('Période')}
              style={{ appearance:'none', height:34, padding:'0 32px 0 14px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--fg)', fontSize:13, cursor:'pointer', outline:'none' }}>
              {['7', '30', '90', '365'].map(d => <option key={d} value={d}>{t('{{count}} derniers jours', { count: d })}</option>)}
              <option value="all">{t('Tout l’historique')}</option>
            </select>
            <ChevronDown size={14} color="var(--fg-muted)" style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
          </div>
          <button onClick={exportCSV} disabled={!data?.documents?.length}
            style={{ display:'inline-flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--fg)', fontSize:13, cursor: data?.documents?.length ? 'pointer' : 'not-allowed', opacity: data?.documents?.length ? 1 : 0.5 }}>
            <Download size={14} /> {t('Exporter')}
          </button>
        </div>
      </div>

      {/* ── Indicateurs ───────────────────────────────────────────────────── */}
      <div className="stats-kpis">
        <StatCard label={t('Documents soumis')} sublabel={periodLabel} value={totals?.documents ?? 0} delta={null} deltaLabel={null} />
        <StatCard label={t('Validés')} value={totals?.approved ?? 0} delta={null} deltaLabel={null}
          urgent={totals?.approvalRate != null ? t('{{p}} % des documents', { p: Math.round(totals.approvalRate) }) : null} urgentColor="var(--success)" />
        <StatCard label={t('En cours')} value={totals?.in_progress ?? 0} delta={null} deltaLabel={null}
          urgent={blocked ? t('{{count}} rejeté(s) ou expiré(s)', { count: blocked }) : null} />
        <StatCard label={t('Durée moyenne d’un circuit')} value={formatHours(totals?.avgCycleHours, t)} delta={null} deltaLabel={null}
          urgent={t('de la soumission à la validation')} urgentColor="var(--fg-subtle)" />
      </div>

      {/* ── Flux de validation ────────────────────────────────────────────── */}
      <div className="ged-card stats-insight" style={{ marginBottom:20, opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
        <div className="stats-header" style={{ marginBottom:18, paddingTop:0 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--fg)', marginBottom:2 }}>{t('Flux de validation')}</div>
            <div style={{ fontSize:12, color:'var(--fg-muted)' }}>
              {t('Parcours des documents à travers les étapes de leur circuit, jusqu’à leur issue')}
            </div>
          </div>
          <div className="stats-actions">
            {hasActiveFilter && (
              <button
                onClick={() => { setFilterService('all'); setFilterType('all'); }}
                style={{ display:'inline-flex', alignItems:'center', gap:4, height:30, padding:'0 10px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--fg-muted)', fontSize:12, cursor:'pointer' }}
              >
                <XIcon size={12} /> {t('Réinitialiser')}
              </button>
            )}
            {serviceOptions.length > 0 && (
              <FilterDropdown label={t('Tous services')} options={serviceOptions} value={filterService} onChange={setFilterService} />
            )}
            <FilterDropdown label={t('Tous types')} options={typeOptions} value={filterType} onChange={setFilterType} />
          </div>
        </div>

        <ValidationFlowChart stages={data?.stages || []} totals={totals} />
      </div>

      {/* ── Bas de page ───────────────────────────────────────────────────── */}
      <div className="stats-2col" style={{ marginBottom:0 }}>

        {/* Goulots d'étranglement */}
        <div className="ged-card stats-insight">
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--fg)' }}>{t("Goulots d'étranglement")}</div>
            <div style={{ fontSize:12, color:'var(--fg-muted)', marginTop:2 }}>{t('Temps moyen de traitement d’une étape, par type de document')}</div>
          </div>
          {data?.bottlenecks?.length ? (
            data.bottlenecks.map(b => (
              <BottleneckBar key={b.category} label={b.category} hours={b.avgStepHours} maxHours={maxBottleneck} documents={b.documents} rejected={b.rejected} />
            ))
          ) : (
            <div style={{ textAlign:'center', color:'var(--fg-muted)', fontSize:13, padding:'24px 0' }}>{t('Aucune donnée sur la période')}</div>
          )}
        </div>

        {/* Valideurs les plus sollicités */}
        <div className="ged-card stats-insight">
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--fg)' }}>{t('Valideurs les plus sollicités')}</div>
            <div style={{ fontSize:12, color:'var(--fg-muted)', marginTop:2 }}>{t('Décisions prises (validations et rejets) · délai moyen de réponse')}</div>
          </div>
          {!data?.topValidators?.length ? (
            <div style={{ textAlign:'center', color:'var(--fg-muted)', fontSize:13, padding:'24px 0' }}>{t('Aucun valideur sur la période')}</div>
          ) : data.topValidators.map((v, i, arr) => (
            <div key={v.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i < arr.length-1 ? '1px solid var(--border)' : 'none' }}>
              <Avatar name={v.name} size={34} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.name}</div>
                <div style={{ fontSize:11.5, color:'var(--fg-muted)' }}>{t('Répond en {{d}} en moyenne', { d: formatHours(v.avgHours, t) })}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <span style={{ fontSize:20, fontWeight:700, color:'var(--fg)', letterSpacing:'-0.5px' }}>{v.decisions}</span>
                <span style={{ fontSize:12, color:'var(--fg-muted)', marginLeft:3 }}>{t('décisions')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
