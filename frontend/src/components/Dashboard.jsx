import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { documentsAPI, workflowAPI, calendarAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import i18n from '../i18n/config';

const BCP47_LOCALES = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA' };
const currentLocale = () => BCP47_LOCALES[i18n.language] || 'fr-FR';
import {
  Clock, CheckCircle, FileText, TrendingDown, TrendingUp,
  Upload, BarChart3, ChevronRight, ArrowRight, RefreshCw, Loader, Hourglass,
  AlertTriangle, Sparkles,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return i18n.t('Bonjour');
  if (h < 18) return i18n.t('Bon après-midi');
  return i18n.t('Bonsoir');
}

function timeAgo(date) {
  if (!date) return '';
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return i18n.t("à l'instant");
  if (diff < 3600) return i18n.t('il y a {{m}} min', { m: Math.floor(diff / 60) });
  if (diff < 86400) return i18n.t('il y a {{h}} h', { h: Math.floor(diff / 3600) });
  const days = Math.floor(diff / 86400);
  return days === 1 ? i18n.t('hier') : i18n.t('il y a {{d}} j', { d: days });
}

function dayLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  d.setHours(0,0,0,0);
  if (d.getTime() === today.getTime()) return i18n.t("Aujourd'hui");
  if (d.getTime() === yesterday.getTime()) return i18n.t('Hier');
  return d.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'long' });
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
  const { t } = useTranslation();
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
              {t('À traiter maintenant')}
            </span>
            {daysOld > 0 && (
              <span className="ged-badge ged-badge-neutral" style={{ fontSize: 11 }}>
                {t('{{days}}j en attente', { days: daysOld })}
              </span>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--fg)', letterSpacing: '-0.2px', marginBottom: 2 }}>
            {doc.title || t('Document en attente')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            {doc.uploadedBy ? t('Soumis par {{name}}', { name: `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` }) : ''}
            {doc.category ? ` · ${doc.category}` : ''}
          </div>
        </div>
        <div className="dash-hero-actions">
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
              {t('Voir le document')}
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
            {t('Approuver')} <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Synthèse du jour ──────────────────────────────────────────────────────────
// Carte façon « Exercise Ring Update » (app Santé) : une phrase-titre qui dit
// quoi faire, quelques phrases de contexte, une action. Calculée uniquement sur
// les tâches et documents déjà chargés pour l'utilisateur.

const LATE_DAYS = 2;
const daysSince = (v) => Math.floor((Date.now() - new Date(v)) / 86400000);

function DailySummary({ tasks, own }) {
  const { t } = useTranslation();
  const ages = tasks.map(tk => daysSince(tk.createdAt || tk.document?.createdAt));
  const late = ages.filter(d => d >= LATE_DAYS).length;
  const oldestIdx = ages.length ? ages.indexOf(Math.max(...ages)) : -1;
  const oldest = oldestIdx >= 0 ? { days: ages[oldestIdx], title: tasks[oldestIdx].document?.title } : null;

  const tone = late > 0 ? 'late' : tasks.length > 0 ? 'todo' : 'calm';
  const TONES = {
    late: { color: 'var(--warning)', icon: AlertTriangle, label: t('À traiter en priorité') },
    todo: { color: 'var(--brand)',   icon: Clock,         label: t('Synthèse du jour') },
    calm: { color: 'var(--success)', icon: Sparkles,      label: t('Synthèse du jour') },
  };
  const { color, icon: Icon, label } = TONES[tone];

  const headline = tone === 'late'
    ? t('{{count}} document(s) attendent votre validation, dont {{late}} depuis plus de {{days}} jours.', { count: tasks.length, late, days: LATE_DAYS })
    : tone === 'todo'
      ? t('{{count}} document(s) attendent votre validation.', { count: tasks.length })
      : t('Rien à valider pour le moment.');

  const lines = [];
  if (oldest && oldest.days >= 1 && oldest.title) lines.push(t('Le plus ancien, « {{title}} », attend depuis {{days}} jour(s).', { title: oldest.title, days: oldest.days }));
  if (own.rejected > 0) lines.push(t('{{count}} de vos documents rejeté(s) cette semaine : pensez à les corriger.', { count: own.rejected }));
  if (own.approved > 0) lines.push(t('{{count}} de vos documents approuvé(s) cette semaine.', { count: own.approved }));
  if (lines.length === 0 && tone === 'calm') lines.push(t('Tout est à jour. Bonne journée !'));

  const actions = [];
  if (tasks.length > 0) actions.push({ to: '/my-tasks', label: t('Voir mes tâches'), primary: true });
  if (own.rejected > 0) actions.push({ to: '/documents?status=rejected', label: t('Voir les documents rejetés') });

  return (
    <div className="ged-card dash-summary" style={{ '--summary-color': color }}>
      <div className="dash-summary-label"><Icon size={14} strokeWidth={2.2} /> {label}</div>
      <div className="dash-summary-headline">{headline}</div>
      {lines.map((l, i) => <p key={i} className="dash-summary-line">{l}</p>)}
      {actions.length > 0 && (
        <div className="dash-summary-actions">
          {actions.map(a => (
            <Link key={a.to} to={a.to} className={a.primary ? 'dash-summary-btn is-primary' : 'dash-summary-btn'}>
              {a.label} <ArrowRight size={13} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── KPI grid ─────────────────────────────────────────────────────────────────
// Cartes façon « épinglées » (app Santé) : titre coloré, grande valeur et
// mini-barres des 7 derniers jours (aujourd'hui en couleur, à droite).

const lastDays = (n) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - (n - 1 - i)); return d; });
};
const dayKey = (v) => { const d = new Date(v); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

// Nombre de documents par jour (sur `field`) pour les jours donnés
const dailyCounts = (docs, field, days) => {
  const index = Object.fromEntries(days.map((d, i) => [dayKey(d), i]));
  const counts = days.map(() => 0);
  docs.forEach(doc => { const i = doc[field] ? index[dayKey(doc[field])] : undefined; if (i !== undefined) counts[i]++; });
  return counts;
};

function MiniBars({ values, color, title }) {
  const max = Math.max(...values, 1);
  const W = 10;
  return (
    <svg className="kpi-bars" viewBox={`0 0 ${values.length * W} 32`} preserveAspectRatio="none" role="img" aria-label={title}>
      <title>{title}</title>
      {values.map((v, i) => {
        const last = i === values.length - 1;
        const h = v > 0 ? Math.max(3, (v / max) * 30) : 1.5;
        return <rect key={i} x={i * W + 1.5} y={32 - h} width={W - 3} height={h} rx={1.5}
          fill={last ? color : 'var(--border-strong)'} opacity={last ? 1 : 0.75} />;
      })}
    </svg>
  );
}

function KpiGrid({ stats, series }) {
  const { t } = useTranslation();
  const days = lastDays(7);
  const fmtDay = (d) => d.toLocaleDateString(currentLocale(), { weekday: 'short' });
  const barsTitle = (values) => `${t('7 derniers jours')} : ` + values.map((v, i) => `${fmtDay(days[i])} ${v}`).join(', ');

  const items = [
    { label: t('Documents'),     icon: FileText,    color: '#2563EB', value: stats.total,    bars: series?.total,
      sub: series ? t('{{count}} cette semaine', { count: series.total.reduce((a, b) => a + b, 0) }) : null, to: '/documents' },
    { label: t('En validation'), icon: Clock,       color: '#D97706', value: stats.pending,  bars: series?.pending,
      sub: t('{{count}} urgents', { count: stats.urgent || 0 }), to: '/documents?status=pending_validation' },
    { label: t('Approuvés'),     icon: CheckCircle, color: '#059669', value: stats.approved, bars: series?.approved,
      sub: stats.total ? `${Math.round(stats.approved / stats.total * 100)}%` : '—', trend: 'up', to: '/documents?status=approved' },
    { label: t('Délai moyen'),   icon: Hourglass,   color: '#8B5CF6', value: stats.avgDays != null ? stats.avgDays : '—',
      unit: stats.avgDays != null ? 'j' : '',
      sub: stats.avgDelta ? `${stats.avgDelta > 0 ? '+' : ''}${stats.avgDelta}j` : null,
      trend: stats.avgDelta < 0 ? 'up' : null, to: null },
  ];

  return (
    <div className="kpi-grid">
      {items.map((k, i) => (
        <ConditionalLink key={i} to={k.to} className="kpi-card">
          <div className="kpi-card-head" style={{ color: k.color }}>
            <k.icon size={15} strokeWidth={2} />
            <span>{k.label}</span>
            {k.to && <ChevronRight size={14} className="kpi-card-chevron" />}
          </div>
          <div className="kpi-card-body">
            <div style={{ minWidth: 0 }}>
              <div className="kpi-card-value">
                {k.value}
                {k.unit && <span className="kpi-card-unit">{k.unit}</span>}
              </div>
              {k.sub && (
                <div className="kpi-card-sub" style={{ color: k.trend === 'up' ? 'var(--success)' : 'var(--fg-muted)' }}>
                  {k.trend === 'up' && <TrendingUp size={11} />}
                  {k.trend === 'down' && <TrendingDown size={11} />}
                  {k.sub}
                </div>
              )}
            </div>
            {k.bars && <MiniBars values={k.bars} color={k.color} title={barsTitle(k.bars)} />}
          </div>
        </ConditionalLink>
      ))}
    </div>
  );
}

function ConditionalLink({ to, children, style, className }) {
  if (to) return <Link to={to} style={style} className={className}>{children}</Link>;
  return <div style={style} className={className}>{children}</div>;
}

// ── Mini calendar ─────────────────────────────────────────────────────────────

const WEEKDAY_LETTERS = {
  fr: ['L','M','M','J','V','S','D'],
  en: ['M','T','W','T','F','S','S'],
  es: ['L','M','X','J','V','S','D'],
  ar: ['ن','ث','ر','خ','ج','س','ح'],
};

function MiniCalendar({ tasksByDay }) {
  const { t } = useTranslation();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [perms, setPerms] = useState([]); // demandes de permission du mois

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7; // Mon-first

  const monthName = new Date(year, month).toLocaleDateString(currentLocale(), { month: 'long', year: 'numeric' });
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
    || t('Demandeur');

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
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>{capitalize(monthName)} · {t('permissions')}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={prev} style={btnGhost}><ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} /></button>
          <button onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }} style={{ ...btnGhost, fontSize: 11 }}>{t('Auj.')}</button>
          <button onClick={next} style={btnGhost}><ChevronRight size={13} /></button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {(WEEKDAY_LETTERS[i18n.language] || WEEKDAY_LETTERS.fr).map((d, i) => (
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
            ? t('En permission : {{names}}', { names: dayPerms.map(requesterName).join(', ') })
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
            {t('Permissions ce mois ({{count}})', { count: perms.length })}
          </div>
          {perms.slice(0, 4).map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success, #18a957)', flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: 'var(--fg)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {requesterName(p)}
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginLeft: 'auto', flexShrink: 0 }}>
                {p.dateDebut ? new Date(p.dateDebut).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' }) : ''}
                {p.dateFin && p.dateFin !== p.dateDebut ? ' → ' + new Date(p.dateFin).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' }) : ''}
              </span>
            </div>
          ))}
          {perms.length > 4 && (
            <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginTop: 2 }}>{t('+{{count}} autre(s)', { count: perms.length - 4 })}</div>
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
  const { t } = useTranslation();
  if (!documents.length) {
    return (
      <div className="ged-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <FileText size={20} color="var(--fg-subtle)" style={{ marginBottom: 8 }} />
        <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Aucun document récent')}</p>
        <Link to="/upload" style={{ fontSize: 12, color: 'var(--brand)', textDecoration: 'none' }}>
          {t('Uploader votre premier document →')}
        </Link>
      </div>
    );
  }

  return (
    <div className="ged-card" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>{t('Documents récents')}</h3>
        <Link to="/documents" style={{ fontSize: 12, color: 'var(--fg-muted)', textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 4 }}>
          {t('Voir tout')} <ChevronRight size={12} />
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
              {t(st.label)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// ── Quick actions ─────────────────────────────────────────────────────────────

function QuickActions({ pendingCount }) {
  const { t } = useTranslation();
  const items = [
    { icon: Upload,     color: '#2563EB', label: t('Upload'),        sub: t('Document unique'),        to: '/upload' },
    { icon: FileText,   color: '#D97706', label: t('Mes tâches'),    sub: t('{{count}} en attente', { count: pendingCount || 0 }), to: '/my-tasks' },
    { icon: BarChart3,  color: '#8B5CF6', label: t('Statistiques'),  sub: t('Vue mensuelle'),           to: '/statistiques' },
    { icon: CheckCircle,color: '#059669', label: t('Workflow'),      sub: t('Suivi validation'),        to: '/workflow-dashboard' },
  ];

  return (
    <div className="ged-card" style={{ padding: '14px 18px', marginBottom: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', margin: '0 0 12px' }}>{t('Raccourcis')}</h3>
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
              <Icon size={20} strokeWidth={1.9} color={a.color || 'var(--brand)'} />
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
  const { t } = useTranslation();
  const grouped = [];
  const seen = new Set();
  documents.forEach(doc => {
    const label = dayLabel(doc.createdAt);
    if (!seen.has(label)) { seen.add(label); grouped.push({ label, items: [] }); }
    grouped[grouped.length - 1].items.push(doc);
  });

  if (!grouped.length) return (
    <div className="ged-card" style={{ padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Aucune activité récente')}</p>
    </div>
  );

  return (
    <div className="ged-card" style={{ overflow: 'hidden', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>{t('Activité')}</h3>
        <Link to="/documents" style={{ fontSize: 12, color: 'var(--fg-muted)', textDecoration: 'none' }}>
          {t('Tout voir →')}
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
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, overflowWrap: 'anywhere' }}>
                    <span style={{ fontWeight: 600, color: 'var(--fg)' }}>
                      {who ? `${who.firstName} ${who.lastName}` : t('Système')}
                    </span>{' '}
                    <span style={{ color: 'var(--fg-muted)' }}>{t('a soumis')}</span>{' '}
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, urgent: 0 });
  const [series, setSeries] = useState(null);
  const [ownWeek, setOwnWeek] = useState({ approved: 0, rejected: 0 });
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
      // 7 derniers jours : créations, arrivées encore en validation, approbations
      // (date d'approbation = date réelle de la dernière validation du circuit)
      const days = lastDays(7);
      // Dates de décision réelles (circuit de validation). Repli, si la route ne répond
      // pas : date de dernière modification des documents approuvés / rejetés.
      let decisions;
      try {
        decisions = (await documentsAPI.getRecentDecisions(7)).data.decisions || [];
      } catch {
        decisions = docs.filter(d => ['approved', 'rejected'].includes(d.status) && d.updatedAt && daysSince(d.updatedAt) < 7)
          .map(d => ({ documentId: d.id, status: d.status, decidedAt: d.updatedAt, userId: d.userId ?? d.uploadedBy?.id }));
      }
      setSeries({
        total:    dailyCounts(docs, 'createdAt', days),
        pending:  dailyCounts(pending, 'createdAt', days),
        approved: dailyCounts(decisions.filter(d => d.status === 'approved'), 'decidedAt', days),
      });
      // Mes documents approuvés / rejetés ces 7 derniers jours
      const mine = decisions.filter(d => d.userId === user.id && daysSince(d.decidedAt) < 7);
      setOwnWeek({
        approved: mine.filter(d => d.status === 'approved').length,
        rejected: mine.filter(d => d.status === 'rejected').length,
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
      await workflowAPI.approveStep(taskId, { comment: t('Approuvé depuis le tableau de bord') });
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
        <Loader size={24} color="var(--fg-muted)" className="animate-spin" />
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>{t('Chargement…')}</p>
      </div>
    );
  }

  const heroTask = myTasks.find(t => {
    const daysOld = Math.floor((Date.now() - new Date(t.createdAt || t.document?.createdAt)) / 86400000);
    return daysOld >= 2;
  }) || myTasks[0] || null;

  const dateLabel = new Date().toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  const orgName = user?.Service?.name || 'Hôpital Saint-Jean-de-Malte';

  return (
    <div className="stats-page animate-pageFade" style={{ maxWidth: 1100 }}>

      {/* Header */}
      <div className="stats-header dash-header" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', letterSpacing: '0.6px',
            textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
            {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} · {orgName}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: 0, letterSpacing: '-0.3px' }}>
            {getGreeting()}, {user?.firstName || user?.username}.
          </h1>
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
          {t('Actualiser')}
        </button>
      </div>

      {/* Synthèse du jour */}
      {!loading && <DailySummary tasks={myTasks} own={ownWeek} />}

      {/* Hero */}
      <HeroCard task={heroTask} onApprove={handleApprove} />

      {/* KPIs */}
      <KpiGrid stats={stats} series={series} />

      {/* Two-column layout */}
      <div className="dashboard-2col">

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
