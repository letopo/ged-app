// frontend/src/pages/EtatServeur.jsx
// État du serveur (superadministrateur, contrôlé aussi côté serveur) : disque
// en direct, dernière sauvegarde nocturne, points de restauration, volumes des
// données (mesurés une fois par jour), tendance et seuils d'alerte.
// Lecture seule, hormis les seuils d'alerte.
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { HardDrive, DatabaseBackup, FolderOpen, TrendingUp, RefreshCw, Loader, FileText, X, Settings2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { systemAPI } from '../services/api';
import i18n from '../i18n/config';

const btn = (bg, fg = '#fff') => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-2)',
  border: 'none', background: bg, color: fg, fontSize: 13, fontWeight: 600, cursor: 'pointer',
});
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', color: 'var(--fg-muted)' };
const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-1)' };
const inputStyle = {
  width: 80, padding: '7px 10px', borderRadius: 'var(--radius-2)', border: '1.5px solid var(--border)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const LEVEL_COLOR = { ok: 'var(--success, #059669)', warning: 'var(--warning, #CA8A04)', error: 'var(--danger, #DC2626)' };

const fmtBytes = (b) => {
  if (b === null || b === undefined) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let v = b, i = 0;
  while (v >= 1000 && i < units.length - 1) { v /= 1000; i++; }
  return `${v.toLocaleString(i18n.language || 'fr', { maximumFractionDigits: v < 10 ? 1 : 0 })} ${units[i]}`;
};
const fmtDate = (d, withTime = false) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleString(i18n.language || 'fr', withTime
  ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  : { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const fmtDuration = (s) => (s === null || s === undefined ? null : s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`);

function Panel({ icon: Icon, title, children, right }) {
  return (
    <div style={{ ...card, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          <Icon size={15} /> {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, muted }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: 13, borderTop: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ color: muted ? 'var(--fg-muted)' : 'var(--fg)', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function DiskBar({ disk, thresholds }) {
  const color = disk.percent >= thresholds.criticalPercent ? LEVEL_COLOR.error : disk.percent >= thresholds.warningPercent ? LEVEL_COLOR.warning : LEVEL_COLOR.ok;
  return (
    <div style={{ position: 'relative', height: 12, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden', margin: '6px 0 14px' }}>
      <div style={{ width: `${Math.min(disk.percent, 100)}%`, height: '100%', background: color, borderRadius: 99 }} />
      {[thresholds.warningPercent, thresholds.criticalPercent].map(p => (
        <div key={p} title={`${p} %`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${p}%`, width: 2, background: 'var(--fg-muted)', opacity: 0.5 }} />
      ))}
    </div>
  );
}

