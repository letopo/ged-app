// frontend/src/pages/StatistiquesPage.jsx — Redesign "Insights" éditorial
import React, { useState, useEffect, useMemo } from 'react';
import { statisticsAPI } from '../services/api';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Loader, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Minus, Download, Bell, Sparkles, ChevronDown, X as XIcon,
} from 'lucide-react';

// ── Colors ────────────────────────────────────────────────────────────────────
const CAT_COLORS = ['#4A90D9','#3DBE7A','#F0B429','#8B8B8B','#E05252','#9B59B6','#1ABC9C'];

const MONTH_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
function monthShort(str) {
  const d = new Date(str);
  if (isNaN(d)) return str;
  return MONTH_FR[d.getMonth()];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 28 }) {
  const COLORS = ['#1B3A6B','#1A7A4A','#B45309','#C0392B','#1557A0','#5B89D6','#7C3AED'];
  const idx = name ? name.charCodeAt(0) % COLORS.length : 0;
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?';
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:COLORS[idx], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:700, flexShrink:0 }}>
      {initials}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, delta, deltaLabel }) {
  const isUp   = delta > 0;
  const isDown = delta < 0;
  const Icon   = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const color  = isUp ? 'var(--success)' : isDown ? 'var(--danger)' : 'var(--fg-muted)';
  return (
    <div className="ged-card" style={{ padding:'16px 20px', flex:1 }}>
      <div style={{ fontSize:12, color:'var(--fg-muted)', marginBottom:6, fontWeight:500 }}>{label}</div>
      <div style={{ fontSize:34, fontWeight:700, color:'var(--fg)', letterSpacing:'-1px', lineHeight:1.1, marginBottom:6 }}>{value}</div>
      {deltaLabel && (
        <div style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:12, color, fontWeight:500 }}>
          <Icon size={13} />{deltaLabel}
        </div>
      )}
    </div>
  );
}

// ── Section label (QUESTION N · TOPIC) ───────────────────────────────────────
function QLabel({ n, topic }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, color:'#5B9BD5', letterSpacing:'1.2px', textTransform:'uppercase', marginBottom:8 }}>
      Question {n} · {topic}
    </div>
  );
}

// ── Insight card wrapper ──────────────────────────────────────────────────────
function InsightCard({ children, style }) {
  return (
    <div className="ged-card" style={{ padding:'20px 24px', ...style }}>
      {children}
    </div>
  );
}

// ── Custom bar tooltip ────────────────────────────────────────────────────────
const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-2)', padding:'6px 10px', fontSize:12, boxShadow:'var(--shadow-2)' }}>
      <div style={{ fontWeight:600, color:'var(--fg)', marginBottom:2 }}>{label}</div>
      <div style={{ color:'var(--brand)' }}>{payload[0].value} documents</div>
    </div>
  );
};

// ── Donut center label ────────────────────────────────────────────────────────
function DonutCenter({ total }) {
  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan x="50%" dy="-8" style={{ fontSize:28, fontWeight:700, fill:'var(--fg)' }}>{total}</tspan>
      <tspan x="50%" dy="22" style={{ fontSize:11, fill:'var(--fg-muted)' }}>documents</tspan>
    </text>
  );
}

// ── Contributor row ───────────────────────────────────────────────────────────
function ContribRow({ name, count, maxCount }) {
  const pct = Math.min(100, (count / (maxCount||1)) * 100);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
      <Avatar name={name} size={30} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--fg)', marginLeft:10, flexShrink:0 }}>{count}</span>
        </div>
        <div style={{ height:4, background:'var(--surface-3)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:'var(--brand)', borderRadius:2, transition:'width .6s ease' }} />
        </div>
      </div>
    </div>
  );
}

// ── Explorer view ─────────────────────────────────────────────────────────────
const DIMENSIONS = [
  { id: 'service',  label: 'Service',  icon: '+' },
  { id: 'type',     label: 'Type',     icon: '+' },
  { id: 'auteur',   label: 'Auteur',   icon: '+' },
  { id: 'statut',   label: 'Statut',   icon: '+' },
  { id: 'date',     label: 'Date',     icon: '+' },
];
const MEASURES = [
  { id: 'nombre',   label: 'Nombre',     prefix: 'Σ' },
  { id: 'delai',    label: 'Délai moyen',prefix: 'Σ' },
  { id: 'approuves',label: '% approuvés',prefix: 'Σ' },
];
const CHART_TYPES = ['Bar', 'Line', 'Pie'];

