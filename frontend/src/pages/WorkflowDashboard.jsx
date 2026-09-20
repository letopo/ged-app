// frontend/src/pages/WorkflowDashboard.jsx — Redesign analytics
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { workflowAPI } from '../services/api';
import DocumentViewer from '../components/DocumentViewer';
import {
  AlertCircle, Loader, Download, Bell,
  ChevronDown, ArrowUpRight, ArrowDownRight, Minus, Check, X as XIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
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

// ── Sankey Flow Diagram ───────────────────────────────────────────────────────
function SankeyFlow({ total, approved, pending, rejected }) {
  // ViewBox: wide enough to include right-side labels
  const VW = 920;   // total viewBox width
  const H  = 230;
  const barW = 10;
  const LABEL_LEFT = 130;       // left edge of diagram (space for "Soumissions")
  const BAR_RIGHT  = 720;       // x of outcome bars
  const LABEL_RIGHT = BAR_RIGHT + barW + 14;  // x of outcome text labels

  const colX = [LABEL_LEFT, LABEL_LEFT + 220, LABEL_LEFT + 440];

  const safeTotal  = Math.max(total, 1);
  const totalH     = H - 30;   // usable height
  const approvedH  = Math.max(4, (approved / safeTotal) * totalH);
  const pendingH   = Math.max(pending  > 0 ? 4 : 0, (pending  / safeTotal) * totalH);
  const rejectedH  = Math.max(rejected > 0 ? 4 : 0, (rejected / safeTotal) * totalH);
  const n2H        = approvedH + pendingH + (pendingH > 0 ? 4 : 0);
  const n1H        = Math.min(totalH, n2H + rejectedH * 0.5);
  const subH       = totalH;

  const approvedY  = 20;
  const pendingY   = approvedY + approvedH + 5;
  const rejectedY  = pendingY  + pendingH  + 5;

  function band(x1, y1Top, h1, x2, y2Top, h2, fill) {
    if (h1 <= 0 || h2 <= 0) return null;
    const mx = (x1 + x2) / 2;
    return (
      <path
        d={`M ${x1} ${y1Top} C ${mx} ${y1Top}, ${mx} ${y2Top}, ${x2} ${y2Top}
            L ${x2} ${y2Top+h2} C ${mx} ${y2Top+h2}, ${mx} ${y1Top+h1}, ${x1} ${y1Top+h1} Z`}
        fill={fill}
      />
    );
  }

  return (
    <svg width="100%" viewBox={`0 0 ${VW} ${H}`} style={{ display: 'block' }}>

      {/* ── Bands ─────────────────────────────── */}
      {/* Sub → N1 (blue) */}
      {band(colX[0]+barW, 20, subH, colX[1], 20, n1H, 'rgba(59,130,246,0.22)')}

      {/* N1 → N2 (blue, approved+pending portion) */}
      {band(colX[1]+barW, 20, n2H, colX[2], 20, n2H, 'rgba(59,130,246,0.18)')}

      {/* N1 → Rejected (drops out from N1 bottom) */}
      {band(colX[1]+barW, n2H+20+4, rejectedH*0.5, BAR_RIGHT, rejectedY, rejectedH, 'rgba(185,28,28,0.45)')}

      {/* N2 → Approved (green) */}
      {band(colX[2]+barW, 20, approvedH, BAR_RIGHT, approvedY, approvedH, 'rgba(21,128,61,0.55)')}

      {/* N2 → Pending (amber) */}
      {band(colX[2]+barW, approvedH+24, pendingH, BAR_RIGHT, pendingY, pendingH, 'rgba(161,98,7,0.55)')}

      {/* ── Vertical bars ─────────────────────── */}
      <rect x={colX[0]}   y={20} width={barW} height={subH}    rx={2} fill="rgba(148,163,184,0.65)" />
      <rect x={colX[1]}   y={20} width={barW} height={n1H}     rx={2} fill="rgba(96,165,250,0.9)" />
      <rect x={colX[2]}   y={20} width={barW} height={n2H}     rx={2} fill="rgba(96,165,250,0.9)" />
      <rect x={BAR_RIGHT} y={approvedY} width={barW} height={approvedH}  rx={2} fill="rgba(34,197,94,0.9)" />
      {pendingH  > 0 && <rect x={BAR_RIGHT} y={pendingY}  width={barW} height={pendingH}   rx={2} fill="rgba(234,179,8,0.9)" />}
      {rejectedH > 0 && <rect x={BAR_RIGHT} y={rejectedY} width={barW} height={rejectedH}  rx={2} fill="rgba(239,68,68,0.9)" />}

      {/* ── Left labels (Soumissions) ────────── */}
      <text x={colX[0]-6} y={20 + subH/2 - 8}  textAnchor="end" fill="var(--fg)" fontSize={13} fontWeight="600" dominantBaseline="middle">Soumissions</text>
      <text x={colX[0]-6} y={20 + subH/2 + 10} textAnchor="end" fill="var(--fg-muted)" fontSize={11} dominantBaseline="middle">{total} documents</text>

      {/* ── Column headers ───────────────────── */}
      <text x={colX[1]+barW/2} y={10} textAnchor="middle" fill="var(--fg-muted)" fontSize={12} fontWeight="600">Validation N1</text>
      <text x={colX[2]+barW/2} y={10} textAnchor="middle" fill="var(--fg-muted)" fontSize={12} fontWeight="600">Validation N2</text>

      {/* ── Right outcome labels ─────────────── */}
      <text x={LABEL_RIGHT} y={approvedY + approvedH/2} fill="rgb(74,222,128)"  fontSize={12} fontWeight="600" dominantBaseline="middle">✓ Approuvés ({approved})</text>
      {pendingH  > 0 && <text x={LABEL_RIGHT} y={pendingY  + pendingH /2} fill="rgb(253,224,71)"  fontSize={12} fontWeight="600" dominantBaseline="middle">◎ En attente ({pending})</text>}
      {rejectedH > 0 && <text x={LABEL_RIGHT} y={rejectedY + rejectedH/2} fill="rgb(252,165,165)" fontSize={12} fontWeight="600" dominantBaseline="middle">✕ Rejetés ({rejected})</text>}
    </svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, sublabel, value, delta, deltaLabel, urgent }) {
  const isUp   = delta > 0;
  const isDown = delta < 0;
  const DeltaIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const deltaColor = isUp ? 'var(--success)' : isDown ? 'var(--danger)' : 'var(--fg-muted)';

  return (
    <div className="ged-card" style={{ padding: '16px 20px', flex: 1 }}>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 6, fontWeight: 500 }}>
        {label}
        {sublabel && <span style={{ color: 'var(--fg-subtle)', fontWeight: 400 }}> · {sublabel}</span>}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-1px', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        {delta !== null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, color: deltaColor, fontWeight: 500 }}>
            <DeltaIcon size={13} />{deltaLabel}
          </span>
        )}
        {urgent && (
          <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 500 }}>{urgent}</span>
        )}
      </div>
    </div>
  );
}