export default function EtatServeur() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [log, setLog] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await systemAPI.getServerHealth();
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || t('Impossible de lire l\'état du serveur.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const openLog = async (day) => {
    try {
      const res = await systemAPI.getBackupLog(day);
      setLog(res.data);
    } catch {
      toast.error(t('Journal introuvable.'));
    }
  };

  const saveThresholds = async () => {
    try {
      const res = await systemAPI.saveThresholds(Object.fromEntries(Object.entries(editing).map(([k, v]) => [k, Number(v)])));
      setData(d => ({ ...d, thresholds: res.data.thresholds }));
      setEditing(null);
      toast.success(t('Seuils enregistrés.'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur serveur.'));
    }
  };

  if (loading && !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader className="animate-spin" /></div>;
  }

  const th = data?.thresholds;
  const b = data?.lastBackup;
  const rp = data?.restorePoints;
  const v = data?.volumes;
  const trend = data?.trend;
  const problemText = (p) => {
    if (p.code === 'failed') return t('La sauvegarde du {{date}} a échoué (étape : {{step}}).', { date: fmtDate(p.date), step: p.step });
    if (p.code === 'stale') return p.hours === null
      ? t('Aucune sauvegarde n\'a encore été enregistrée.')
      : t('Aucune sauvegarde réussie depuis {{hours}} heures : la sauvegarde automatique ne s\'exécute plus.', { hours: p.hours });
    if (p.code === 'disk') return t('Le disque du serveur est plein à {{percent}} % : les prochaines sauvegardes risquent d\'échouer.', { percent: p.percent });
    return t('L\'état de la sauvegarde est illisible.');
  };
  const chartData = (data?.history || []).map(s => ({ day: s.day.slice(5).split('-').reverse().join('/'), used: Math.round(s.diskUsed / 1e8) / 10, total: Math.round(s.diskTotal / 1e8) / 10 }));

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 40px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{t('État du serveur')}</h1>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>{t('Disque mesuré en direct ; volumes des données mesurés une fois par jour.')}</div>
        </div>
        <button type="button" onClick={load} disabled={loading} style={btn('var(--surface-2)', 'var(--fg)')}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t('Actualiser')}
        </button>
      </div>

      {error && <div style={{ ...card, padding: 14, marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

      {data && (
        <>
          <div style={{ ...card, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--fg)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: LEVEL_COLOR[data.level], flexShrink: 0, marginTop: 5 }} />
            <div>
              {data.problems.length === 0
                ? t('Tout va bien : disque sous les seuils et dernière sauvegarde réussie.')
                : data.problems.map((p, i) => <div key={i}>{problemText(p)}</div>)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
            <Panel icon={HardDrive} title={t('Disque')}
              right={!editing && <button type="button" onClick={() => setEditing({ ...th })} style={iconBtn} aria-label={t('Seuils d\'alerte')} title={t('Seuils d\'alerte')}><Settings2 size={15} /></button>}>
              {data.disk ? (
                <>
                  <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--fg)', lineHeight: 1 }}>{data.disk.percent} %</div>
                  <DiskBar disk={data.disk} thresholds={th} />
                  <Row label={t('Taille totale')} value={fmtBytes(data.disk.total)} />
                  <Row label={t('Utilisé')} value={fmtBytes(data.disk.used)} />
                  <Row label={t('Libre')} value={fmtBytes(data.disk.available)} />
                  <Row label={t('Seuils d\'alerte')} value={t('{{w}} % · critique {{c}} %', { w: th.warningPercent, c: th.criticalPercent })} muted />
                </>
              ) : <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Mesure du disque indisponible.')}</div>}
              {editing && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'grid', gap: 8 }}>
                  {[
                    ['warningPercent', t('Avertissement (%)')],
                    ['criticalPercent', t('Critique (%)')],
                    ['maxBackupAgeHours', t('Sauvegarde trop ancienne après (h)')],
                  ].map(([k, label]) => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 13, color: 'var(--fg)' }}>
                      {label}
                      <input type="number" value={editing[k]} onChange={e => setEditing(s => ({ ...s, [k]: e.target.value }))} style={inputStyle} />
                    </label>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button type="button" onClick={() => setEditing(null)} style={btn('var(--surface-2)', 'var(--fg)')}><X size={14} /> {t('Annuler')}</button>
                    <button type="button" onClick={saveThresholds} style={btn('var(--brand)')}><Check size={14} /> {t('Enregistrer')}</button>
                  </div>
                </div>
              )}
            </Panel>

            <Panel icon={DatabaseBackup} title={t('Dernière sauvegarde')}
              right={b?.date && <button type="button" onClick={() => openLog(b.date)} style={{ ...iconBtn, fontSize: 12, fontWeight: 600, gap: 4 }}><FileText size={14} /> {t('Journal')}</button>}>
              {b ? (
                <>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: b.ok ? LEVEL_COLOR.ok : LEVEL_COLOR.error, marginBottom: 10 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 99, background: 'currentColor' }} />
                    {b.ok ? t('Réussie') : t('Échec : {{step}}', { step: b.step })}
                  </div>
                  <Row label={t('Terminée le')} value={fmtDate(b.finishedAt, true)} />
                  {fmtDuration(b.durationSeconds) && <Row label={t('Durée')} value={fmtDuration(b.durationSeconds)} />}
                  {b.dbSize && <Row label={t('Archive de la base')} value={b.dbSize} />}
                  {b.uploadsFiles !== null && b.uploadsFiles !== undefined && <Row label={t('Documents copiés')} value={b.uploadsFiles.toLocaleString(i18n.language || 'fr')} />}
                  <Row label={t('Journal')} value={b.log || '—'} muted />
                </>
              ) : <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Aucun état de sauvegarde sur ce serveur.')}</div>}
            </Panel>

            <Panel icon={DatabaseBackup} title={t('Points de restauration')}>
              {rp ? (
                <>
                  <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--fg)', lineHeight: 1, marginBottom: 12 }}>{rp.count ?? '—'}</div>
                  <Row label={t('Plus ancien')} value={fmtDate(rp.oldest)} />
                  <Row label={t('Plus récent')} value={fmtDate(rp.newest)} />
                </>
              ) : <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Dossier des sauvegardes inaccessible.')}</div>}
            </Panel>

            <Panel icon={FolderOpen} title={t('Volume des données')}>
              {v ? (
                <>
                  <Row label={t('Documents (uploads)')} value={fmtBytes(v.uploadsBytes)} />
                  <Row label={t('Base de données')} value={fmtBytes(v.dbBytes)} />
                  <Row label={t('Sauvegardes (espace réel)')} value={fmtBytes(v.backupsBytes)} />
                  <Row label={t('Mesuré le')} value={fmtDate(v.measuredAt, true)} muted />
                </>
              ) : <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Première mesure cette nuit (après 3 h).')}</div>}
            </Panel>
          </div>

          <Panel icon={TrendingUp} title={t('Tendance')}>
            {trend?.enoughData ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 12, fontSize: 13, color: 'var(--fg)' }}>
                <div>
                  <div style={{ color: 'var(--fg-muted)' }}>{t('Croissance sur {{days}} jours', { days: Math.round(trend.spanDays) })}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{trend.growthBytes < 0 ? '−' : '+'}{fmtBytes(Math.abs(trend.growthBytes))}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--fg-muted)' }}>{t('Rythme')}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{t('{{size}} / mois', { size: fmtBytes(Math.max(trend.perMonthBytes, 0)) })}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--fg-muted)' }}>{t('Disque plein dans')}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {trend.monthsUntilFull === null ? t('pas de croissance') : t('≈ {{n}} mois', { n: trend.monthsUntilFull.toLocaleString(i18n.language || 'fr') })}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 12 }}>{t('Estimation disponible après une semaine de mesures quotidiennes.')}</div>
            )}
            {chartData.length > 1 && (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} tickLine={false} axisLine={false} unit=" Go" width={70} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--fg)' }}
                    formatter={(val, name) => [`${val.toLocaleString(i18n.language || 'fr')} Go`, name === 'used' ? t('Utilisé') : t('Taille totale')]} />
                  <Area type="monotone" dataKey="total" stroke="var(--fg-muted)" strokeDasharray="4 3" fill="none" />
                  <Area type="monotone" dataKey="used" stroke="var(--brand)" fill="var(--brand)" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </>
      )}

      {log && (
        <div role="dialog" aria-modal="true" onClick={() => setLog(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, width: 'min(900px, 100%)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <strong style={{ color: 'var(--fg)', fontSize: 14 }}>{t('Journal de la sauvegarde du {{date}}', { date: fmtDate(log.day) })}</strong>
              <button type="button" onClick={() => setLog(null)} style={iconBtn} aria-label={t('Fermer')}><X size={16} /></button>
            </div>
            {log.truncated && <div style={{ padding: '6px 16px', fontSize: 12, color: 'var(--fg-muted)' }}>{t('Fin du journal seulement (fichier volumineux).')}</div>}
            <pre style={{ margin: 0, padding: 16, overflow: 'auto', fontSize: 12, lineHeight: 1.5, color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{log.text}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
