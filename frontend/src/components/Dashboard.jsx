import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { documentsAPI, workflowAPI, calendarAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Clock, CheckCircle, FileText, TrendingDown, TrendingUp,
  Upload, BarChart3, ChevronRight, ArrowRight, RefreshCw, Loader,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function timeAgo(date) {
  if (!date) return '';
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? 'hier' : `il y a ${days} j`;
}

function dayLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  d.setHours(0,0,0,0);
  if (d.getTime() === today.getTime()) return "Aujourd'hui";
  if (d.getTime() === yesterday.getTime()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function initials(doc) {
  if (doc?.uploadedBy?.firstName) {
    return (doc.uploadedBy.firstName[0] + (doc.uploadedBy.lastName?.[0] || '')).toUpperCase();
  }
  return (doc?.title?.[0] || 'D').toUpperCase();
}

const STATUS = {
  draft:              { label: 'Brouillon',     cls: 'ged-badge-neutral' },
  pending:            { label: 'En validation', cls: 'ged-badge-warning' },
  pending_validation: { label: 'En validation', cls: 'ged-badge-warning' },
  approved:           { label: 'Approuvé',      cls: 'ged-badge-success' },
  rejected:           { label: 'Rejeté',        cls: 'ged-badge-danger'  },
};

// ── Avatar chip ───────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: 'var(--brand-soft)',   color: 'var(--brand)' },
  { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  { bg: 'var(--success-soft)', color: 'var(--success)' },
  { bg: 'var(--danger-soft)',  color: 'var(--danger)' },
  { bg: 'var(--info-soft)',    color: 'var(--info)' },
];

function Avatar({ text, idx = 0, size = 32 }) {
  const { bg, color } = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
      fontFamily: 'var(--font-mono)',
    }}>
      {text}
    </div>
  );
}

// ── Hero action card ─────────────────────────────────────────────────────────

