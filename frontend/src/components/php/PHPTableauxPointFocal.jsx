// frontend/src/components/php/PHPTableauxPointFocal.jsx
// Statistiques PHP — tableaux croisés de l'Excel du Point Focal :
//  - TabTableauDuJour (Feuil8 / Feuil10) : infirmerie × type de visite × service ;
//  - TabIndicateurs (Feuil1) : visites par spécialité et par secteur, indicateurs
//    par mots-clés du diagnostic (paludisme, IST… modifiables), repos ;
//  - TabActiviteInfirmeries (Tableau PHP 2026, une feuille par mois) : par
//    infirmerie et par jour, consultations et rendez-vous (généraliste,
//    spécialiste de l'hôpital / externe), labo, pharmacie, résultats.
// Les tableaux sont exportés tels qu'affichés (utils/tableToExcel.js, une
// feuille par bloc data-export-title).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, CalendarDays, Settings2, Plus, Trash2, X, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { phpStatsAPI } from '../../services/phpService';

const TYPE_STYLE = {
  CS:    { label: 'CS',    title: 'Consultations',        bg: '#1d4ed8', light: 'rgba(29,78,216,0.07)' },
  RDV:   { label: 'RDV',   title: 'Rendez-vous de suivi', bg: '#047857', light: 'rgba(4,120,87,0.07)' },
  AUTRE: { label: 'AUTRE', title: 'Pharmacie, laboratoire, bilans…', bg: '#b45309', light: 'rgba(180,83,9,0.07)' },
  NP:    { label: 'NON PRÉCISÉ', title: 'Type de visite non saisi', bg: '#4b5563', light: 'rgba(75,85,99,0.07)' },
};
const TYPE_ORDER = ['CS', 'RDV', 'AUTRE', 'NP'];
const num = (v) => (v ? v : '');
const cell = 'text-center px-2 py-1.5 text-xs';
const border = { border: '1px solid var(--border)' };
const DARK = '#111827';

const todayISO = () => new Date().toISOString().slice(0, 10);
const frDate = (d, locale = 'fr-FR', opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) =>
  (d ? new Date(`${d}T12:00:00`).toLocaleDateString(locale, opts) : '');

function Box({ children }) {
  return <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>{children}</div>;
}
function Loading() {
  return <div className="flex justify-center py-16" style={{ color: 'var(--fg-muted)' }}><Loader size={22} className="animate-spin" /></div>;
}

// ─── Tableau du jour ──────────────────────────────────────────────────────────