// ── Bottleneck bar ────────────────────────────────────────────────────────────
function BottleneckBar({ label, value, maxValue }) {
  const pct   = Math.min(100, (value / (maxValue || 1)) * 100);
  const color = value >= 5 ? 'var(--danger)' : value >= 3 ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--fg)' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 500 }}>{value.toFixed(1)} j moyen</span>
      </div>
      <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .6s ease' }} />
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
  const { user } = useAuth();
  const [allTasks, setAllTasks]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [period, setPeriod]             = useState('30');
  const [filterService, setFilterService] = useState('all');
  const [filterType, setFilterType]       = useState('all');

  const loadAllTasks = async () => {
    try {
      setLoading(true); setError(null);
      const response = await workflowAPI.getMyTasks('all');
      const data = response.data?.data || response.data?.tasks || (Array.isArray(response.data) ? response.data : []);
      setAllTasks(data);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAllTasks(); }, []);

  // ── Derived options for dropdowns ──────────────────────────────────────────
  const { serviceOptions, typeOptions } = useMemo(() => {
    const services = new Set();
    const types    = new Set();
    allTasks.forEach(t => {
      const svc  = t.document?.service   || t.document?.department;
      const type = t.document?.category  || t.document?.type;
      if (svc)  services.add(svc);
      if (type) types.add(type);
    });
    return {
      serviceOptions: [...services].sort().map(s => ({ value: s, label: s })),
      typeOptions:    [...types].sort().map(t => ({ value: t, label: t })),
    };
  }, [allTasks]);

  // ── Filtered task set (for Sankey + stats) ─────────────────────────────────
  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      const svc  = t.document?.service || t.document?.department;
      const type = t.document?.category || t.document?.type;
      if (filterService !== 'all' && svc  !== filterService) return false;
      if (filterType    !== 'all' && type !== filterType)    return false;
      return true;
    });
  }, [allTasks, filterService, filterType]);

  // ── Stats derived from filtered tasks ──────────────────────────────────────
  const stats = useMemo(() => {
    const pending  = filteredTasks.filter(t => t.status === 'pending').length;
    const approved = filteredTasks.filter(t => t.status === 'approved').length;
    const rejected = filteredTasks.filter(t => t.status === 'rejected').length;
    const total    = filteredTasks.length;

    // Top validators
    const valMap = {};
    filteredTasks.forEach(t => {
      const v = t.validator || t.assignedTo;
      if (!v) return;
      const key = v.id || v._id || v.email;
      if (!valMap[key]) valMap[key] = { name: `${v.firstName||''} ${v.lastName||''}`.trim() || v.email, role: v.role || 'Validateur', count: 0 };
      valMap[key].count++;
    });
    const topValidators = Object.values(valMap).sort((a,b) => b.count - a.count).slice(0,4);

    // Bottlenecks
    const svcMap = {};
    filteredTasks.forEach(t => {
      const svc = t.document?.service || t.document?.category || 'Autre';
      if (!svcMap[svc]) svcMap[svc] = { total: 0, daysSum: 0 };
      svcMap[svc].total++;
      const c = t.createdAt ? new Date(t.createdAt) : null;
      const u = t.updatedAt ? new Date(t.updatedAt) : null;
      if (c && u) svcMap[svc].daysSum += (u - c) / 86400000;
    });
    const bottlenecks = Object.entries(svcMap)
      .map(([k, v]) => ({ label: k, avg: v.total > 0 ? v.daysSum / v.total : 0 }))
      .sort((a,b) => b.avg - a.avg).slice(0, 5);

    // Avg days
    let dSum = 0, dCnt = 0;
    filteredTasks.forEach(t => {
      if (t.createdAt && t.updatedAt) { dSum += (new Date(t.updatedAt) - new Date(t.createdAt)) / 86400000; dCnt++; }
    });
    const avgDays = dCnt > 0 ? (dSum / dCnt).toFixed(1) : '—';

    return { pending, approved, rejected, total, topValidators, bottlenecks, avgDays };
  }, [filteredTasks]);

  const handleValidate = async ({ comment, realisePar }) => {
    if (!selectedTask) return;
    try {
      await workflowAPI.validateTask(selectedTask.id, { status: 'approved', comment, realisePar });
      setSelectedTask(null); loadAllTasks(); toast.success('Document approuvé !');
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur lors de la validation'); }
  };

  const handleReject = async ({ comment }) => {
    if (!comment?.trim()) { toast('Commentaire obligatoire pour rejeter'); return; }
    if (!selectedTask) return;
    try {
      await workflowAPI.validateTask(selectedTask.id, { status: 'rejected', comment });
      setSelectedTask(null); loadAllTasks(); toast('Document rejeté');
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur lors du rejet'); }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <Loader size={24} color="var(--fg-muted)" className="animate-spin" />
    </div>
  );
  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:8, color:'var(--danger)' }}>
      <AlertCircle size={18} /> {error}
      <button onClick={loadAllTasks} style={{ marginLeft:8, padding:'4px 10px', borderRadius:'var(--radius-2)', border:'1px solid var(--danger)', background:'transparent', color:'var(--danger)', fontSize:12, cursor:'pointer' }}>Réessayer</button>
    </div>
  );

  const urgentCount = allTasks.filter(t => t.status === 'pending' && t.priority === 'urgent').length;
  const hasActiveFilter = filterService !== 'all' || filterType !== 'all';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 48px' }} className="animate-pageFade">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, paddingTop:4 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'var(--fg)', margin:'0 0 4px', letterSpacing:'-0.3px' }}>Workflow</h1>
          <div style={{ fontSize:13, color:'var(--fg-muted)' }}>Vue d'ensemble du flux de validation et goulots d'étranglement</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button style={{ display:'inline-flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--fg)', fontSize:13, cursor:'pointer' }}>
            {period} derniers jours <ChevronDown size={14} color="var(--fg-muted)" />
          </button>
          <button style={{ display:'inline-flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--fg)', fontSize:13, cursor:'pointer' }}>
            <Download size={14} /> Exporter
          </button>
          <div style={{ width:34, height:34, borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
            <Bell size={16} color="var(--fg-muted)" />
            {urgentCount > 0 && <span style={{ position:'absolute', top:6, right:6, width:7, height:7, borderRadius:'50%', background:'var(--warning)', border:'2px solid var(--surface)' }} />}
          </div>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:14, marginBottom:20 }}>
        <StatCard label="Entrées" sublabel={`${period}j`}  value={stats.total}    delta={null} deltaLabel={null} />
        <StatCard label="En attente"                        value={stats.pending}  delta={null} deltaLabel={null} urgent={urgentCount > 0 ? `${urgentCount} urgente${urgentCount>1?'s':''}` : null} />
        <StatCard label="Approuvées"                        value={stats.approved} delta={null} deltaLabel={null} />
        <StatCard label="Délai moyen"                       value={stats.avgDays !== '—' ? `${stats.avgDays}j` : '—'} delta={null} deltaLabel={null} />
      </div>

      {/* ── Sankey card ────────────────────────────────────────────────────── */}
      <div className="ged-card" style={{ padding:'20px 24px', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--fg)', marginBottom:2 }}>Flux de validation</div>
            <div style={{ fontSize:12, color:'var(--fg-muted)' }}>Entrées → étapes → sorties</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {hasActiveFilter && (
              <button
                onClick={() => { setFilterService('all'); setFilterType('all'); }}
                style={{ display:'inline-flex', alignItems:'center', gap:4, height:30, padding:'0 10px', borderRadius:'var(--radius-2)', border:'1px solid var(--danger)', background:'var(--danger-soft)', color:'var(--danger)', fontSize:12, cursor:'pointer' }}
              >
                <XIcon size={12} /> Réinitialiser
              </button>
            )}
            <FilterDropdown
              label="Tous services"
              options={serviceOptions}
              value={filterService}
              onChange={setFilterService}
            />
            <FilterDropdown
              label="Tous types"
              options={typeOptions}
              value={filterType}
              onChange={setFilterType}
            />
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilter && (
          <div style={{ display:'flex', gap:6, marginBottom:12 }}>
            {filterService !== 'all' && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:'var(--radius-full)', background:'var(--brand-soft)', color:'var(--brand)', fontSize:11, fontWeight:500 }}>
                Service : {filterService}
                <XIcon size={10} style={{ cursor:'pointer' }} onClick={() => setFilterService('all')} />
              </span>
            )}
            {filterType !== 'all' && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:'var(--radius-full)', background:'var(--brand-soft)', color:'var(--brand)', fontSize:11, fontWeight:500 }}>
                Type : {filterType}
                <XIcon size={10} style={{ cursor:'pointer' }} onClick={() => setFilterType('all')} />
              </span>
            )}
          </div>
        )}

        <div style={{ overflowX:'auto' }}>
          <div style={{ minWidth: 700 }}>
            <SankeyFlow
              total={stats.total}
              approved={stats.approved}
              pending={stats.pending}
              rejected={stats.rejected}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom row ─────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Goulots d'étranglement */}
        <div className="ged-card" style={{ padding:'20px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--fg)' }}>Goulots d'étranglement</div>
            <button style={{ fontSize:12, color:'var(--brand)', background:'none', border:'none', cursor:'pointer', fontWeight:500 }}>Détails →</button>
          </div>
          {stats.bottlenecks.length > 0 ? (
            stats.bottlenecks.map((b,i) => (
              <BottleneckBar key={i} label={b.label} value={b.avg} maxValue={Math.max(...stats.bottlenecks.map(x=>x.avg), 1)} />
            ))
          ) : (
            <div style={{ textAlign:'center', color:'var(--fg-muted)', fontSize:13, padding:'24px 0' }}>Aucune donnée sur la période</div>
          )}
        </div>

        {/* Top valideurs */}
        <div className="ged-card" style={{ padding:'20px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--fg)' }}>
              Top valideurs <span style={{ fontWeight:400, color:'var(--fg-muted)' }}>· {period}j</span>
            </div>
            <button style={{ fontSize:12, color:'var(--brand)', background:'none', border:'none', cursor:'pointer', fontWeight:500 }}>Tous →</button>
          </div>
          {stats.topValidators.length === 0 ? (
            <div style={{ textAlign:'center', color:'var(--fg-muted)', fontSize:13, padding:'24px 0' }}>Aucun valideur sur la période</div>
          ) : stats.topValidators.map((v, i, arr) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i < arr.length-1 ? '1px solid var(--border)' : 'none' }}>
              <Avatar name={v.name} size={36} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.name}</div>
                <div style={{ fontSize:11, color:'var(--fg-muted)', textTransform:'capitalize' }}>{v.role}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <span style={{ fontSize:22, fontWeight:700, color:'var(--fg)', letterSpacing:'-0.5px' }}>{v.count}</span>
                <span style={{ fontSize:12, color:'var(--fg-muted)', marginLeft:3 }}>docs</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedTask && (
        <DocumentViewer
          document={selectedTask.document}
          onClose={() => setSelectedTask(null)}
          onValidate={handleValidate}
          onReject={handleReject}
          showActions={selectedTask.status === 'pending'}
        />
      )}
    </div>
  );
}