function HeroCard({ task, onApprove }) {
  if (!task) return null;
  const doc = task.document || {};
  const daysOld = Math.floor((Date.now() - new Date(task.createdAt || doc.createdAt)) / 86400000);

  return (
    <div className="ged-card" style={{
      background: 'linear-gradient(135deg, var(--brand-soft), var(--bg))',
      borderColor: 'var(--brand-soft-2)',
      padding: '18px 20px',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{
          width: 44, height: 44, background: 'var(--warning)', borderRadius: 'var(--radius-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Clock size={22} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
            <span className="ged-badge ged-badge-warning" style={{ fontSize: 11 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }} />
              À traiter maintenant
            </span>
            {daysOld > 0 && (
              <span className="ged-badge ged-badge-neutral" style={{ fontSize: 11 }}>
                {daysOld}j en attente
              </span>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--fg)', letterSpacing: '-0.2px', marginBottom: 2 }}>
            {doc.title || 'Document en attente'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            {doc.uploadedBy ? `Soumis par ${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : ''}
            {doc.category ? ` · ${doc.category}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {doc.id && (
            <Link
              to={`/documents/${doc.id}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 'var(--radius-2)',
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--fg)', fontSize: 13, fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Voir le document
            </Link>
          )}
          <button
            onClick={() => onApprove(task.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 'var(--radius-2)',
              background: 'var(--brand)', border: 'none', cursor: 'pointer',
              color: '#fff', fontSize: 13, fontWeight: 600,
            }}
          >
            Approuver <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── KPI grid ─────────────────────────────────────────────────────────────────

function KpiGrid({ stats }) {
  const items = [
    { label: 'Total documents', value: stats.total,    sub: '+12% ce mois',    trend: 'up',   to: '/documents' },
    { label: 'En validation',   value: stats.pending,  sub: `${stats.urgent || 0} urgents`, trend: null, to: '/documents?status=pending_validation' },
    { label: 'Approuvés',       value: stats.approved, sub: stats.total ? `${Math.round(stats.approved/stats.total*100)}%` : '—', trend: 'up', to: '/documents?status=approved' },
    { label: 'Délai moyen',     value: stats.avgDays != null ? stats.avgDays : '—',
      sub: stats.avgDelta ? `${stats.avgDelta > 0 ? '+' : ''}${stats.avgDelta}j` : null,
      unit: stats.avgDays != null ? 'j' : '',
      trend: stats.avgDelta < 0 ? 'up' : null, to: null },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 12, marginBottom: 24,
    }}>
      {items.map((k, i) => (
        <ConditionalLink key={i} to={k.to}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-3)', padding: '16px 18px',
            textDecoration: 'none', display: 'block',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {k.label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.5px', lineHeight: 1 }}>
            {k.value}
            {k.unit && <span style={{ fontSize: 16, opacity: 0.5, fontWeight: 500 }}>{k.unit}</span>}
          </div>
          {k.sub && (
            <div style={{ marginTop: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
              color: k.trend === 'up' ? 'var(--success)' : 'var(--fg-muted)' }}>
              {k.trend === 'up' && <TrendingUp size={11} />}
              {k.trend === 'down' && <TrendingDown size={11} />}
              {k.sub}
            </div>
          )}
        </ConditionalLink>
      ))}
    </div>
  );
}

function ConditionalLink({ to, children, style }) {
  if (to) return <Link to={to} style={style}>{children}</Link>;
  return <div style={style}>{children}</div>;
}

// ── Mini calendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ tasksByDay }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [perms, setPerms] = useState([]); // demandes de permission du mois

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7; // Mon-first

  const monthName = new Date(year, month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0);  setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Charge les demandes de permission du mois affiché
  useEffect(() => {
    const start = new Date(year, month, 1).toISOString().split('T')[0];
    const end   = new Date(year, month + 1, 0).toISOString().split('T')[0];
    calendarAPI.getPermissions(start, end)
      .then(res => setPerms(res.data?.data || []))
      .catch(() => setPerms([]));
  }, [year, month]);

  const requesterName = (p) =>
    p.metadata?.noms_prenoms
    || p.metadata?.nomsDemandeur
    || (p.uploadedBy ? `${p.uploadedBy.firstName || ''} ${p.uploadedBy.lastName || ''}`.trim() : '')
    || 'Demandeur';

  const permsForDay = (day) => {
    const cur = new Date(year, month, day); cur.setHours(0, 0, 0, 0);
    return perms.filter(p => {
      const s = new Date(p.dateDebut), e = new Date(p.dateFin);
      if (isNaN(s) || isNaN(e)) return false;
      s.setHours(0, 0, 0, 0); e.setHours(0, 0, 0, 0);
      return cur >= s && cur <= e;
    });
  };

  return (
    <div className="ged-card" style={{ padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>{capitalize(monthName)} · permissions</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={prev} style={btnGhost}><ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} /></button>
          <button onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }} style={{ ...btnGhost, fontSize: 11 }}>Auj.</button>
          <button onClick={next} style={btnGhost}><ChevronRight size={13} /></button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {['L','M','M','J','V','S','D'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)',
            textTransform: 'uppercase', letterSpacing: '0.3px', paddingBottom: 4 }}>
            {d}
          </div>
        ))}
        {Array.from({ length: startOffset }).map((_, i) => <div key={`pad-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const count = tasksByDay?.[key] || 0;
          const dayPerms = permsForDay(day);
          // Tooltip du jour : qui est en permission ce jour-là
          const tooltip = dayPerms.length
            ? 'En permission : ' + dayPerms.map(requesterName).join(', ')
            : undefined;
          const hasMarks = dayPerms.length > 0 || count > 0;
          return (
            <div key={day} title={tooltip} style={{
              aspectRatio: '1 / 1',
              border: `1px solid ${isToday ? 'var(--brand)' : 'var(--border)'}`,
              borderRadius: 5,
              padding: '3px 2px 2px',
              background: isToday ? 'var(--brand-soft)' : 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              cursor: hasMarks ? 'pointer' : 'default',
            }}>
              <span style={{ fontSize: 10, fontWeight: isToday ? 700 : 500,
                color: isToday ? 'var(--brand)' : 'var(--fg)' }}>{day}</span>
              {hasMarks && (
                <div style={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {/* une pastille verte par permission (survol = nom) */}
                  {dayPerms.slice(0, 3).map((p, j) => (
                    <div key={`p${j}`} title={requesterName(p)} style={{ width: 4, height: 4, borderRadius: '50%',
                      background: 'var(--success, #18a957)' }} />
                  ))}
                  {/* échéances éventuelles */}
                  {Array.from({ length: Math.min(count, 2) }).map((_, j) => (
                    <div key={`t${j}`} style={{ width: 4, height: 3, borderRadius: 2,
                      background: 'var(--warning)' }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {perms.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6 }}>
            Permissions ce mois ({perms.length})
          </div>
          {perms.slice(0, 4).map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success, #18a957)', flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: 'var(--fg)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {requesterName(p)}
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginLeft: 'auto', flexShrink: 0 }}>
                {p.dateDebut ? new Date(p.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                {p.dateFin && p.dateFin !== p.dateDebut ? ' → ' + new Date(p.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
              </span>
            </div>
          ))}
          {perms.length > 4 && (
            <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginTop: 2 }}>+{perms.length - 4} autre(s)</div>
          )}
        </div>
      )}
    </div>
  );
}

const btnGhost = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '4px 6px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)',
  background: 'transparent', cursor: 'pointer', color: 'var(--fg-muted)',
};

// ── Recent docs list ──────────────────────────────────────────────────────────

function RecentDocs({ documents }) {
  if (!documents.length) {
    return (
      <div className="ged-card" style={{ padding: '24px', textAlign: 'center' }}>
        <FileText size={20} color="var(--fg-subtle)" style={{ marginBottom: 8 }} />
        <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Aucun document récent</p>
        <Link to="/upload" style={{ fontSize: 12, color: 'var(--brand)', textDecoration: 'none' }}>
          Uploader votre premier document →
        </Link>
      </div>
    );
  }

  return (
    <div className="ged-card" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>Documents récents</h3>
        <Link to="/documents" style={{ fontSize: 12, color: 'var(--fg-muted)', textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 4 }}>
          Voir tout <ChevronRight size={12} />
        </Link>
      </div>
      {documents.map((doc, i) => {
        const st = STATUS[doc.status] || STATUS.draft;
        return (
          <Link key={doc.id} to={`/documents/${doc.id}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 18px',
              borderBottom: i < documents.length - 1 ? '1px solid var(--surface-3)' : 'none',
              textDecoration: 'none',
              background: 'var(--surface)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
          >
            <Avatar text={initials(doc)} idx={i} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {doc.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                {doc.category ? `${doc.category} · ` : ''}{timeAgo(doc.createdAt)}
              </div>
            </div>
            <span className={`ged-badge ${st.cls}`} style={{ fontSize: 11, flexShrink: 0 }}>
              {st.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// ── Quick actions ─────────────────────────────────────────────────────────────

function QuickActions({ pendingCount }) {
  const items = [
    { icon: Upload,     label: 'Upload',        sub: 'Document unique',        to: '/upload' },
    { icon: FileText,   label: 'Mes tâches',    sub: `${pendingCount || 0} en attente`, to: '/my-tasks' },
    { icon: BarChart3,  label: 'Statistiques',  sub: 'Vue mensuelle',           to: '/stats' },
    { icon: CheckCircle,label: 'Workflow',      sub: 'Suivi validation',        to: '/workflow-dashboard' },
  ];

  return (
    <div className="ged-card" style={{ padding: '14px 18px', marginBottom: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', margin: '0 0 12px' }}>Raccourcis</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {items.map((a, i) => {
          const Icon = a.icon;
          return (
            <Link key={i} to={a.to} style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              padding: '12px 14px', borderRadius: 'var(--radius-3)',
              border: '1px solid var(--border)', textDecoration: 'none',
              background: 'var(--surface)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            >
              <Icon size={17} color="var(--brand)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>{a.label}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{a.sub}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Activity feed ─────────────────────────────────────────────────────────────

function ActivityFeed({ documents }) {
  const grouped = [];
  const seen = new Set();
  documents.forEach(doc => {
    const label = dayLabel(doc.createdAt);
    if (!seen.has(label)) { seen.add(label); grouped.push({ label, items: [] }); }
    grouped[grouped.length - 1].items.push(doc);
  });

  if (!grouped.length) return (
    <div className="ged-card" style={{ padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Aucune activité récente</p>
    </div>
  );

  return (
    <div className="ged-card" style={{ overflow: 'hidden', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>Activité</h3>
        <Link to="/documents" style={{ fontSize: 12, color: 'var(--fg-muted)', textDecoration: 'none' }}>
          Tout voir →
        </Link>
      </div>
      <div style={{ padding: '0 18px' }}>
        {grouped.map((group, gi) => (
          <div key={gi}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', letterSpacing: '0.6px',
              textTransform: 'uppercase', padding: '10px 0 6px', fontFamily: 'var(--font-mono)' }}>
              {group.label}
            </div>
            {group.items.map((doc, i) => {
              const who = doc.uploadedBy;
              return (
                <div key={doc.id} style={{
                  display: 'flex', gap: 10, padding: '8px 0',
                  borderBottom: i < group.items.length - 1 ? '1px solid var(--surface-3)' : 'none',
                }}>
                  <Avatar text={initials(doc)} idx={i} size={28} />
                  <div style={{ flex: 1, fontSize: 12.5 }}>
                    <span style={{ fontWeight: 600, color: 'var(--fg)' }}>
                      {who ? `${who.firstName} ${who.lastName}` : 'Système'}
                    </span>{' '}
                    <span style={{ color: 'var(--fg-muted)' }}>a soumis</span>{' '}
                    <span style={{ color: 'var(--brand)', fontWeight: 500 }}>{doc.title}</span>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>
                      {timeAgo(doc.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, urgent: 0 });
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'gardien') { navigate('/portail', { replace: true }); return; }
    if (['agent_accueil_php','agent_accueil_normal'].includes(user.role)) { navigate('/accueil', { replace: true }); return; }
    if (user.role === 'caissier') { navigate('/caisse', { replace: true }); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const docsRes = await documentsAPI.getAll();
      const docs = docsRes.data.data || [];
      const pending = docs.filter(d => ['pending','pending_validation'].includes(d.status));
      setStats({
        total:    docs.length,
        approved: docs.filter(d => d.status === 'approved').length,
        rejected: docs.filter(d => d.status === 'rejected').length,
        pending:  pending.length,
        urgent:   pending.filter(d => Math.floor((Date.now() - new Date(d.createdAt)) / 86400000) >= 2).length,
      });
      setRecentDocuments([...docs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10));
      try {
        const tasksRes = await workflowAPI.getMyTasks('pending');
        setMyTasks(tasksRes.data.tasks || []);
      } catch { setMyTasks([]); }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (taskId) => {
    if (approving) return;
    try {
      setApproving(true);
      await workflowAPI.approveStep(taskId, { comment: 'Approuvé depuis le tableau de bord' });
      await loadData();
    } catch (err) {
      console.error('Approve error:', err);
    } finally {
      setApproving(false);
    }
  };

  if (user && ['gardien','agent_accueil_php','agent_accueil_normal','caissier'].includes(user.role)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader size={24} color="var(--fg-muted)" className="animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={24} color="var(--fg-muted)" style={{ marginBottom: 12 }} className="animate-spin" />
          <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Chargement…</p>
        </div>
      </div>
    );
  }

  const heroTask = myTasks.find(t => {
    const daysOld = Math.floor((Date.now() - new Date(t.createdAt || t.document?.createdAt)) / 86400000);
    return daysOld >= 2;
  }) || myTasks[0] || null;

  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const orgName = user?.Service?.name || 'Hôpital Saint-Jean-de-Malte';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 40px' }} className="animate-pageFade">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingTop: 4 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', letterSpacing: '0.6px',
            textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
            {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} · {orgName}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: 0, letterSpacing: '-0.3px' }}>
            {getGreeting()}, {user?.firstName || user?.username}.
          </h1>
          {myTasks.length > 0 && (
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>
              Vous avez{' '}
              <strong style={{ color: 'var(--warning)' }}>{myTasks.length} tâche{myTasks.length > 1 ? 's' : ''} en attente</strong>
              {stats.pending > 0 && ` et ${stats.pending} document${stats.pending > 1 ? 's' : ''} à examiner.`}
            </div>
          )}
        </div>
        <button onClick={loadData}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 'var(--radius-2)',
            border: '1px solid var(--border)', background: 'var(--surface)',
            cursor: 'pointer', fontSize: 12, color: 'var(--fg-muted)',
            marginTop: 4,
          }}>
          <RefreshCw size={13} />
          Actualiser
        </button>
      </div>

      {/* Hero */}
      <HeroCard task={heroTask} onApprove={handleApprove} />

      {/* KPIs */}
      <KpiGrid stats={stats} />

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>

        {/* Left: calendar + recent docs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <MiniCalendar tasksByDay={null} />
          <RecentDocs documents={recentDocuments.slice(0, 6)} />
        </div>

        {/* Right: quick actions + activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <QuickActions pendingCount={myTasks.length} />
          <ActivityFeed documents={recentDocuments.slice(0, 8)} />
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