export function TabTableauDuJour({ refreshKey, onPeriod }) {
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoJumped, setAutoJumped] = useState(false);

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const res = await phpStatsAPI.getTableauJour({ date: d });
      setData(res.data.data);
    } catch (err) {
      console.error('Tableau du jour :', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(date); }, [date, load, refreshKey]);
  useEffect(() => { onPeriod?.(frDate(date, i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric' })); }, [date, onPeriod, i18n.language]);

  // Rien aujourd'hui (saisie pas encore faite) : on montre le dernier jour saisi
  useEffect(() => {
    if (!autoJumped && data && !data.rows.length && data.navigation?.last && date === todayISO()) {
      setAutoJumped(true);
      setDate(String(data.navigation.last).slice(0, 10));
    }
  }, [data, autoJumped, date]);

  const pivot = useMemo(() => {
    if (!data) return null;
    const servicesByType = {};
    const cells = new Map();
    const rowTotals = new Map();
    const typeTotals = new Map();
    let grand = 0;
    for (const r of data.rows) {
      (servicesByType[r.type] ??= new Set()).add(r.service);
      const key = r.infirmerieId || 'none';
      cells.set(`${key}|${r.type}|${r.service}`, (cells.get(`${key}|${r.type}|${r.service}`) || 0) + r.n);
      cells.set(`${key}|${r.type}|*`, (cells.get(`${key}|${r.type}|*`) || 0) + r.n);
      cells.set(`*|${r.type}|${r.service}`, (cells.get(`*|${r.type}|${r.service}`) || 0) + r.n);
      rowTotals.set(key, (rowTotals.get(key) || 0) + r.n);
      typeTotals.set(r.type, (typeTotals.get(r.type) || 0) + r.n);
      grand += r.n;
    }
    const types = TYPE_ORDER.filter((tp) => servicesByType[tp]).map((tp) => ({ type: tp, services: [...servicesByType[tp]].sort() }));
    const rows = [...data.infirmeries.map((i) => ({ key: i.id, label: i.code, title: i.nom }))];
    if (rowTotals.has('none')) rows.push({ key: 'none', label: t('SANS INFIRMERIE'), title: t('Infirmerie non renseignée') });
    return { types, rows, cells, rowTotals, typeTotals, grand };
  }, [data, t]);

  const go = (d) => { if (d) setDate(String(d).slice(0, 10)); };
  const nav = data?.navigation || {};
  const navBtn = { padding: '0.45rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', color: 'var(--fg)', cursor: 'pointer' };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => go(nav.prev)} disabled={!nav.prev} style={{ ...navBtn, opacity: nav.prev ? 1 : 0.4 }} title={t('Jour saisi précédent')}><ChevronLeft size={16} /></button>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13 }} />
        <button onClick={() => go(nav.next)} disabled={!nav.next} style={{ ...navBtn, opacity: nav.next ? 1 : 0.4 }} title={t('Jour saisi suivant')}><ChevronRight size={16} /></button>
        <span className="text-sm font-semibold capitalize" style={{ color: 'var(--fg)' }}>{frDate(date, i18n.language)}</span>
        {nav.last && String(nav.last).slice(0, 10) !== date && (
          <button onClick={() => go(nav.last)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--brand)' }}>
            <CalendarDays size={13} /> {t('Dernier jour saisi')}
          </button>
        )}
        {pivot && <span className="text-xs ml-auto" style={{ color: 'var(--fg-muted)' }}>{t('{{count}} visite(s)', { count: pivot.grand })}</span>}
      </div>

      {loading ? <Box><Loading /></Box> : !pivot?.grand ? (
        <Box><div className="py-14 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>{t('Aucune visite enregistrée ce jour-là.')}</div></Box>
      ) : (
        <Box>
          <div className="overflow-x-auto" data-export-title={t('Tableau du jour')}>
            <table className="border-collapse text-xs min-w-max w-full">
              <thead>
                <tr>
                  <th rowSpan={2} className="sticky left-0 z-20 text-left font-bold px-3 py-2" style={{ background: DARK, color: '#fff', minWidth: 120 }}>{t('INFIRMERIE')}</th>
                  {pivot.types.map(({ type, services }) => (
                    <th key={type} colSpan={services.length + 1} className="text-center px-2 py-2 font-bold" title={t(TYPE_STYLE[type].title)}
                      style={{ background: TYPE_STYLE[type].bg, color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
                      {t(TYPE_STYLE[type].label)}
                    </th>
                  ))}
                  <th rowSpan={2} className="text-center px-3 py-2 font-bold" style={{ background: DARK, color: '#fff' }}>{t('TOTAL')}</th>
                </tr>
                <tr>
                  {pivot.types.map(({ type, services }) => [
                    ...services.map((s) => (
                      <th key={`${type}-${s}`} className="text-center px-2 py-1 font-semibold text-[10px]"
                        style={{ background: TYPE_STYLE[type].bg, color: '#fff', opacity: 0.92, border: '1px solid rgba(255,255,255,0.25)', minWidth: 64 }}>{s}</th>
                    )),
                    <th key={`${type}-t`} className="text-center px-2 py-1 font-bold text-[10px]"
                      style={{ background: TYPE_STYLE[type].bg, color: '#fff', border: '1px solid rgba(255,255,255,0.25)', minWidth: 56 }}>{t('Total {{type}}', { type: t(TYPE_STYLE[type].label) })}</th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {pivot.rows.map((row, ri) => (
                  <tr key={row.key} style={{ background: ri % 2 ? 'var(--surface-2)' : 'var(--surface)' }}>
                    <td className="sticky left-0 z-10 px-3 py-1.5 font-medium whitespace-nowrap" title={row.title}
                      style={{ background: 'inherit', color: 'var(--fg)', borderRight: '1px solid var(--border)' }}>{row.label}</td>
                    {pivot.types.map(({ type, services }) => [
                      ...services.map((s) => (
                        <td key={`${type}-${s}`} className={cell} style={{ ...border, color: 'var(--fg)' }}>{num(pivot.cells.get(`${row.key}|${type}|${s}`))}</td>
                      )),
                      <td key={`${type}-t`} className={`${cell} font-bold`} style={{ ...border, background: TYPE_STYLE[type].light, color: 'var(--fg)' }}>{num(pivot.cells.get(`${row.key}|${type}|*`))}</td>,
                    ])}
                    <td className={`${cell} font-bold`} style={{ ...border, color: 'var(--fg)' }}>{num(pivot.rowTotals.get(row.key))}</td>
                  </tr>
                ))}
                <tr style={{ background: DARK, color: '#fff', fontWeight: 700 }}>
                  <td className="sticky left-0 z-10 px-3 py-2" style={{ background: DARK }}>{t('TOTAL GÉNÉRAL')}</td>
                  {pivot.types.map(({ type, services }) => [
                    ...services.map((s) => <td key={`${type}-${s}`} className={cell} style={{ border: '1px solid #374151' }}>{num(pivot.cells.get(`*|${type}|${s}`))}</td>),
                    <td key={`${type}-t`} className={cell} style={{ border: '1px solid #374151', background: TYPE_STYLE[type].bg }}>{pivot.typeTotals.get(type)}</td>,
                  ])}
                  <td className={cell} style={{ border: '1px solid #374151' }}>{pivot.grand}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div data-export-note className="px-4 py-2 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
            {t('Infirmerie du lieu de la visite, comme sur la ligne de l\'Excel du Point Focal. CS : consultation · RDV : rendez-vous de suivi · AUTRE : pharmacie, laboratoire, bilans…')}
          </div>
        </Box>
      )}
    </div>
  );
}

// ─── Indicateurs ──────────────────────────────────────────────────────────────

/** Tableau libellé × type de visite (+ total), trié par total décroissant. */
function TypePivot({ title, subtitle, rows, emptyLabel, firstCol }) {
  const { t } = useTranslation();
  const { lines, types, totals, grand } = useMemo(() => {
    const byLabel = new Map();
    const present = new Set();
    for (const r of rows) {
      present.add(r.type);
      const l = byLabel.get(r.libelle) || { libelle: r.libelle, total: 0 };
      l[r.type] = (l[r.type] || 0) + r.n;
      l.total += r.n;
      byLabel.set(r.libelle, l);
    }
    const ty = TYPE_ORDER.filter((x) => present.has(x));
    const tot = Object.fromEntries(ty.map((x) => [x, rows.filter((r) => r.type === x).reduce((s, r) => s + r.n, 0)]));
    return { lines: [...byLabel.values()].sort((a, b) => b.total - a.total || a.libelle.localeCompare(b.libelle)), types: ty, totals: tot, grand: rows.reduce((s, r) => s + r.n, 0) };
  }, [rows]);

  return (
    <Box>
      <div className="px-4 py-2.5 flex items-baseline justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{title}</div>
          {subtitle && <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{subtitle}</div>}
        </div>
        <div className="text-lg font-bold" style={{ color: 'var(--brand)' }}>{grand}</div>
      </div>
      {!lines.length ? (
        <div className="py-8 text-center text-xs" style={{ color: 'var(--fg-muted)' }}>{emptyLabel || t('Aucune donnée sur la période')}</div>
      ) : (
        <div className="overflow-x-auto" style={{ maxHeight: 420 }} data-export-title={title}>
          <table className="border-collapse text-xs w-full">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 font-bold sticky top-0" style={{ background: DARK, color: '#fff' }}>{firstCol}</th>
                {types.map((x) => <th key={x} className="text-center px-2 py-2 font-bold sticky top-0" style={{ background: TYPE_STYLE[x].bg, color: '#fff', minWidth: 52 }}>{t(TYPE_STYLE[x].label)}</th>)}
                <th className="text-center px-2 py-2 font-bold sticky top-0" style={{ background: DARK, color: '#fff', minWidth: 52 }}>{t('TOTAL')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.libelle} style={{ background: i % 2 ? 'var(--surface-2)' : 'var(--surface)' }}>
                  <td className="px-3 py-1.5" style={{ ...border, color: 'var(--fg)' }}>{l.libelle}</td>
                  {types.map((x) => <td key={x} className={cell} style={{ ...border, color: 'var(--fg)' }}>{num(l[x])}</td>)}
                  <td className={`${cell} font-bold`} style={{ ...border, color: 'var(--fg)' }}>{l.total}</td>
                </tr>
              ))}
              <tr style={{ background: DARK, color: '#fff', fontWeight: 700 }}>
                <td className="px-3 py-1.5">{t('TOTAL')}</td>
                {types.map((x) => <td key={x} className={cell} style={{ border: '1px solid #374151' }}>{totals[x]}</td>)}
                <td className={cell} style={{ border: '1px solid #374151' }}>{grand}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Box>
  );
}

function IndicateursEditor({ onClose, onSaved }) {
  const { t } = useTranslation();
  const [items, setItems] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    phpStatsAPI.getIndicateursConfig()
      .then((res) => setItems(res.data.data.map((r) => ({ libelle: r.libelle, mots: r.motsCles.join(', ') }))))
      .catch(() => setItems([]));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await phpStatsAPI.saveIndicateursConfig({
        indicateurs: items.map((it) => ({ libelle: it.libelle, motsCles: it.mots.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean) })),
      });
      toast.success(t('Indicateurs enregistrés'));
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Enregistrement impossible.'));
    } finally {
      setSaving(false);
    }
  };

  const input = { width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' };
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl overflow-hidden flex flex-col" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-3)', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--fg)' }}><Settings2 size={17} /> {t('Indicateurs par diagnostic')}</h2>
          <button onClick={onClose} aria-label={t('Fermer')} style={{ color: 'var(--fg-muted)' }}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            {t('Un diagnostic compte s\'il contient un mot qui commence par l\'un des mots-clés (sans tenir compte des accents ni des majuscules). Exemple : « PALU » compte PALUDISME GRAVE et SUIVI PALUDISME ; « IST » ne compte pas PERSISTANT.')}
          </p>
          {!items ? <Loading /> : items.map((it, i) => (
            <div key={i} className="rounded-lg p-3 space-y-2" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <div className="flex gap-2">
                <input value={it.libelle} placeholder={t('Nom (ex. Paludisme)')} style={input}
                  onChange={(e) => setItems((p) => p.map((x, j) => (j === i ? { ...x, libelle: e.target.value } : x)))} />
                <button onClick={() => setItems((p) => p.filter((_, j) => j !== i))} aria-label={t('Supprimer')} className="px-2" style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
              </div>
              <textarea value={it.mots} rows={2} placeholder={t('Mots-clés séparés par des virgules (ex. PALU)')} style={{ ...input, resize: 'vertical' }}
                onChange={(e) => setItems((p) => p.map((x, j) => (j === i ? { ...x, mots: e.target.value } : x)))} />
            </div>
          ))}
          {items && (
            <button onClick={() => setItems((p) => [...p, { libelle: '', mots: '' }])} className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--brand)' }}>
              <Plus size={15} /> {t('Ajouter un indicateur')}
            </button>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--fg)' }}>{t('Annuler')}</button>
          <button onClick={save} disabled={!items || saving} className="px-4 py-2 text-sm rounded-lg font-medium" style={{ background: 'var(--brand)', color: '#fff', opacity: saving ? 0.6 : 1 }}>
            {saving ? t('Enregistrement…') : t('Enregistrer')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TabIndicateurs({ refreshKey, onPeriod, canWrite }) {
  const { t, i18n } = useTranslation();
  const today = todayISO();
  const [du, setDu] = useState(`${today.slice(0, 4)}-01-01`);
  const [au, setAu] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    phpStatsAPI.getIndicateurs({ du, au })
      .then((res) => { if (alive) setData(res.data.data); })
      .catch((err) => { console.error('Indicateurs :', err); if (alive) setData(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [du, au, refreshKey, reload]);

  const short = (d) => frDate(d, i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric' });
  useEffect(() => { onPeriod?.(t('du {{du}} au {{au}}', { du: short(du), au: short(au) })); }, [du, au, onPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Raccourcis de période
  const setRange = (a, b) => { setDu(a); setAu(b); };
  const ym = (d) => d.toISOString().slice(0, 7);
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const monthEnd = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 12).toISOString().slice(0, 10);
  const presets = [
    [t('Ce mois'), `${ym(now)}-01`, today],
    [t('Mois dernier'), `${ym(lastMonth)}-01`, monthEnd(lastMonth)],
    [t('Cette année'), `${today.slice(0, 4)}-01-01`, today],
  ];
  const dateInput = { padding: '6px 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13 };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>{t('Du')}
          <input type="date" value={du} max={au} onChange={(e) => e.target.value && setDu(e.target.value)} style={dateInput} />
        </label>
        <label className="text-xs flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>{t('au')}
          <input type="date" value={au} min={du} onChange={(e) => e.target.value && setAu(e.target.value)} style={dateInput} />
        </label>
        {presets.map(([label, a, b]) => (
          <button key={label} onClick={() => setRange(a, b)} className="px-2.5 py-1.5 text-xs rounded-lg"
            style={{ background: du === a && au === b ? 'var(--brand)' : 'var(--surface)', color: du === a && au === b ? '#fff' : 'var(--fg)', border: '1px solid var(--border)' }}>
            {label}
          </button>
        ))}
        {canWrite && (
          <button onClick={() => setEditing(true)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--brand)' }}>
            <Settings2 size={13} /> {t('Modifier les indicateurs')}
          </button>
        )}
      </div>

      {loading ? <Box><Loading /></Box> : !data ? (
        <Box><div className="py-14 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>{t('Indicateurs indisponibles.')}</div></Box>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.indicateurs.map((ind) => (
              <TypePivot key={ind.id} title={t('{{name}} — par secteur', { name: ind.libelle })}
                subtitle={t('Mots-clés : {{list}}', { list: ind.motsCles.join(', ') })}
                rows={ind.rows} firstCol={t('SECTEUR')} emptyLabel={t('Aucun cas sur la période')} />
            ))}
            {!data.indicateurs.length && (
              <Box><div className="py-8 px-4 text-center text-xs" style={{ color: 'var(--fg-muted)' }}>{t('Aucun indicateur par diagnostic n\'est défini.')}</div></Box>
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <TypePivot title={t('Visites par spécialité')} subtitle={t('Consultations, rendez-vous et autres visites, par service')} rows={data.parService} firstCol={t('SPÉCIALITÉ')} />
            <TypePivot title={t('Évacuations par secteur')} subtitle={t('Patients venus de chaque secteur de travail')} rows={data.parSecteur} firstCol={t('SECTEUR')} />
          </div>
          <Box>
            <div className="px-4 py-2.5 flex items-baseline justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{t('Repos par spécialité')}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{t('Repos maladie commencés sur la période, par service de la consultation')}</div>
              </div>
              <div className="text-lg font-bold" style={{ color: 'var(--brand)' }}>{data.repos.reduce((s, r) => s + r.n, 0)}</div>
            </div>
            {!data.repos.length ? (
              <div className="py-8 text-center text-xs" style={{ color: 'var(--fg-muted)' }}>{t('Aucun repos sur la période')}</div>
            ) : (
              <div className="overflow-x-auto" data-export-title={t('Repos par spécialité')}>
                <table className="border-collapse text-xs w-full">
                  <thead>
                    <tr>
                      <th className="text-left px-3 py-2 font-bold" style={{ background: DARK, color: '#fff' }}>{t('SPÉCIALITÉ')}</th>
                      <th className="text-center px-2 py-2 font-bold" style={{ background: '#7c3aed', color: '#fff' }}>{t('REPOS')}</th>
                      <th className="text-center px-2 py-2 font-bold" style={{ background: '#7c3aed', color: '#fff' }}>{t('JOURS ACCORDÉS')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.repos.map((r, i) => (
                      <tr key={r.libelle} style={{ background: i % 2 ? 'var(--surface-2)' : 'var(--surface)' }}>
                        <td className="px-3 py-1.5" style={{ ...border, color: 'var(--fg)' }}>{r.libelle}</td>
                        <td className={cell} style={{ ...border, color: 'var(--fg)' }}>{r.n}</td>
                        <td className={cell} style={{ ...border, color: 'var(--fg)' }}>{r.jours}</td>
                      </tr>
                    ))}
                    <tr style={{ background: DARK, color: '#fff', fontWeight: 700 }}>
                      <td className="px-3 py-1.5">{t('TOTAL')}</td>
                      <td className={cell}>{data.repos.reduce((s, r) => s + r.n, 0)}</td>
                      <td className={cell}>{data.repos.reduce((s, r) => s + r.jours, 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Box>
          <div data-export-note className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            {t('Secteur et infirmerie du lieu de la visite, comme sur la ligne de l\'Excel du Point Focal.')}
          </div>
        </>
      )}

      {editing && <IndicateursEditor onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setReload((x) => x + 1); }} />}
    </div>
  );
}

// ─── Activité des infirmeries (Tableau PHP 2026) ──────────────────────────────

const ACT_GROUPES = [
  { label: 'CONSULTATION', bg: TYPE_STYLE.CS.bg, cols: [['cs_gen', 'Généraliste'], ['cs_int', 'Spécialiste Int'], ['cs_ext', 'Spécialiste Ext']] },
  { label: 'RENDEZ-VOUS', bg: TYPE_STYLE.RDV.bg, cols: [['rdv_gen', 'Généraliste'], ['rdv_int', 'Spécialiste Int'], ['rdv_ext', 'Spécialiste Ext']] },
  { label: 'AUTRES', bg: TYPE_STYLE.AUTRE.bg, cols: [['labo', 'Labo'], ['pharmacie', 'Pharmacie'], ['resultat', 'Présentation résultat']] },
];
const ACT_COLS = ACT_GROUPES.flatMap((g) => g.cols.map(([key, label]) => ({ key, label, bg: g.bg })));
const NCOLS = ACT_COLS.length;
const TOTAL_BG = 'rgba(17,24,39,0.06)';
const hd = { border: '1px solid rgba(255,255,255,0.25)', color: '#fff' };

/** Tableau infirmeries × blocs (jours, semaines, mois) × 9 colonnes du Point Focal. */
function ActiviteTable({ title, weeks, blocks, rows, value }) {
  const { t } = useTranslation();
  const headRows = weeks ? 4 : 3;
  return (
    <div className="overflow-x-auto" data-export-title={title}>
      <table className="border-collapse text-xs min-w-max">
        <thead>
          {weeks && (
            <tr>
              <th rowSpan={headRows} className="sticky left-0 z-20 text-left font-bold px-3 py-2" style={{ background: DARK, color: '#fff', minWidth: 120 }}>{t('INFIRMERIES')}</th>
              {weeks.map((w) => (
                <th key={w.key} colSpan={w.span * NCOLS} className="text-center px-2 py-1.5 font-bold" style={{ ...hd, background: '#374151' }}>{w.label}</th>
              ))}
            </tr>
          )}
          <tr>
            {!weeks && <th rowSpan={headRows} className="sticky left-0 z-20 text-left font-bold px-3 py-2" style={{ background: DARK, color: '#fff', minWidth: 120 }}>{t('INFIRMERIES')}</th>}
            {blocks.map((b) => (
              <th key={b.key} colSpan={NCOLS} className="text-center px-2 py-1.5 font-bold whitespace-nowrap" title={b.title}
                style={{ ...hd, background: b.total ? DARK : '#4b5563' }}>{b.label}</th>
            ))}
          </tr>
          <tr>
            {blocks.map((b) => ACT_GROUPES.map((g) => (
              <th key={`${b.key}-${g.label}`} colSpan={g.cols.length} className="text-center px-2 py-1 font-bold text-[10px]" style={{ ...hd, background: g.bg }}>{t(g.label)}</th>
            )))}
          </tr>
          <tr>
            {blocks.map((b) => ACT_COLS.map((c) => (
              <th key={`${b.key}-${c.key}`} className="text-center px-1 py-1 font-semibold text-[10px] leading-tight" style={{ ...hd, background: c.bg, opacity: 0.92, minWidth: 58, maxWidth: 72, whiteSpace: 'normal' }}>{t(c.label)}</th>
            )))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.key} style={{ background: ri % 2 ? 'var(--surface-2)' : 'var(--surface)' }}>
              <td className="sticky left-0 z-10 px-3 py-1.5 font-medium whitespace-nowrap" title={row.title}
                style={{ background: 'inherit', color: 'var(--fg)', borderRight: '1px solid var(--border)' }}>{row.label}</td>
              {blocks.map((b) => ACT_COLS.map((c) => (
                <td key={`${b.key}-${c.key}`} className={`${cell} ${b.total ? 'font-bold' : ''}`}
                  style={{ ...border, color: 'var(--fg)', background: b.total ? TOTAL_BG : undefined }}>{num(value(row.key, b.dates, c.key))}</td>
              )))}
            </tr>
          ))}
          <tr style={{ background: DARK, color: '#fff', fontWeight: 700 }}>
            <td className="sticky left-0 z-10 px-3 py-2" style={{ background: DARK }}>{t('TOTAL')}</td>
            {blocks.map((b) => ACT_COLS.map((c) => (
              <td key={`${b.key}-${c.key}`} className={cell} style={{ border: '1px solid #374151' }}>{value('*', b.dates, c.key) || 0}</td>
            )))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function TabActiviteInfirmeries({ refreshKey, onPeriod }) {
  const { t, i18n } = useTranslation();
  const [mois, setMois] = useState(todayISO().slice(0, 7));
  const [vue, setVue] = useState('semaine');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoJumped, setAutoJumped] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    phpStatsAPI.getActivite({ mois })
      .then((res) => { if (alive) setData(res.data.data); })
      .catch((err) => { console.error('Activité des infirmeries :', err); if (alive) setData(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [mois, refreshKey]);

  const moisLabel = (m) => new Date(`${m}-15T12:00:00`).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
  useEffect(() => { onPeriod?.(moisLabel(mois)); }, [mois, onPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mois en cours encore vide : on montre le dernier mois saisi
  useEffect(() => {
    if (!autoJumped && data && !data.rows.length && data.dernierMois && data.dernierMois !== mois && mois === todayISO().slice(0, 7)) {
      setAutoJumped(true);
      setMois(data.dernierMois);
    }
  }, [data, autoJumped, mois]);

  const pivot = useMemo(() => {
    if (!data || data.mois !== mois) return null;
    const cells = new Map();
    const add = (k, n) => cells.set(k, (cells.get(k) || 0) + n);
    let grand = 0;
    const parGroupe = [0, 0, 0];
    for (const r of data.rows) {
      const inf = r.infirmerieId || 'none';
      add(`${inf}|${r.date}|${r.col}`, r.n);
      add(`*|${r.date}|${r.col}`, r.n);
      add(`*|${r.date}`, r.n);
      grand += r.n;
      parGroupe[ACT_GROUPES.findIndex((g) => g.cols.some(([k]) => k === r.col))] += r.n;
    }
    const value = (inf, dates, col) => dates.reduce((s, d) => s + (cells.get(`${inf}|${d}|${col}`) || 0), 0);
    const short = (d, opts) => new Date(`${d}T12:00:00`).toLocaleDateString(i18n.language, opts);
    const range = (w) => `${short(w.jours[0], { day: 'numeric' })}–${short(w.jours.at(-1), { day: 'numeric', month: 'short' })}`;
    const tous = data.semaines.flatMap((w) => w.jours);
    const totalMois = { key: 'mois', label: t('TOTAL DU MOIS'), dates: tous, total: true };

    const blocsSemaine = [
      ...data.semaines.map((w) => ({ key: `s${w.numero}`, label: t('SEMAINE {{num}}', { num: w.numero }), title: range(w), dates: w.jours })),
      totalMois,
    ];
    // Par jour : jours où au moins une visite est enregistrée, puis le total de la semaine
    const weeks = [];
    const blocsJour = [];
    for (const w of data.semaines) {
      const jours = w.jours.filter((d) => cells.get(`*|${d}`));
      if (!jours.length) continue;
      weeks.push({ key: `w${w.numero}`, label: `${t('SEMAINE {{num}}', { num: w.numero })} (${range(w)})`, span: jours.length + 1 });
      blocsJour.push(...jours.map((d) => ({ key: d, label: short(d, { weekday: 'short', day: 'numeric' }), dates: [d] })));
      blocsJour.push({ key: `t${w.numero}`, label: t('TOTAL SEMAINE {{num}}', { num: w.numero }), dates: w.jours, total: true });
    }
    weeks.push({ key: 'wm', label: t('MOIS'), span: 1 });
    blocsJour.push(totalMois);

    const rows = data.infirmeries.map((i) => ({ key: i.id, label: i.code, title: i.nom }));
    if (data.rows.some((r) => !r.infirmerieId)) rows.push({ key: 'none', label: t('SANS INFIRMERIE'), title: t('Infirmerie non renseignée') });
    return { value, rows, grand, parGroupe, blocsSemaine, blocsJour, weeks };
  }, [data, mois, t, i18n.language]);

  const shift = (delta) => {
    const [y, m] = mois.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMois(d.toISOString().slice(0, 7));
  };
  const isCurrent = mois >= todayISO().slice(0, 7);
  const navBtn = { padding: '0.45rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', color: 'var(--fg)', cursor: 'pointer' };
  const toggle = (k) => ({
    background: vue === k ? 'var(--surface)' : 'transparent', color: vue === k ? 'var(--fg)' : 'var(--fg-muted)',
    boxShadow: vue === k ? 'var(--shadow-1)' : 'none',
  });

  const jour = pivot && <ActiviteTable title={t('Activité par jour')} weeks={pivot.weeks} blocks={pivot.blocsJour} rows={pivot.rows} value={pivot.value} />;
  const semaine = pivot && <ActiviteTable title={t('Activité par semaine')} blocks={pivot.blocsSemaine} rows={pivot.rows} value={pivot.value} />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => shift(-1)} style={navBtn} title={t('Mois précédent')}><ChevronLeft size={16} /></button>
        <input type="month" value={mois} max={todayISO().slice(0, 7)} onChange={(e) => e.target.value && setMois(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13 }} />
        <button onClick={() => shift(1)} disabled={isCurrent} style={{ ...navBtn, opacity: isCurrent ? 0.4 : 1 }} title={t('Mois suivant')}><ChevronRight size={16} /></button>
        <span className="text-sm font-semibold capitalize" style={{ color: 'var(--fg)' }}>{moisLabel(mois)}</span>
        <div className="flex gap-1 rounded-lg p-0.5 ml-auto" style={{ background: 'var(--surface-3)' }}>
          <button onClick={() => setVue('semaine')} className="px-3 py-1.5 text-xs rounded-md font-medium" style={toggle('semaine')}>{t('Par semaine')}</button>
          <button onClick={() => setVue('jour')} className="px-3 py-1.5 text-xs rounded-md font-medium" style={toggle('jour')}>{t('Par jour')}</button>
        </div>
      </div>

      {loading && !pivot ? <Box><Loading /></Box> : !pivot?.grand ? (
        <Box><div className="py-14 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>{t('Aucune visite enregistrée ce mois-ci.')}</div></Box>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[[t('Visites'), pivot.grand, 'var(--brand)'], ...ACT_GROUPES.map((g, i) => [t(g.label), pivot.parGroupe[i], g.bg])].map(([label, n, color]) => (
              <div key={label} data-export-kpi={label} className="rounded-xl px-4 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>{label}</div>
                <div data-kpi-value className="text-2xl font-bold" style={{ color }}>{n}</div>
              </div>
            ))}
          </div>
          <Box>
            {vue === 'jour' ? jour : semaine}
            {/* Le fichier Excel contient les deux présentations : par jour (comme le tableau du Point Focal) et par semaine */}
            <div data-export-only style={{ display: 'none' }}>{vue === 'jour' ? semaine : jour}</div>
            <div data-export-note className="px-4 py-2 text-xs space-y-0.5" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
              <div>{t('Spécialiste Int : spécialiste de l\'hôpital (chirurgie, gynécologie, PMI…). Spécialiste Ext : spécialiste externe qui consulte à l\'hôpital (dentiste, ophtalmologie, ORL, gastro-entérologie, urologie, chirurgie pédiatrique).')}</div>
              <div>{t('Labo : laboratoire, radiologie, échographie. Présentation résultat : visite « AUTRE » vers un médecin. Semaines du lundi au dimanche ; infirmerie du lieu de la visite.')}</div>
              {data.sansType > 0 && <div>{t('{{count}} visite(s) sans type saisi comptée(s) en consultation.', { count: data.sansType })}</div>}
            </div>
          </Box>
        </>
      )}
    </div>
  );
}
