// frontend/src/pages/PHPStatistiques.jsx
// Rapport statistique PHP — Format calqué sur le fichier Excel HSJM
// 5 onglets : Journalier | Synthèse mensuelle | Trimestriel | Hospitalisations | Repos maladie

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, ChevronLeft, ChevronRight, Download, RefreshCw,
  ArrowLeft, BedDouble, Users, Activity, TrendingUp, FileSpreadsheet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { phpStatsAPI } from '../services/phpService';
import i18n from '../i18n/config';

// ─── Constantes ───────────────────────────────────────────────────────────────
const getMois = (t) => ['','Janvier','Février','Mars','Avril','Mai','Juin',
              'Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map(m => m ? t(m) : m);

// Week colors as inline style objects (bg and text used in table headers)
const WEEK_COLORS = [
  { bg: '#6d28d9', text: '#fff', light: 'rgba(109,40,217,0.07)' },
  { bg: '#2563eb', text: '#fff', light: 'rgba(37,99,235,0.07)'  },
  { bg: '#15803d', text: '#fff', light: 'rgba(21,128,61,0.07)'  },
  { bg: '#ea580c', text: '#fff', light: 'rgba(234,88,12,0.07)'  },
];

const TRIM_COLORS = [
  { bg: '#ea580c', text: '#fff' },
  { bg: '#0f766e', text: '#fff' },
  { bg: '#15803d', text: '#fff' },
];

const fmt = (v) => (v === 0 || v == null)
  ? <span style={{ color: 'var(--fg-subtle)' }}>–</span>
  : v;

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, colorStyle }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="inline-flex p-2 rounded-lg mb-2" style={colorStyle}>{icon}</div>
      <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{value}</p>
      <p className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--fg-muted)' }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--fg-subtle)' }}>{sub}</p>}
    </div>
  );
}

