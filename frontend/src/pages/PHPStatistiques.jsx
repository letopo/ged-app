// frontend/src/pages/PHPStatistiques.jsx
// Rapport statistique PHP — Format calqué sur le fichier Excel HSJM
// 5 onglets : Journalier | Synthèse mensuelle | Trimestriel | Hospitalisations | Repos maladie

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, ChevronLeft, ChevronRight, Download, RefreshCw,
  ArrowLeft, BedDouble, Users, Activity, TrendingUp, FileSpreadsheet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { phpStatsAPI } from '../services/phpService';

// ─── Constantes ───────────────────────────────────────────────────────────────
const MOIS = ['','Janvier','Février','Mars','Avril','Mai','Juin',
              'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const WEEK_COLORS = [
  { bg: 'bg-purple-700', text: 'text-white', light: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
  { bg: 'bg-blue-600',   text: 'text-white', light: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-blue-200 dark:border-blue-800'   },
  { bg: 'bg-green-700',  text: 'text-white', light: 'bg-green-50 dark:bg-green-900/20',   border: 'border-green-200 dark:border-green-800'  },
  { bg: 'bg-orange-500', text: 'text-white', light: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' },
];

const TRIM_COLORS = [
  { bg: 'bg-orange-600',  text: 'text-white' },
  { bg: 'bg-teal-700',    text: 'text-white' },
  { bg: 'bg-green-700',   text: 'text-white' },
];

const fmt = (v) => (v === 0 || v == null) ? <span className="text-gray-300 dark:text-gray-600">–</span> : v;

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, colorClass }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className={`inline-flex p-2 rounded-lg ${colorClass} mb-2`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Tableau Journalier ───────────────────────────────────────────────────────
function TabJournalier({ data, loading }) {
  if (loading) return <LoadingBox />;
  if (!data) return <EmptyBox label="Aucune donnée pour cette période" />;

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
        <KpiCard icon={<Users size={18}/>} label="Déclarations" value={global.declarations}
          colorClass="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" />
        <KpiCard icon={<Activity size={18}/>} label="Reçus à HSJM" value={global.recus}
          colorClass="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" />
        <KpiCard icon={<BedDouble size={18}/>} label="Hospitalisés" value={global.hospi}
          colorClass="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" />
        <KpiCard icon={<TrendingUp size={18}/>} label="Ratio Hospi/Reçus" value={ratioPct}
          sub={`${global.hospi} / ${global.recus}`}
          colorClass="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" />
        <KpiCard icon={<FileSpreadsheet size={18}/>} label="Jours repos maladie" value={repos}
          colorClass="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" />
      </div>

      {/* Grand tableau scrollable */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="border-collapse text-xs min-w-max">
            <thead>
              {/* Ligne 1 : SEMAINES + TOTAL MOIS */}
              <tr>
                <th rowSpan={3}
                  className="sticky left-0 z-30 bg-gray-800 text-white px-3 py-2 text-left text-xs font-bold border-r border-gray-600 min-w-[120px]">
                  INFIRMERIE PHP
                </th>
                {semaines.map((s, si) => {
                  const c = WEEK_COLORS[si] || WEEK_COLORS[3];
                  // nb colonnes = jours×3 + 3 (total semaine)
                  const span = s.jours.length * 3 + 3;
                  return (
                    <th key={si} colSpan={span}
                      className={`${c.bg} ${c.text} text-center px-2 py-1.5 font-bold text-xs border border-white/20`}>
                      SEMAINE {s.numero}
                    </th>
                  );
                })}
                <th colSpan={3}
                  className="bg-cyan-600 text-white text-center px-2 py-1.5 font-bold text-xs border border-white/20">
                  TOTAL DU MOIS
                </th>
              </tr>

              {/* Ligne 2 : numéros de jour + TOT Sn */}
              <tr>
                {semaines.map((s, si) => {
                  const c = WEEK_COLORS[si] || WEEK_COLORS[3];
                  return [
                    ...s.jours.map(j => (
                      <th key={j.date} colSpan={3}
                        className={`${c.bg} ${c.text} text-center px-1 py-1 font-semibold text-xs border border-white/20`}>
                        {j.jourNum}
                      </th>
                    )),
                    <th key={`tot${si}`} colSpan={3}
                      className="bg-gray-800 text-white text-center px-1 py-1 font-bold text-xs border border-white/20">
                      TOT S{s.numero}
                    </th>,
                  ];
                })}
                {/* total mois — déjà mergé en ligne 1, on complète avec les 3 sous-labels */}
                {/* vide car rowSpan=1 ici */}
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
                          className={`${c.bg} ${c.text} text-center px-1 py-0.5 font-normal opacity-90 text-[10px] border border-white/20 min-w-[28px]`}>
                          {lbl}
                        </th>
                      );
                    });
                  });
                  // TOT semaine
                  ['D','R','H'].forEach(lbl => {
                    cols.push(
                      <th key={`tot${si}-${lbl}`}
                        className="bg-gray-700 text-gray-100 text-center px-1 py-0.5 font-semibold text-[10px] border border-white/20 min-w-[28px]">
                        {lbl}
                      </th>
                    );
                  });
                  return cols;
                })}
                {['D','R','H'].map(lbl => (
                  <th key={`mois-${lbl}`}
                    className="bg-cyan-700 text-white text-center px-1 py-0.5 font-semibold text-[10px] border border-white/20 min-w-[32px]">
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
                    className={ri % 2 === 0
                      ? 'bg-white dark:bg-gray-800'
                      : 'bg-gray-50 dark:bg-gray-750'}>
                    <td className="sticky left-0 z-20 bg-inherit px-3 py-1.5 font-medium text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 text-xs whitespace-nowrap">
                      {inf.code.replace('INF_', '')}
                    </td>
                    {semaines.map((s, si) => {
                      const c = WEEK_COLORS[si] || WEEK_COLORS[3];
                      const totSem = s.totaux.parInfirmerie[inf.code] || { declarations: 0, recus: 0, hospi: 0 };
                      return [
                        ...s.jours.map(j => {
                          const v = j.parInfirmerie[inf.code] || { declarations: 0, recus: 0, hospi: 0 };
                          return [
                            <td key={`${j.date}-d`} className={`text-center px-1 py-1.5 text-xs border border-gray-100 dark:border-gray-700 ${c.light}`}>{fmt(v.declarations)}</td>,
                            <td key={`${j.date}-r`} className="text-center px-1 py-1.5 text-xs border border-gray-100 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/10">{fmt(v.recus)}</td>,
                            <td key={`${j.date}-h`} className="text-center px-1 py-1.5 text-xs border border-gray-100 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">{fmt(v.hospi)}</td>,
                          ];
                        }),
                        <td key={`ts${si}-d`} className={`text-center px-1 py-1.5 text-xs border border-gray-200 dark:border-gray-600 font-semibold ${c.light}`}>{fmt(totSem.declarations)}</td>,
                        <td key={`ts${si}-r`} className="text-center px-1 py-1.5 text-xs border border-gray-200 dark:border-gray-600 font-semibold bg-amber-50 dark:bg-amber-900/10">{fmt(totSem.recus)}</td>,
                        <td key={`ts${si}-h`} className="text-center px-1 py-1.5 text-xs border border-gray-200 dark:border-gray-600 font-semibold bg-red-50 dark:bg-red-900/10">{fmt(totSem.hospi)}</td>,
                      ];
                    })}
                    <td className="text-center px-1 py-1.5 text-xs border border-cyan-200 dark:border-cyan-800 font-bold bg-cyan-50 dark:bg-cyan-900/20 text-indigo-700 dark:text-indigo-300">{fmt(totInf.declarations)}</td>
                    <td className="text-center px-1 py-1.5 text-xs border border-cyan-200 dark:border-cyan-800 font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">{fmt(totInf.recus)}</td>
                    <td className="text-center px-1 py-1.5 text-xs border border-cyan-200 dark:border-cyan-800 font-bold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">{fmt(totInf.hospi)}</td>
                  </tr>
                );
              })}

              {/* Ligne TOTAL */}
              <tr className="bg-gray-900 dark:bg-gray-900 text-white font-bold">
                <td className="sticky left-0 z-20 bg-gray-900 px-3 py-2 text-xs border-r border-gray-600">
                  TOTAL
                </td>
                {semaines.map((s, si) => {
                  const gS = s.totaux.global;
                  return [
                    ...s.jours.map(j => [
                      <td key={`${j.date}-d-tot`} className="text-center px-1 py-2 text-xs border border-gray-700 text-indigo-300">{fmt(j.totaux.declarations)}</td>,
                      <td key={`${j.date}-r-tot`} className="text-center px-1 py-2 text-xs border border-gray-700 text-amber-300">{fmt(j.totaux.recus)}</td>,
                      <td key={`${j.date}-h-tot`} className="text-center px-1 py-2 text-xs border border-gray-700 text-red-300">{fmt(j.totaux.hospi)}</td>,
                    ]),
                    <td key={`gs${si}-d`} className="text-center px-1 py-2 text-xs border border-gray-600 text-indigo-300 font-bold">{fmt(gS.declarations)}</td>,
                    <td key={`gs${si}-r`} className="text-center px-1 py-2 text-xs border border-gray-600 text-amber-300 font-bold">{fmt(gS.recus)}</td>,
                    <td key={`gs${si}-h`} className="text-center px-1 py-2 text-xs border border-gray-600 text-red-300 font-bold">{fmt(gS.hospi)}</td>,
                  ];
                })}
                <td className="text-center px-1 py-2 text-xs border border-cyan-700 bg-cyan-800 font-bold text-indigo-200">{global.declarations}</td>
                <td className="text-center px-1 py-2 text-xs border border-cyan-700 bg-cyan-800 font-bold text-amber-200">{global.recus}</td>
                <td className="text-center px-1 py-2 text-xs border border-cyan-700 bg-cyan-800 font-bold text-red-200">{global.hospi}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Légende */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-200 inline-block"/>D = Déclarations des malades par infirmerie PHP</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 inline-block"/>R = Patients reçus à HSJM</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block"/>H = Hospitalisés</span>
        </div>
      </div>
    </div>
  );
}