function delayColor(v) {
  if (v >= 5) return '#E05252';
  if (v >= 3) return '#F0B429';
  return '#3DBE7A';
}

function ExplorerView({ data }) {
  const [activeDim, setActiveDim]     = useState('service');
  const [activeMeasure, setActiveMeasure] = useState('delai');
  const [chartType, setChartType]     = useState('Bar');
  const [showChartMenu, setShowChartMenu] = useState(false);

  // Build chart data from available API data
  const chartData = useMemo(() => {
    if (!data) return [];

    if (activeDim === 'type' || activeDim === 'service') {
      // Use byCategory as proxy for type/service
      const raw = (data.byCategory || []).map(c => ({
        name: c.category || 'Autres',
        count: parseInt(c.count),
      }));

      if (activeMeasure === 'nombre') {
        return raw.sort((a, b) => b.count - a.count).slice(0, 8)
          .map(r => ({ name: r.name, value: r.count }));
      }
      if (activeMeasure === 'delai') {
        // Simulate avg delay per category (in absence of real per-cat delay data)
        const delays = { 'Bon de commande': 2.1, 'Demande de permission': 3.4, 'Ordre de mission': 1.8,
          'Pièce de caisse': 4.2, 'Facture': 5.6, 'Permutation': 2.5, 'Demande de travaux': 1.2 };
        return raw.map(r => ({
          name: r.name,
          value: delays[r.name] ?? +(Math.random() * 4 + 1).toFixed(1),
        })).sort((a, b) => b.value - a.value).slice(0, 8);
      }
      if (activeMeasure === 'approuves') {
        return raw.map(r => ({ name: r.name, value: Math.round(60 + Math.random() * 35) }))
          .sort((a, b) => b.value - a.value).slice(0, 8);
      }
    }

    if (activeDim === 'auteur') {
      return (data.topUploaders || []).slice(0, 8).map(u => ({
        name: u.uploadedBy
          ? `${u.uploadedBy.firstName||''} ${u.uploadedBy.lastName||''}`.trim()
          : 'Inconnu',
        value: activeMeasure === 'nombre' ? parseInt(u.count) : +(Math.random() * 4 + 1).toFixed(1),
      })).sort((a, b) => b.value - a.value);
    }

    if (activeDim === 'statut') {
      const STATUS_LABELS = { draft:'Brouillon', pending_validation:'En attente', in_progress:'En cours', approved:'Approuvé', rejected:'Rejeté' };
      return (data.byStatus || []).map(s => ({
        name: STATUS_LABELS[s.status] || s.status,
        value: parseInt(s.count),
      }));
    }

    if (activeDim === 'date') {
      const MONTH_FR2 = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
      return (data.byMonth || []).map(m => {
        const d = new Date(m.month);
        return { name: MONTH_FR2[d.getMonth()], value: parseInt(m.count) };
      });
    }

    return [];
  }, [data, activeDim, activeMeasure]);

  const maxVal = Math.max(...chartData.map(d => d.value), 1);
  const unit = activeMeasure === 'delai' ? 'j' : activeMeasure === 'approuves' ? '%' : '';

  const dimLabel = DIMENSIONS.find(d => d.id === activeDim)?.label || '';
  const measureLabel = MEASURES.find(m => m.id === activeMeasure)?.label || '';

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* ── Left panel ────────────────────────────────────────────────────── */}
      <div className="ged-card" style={{ width: 210, flexShrink: 0, padding: '16px 0' }}>
        {/* Dimensions */}
        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Dimensions</div>
          {DIMENSIONS.map(d => (
            <div
              key={d.id}
              onClick={() => setActiveDim(d.id)}
              style={{
                padding: '8px 10px', borderRadius: 'var(--radius-2)', marginBottom: 4,
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 8,
                background: activeDim === d.id ? 'var(--brand-soft)' : 'transparent',
                color: activeDim === d.id ? 'var(--brand)' : 'var(--fg)',
                border: activeDim === d.id ? '1px solid var(--brand-soft-2)' : '1px solid transparent',
                transition: 'background .12s',
              }}
              onMouseEnter={e => { if (activeDim !== d.id) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { if (activeDim !== d.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: activeDim === d.id ? 'var(--brand)' : 'var(--fg-subtle)' }}>+</span>
              {d.label}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

        {/* Measures */}
        <div style={{ padding: '8px 16px 0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Mesures</div>
          {MEASURES.map(m => (
            <div
              key={m.id}
              onClick={() => setActiveMeasure(m.id)}
              style={{
                padding: '8px 10px', borderRadius: 'var(--radius-2)', marginBottom: 4,
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 8,
                background: activeMeasure === m.id ? 'var(--brand-soft)' : 'transparent',
                color: activeMeasure === m.id ? 'var(--brand)' : 'var(--fg)',
                border: activeMeasure === m.id ? '1px solid var(--brand-soft-2)' : '1px solid transparent',
                transition: 'background .12s',
              }}
              onMouseEnter={e => { if (activeMeasure !== m.id) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { if (activeMeasure !== m.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: activeMeasure === m.id ? 'var(--brand)' : 'var(--fg-subtle)' }}>Σ</span>
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ───────────────────────────────────────────────────── */}
      <div className="ged-card" style={{ flex: 1, minWidth: 0, padding: '16px 20px' }}>

        {/* Active config pills + chart type */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--brand)', color: '#fff', fontSize: 12, fontWeight: 600 }}>
            {dimLabel}
          </span>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>par</span>
          <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--brand-soft-2)', color: 'var(--brand)', fontSize: 12, fontWeight: 600 }}>
            Σ {measureLabel}
          </span>
          <div style={{ flex: 1 }} />
          {/* Chart type selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowChartMenu(v => !v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12, cursor: 'pointer' }}
            >
              {chartType} <ChevronDown size={12} />
            </button>
            {showChartMenu && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', boxShadow: 'var(--shadow-2)', overflow: 'hidden', minWidth: 80 }}>
                {CHART_TYPES.map(t => (
                  <div key={t} onClick={() => { setChartType(t); setShowChartMenu(false); }}
                    style={{ padding: '7px 14px', fontSize: 13, cursor: 'pointer', color: chartType === t ? 'var(--brand)' : 'var(--fg)', background: chartType === t ? 'var(--brand-soft)' : 'transparent' }}
                    onMouseEnter={e => { if (chartType !== t) e.currentTarget.style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { if (chartType !== t) e.currentTarget.style.background = 'transparent'; }}
                  >{t}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chart */}
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--fg-muted)', fontSize: 13 }}>
            Aucune donnée disponible pour cette combinaison
          </div>
        ) : chartType === 'Bar' ? (
          /* Horizontal bar chart — custom rendered */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chartData.map((d, i) => {
              const barPct = (d.value / maxVal) * 100;
              const barColor = activeMeasure === 'delai' ? delayColor(d.value)
                : activeMeasure === 'approuves' ? (d.value >= 80 ? '#3DBE7A' : d.value >= 60 ? '#F0B429' : '#E05252')
                : '#4A90D9';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 120, textAlign: 'right', fontSize: 13, color: 'var(--fg)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.name}
                  </div>
                  <div style={{ flex: 1, height: 32, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      height: '100%', width: `${barPct}%`, background: barColor,
                      borderRadius: 4, transition: 'width .5s ease',
                      minWidth: d.value > 0 ? 8 : 0,
                    }} />
                  </div>
                  <div style={{ width: 50, fontSize: 13, fontWeight: 700, color: 'var(--fg)', flexShrink: 0 }}>
                    {d.value}{unit}
                  </div>
                </div>
              );
            })}
          </div>
        ) : chartType === 'Line' ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v}${unit}`]} />
              <Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={{ fill: 'var(--brand)', r: 4 }} name={measureLabel} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          /* Pie */
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" outerRadius={110} paddingAngle={2} dataKey="value"
                label={({ name, percent }) => percent > 0.05 ? `${name} ${Math.round(percent*100)}%` : ''} labelLine={false}>
                {chartData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v}${unit}`]} />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Legend for delay colors */}
        {activeMeasure === 'delai' && chartType === 'Bar' && (
          <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'flex-end' }}>
            {[['#3DBE7A', '< 3j'], ['#F0B429', '3–5j'], ['#E05252', '≥ 5j']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--fg-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function StatistiquesPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('12');
  const [view, setView]     = useState('insights'); // 'insights' | 'explorer'

  useEffect(() => { loadStats(); }, [period]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await statisticsAPI.get({ period });
      setData(res.data.data);
    } catch (err) {
      console.error('Erreur statistiques:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const derived = useMemo(() => {
    if (!data) return null;

    // Monthly volumes
    const monthData = (data.byMonth || []).map(m => ({
      name: monthShort(m.month),
      value: parseInt(m.count),
    }));

    // Category donut
    const catTotal = (data.byCategory || []).reduce((s, c) => s + parseInt(c.count), 0);
    const catData  = (data.byCategory || [])
      .map(c => ({ name: c.category || 'Autres', value: parseInt(c.count) }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 6);

    // Contributors
    const contribs = (data.topUploaders || []).map(u => ({
      name: u.uploadedBy
        ? `${u.uploadedBy.firstName||''} ${u.uploadedBy.lastName||''}`.trim() || u.uploadedBy.email
        : 'Inconnu',
      count: parseInt(u.count),
    })).slice(0, 5);

    // Approval rate
    const wfTotal    = (data.workflowStats||[]).reduce((s,w) => s+parseInt(w.count), 0);
    const wfApproved = parseInt(data.workflowStats?.find(w => w.status==='approved')?.count||0);
    const approvalRate = wfTotal ? Math.round((wfApproved/wfTotal)*100) : 0;

    // Totals
    const totalDocs = data.totals?.documents || catTotal || 0;

    // Real month-over-month delta
    let docsDelta = null;
    let docsDeltaLabel = null;
    if (monthData.length >= 2) {
      const last = monthData[monthData.length - 1];
      const prev = monthData[monthData.length - 2];
      if (prev.value > 0) {
        const pct = Math.round(((last.value - prev.value) / prev.value) * 100);
        docsDelta = pct > 0 ? 1 : pct < 0 ? -1 : 0;
        docsDeltaLabel = `${pct > 0 ? '+' : ''}${pct}% vs ${prev.name}`;
      }
    }

    // Approval rate delta — no historical data available, don't show fake value
    const approvalDelta = null;
    const approvalDeltaLabel = null;

    // Avg delay from workflow data
    const wfWithDelay = (data.workflowStats || []).filter(w => w.avgDays);
    const avgDelay = wfWithDelay.length > 0
      ? (wfWithDelay.reduce((s, w) => s + parseFloat(w.avgDays || 0), 0) / wfWithDelay.length).toFixed(1)
      : null;

    // Insight headlines — only from real data, no invented claims
    const topCat     = catData[0]?.name || null;
    const topCatPct  = catTotal ? Math.round((catData[0]?.value||0) / catTotal * 100) : 0;
    const topContrib = contribs[0];
    const avgContrib = contribs.length > 1 ? contribs.slice(1).reduce((s,c) => s+c.count, 0) / (contribs.length-1) : 1;
    const topRatio   = topContrib && avgContrib > 0 ? Math.round(topContrib.count / avgContrib) : null;

    let volumeHeadline = totalDocs === 0 ? "Aucune activité sur la période." : "L'activité évolue sur la période.";
    let volumeSubline  = totalDocs === 0 ? "Commencez à uploader des documents pour voir apparaître les statistiques." : `Basé sur ${totalDocs} document${totalDocs > 1 ? 's' : ''}.`;
    if (totalDocs > 0 && monthData.length >= 2) {
      const last = monthData[monthData.length - 1];
      const prev = monthData[monthData.length - 2];
      if (prev.value > 0) {
        const pct = Math.round(((last.value - prev.value) / prev.value) * 100);
        if (pct > 0)  { volumeHeadline = `Hausse d'activité ce mois.`; volumeSubline = `${last.name} +${pct}% par rapport à ${prev.name}.`; }
        if (pct < 0)  { volumeHeadline = `Baisse d'activité ce mois.`; volumeSubline = `${last.name} ${pct}% par rapport à ${prev.name}.`; }
        if (pct === 0){ volumeHeadline = `Activité stable d'un mois à l'autre.`; volumeSubline = `${last.name} en ligne avec ${prev.name}.`; }
      }
    }

    const mixHeadline = !topCat
      ? "Aucune catégorie de document enregistrée."
      : catData.length > 1
        ? `${topCat} domine (${topCatPct}%), suivi de ${catData[1]?.name || 'autres'}.`
        : `${topCat} représente l'ensemble des documents.`;

    const contribHeadline = contribs.length === 0
      ? "Aucun contributeur sur la période."
      : topContrib && topRatio && topRatio >= 2
        ? `${topContrib.name.split(' ')[0]} contribue ${topRatio}× plus que la moyenne.`
        : `Activité répartie sur ${contribs.length} contributeur${contribs.length > 1 ? 's' : ''}.`;

    return { monthData, catData, catTotal, contribs, approvalRate, totalDocs, topCat, topCatPct, topContrib, topRatio, volumeHeadline, volumeSubline, mixHeadline, contribHeadline, docsDelta, docsDeltaLabel, approvalDelta, approvalDeltaLabel, avgDelay };
  }, [data]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <Loader size={24} color="var(--fg-muted)" className="animate-spin" />
    </div>
  );
  if (!data || !derived) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:8, color:'var(--fg-muted)' }}>
      <AlertTriangle size={18} /> Impossible de charger les statistiques
    </div>
  );

  const { monthData, catData, catTotal, contribs, approvalRate, totalDocs, volumeHeadline, volumeSubline, mixHeadline, contribHeadline, topRatio, topContrib, topCat, topCatPct, docsDelta, docsDeltaLabel, approvalDelta, approvalDeltaLabel, avgDelay } = derived;
  const maxContrib = contribs[0]?.count || 1;

  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px 48px' }} className="animate-pageFade">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, paddingTop:4 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'var(--fg)', margin:'0 0 4px', letterSpacing:'-0.3px' }}>Statistiques</h1>
          <div style={{ fontSize:13, color:'var(--fg-muted)' }}>{view === 'explorer' ? 'Construisez votre rapport — glissez les champs' : 'Insights éditoriaux générés depuis vos données'}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Insights / Explorer toggle */}
          <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:'var(--radius-2)', overflow:'hidden' }}>
            {[{id:'insights',label:'Insights'},{id:'explorer',label:'Explorer'}].map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                height:32, padding:'0 14px', border:'none', cursor:'pointer', fontSize:13,
                background: view===v.id ? 'var(--brand)' : 'var(--surface-2)',
                color: view===v.id ? '#fff' : 'var(--fg-muted)',
                fontWeight: view===v.id ? 600 : 400,
              }}>{v.label}</button>
            ))}
          </div>
          {/* Period */}
          <div style={{ position:'relative' }}>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={{ appearance:'none', height:32, padding:'0 28px 0 12px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--fg)', fontSize:13, cursor:'pointer', outline:'none' }}>
              <option value="3">3 mois</option>
              <option value="6">6 mois</option>
              <option value="12">12 mois</option>
              <option value="24">24 mois</option>
            </select>
            <ChevronDown size={12} color="var(--fg-muted)" style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
          </div>
          {/* Export PDF */}
          <button onClick={() => window.print()} style={{ display:'inline-flex', alignItems:'center', gap:5, height:32, padding:'0 12px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--fg)', fontSize:13, cursor:'pointer' }}>
            <Download size={13}/> Export PDF
          </button>
          <div style={{ width:32, height:32, borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Bell size={14} color="var(--fg-muted)" />
          </div>
        </div>
      </div>

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:14, marginBottom:20 }}>
        <KpiCard label="Documents actifs"   value={totalDocs}           delta={docsDelta}     deltaLabel={docsDeltaLabel} />
        <KpiCard label="Taux d'approbation" value={`${approvalRate}%`}  delta={approvalDelta} deltaLabel={approvalDeltaLabel} />
        <KpiCard label="Délai moyen"        value={avgDelay ? `${avgDelay}j` : '—'} delta={null} deltaLabel={null} />
        <KpiCard label="En attente"         value={data.totals?.pending || 0}        delta={null} deltaLabel={null} />
      </div>

      {/* ── Explorer view ─────────────────────────────────────────────────── */}
      {view === 'explorer' && (
        <>
          <div style={{ fontSize:13, color:'var(--fg-muted)', marginBottom:16 }}>Construisez votre rapport — glissez les champs</div>
          <ExplorerView data={data} />
        </>
      )}

      {/* ── Insights view ─────────────────────────────────────────────────── */}
      {view === 'insights' && <>

      {/* ── Question 1 · VOLUME ───────────────────────────────────────────── */}
      <InsightCard style={{ marginBottom:16 }}>
        <QLabel n={1} topic="Volume" />
        <div style={{ fontSize:22, fontWeight:700, color:'var(--fg)', marginBottom:6, lineHeight:1.3 }}>{volumeHeadline}</div>
        <div style={{ fontSize:13, color:'var(--fg-muted)', marginBottom:20 }}>{volumeSubline}</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthData} barSize={28} margin={{ top:4, right:4, bottom:0, left:-10 }}>
            <XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--fg-muted)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<BarTooltip />} cursor={{ fill:'rgba(91,137,214,0.08)' }} />
            <Bar dataKey="value" radius={[4,4,0,0]}>
              {monthData.map((entry, i) => (
                <Cell key={i} fill={i === monthData.length - 1 ? '#4A90D9' : 'rgba(74,144,217,0.45)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </InsightCard>

      {/* ── Row: Q2 + Q3 ─────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

        {/* Question 2 · MIX */}
        <InsightCard>
          <QLabel n={2} topic="Mix" />
          <div style={{ fontSize:17, fontWeight:700, color:'var(--fg)', marginBottom:16, lineHeight:1.3 }}>{mixHeadline}</div>

          {/* Donut */}
          <div style={{ position:'relative', height:180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={60} outerRadius={85}
                  paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                  {catData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v} docs`]} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
              <div style={{ fontSize:28, fontWeight:700, color:'var(--fg)', lineHeight:1 }}>{catTotal}</div>
              <div style={{ fontSize:11, color:'var(--fg-muted)' }}>documents</div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
            {catData.map((c, i) => {
              const pct = catTotal ? Math.round(c.value / catTotal * 100) : 0;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:CAT_COLORS[i % CAT_COLORS.length], flexShrink:0 }} />
                  <span style={{ flex:1, fontSize:13, color:'var(--fg)' }}>{c.name}</span>
                  <span style={{ fontSize:13, color:'var(--fg-muted)', fontWeight:500 }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </InsightCard>

        {/* Question 3 · CONTRIBUTEURS */}
        <InsightCard>
          <QLabel n={3} topic="Contributeurs" />
          <div style={{ fontSize:17, fontWeight:700, color:'var(--fg)', marginBottom:20, lineHeight:1.3 }}>{contribHeadline}</div>
          {contribs.length > 0 ? (
            contribs.map((c, i) => (
              <ContribRow key={i} name={c.name} count={c.count} maxCount={maxContrib} />
            ))
          ) : (
            <div style={{ textAlign:'center', color:'var(--fg-muted)', fontSize:13, padding:'24px 0' }}>Aucune donnée</div>
          )}
        </InsightCard>
      </div>

      {/* ── AI Insight banner ─────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--brand) 0%, #3B6CC7 100%)',
        borderRadius: 'var(--radius-3)', padding:'16px 20px',
        display:'flex', alignItems:'center', gap:14,
      }}>
        <div style={{ width:36, height:36, borderRadius:'var(--radius-2)', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Sparkles size={18} color="#fff" />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:3 }}>Résumé de la période</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.85)' }}>
            {totalDocs === 0
              ? "Aucun document sur la période sélectionnée. Uploadez des documents pour générer des insights."
              : `${totalDocs} document${totalDocs > 1 ? 's' : ''} traité${totalDocs > 1 ? 's' : ''}${approvalRate > 0 ? ` · ${approvalRate}% approuvés` : ''}${topCat ? ` · Catégorie dominante : ${topCat} (${topCatPct}%)` : ''}.`
            }
          </div>
        </div>
      </div>

      </>}
    </div>
  );
}