// ─── Tableau Journalier ───────────────────────────────────────────────────────
function TabJournalier({ data, loading }) {
  const { t } = useTranslation();
  if (loading) return <LoadingBox />;
  if (!data) return <EmptyBox label={t('Aucune donnée pour cette période')} />;

  const { infirmeries, semaines, totauxMois } = data;
  const global = totauxMois.global;
  const pInf   = totauxMois.parInfirmerie;
  const repos   = (data.reposMaladie || []).reduce((s, r) => s + r.totalJours, 0);

  const ratioPct = global.recus > 0
    ? ((global.hospi / global.recus) * 100).toFixed(1) + '%'
    : '–';

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={<Users size={18}/>} label={t('Déclarations')} value={global.declarations}
          colorStyle={{ background: 'rgba(99,102,241,0.1)', color: 'rgb(99,102,241)' }} />
        <KpiCard icon={<Activity size={18}/>} label={t('Reçus à HSJM')} value={global.recus}
          colorStyle={{ background: 'rgba(245,158,11,0.1)', color: 'rgb(217,119,6)' }} />
        <KpiCard icon={<BedDouble size={18}/>} label={t('Hospitalisés')} value={global.hospi}
          colorStyle={{ background: 'var(--danger-soft)', color: 'var(--danger)' }} />
        <KpiCard icon={<TrendingUp size={18}/>} label={t('Ratio Hospi/Reçus')} value={ratioPct}
          sub={`${global.hospi} / ${global.recus}`}
          colorStyle={{ background: 'rgba(168,85,247,0.1)', color: 'rgb(147,51,234)' }} />
        <KpiCard icon={<FileSpreadsheet size={18}/>} label={t('Jours repos maladie')} value={repos}
          colorStyle={{ background: 'var(--success-soft)', color: 'var(--success)' }} />
      </div>

      {/* Grand tableau scrollable */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="border-collapse text-xs min-w-max">
            <thead>
              {/* Ligne 1 : SEMAINES + TOTAL MOIS */}
              <tr>
                <th rowSpan={3}
                  className="sticky left-0 z-30 text-left text-xs font-bold px-3 py-2"
                  style={{ background: '#1f2937', color: '#fff', borderRight: '1px solid #4b5563', minWidth: '120px' }}>
                  {t('INFIRMERIE PHP')}
                </th>
                {semaines.map((s, si) => {
                  const c = WEEK_COLORS[si] || WEEK_COLORS[3];
                  const span = s.jours.length * 3 + 3;
                  return (
                    <th key={si} colSpan={span}
                      className="text-center px-2 py-1.5 font-bold text-xs"
                      style={{ background: c.bg, color: c.text, border: '1px solid rgba(255,255,255,0.2)' }}>
                      {t('SEMAINE {{num}}', { num: s.numero })}
                    </th>
                  );
                })}
                <th colSpan={3}
                  className="text-center px-2 py-1.5 font-bold text-xs"
                  style={{ background: '#0891b2', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                  {t('TOTAL DU MOIS')}
                </th>
              </tr>

              {/* Ligne 2 : numéros de jour + TOT Sn */}
              <tr>
                {semaines.map((s, si) => {
                  const c = WEEK_COLORS[si] || WEEK_COLORS[3];
                  return [
                    ...s.jours.map(j => (
                      <th key={j.date} colSpan={3}
                        className="text-center px-1 py-1 font-semibold text-xs"
                        style={{ background: c.bg, color: c.text, border: '1px solid rgba(255,255,255,0.2)' }}>
                        {j.jourNum}
                      </th>
                    )),
                    <th key={`tot${si}`} colSpan={3}
                      className="text-center px-1 py-1 font-bold text-xs"
                      style={{ background: '#1f2937', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                      {t('TOT S{{num}}', { num: s.numero })}
                    </th>,
                  ];
                })}
              </tr>

              {/* Ligne 3 : D / R / H pour chaque colonne */}
              <tr>
                {semaines.map((s, si) => {
                  const c = WEEK_COLORS[si] || WEEK_COLORS[3];
                  const cols = [];
                  s.jours.forEach(j => {
                    ['D','R','H'].forEach(lbl => {
                      cols.push(
                        <th key={`${j.date}-${lbl}`}
                          className="text-center px-1 py-0.5 font-normal text-[10px]"
                          style={{ background: c.bg, color: c.text, opacity: 0.9, border: '1px solid rgba(255,255,255,0.2)', minWidth: '28px' }}>
                          {lbl}
                        </th>
                      );
                    });
                  });
                  // TOT semaine
                  ['D','R','H'].forEach(lbl => {
                    cols.push(
                      <th key={`tot${si}-${lbl}`}
                        className="text-center px-1 py-0.5 font-semibold text-[10px]"
                        style={{ background: '#374151', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.2)', minWidth: '28px' }}>
                        {lbl}
                      </th>
                    );
                  });
                  return cols;
                })}
                {['D','R','H'].map(lbl => (
                  <th key={`mois-${lbl}`}
                    className="text-center px-1 py-0.5 font-semibold text-[10px]"
                    style={{ background: '#0e7490', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', minWidth: '32px' }}>
                    {lbl}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {infirmeries.map((inf, ri) => {
                const totInf = pInf[inf.code] || { declarations: 0, recus: 0, hospi: 0 };
                return (
                  <tr key={inf.code}
                    style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                    <td className="sticky left-0 z-20 px-3 py-1.5 font-medium text-xs whitespace-nowrap"
                      style={{ background: 'inherit', color: 'var(--fg)', borderRight: '1px solid var(--border)' }}>
                      {inf.code.replace('INF_', '')}
                    </td>
                    {semaines.map((s, si) => {
                      const c = WEEK_COLORS[si] || WEEK_COLORS[3];
                      const totSem = s.totaux.parInfirmerie[inf.code] || { declarations: 0, recus: 0, hospi: 0 };
                      return [
                        ...s.jours.map(j => {
                          const v = j.parInfirmerie[inf.code] || { declarations: 0, recus: 0, hospi: 0 };
                          return [
                            <td key={`${j.date}-d`} className="text-center px-1 py-1.5 text-xs" style={{ background: c.light, border: '1px solid var(--border)' }}>{fmt(v.declarations)}</td>,
                            <td key={`${j.date}-r`} className="text-center px-1 py-1.5 text-xs" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid var(--border)' }}>{fmt(v.recus)}</td>,
                            <td key={`${j.date}-h`} className="text-center px-1 py-1.5 text-xs" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid var(--border)' }}>{fmt(v.hospi)}</td>,
                          ];
                        }),
                        <td key={`ts${si}-d`} className="text-center px-1 py-1.5 text-xs font-semibold" style={{ background: c.light, border: '1px solid var(--border)' }}>{fmt(totSem.declarations)}</td>,
                        <td key={`ts${si}-r`} className="text-center px-1 py-1.5 text-xs font-semibold" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid var(--border)' }}>{fmt(totSem.recus)}</td>,
                        <td key={`ts${si}-h`} className="text-center px-1 py-1.5 text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid var(--border)' }}>{fmt(totSem.hospi)}</td>,
                      ];
                    })}
                    <td className="text-center px-1 py-1.5 text-xs font-bold" style={{ background: 'rgba(14,116,164,0.1)', border: '1px solid rgba(8,145,178,0.3)', color: 'rgb(99,102,241)' }}>{fmt(totInf.declarations)}</td>
                    <td className="text-center px-1 py-1.5 text-xs font-bold" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(8,145,178,0.3)', color: 'rgb(217,119,6)' }}>{fmt(totInf.recus)}</td>
                    <td className="text-center px-1 py-1.5 text-xs font-bold" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(8,145,178,0.3)', color: 'var(--danger)' }}>{fmt(totInf.hospi)}</td>
                  </tr>
                );
              })}

              {/* Ligne TOTAL */}
              <tr style={{ background: '#111827', color: '#fff', fontWeight: 'bold' }}>
                <td className="sticky left-0 z-20 px-3 py-2 text-xs" style={{ background: '#111827', borderRight: '1px solid #4b5563' }}>
                  {t('TOTAL')}
                </td>
                {semaines.map((s, si) => {
                  const gS = s.totaux.global;
                  return [
                    ...s.jours.map(j => [
                      <td key={`${j.date}-d-tot`} className="text-center px-1 py-2 text-xs" style={{ border: '1px solid #374151', color: '#a5b4fc' }}>{fmt(j.totaux.declarations)}</td>,
                      <td key={`${j.date}-r-tot`} className="text-center px-1 py-2 text-xs" style={{ border: '1px solid #374151', color: '#fcd34d' }}>{fmt(j.totaux.recus)}</td>,
                      <td key={`${j.date}-h-tot`} className="text-center px-1 py-2 text-xs" style={{ border: '1px solid #374151', color: '#fca5a5' }}>{fmt(j.totaux.hospi)}</td>,
                    ]),
                    <td key={`gs${si}-d`} className="text-center px-1 py-2 text-xs font-bold" style={{ border: '1px solid #4b5563', color: '#a5b4fc' }}>{fmt(gS.declarations)}</td>,
                    <td key={`gs${si}-r`} className="text-center px-1 py-2 text-xs font-bold" style={{ border: '1px solid #4b5563', color: '#fcd34d' }}>{fmt(gS.recus)}</td>,
                    <td key={`gs${si}-h`} className="text-center px-1 py-2 text-xs font-bold" style={{ border: '1px solid #4b5563', color: '#fca5a5' }}>{fmt(gS.hospi)}</td>,
                  ];
                })}
                <td className="text-center px-1 py-2 text-xs font-bold" style={{ background: '#164e63', border: '1px solid #0e7490', color: '#c7d2fe' }}>{global.declarations}</td>
                <td className="text-center px-1 py-2 text-xs font-bold" style={{ background: '#164e63', border: '1px solid #0e7490', color: '#fde68a' }}>{global.recus}</td>
                <td className="text-center px-1 py-2 text-xs font-bold" style={{ background: '#164e63', border: '1px solid #0e7490', color: '#fecaca' }}>{global.hospi}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Légende */}
        <div className="px-4 py-2 flex flex-wrap gap-4 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: '#c7d2fe' }}/>{t('D = Déclarations des malades par infirmerie PHP')}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: '#fde68a' }}/>{t('R = Patients reçus à HSJM')}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: '#fecaca' }}/>{t('H = Hospitalisés')}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Tableau Synthèse Mensuelle ───────────────────────────────────────────────
function TabSyntheseMensuelle({ data, loading }) {
  const { t } = useTranslation();
  if (loading) return <LoadingBox />;
  if (!data) return <EmptyBox label={t('Aucune donnée pour cette période')} />;

  const { infirmeries, semaines, totauxMois } = data;
  const colSpecs = [
    ...semaines.map((s, i) => ({ label: t('SYNTHÈSE S{{num}}', { num: s.numero }), ...(WEEK_COLORS[i] || WEEK_COLORS[3]), data: s.totaux.parInfirmerie, global: s.totaux.global })),
    { label: t('TOTAL GLOBAL'), bg: '#1f2937', text: '#fff', light: 'var(--surface-2)', data: totauxMois.parInfirmerie, global: totauxMois.global },
  ];

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs min-w-max w-full">
          <thead>
            <tr>
              <th rowSpan={2} className="sticky left-0 z-20 text-left font-bold px-4 py-2"
                style={{ background: '#1f2937', color: '#fff', borderRight: '1px solid #4b5563', minWidth: '120px' }}>
                {t('INFIRMERIE PHP')}
              </th>
              {colSpecs.map((c, i) => (
                <th key={i} colSpan={3}
                  className="text-center px-3 py-2 font-bold"
                  style={{ background: c.bg, color: c.text, border: '1px solid rgba(255,255,255,0.2)' }}>
                  {c.label}
                </th>
              ))}
            </tr>
            <tr>
              {colSpecs.map((c, i) =>
                [t('DÉCL.'), t('REÇUS'), t('HOSPI')].map(lbl => (
                  <th key={`${i}-${lbl}`}
                    className="text-center px-3 py-1 font-normal text-[10px]"
                    style={{ background: c.bg, color: c.text, opacity: 0.9, border: '1px solid rgba(255,255,255,0.2)', minWidth: '50px' }}>
                    {lbl}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {infirmeries.map((inf, ri) => (
              <tr key={inf.code}
                style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                <td className="sticky left-0 z-10 px-4 py-2 font-medium text-xs whitespace-nowrap"
                  style={{ background: 'inherit', color: 'var(--fg)', borderRight: '1px solid var(--border)' }}>
                  {inf.code}
                </td>
                {colSpecs.map((col, ci) => {
                  const v = col.data[inf.code] || { declarations: 0, recus: 0, hospi: 0 };
                  return [
                    <td key={`${ci}-d`} className="text-center px-3 py-2 text-xs" style={{ background: col.light || 'transparent', border: '1px solid var(--border)' }}>{fmt(v.declarations)}</td>,
                    <td key={`${ci}-r`} className="text-center px-3 py-2 text-xs" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid var(--border)' }}>{fmt(v.recus)}</td>,
                    <td key={`${ci}-h`} className="text-center px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid var(--border)' }}>{fmt(v.hospi)}</td>,
                  ];
                })}
              </tr>
            ))}
            <tr style={{ background: '#111827', color: '#fff', fontWeight: 'bold' }}>
              <td className="sticky left-0 z-10 px-4 py-2 text-xs" style={{ background: '#111827', borderRight: '1px solid #4b5563' }}>{t('TOTAL')}</td>
              {colSpecs.map((col, ci) => {
                const g = col.global || { declarations: 0, recus: 0, hospi: 0 };
                return [
                  <td key={`${ci}-d`} className="text-center px-3 py-2 text-xs" style={{ border: '1px solid #374151', color: '#a5b4fc' }}>{g.declarations}</td>,
                  <td key={`${ci}-r`} className="text-center px-3 py-2 text-xs" style={{ border: '1px solid #374151', color: '#fcd34d' }}>{g.recus}</td>,
                  <td key={`${ci}-h`} className="text-center px-3 py-2 text-xs" style={{ border: '1px solid #374151', color: '#fca5a5' }}>{g.hospi}</td>,
                ];
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tableau Trimestriel ──────────────────────────────────────────────────────
function TabTrimestriel({ data, loading }) {
  const { t } = useTranslation();
  if (loading) return <LoadingBox />;
  if (!data) return <EmptyBox label={t('Aucune donnée trimestrielle')} />;

  const { infirmeries, mois, parMois, totauxTrimestre } = data;

  const colSpecs = [
    ...mois.map((m, i) => ({
      label: parMois[m]?.label || t('MOIS {{num}}', { num: m }),
      ...(TRIM_COLORS[i] || TRIM_COLORS[2]),
      data: parMois[m]?.parInfirmerie || {},
      global: parMois[m]?.global || { declarations: 0, recus: 0, hospi: 0 },
    })),
    {
      label: t('TOTAL TRIMESTRIEL'),
      bg: '#1f2937', text: '#fff',
      data: totauxTrimestre.parInfirmerie,
      global: totauxTrimestre.global,
    },
  ];

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs min-w-max w-full">
          <thead>
            <tr>
              <th rowSpan={2} className="sticky left-0 z-20 text-left font-bold px-4 py-2"
                style={{ background: '#1f2937', color: '#fff', borderRight: '1px solid #4b5563', minWidth: '120px' }}>
                {t('INFIRMERIE PHP')}
              </th>
              {colSpecs.map((c, i) => (
                <th key={i} colSpan={3}
                  className="text-center px-3 py-2 font-bold"
                  style={{ background: c.bg, color: c.text, border: '1px solid rgba(255,255,255,0.2)' }}>
                  {t('TOTAL GLOBAL {{label}}', { label: c.label })}
                </th>
              ))}
            </tr>
            <tr>
              {colSpecs.map((c, i) =>
                [t('DÉCL.'), t('REÇUS'), t('HOSPI')].map(lbl => (
                  <th key={`${i}-${lbl}`}
                    className="text-center px-3 py-1 font-normal text-[10px]"
                    style={{ background: c.bg, color: c.text, opacity: 0.9, border: '1px solid rgba(255,255,255,0.2)', minWidth: '55px' }}>
                    {lbl}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {infirmeries.map((inf, ri) => (
              <tr key={inf.code}
                style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                <td className="sticky left-0 z-10 px-4 py-2 font-medium text-xs whitespace-nowrap"
                  style={{ background: 'inherit', color: 'var(--fg)', borderRight: '1px solid var(--border)' }}>
                  {inf.code}
                </td>
                {colSpecs.map((col, ci) => {
                  const v = col.data[inf.code] || { declarations: 0, recus: 0, hospi: 0 };
                  return [
                    <td key={`${ci}-d`} className="text-center px-3 py-2 text-xs" style={{ border: '1px solid var(--border)' }}>{fmt(v.declarations)}</td>,
                    <td key={`${ci}-r`} className="text-center px-3 py-2 text-xs" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid var(--border)' }}>{fmt(v.recus)}</td>,
                    <td key={`${ci}-h`} className="text-center px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid var(--border)' }}>{fmt(v.hospi)}</td>,
                  ];
                })}
              </tr>
            ))}
            <tr style={{ background: '#111827', color: '#fff', fontWeight: 'bold' }}>
              <td className="sticky left-0 z-10 px-4 py-2 text-xs" style={{ background: '#111827', borderRight: '1px solid #4b5563' }}>{t('TOTAL')}</td>
              {colSpecs.map((col, ci) => {
                const g = col.global;
                const ratioPct = g.recus > 0 ? ` (${((g.hospi / g.recus) * 100).toFixed(1)}%)` : '';
                return [
                  <td key={`${ci}-d`} className="text-center px-3 py-2 text-xs" style={{ border: '1px solid #374151', color: '#a5b4fc' }}>{g.declarations}</td>,
                  <td key={`${ci}-r`} className="text-center px-3 py-2 text-xs" style={{ border: '1px solid #374151', color: '#fcd34d' }}>{g.recus}</td>,
                  <td key={`${ci}-h`} className="text-center px-3 py-2 text-xs" style={{ border: '1px solid #374151', color: '#fca5a5' }}>{g.hospi}{ratioPct}</td>,
                ];
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab Motifs Hospitalisation ───────────────────────────────────────────────
function TabMotifHospi({ data, loading, mois, annee }) {
  const { t } = useTranslation();
  const MOIS = getMois(t);
  if (loading) return <LoadingBox />;
  if (!data?.motifHospi?.length) return <EmptyBox label={t('Aucune hospitalisation ce mois-ci')} />;

  const { motifHospi } = data;
  const grouped = {};
  motifHospi.forEach(m => {
    if (!grouped[m.infirmerie]) grouped[m.infirmerie] = [];
    grouped[m.infirmerie].push(m);
  });

  const total = motifHospi.reduce((s, m) => s + m.count, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 text-sm font-medium"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: 'rgb(217,119,6)' }}>
        {t("MOTIFS D'HOSPITALISATION — {{month}} {{year}} — Total : {{count}} hospitalisations", { month: MOIS[mois].toUpperCase(), year: annee, count: total })}
      </div>

      {Object.entries(grouped).map(([infirmerie, motifs]) => {
        const sousTotal = motifs.reduce((s, m) => s + m.count, 0);
        return (
          <div key={infirmerie} className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-4 py-2 flex justify-between text-xs font-bold" style={{ background: '#1f2937', color: '#fff' }}>
              <span>{infirmerie}</span>
              <span>{t('{{count}} hospi', { count: sousTotal })}</span>
            </div>
            <table className="w-full text-xs">
              <thead style={{ background: 'var(--surface-2)' }}>
                <tr>
                  <th className="text-left px-4 py-2 font-semibold" style={{ color: 'var(--fg-muted)' }}>{t('MOTIF / DIAGNOSTIC')}</th>
                  <th className="text-center px-4 py-2 font-semibold w-20" style={{ color: 'var(--fg-muted)' }}>{t('NOMBRE')}</th>
                </tr>
              </thead>
              <tbody>
                {motifs.map((m, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)', background: i % 2 !== 0 ? 'var(--surface-2)' : 'transparent' }}>
                    <td className="px-4 py-2" style={{ color: 'var(--fg)' }}>{m.motif}</td>
                    <td className="text-center px-4 py-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full font-bold"
                        style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                        {m.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab Repos Maladie ────────────────────────────────────────────────────────
function TabReposMaladie({ data, loading, mois, annee }) {
  const { t } = useTranslation();
  const MOIS = getMois(t);
  if (loading) return <LoadingBox />;
  if (!data?.reposMaladie?.length) return <EmptyBox label={t('Aucun repos maladie ce mois-ci')} />;

  const repos = data.reposMaladie;
  const totalJours = repos.reduce((s, r) => s + r.totalJours, 0);
  const totalPersonnes = repos.reduce((s, r) => s + r.nbPersonnes, 0);
  const totalHospi = data.totauxMois?.global?.hospi || 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 text-sm font-medium flex justify-between"
        style={{ background: 'var(--success-soft)', border: '1px solid var(--success)', color: 'var(--success)' }}>
        <span>{t('REPOS MALADIES — {{month}} {{year}}', { month: MOIS[mois].toUpperCase(), year: annee })}</span>
        {totalHospi > 0 && (
          <span className="font-bold">{t('{{jours}} JRS / {{hospi}} PRS', { jours: totalJours, hospi: totalHospi })}</span>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'var(--surface-2)' }}>
            <tr>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--fg)' }}>{t('INFIRMERIE')}</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--fg)' }}>{t('Nb personnes')}</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--fg)' }}>{t('Jours repos maladie')}</th>
            </tr>
          </thead>
          <tbody>
            {repos.map((r, i) => (
              <tr key={r.code} style={{ borderTop: '1px solid var(--border)', background: i % 2 !== 0 ? 'var(--surface-2)' : 'transparent' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--fg)' }}>{r.code}</td>
                <td className="text-center px-4 py-3" style={{ color: 'var(--fg-muted)' }}>{r.nbPersonnes}</td>
                <td className="text-center px-4 py-3">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-sm"
                    style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                    {t('{{count}} jrs', { count: r.totalJours })}
                  </span>
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface-2)', fontWeight: 'bold' }}>
              <td className="px-4 py-3" style={{ color: 'var(--fg)' }}>{t('Total général')}</td>
              <td className="text-center px-4 py-3" style={{ color: 'var(--fg)' }}>{totalPersonnes}</td>
              <td className="text-center px-4 py-3 text-base" style={{ color: 'var(--success)' }}>{t('{{count}} jrs', { count: totalJours })}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Helpers d'état ───────────────────────────────────────────────────────────
function LoadingBox() {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <RefreshCw size={28} className="animate-spin mx-auto mb-3" style={{ color: 'var(--fg-subtle)' }} />
      <p className="text-sm" style={{ color: 'var(--fg-subtle)' }}>{t('Chargement des données...')}</p>
    </div>
  );
}

function EmptyBox({ label }) {
  return (
    <div className="rounded-xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <BarChart3 size={40} className="mx-auto mb-3" style={{ color: 'var(--fg-subtle)' }} />
      <p className="text-sm" style={{ color: 'var(--fg-subtle)' }}>{label}</p>
    </div>
  );
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportCSV(data, mois, annee) {
  if (!data) return;
  const { infirmeries, semaines, totauxMois } = data;
  const t = i18n.t;
  const MOIS_NOM = getMois(t);

  const rows = [];

  rows.push([t('STATISTIC JOURNALIER DE {{month}} {{year}}', { month: MOIS_NOM[mois].toUpperCase(), year: annee })]);
  rows.push([]);

  const h1 = [t('INFIRMERIE PHP')];
  const h2 = [''];
  semaines.forEach(s => {
    s.jours.forEach(j => {
      h1.push(t('SEMAINE {{num}} - Jour {{jour}}', { num: s.numero, jour: j.jourNum }), '', '');
      h2.push(t('DÉCLARATIONS'), t('REÇUS HSJM'), t('HOSPI'));
    });
    h1.push(t('TOT S{{num}}', { num: s.numero }), '', '');
    h2.push(t('DÉCLARATIONS'), t('REÇUS HSJM'), t('HOSPI'));
  });
  h1.push(t('TOTAL MOIS'), '', '');
  h2.push(t('DÉCLARATIONS'), t('REÇUS HSJM'), t('HOSPI'));
  rows.push(h1);
  rows.push(h2);

  infirmeries.forEach(inf => {
    const row = [inf.code];
    semaines.forEach(s => {
      s.jours.forEach(j => {
        const v = j.parInfirmerie[inf.code] || { declarations: 0, recus: 0, hospi: 0 };
        row.push(v.declarations, v.recus, v.hospi);
      });
      const ts = s.totaux.parInfirmerie[inf.code] || { declarations: 0, recus: 0, hospi: 0 };
      row.push(ts.declarations, ts.recus, ts.hospi);
    });
    const tm = totauxMois.parInfirmerie[inf.code] || { declarations: 0, recus: 0, hospi: 0 };
    row.push(tm.declarations, tm.recus, tm.hospi);
    rows.push(row);
  });

  const totRow = [t('TOTAL')];
  semaines.forEach(s => {
    s.jours.forEach(j => {
      totRow.push(j.totaux.declarations, j.totaux.recus, j.totaux.hospi);
    });
    totRow.push(s.totaux.global.declarations, s.totaux.global.recus, s.totaux.global.hospi);
  });
  totRow.push(totauxMois.global.declarations, totauxMois.global.recus, totauxMois.global.hospi);
  rows.push(totRow);

  const csv = '﻿' + rows.map(r => r.join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `STATISTIC-PHP-${MOIS_NOM[mois].toUpperCase()}-${annee}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Tab Pathologies par Infirmerie ───────────────────────────────────────────
function TabPathologies({ data, loading, onRefresh }) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('global');
  if (loading) return <LoadingBox />;
  if (!data) return <EmptyBox label={t('Aucune donnée pathologie pour cette période')} />;

  const { topGlobal, parInfirmerie } = data;
  const maxGlobal = topGlobal[0]?.count || 1;

  const currentInf = viewMode !== 'global'
    ? parInfirmerie.find(r => r.infirmerie === viewMode)
    : null;
  const currentList = currentInf ? currentInf.pathologies : topGlobal;
  const maxCurrent  = currentList[0]?.count || 1;

  // Bar colors as explicit hex values
  const barColors = ['#4f46e5','#3b82f6','#14b8a6','#22c55e','#eab308','#f97316','#ef4444'];

  return (
    <div className="space-y-4">
      {/* Sélecteur vue */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setViewMode('global')}
          className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
          style={viewMode === 'global'
            ? { background: 'rgb(79,70,229)', color: '#fff' }
            : { background: 'var(--surface-2)', color: 'var(--fg-muted)' }}
        >
          🌍 {t('Toutes infirmeries')}
        </button>
        {parInfirmerie.map(inf => (
          <button key={inf.infirmerie}
            onClick={() => setViewMode(inf.infirmerie)}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
            style={viewMode === inf.infirmerie
              ? { background: 'rgb(79,70,229)', color: '#fff' }
              : { background: 'var(--surface-2)', color: 'var(--fg-muted)' }}
          >
            {inf.infirmerie.replace('INF_', '')}
            <span className="ml-1 opacity-70">({inf.total})</span>
          </button>
        ))}
      </div>

      {/* Titre section */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-4 py-3" style={{ background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'rgb(67,56,202)' }}>
            {viewMode === 'global'
              ? t('Top pathologies — Toutes infirmeries ({{count}} cas)', { count: topGlobal.reduce((s,p) => s+p.count, 0) })
              : t('Top pathologies — {{nom}} ({{count}} cas)', { nom: currentInf?.nom, count: currentInf?.total })
            }
          </h3>
        </div>
        <div className="p-4 space-y-2">
          {currentList.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--fg-subtle)' }}>{t('Aucun diagnostic enregistré')}</p>
          ) : currentList.map((p, i) => {
            const pct = Math.round((p.count / maxCurrent) * 100);
            const bar = barColors[Math.min(i, barColors.length - 1)];
            return (
              <div key={p.diagnostic} className="flex items-center gap-3">
                <span className="w-5 text-xs text-right font-mono shrink-0" style={{ color: 'var(--fg-subtle)' }}>{i+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--fg)' }} title={p.diagnostic}>
                      {p.diagnostic}
                    </span>
                    <span className="text-xs font-bold ml-2 shrink-0" style={{ color: 'var(--fg)' }}>
                      {p.count} <span style={{ color: 'var(--fg-subtle)', fontWeight: 400 }}>{t('cas')}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: bar }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Résumé par infirmerie (en cards compactes) */}
      {viewMode === 'global' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {parInfirmerie.map(inf => (
            <div key={inf.infirmerie} className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold" style={{ color: 'var(--fg)' }}>
                  {inf.infirmerie.replace('INF_','')}
                </h4>
                <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{t('{{count}} cas diagnostiqués', { count: inf.total })}</span>
              </div>
              <ol className="space-y-1">
                {inf.pathologies.slice(0, 5).map((p, i) => (
                  <li key={p.diagnostic} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--fg-muted)' }}>
                    <span className="w-4 text-right font-mono" style={{ color: 'var(--fg-subtle)' }}>{i+1}.</span>
                    <span className="flex-1 truncate" title={p.diagnostic}>{p.diagnostic}</span>
                    <span className="font-semibold" style={{ color: 'var(--fg)' }}>{p.count}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────
const getTabs = (t) => [
  { key: 'journalier',   label: t('Rapport journalier')  },
  { key: 'synthese',     label: t('Synthèse mensuelle')   },
  { key: 'trimestriel',  label: t('Trimestriel')           },
  { key: 'hospit',       label: t('Hospitalisations')      },
  { key: 'repos',        label: t('Repos maladie')         },
  { key: 'pathologies',  label: t('Pathologies')           },
];

export default function PHPStatistiques() {
  const { t } = useTranslation();
  const TABS = getTabs(t);
  const MOIS = getMois(t);
  const now = new Date();
  const [activeTab,  setActiveTab]  = useState('journalier');
  const [month,      setMonth]      = useState(now.getMonth() + 1);
  const [year,       setYear]       = useState(now.getFullYear());
  const [trimestre,  setTrimestre]  = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [trimYear,   setTrimYear]   = useState(now.getFullYear());

  const [rapportMensuel,     setRapportMensuel]     = useState(null);
  const [rapportTrimestriel, setRapportTrimestriel] = useState(null);
  const [pathologiesData,    setPathologiesData]    = useState(null);
  const [loadingMens,        setLoadingMens]        = useState(true);
  const [loadingTrim,        setLoadingTrim]        = useState(true);
  const [loadingPath,        setLoadingPath]        = useState(false);

  const loadMensuel = useCallback(async () => {
    setLoadingMens(true);
    try {
      const res = await phpStatsAPI.getRapportMensuel({ month, year });
      setRapportMensuel(res.data.data);
    } catch (err) {
      console.error('Erreur rapport mensuel:', err);
      setRapportMensuel(null);
    } finally {
      setLoadingMens(false);
    }
  }, [month, year]);

  const loadPathologies = useCallback(async () => {
    setLoadingPath(true);
    try {
      const res = await phpStatsAPI.getPathologies({ month, year });
      setPathologiesData(res.data.data);
    } catch (err) {
      console.error('Erreur pathologies:', err);
    } finally {
      setLoadingPath(false);
    }
  }, [month, year]);

  const loadTrimestriel = useCallback(async () => {
    setLoadingTrim(true);
    try {
      const res = await phpStatsAPI.getRapportTrimestriel({ trimestre, year: trimYear });
      setRapportTrimestriel(res.data.data);
    } catch (err) {
      console.error('Erreur rapport trimestriel:', err);
      setRapportTrimestriel(null);
    } finally {
      setLoadingTrim(false);
    }
  }, [trimestre, trimYear]);

  useEffect(() => { loadMensuel(); }, [loadMensuel]);
  useEffect(() => { loadTrimestriel(); }, [loadTrimestriel]);
  useEffect(() => { if (activeTab === 'pathologies') loadPathologies(); }, [activeTab, loadPathologies]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
    if (isCurrentMonth) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const prevTrimestre = () => {
    if (trimestre === 1) { setTrimestre(4); setTrimYear(y => y - 1); }
    else setTrimestre(t => t - 1);
  };
  const nextTrimestre = () => {
    if (trimestre === 4) { setTrimestre(1); setTrimYear(y => y + 1); }
    else setTrimestre(t => t + 1);
  };

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const loadingCurrent = activeTab === 'trimestriel' ? loadingTrim : loadingMens;

  const TRIMESTRE_LABELS = { 1: t('T1 Jan–Mar'), 2: t('T2 Avr–Jun'), 3: t('T3 Jul–Sep'), 4: t('T4 Oct–Déc') };

  const navBtnStyle = {
    padding: '0.5rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-2)',
    color: 'var(--fg)',
    cursor: 'pointer',
  };

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ background: 'var(--surface-2)' }}>

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Link to="/php" className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--fg-muted)' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <BarChart3 style={{ color: 'rgb(99,102,241)' }} size={22} />
              {t('Statistiques PHP')}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              {t('Rapport journalier — Format HSJM')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={activeTab === 'trimestriel' ? loadTrimestriel : loadMensuel}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          >
            <RefreshCw size={14} className={loadingCurrent ? 'animate-spin' : ''} />
          </button>
          {['journalier', 'synthese', 'hospit', 'repos'].includes(activeTab) && rapportMensuel && (
            <button
              onClick={() => exportCSV(rapportMensuel, month, year)}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors font-medium"
              style={{ background: 'var(--success)', color: '#fff' }}
            >
              <Download size={15} />
              {t('Export CSV')}
            </button>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 rounded-xl p-1 mb-5 overflow-x-auto" style={{ background: 'var(--surface-3)' }}>
        {TABS.map(tb => (
          <button
            key={tb.key}
            onClick={() => setActiveTab(tb.key)}
            className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors"
            style={activeTab === tb.key
              ? { background: 'var(--surface)', color: 'var(--fg)', boxShadow: 'var(--shadow-1)' }
              : { color: 'var(--fg-muted)' }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Sélecteur de période */}
      {activeTab !== 'trimestriel' ? (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={prevMonth} style={navBtnStyle}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-base font-semibold min-w-[140px] text-center" style={{ color: 'var(--fg)' }}>
            {MOIS[month]} {year}
          </span>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            style={{ ...navBtnStyle, opacity: isCurrentMonth ? 0.4 : 1 }}>
            <ChevronRight size={16} />
          </button>
          {rapportMensuel && (
            <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
              {t('{{count}} semaine(s)', { count: rapportMensuel.semaines?.length || 0 })} —{' '}
              {t('{{count}} jours ouvrés', { count: rapportMensuel.semaines?.reduce((s, w) => s + w.jours.length, 0) || 0 })}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={prevTrimestre} style={navBtnStyle}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-base font-semibold min-w-[160px] text-center" style={{ color: 'var(--fg)' }}>
            {TRIMESTRE_LABELS[trimestre]} {trimYear}
          </span>
          <button onClick={nextTrimestre} style={navBtnStyle}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Contenu des onglets */}
      {activeTab === 'journalier'  && <TabJournalier data={rapportMensuel} loading={loadingMens} />}
      {activeTab === 'synthese'    && <TabSyntheseMensuelle data={rapportMensuel} loading={loadingMens} />}
      {activeTab === 'trimestriel' && <TabTrimestriel data={rapportTrimestriel} loading={loadingTrim} />}
      {activeTab === 'hospit'      && <TabMotifHospi data={rapportMensuel} loading={loadingMens} mois={month} annee={year} />}
      {activeTab === 'repos'       && <TabReposMaladie data={rapportMensuel} loading={loadingMens} mois={month} annee={year} />}
      {activeTab === 'pathologies' && <TabPathologies data={pathologiesData} loading={loadingPath} onRefresh={loadPathologies} />}

    </div>
  );
}