// ─── Tableau Synthèse Mensuelle ───────────────────────────────────────────────
function TabSyntheseMensuelle({ data, loading }) {
  if (loading) return <LoadingBox />;
  if (!data) return <EmptyBox label="Aucune donnée pour cette période" />;

  const { infirmeries, semaines, totauxMois } = data;
  const colSpecs = [
    ...semaines.map((s, i) => ({ label: `SYNTHÈSE S${s.numero}`, ...WEEK_COLORS[i] || WEEK_COLORS[3], data: s.totaux.parInfirmerie, global: s.totaux.global })),
    { label: 'TOTAL GLOBAL', bg: 'bg-gray-800', text: 'text-white', data: totauxMois.parInfirmerie, global: totauxMois.global },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs min-w-max w-full">
          <thead>
            <tr>
              <th rowSpan={2} className="sticky left-0 z-20 bg-gray-800 text-white px-4 py-2 text-left font-bold border-r border-gray-600 min-w-[120px]">
                INFIRMERIE PHP
              </th>
              {colSpecs.map((c, i) => (
                <th key={i} colSpan={3}
                  className={`${c.bg} ${c.text} text-center px-3 py-2 font-bold border border-white/20`}>
                  {c.label}
                </th>
              ))}
            </tr>
            <tr>
              {colSpecs.map((c, i) =>
                ['DÉCL.', 'REÇUS', 'HOSPI'].map(lbl => (
                  <th key={`${i}-${lbl}`}
                    className={`${c.bg} ${c.text} text-center px-3 py-1 font-normal text-[10px] opacity-90 border border-white/20 min-w-[50px]`}>
                    {lbl}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {infirmeries.map((inf, ri) => (
              <tr key={inf.code}
                className={ri % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                <td className="sticky left-0 z-10 bg-inherit px-4 py-2 font-medium text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 text-xs whitespace-nowrap">
                  {inf.code}
                </td>
                {colSpecs.map((col, ci) => {
                  const v = col.data[inf.code] || { declarations: 0, recus: 0, hospi: 0 };
                  return [
                    <td key={`${ci}-d`} className={`text-center px-3 py-2 text-xs border border-gray-100 dark:border-gray-700 ${col.light || ''}`}>{fmt(v.declarations)}</td>,
                    <td key={`${ci}-r`} className="text-center px-3 py-2 text-xs border border-gray-100 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/10">{fmt(v.recus)}</td>,
                    <td key={`${ci}-h`} className="text-center px-3 py-2 text-xs border border-gray-100 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">{fmt(v.hospi)}</td>,
                  ];
                })}
              </tr>
            ))}
            <tr className="bg-gray-900 text-white font-bold">
              <td className="sticky left-0 z-10 bg-gray-900 px-4 py-2 text-xs border-r border-gray-600">TOTAL</td>
              {colSpecs.map((col, ci) => {
                const g = col.global || { declarations: 0, recus: 0, hospi: 0 };
                return [
                  <td key={`${ci}-d`} className="text-center px-3 py-2 text-xs border border-gray-700 text-indigo-300">{g.declarations}</td>,
                  <td key={`${ci}-r`} className="text-center px-3 py-2 text-xs border border-gray-700 text-amber-300">{g.recus}</td>,
                  <td key={`${ci}-h`} className="text-center px-3 py-2 text-xs border border-gray-700 text-red-300">{g.hospi}</td>,
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
  if (loading) return <LoadingBox />;
  if (!data) return <EmptyBox label="Aucune donnée trimestrielle" />;

  const { infirmeries, mois, parMois, totauxTrimestre } = data;

  const colSpecs = [
    ...mois.map((m, i) => ({
      label: parMois[m]?.label || `MOIS ${m}`,
      ...TRIM_COLORS[i] || TRIM_COLORS[2],
      data: parMois[m]?.parInfirmerie || {},
      global: parMois[m]?.global || { declarations: 0, recus: 0, hospi: 0 },
    })),
    {
      label: 'TOTAL TRIMESTRIEL',
      bg: 'bg-gray-800', text: 'text-white',
      data: totauxTrimestre.parInfirmerie,
      global: totauxTrimestre.global,
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs min-w-max w-full">
          <thead>
            <tr>
              <th rowSpan={2} className="sticky left-0 z-20 bg-gray-800 text-white px-4 py-2 text-left font-bold border-r border-gray-600 min-w-[120px]">
                INFIRMERIE PHP
              </th>
              {colSpecs.map((c, i) => (
                <th key={i} colSpan={3}
                  className={`${c.bg} ${c.text} text-center px-3 py-2 font-bold border border-white/20`}>
                  TOTAL GLOBAL {c.label}
                </th>
              ))}
            </tr>
            <tr>
              {colSpecs.map((c, i) =>
                ['DÉCL.', 'REÇUS', 'HOSPI'].map(lbl => (
                  <th key={`${i}-${lbl}`}
                    className={`${c.bg} ${c.text} text-center px-3 py-1 font-normal text-[10px] opacity-90 border border-white/20 min-w-[55px]`}>
                    {lbl}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {infirmeries.map((inf, ri) => (
              <tr key={inf.code}
                className={ri % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                <td className="sticky left-0 z-10 bg-inherit px-4 py-2 font-medium text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 text-xs whitespace-nowrap">
                  {inf.code}
                </td>
                {colSpecs.map((col, ci) => {
                  const v = col.data[inf.code] || { declarations: 0, recus: 0, hospi: 0 };
                  return [
                    <td key={`${ci}-d`} className="text-center px-3 py-2 text-xs border border-gray-100 dark:border-gray-700">{fmt(v.declarations)}</td>,
                    <td key={`${ci}-r`} className="text-center px-3 py-2 text-xs border border-gray-100 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/10">{fmt(v.recus)}</td>,
                    <td key={`${ci}-h`} className="text-center px-3 py-2 text-xs border border-gray-100 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">{fmt(v.hospi)}</td>,
                  ];
                })}
              </tr>
            ))}
            <tr className="bg-gray-900 text-white font-bold">
              <td className="sticky left-0 z-10 bg-gray-900 px-4 py-2 text-xs border-r border-gray-600">TOTAL</td>
              {colSpecs.map((col, ci) => {
                const g = col.global;
                const ratioPct = g.recus > 0 ? ` (${((g.hospi / g.recus) * 100).toFixed(1)}%)` : '';
                return [
                  <td key={`${ci}-d`} className="text-center px-3 py-2 text-xs border border-gray-700 text-indigo-300">{g.declarations}</td>,
                  <td key={`${ci}-r`} className="text-center px-3 py-2 text-xs border border-gray-700 text-amber-300">{g.recus}</td>,
                  <td key={`${ci}-h`} className="text-center px-3 py-2 text-xs border border-gray-700 text-red-300">{g.hospi}{ratioPct}</td>,
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
  if (loading) return <LoadingBox />;
  if (!data?.motifHospi?.length) return <EmptyBox label="Aucune hospitalisation ce mois-ci" />;

  const { motifHospi } = data;
  // Grouper par infirmerie
  const grouped = {};
  motifHospi.forEach(m => {
    if (!grouped[m.infirmerie]) grouped[m.infirmerie] = [];
    grouped[m.infirmerie].push(m);
  });

  const total = motifHospi.reduce((s, m) => s + m.count, 0);

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400 font-medium">
        MOTIFS D'HOSPITALISATION — {MOIS[mois].toUpperCase()} {annee} — Total : {total} hospitalisations
      </div>

      {Object.entries(grouped).map(([infirmerie, motifs]) => {
        const sousTotal = motifs.reduce((s, m) => s + m.count, 0);
        return (
          <div key={infirmerie} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-2 bg-gray-800 text-white text-xs font-bold flex justify-between">
              <span>{infirmerie}</span>
              <span>{sousTotal} hospi</span>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-600 dark:text-gray-300 font-semibold">MOTIF / DIAGNOSTIC</th>
                  <th className="text-center px-4 py-2 text-gray-600 dark:text-gray-300 font-semibold w-20">NOMBRE</th>
                </tr>
              </thead>
              <tbody>
                {motifs.map((m, i) => (
                  <tr key={i} className={`border-t border-gray-100 dark:border-gray-700 ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/30'}`}>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{m.motif}</td>
                    <td className="text-center px-4 py-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold">
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
  if (loading) return <LoadingBox />;
  if (!data?.reposMaladie?.length) return <EmptyBox label="Aucun repos maladie ce mois-ci" />;

  const repos = data.reposMaladie;
  const totalJours = repos.reduce((s, r) => s + r.totalJours, 0);
  const totalPersonnes = repos.reduce((s, r) => s + r.nbPersonnes, 0);
  const totalHospi = data.totauxMois?.global?.hospi || 0;

  return (
    <div className="space-y-4">
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-sm text-green-700 dark:text-green-400 font-medium flex justify-between">
        <span>REPOS MALADIES — {MOIS[mois].toUpperCase()} {annee}</span>
        {totalHospi > 0 && (
          <span className="font-bold">{totalJours} JRS / {totalHospi} PRS</span>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">INFIRMERIE</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Nb personnes</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Jours repos maladie</th>
            </tr>
          </thead>
          <tbody>
            {repos.map((r, i) => (
              <tr key={r.code} className={`border-t border-gray-100 dark:border-gray-700 ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/30'}`}>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{r.code}</td>
                <td className="text-center px-4 py-3 text-gray-600 dark:text-gray-400">{r.nbPersonnes}</td>
                <td className="text-center px-4 py-3">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold text-sm">
                    {r.totalJours} jrs
                  </span>
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 font-bold">
              <td className="px-4 py-3 text-gray-900 dark:text-white">Total général</td>
              <td className="text-center px-4 py-3 text-gray-700 dark:text-gray-300">{totalPersonnes}</td>
              <td className="text-center px-4 py-3 text-green-700 dark:text-green-400 text-base">{totalJours} jrs</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Helpers d'état ───────────────────────────────────────────────────────────
function LoadingBox() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
      <RefreshCw size={28} className="animate-spin mx-auto text-gray-300 mb-3" />
      <p className="text-sm text-gray-400">Chargement des données...</p>
    </div>
  );
}

function EmptyBox({ label }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
      <BarChart3 size={40} className="mx-auto text-gray-200 dark:text-gray-700 mb-3" />
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportCSV(data, mois, annee) {
  if (!data) return;
  const { infirmeries, semaines, totauxMois } = data;
  const MOIS_NOM = ['','Janvier','Février','Mars','Avril','Mai','Juin',
                    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  const rows = [];

  // Titre
  rows.push([`STATISTIC JOURNALIER DE ${MOIS_NOM[mois].toUpperCase()} ${annee}`]);
  rows.push([]);

  // En-têtes
  const h1 = ['INFIRMERIE PHP'];
  const h2 = [''];
  semaines.forEach(s => {
    s.jours.forEach(j => {
      h1.push(`SEMAINE ${s.numero} - Jour ${j.jourNum}`, '', '');
      h2.push('DÉCLARATIONS', 'REÇUS HSJM', 'HOSPI');
    });
    h1.push(`TOT S${s.numero}`, '', '');
    h2.push('DÉCLARATIONS', 'REÇUS HSJM', 'HOSPI');
  });
  h1.push('TOTAL MOIS', '', '');
  h2.push('DÉCLARATIONS', 'REÇUS HSJM', 'HOSPI');
  rows.push(h1);
  rows.push(h2);

  // Données
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

  // Ligne TOTAL
  const totRow = ['TOTAL'];
  semaines.forEach(s => {
    s.jours.forEach(j => {
      totRow.push(j.totaux.declarations, j.totaux.recus, j.totaux.hospi);
    });
    totRow.push(s.totaux.global.declarations, s.totaux.global.recus, s.totaux.global.hospi);
  });
  totRow.push(totauxMois.global.declarations, totauxMois.global.recus, totauxMois.global.hospi);
  rows.push(totRow);

  // Génération du fichier
  const csv = '\ufeff' + rows.map(r => r.join(';')).join('\n');
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
  const [viewMode, setViewMode] = useState('global'); // 'global' | code infirmerie
  if (loading) return <LoadingBox />;
  if (!data) return <EmptyBox label="Aucune donnée pathologie pour cette période" />;

  const { topGlobal, parInfirmerie } = data;
  const maxGlobal = topGlobal[0]?.count || 1;

  const currentInf = viewMode !== 'global'
    ? parInfirmerie.find(r => r.infirmerie === viewMode)
    : null;
  const currentList = currentInf ? currentInf.pathologies : topGlobal;
  const maxCurrent  = currentList[0]?.count || 1;

  return (
    <div className="space-y-4">
      {/* Sélecteur vue */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setViewMode('global')}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${viewMode === 'global' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
        >
          🌍 Toutes infirmeries
        </button>
        {parInfirmerie.map(inf => (
          <button key={inf.infirmerie}
            onClick={() => setViewMode(inf.infirmerie)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${viewMode === inf.infirmerie ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
          >
            {inf.infirmerie.replace('INF_', '')}
            <span className="ml-1 opacity-70">({inf.total})</span>
          </button>
        ))}
      </div>

      {/* Titre section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
          <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-300">
            {viewMode === 'global'
              ? `Top pathologies — Toutes infirmeries (${topGlobal.reduce((s,p) => s+p.count, 0)} cas)`
              : `Top pathologies — ${currentInf?.nom} (${currentInf?.total} cas)`
            }
          </h3>
        </div>
        <div className="p-4 space-y-2">
          {currentList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucun diagnostic enregistré</p>
          ) : currentList.map((p, i) => {
            const pct = Math.round((p.count / maxCurrent) * 100);
            const colors = ['bg-indigo-600','bg-blue-500','bg-teal-500','bg-green-500','bg-yellow-500','bg-orange-500','bg-red-500'];
            const bar = colors[Math.min(i, colors.length - 1)];
            return (
              <div key={p.diagnostic} className="flex items-center gap-3">
                <span className="w-5 text-xs text-gray-400 text-right font-mono shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate" title={p.diagnostic}>
                      {p.diagnostic}
                    </span>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-2 shrink-0">
                      {p.count} <span className="text-gray-400 font-normal">cas</span>
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full ${bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
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
            <div key={inf.infirmerie} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {inf.infirmerie.replace('INF_','')}
                </h4>
                <span className="text-xs text-gray-400">{inf.total} cas diagnostiqués</span>
              </div>
              <ol className="space-y-1">
                {inf.pathologies.slice(0, 5).map((p, i) => (
                  <li key={p.diagnostic} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <span className="w-4 text-right text-gray-400 font-mono">{i+1}.</span>
                    <span className="flex-1 truncate" title={p.diagnostic}>{p.diagnostic}</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{p.count}</span>
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
const TABS = [
  { key: 'journalier',   label: 'Rapport journalier'  },
  { key: 'synthese',     label: 'Synthèse mensuelle'   },
  { key: 'trimestriel',  label: 'Trimestriel'           },
  { key: 'hospit',       label: 'Hospitalisations'      },
  { key: 'repos',        label: 'Repos maladie'         },
  { key: 'pathologies',  label: 'Pathologies'           },
];

export default function PHPStatistiques() {
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

  // Chargement rapport mensuel
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

  // Chargement pathologies
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

  // Chargement rapport trimestriel
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

  const TRIMESTRE_LABELS = { 1: 'T1 Jan–Mar', 2: 'T2 Avr–Jun', 3: 'T3 Jul–Sep', 4: 'T4 Oct–Déc' };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Link to="/php" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="text-indigo-600" size={22} />
              Statistiques PHP
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Rapport journalier — Format HSJM
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={activeTab === 'trimestriel' ? loadTrimestriel : loadMensuel}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={14} className={loadingCurrent ? 'animate-spin' : ''} />
          </button>
          {['journalier', 'synthese', 'hospit', 'repos'].includes(activeTab) && rapportMensuel && (
            <button
              onClick={() => exportCSV(rapportMensuel, month, year)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Download size={15} />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sélecteur de période */}
      {activeTab !== 'trimestriel' ? (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={prevMonth}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-base font-semibold text-gray-900 dark:text-white min-w-[140px] text-center">
            {MOIS[month]} {year}
          </span>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
            <ChevronRight size={16} />
          </button>
          {rapportMensuel && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {rapportMensuel.semaines?.length || 0} semaine(s) —{' '}
              {rapportMensuel.semaines?.reduce((s, w) => s + w.jours.length, 0) || 0} jours ouvrés
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={prevTrimestre}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-base font-semibold text-gray-900 dark:text-white min-w-[160px] text-center">
            {TRIMESTRE_LABELS[trimestre]} {trimYear}
          </span>
          <button onClick={nextTrimestre}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
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
