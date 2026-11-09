// frontend/src/components/vehicles/InventoriesTab.jsx
// Onglet « Inventaires » (cheffe de pôle RO SAU, chef sécurité logistique) :
// la semaine comme sur la fiche papier — une ligne par jour d'inventaire
// (lun / mer / ven), une colonne par ambulance — puis, pour chaque ambulance,
// ses manques encore ouverts (non réarmés) et où en est la commande.
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader, ChevronLeft, ChevronRight, FileText, PackageOpen } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import { StatusBadge } from './VehicleChecksTab';
import { WEEKDAYS, fmtDay, fmtDateTime, openCheckPdf } from './fleetUi';
import { ShortageStatus, shortageWhat } from './ShortagesTab';

const shiftWeek = (monday, n) => {
  const d = new Date(`${monday}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7 * n);
  return d.toISOString().slice(0, 10);
};

export default function InventoriesTab({ refreshKey }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [week, setWeek] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    vehiclesAPI.inventories(week)
      .then((r) => setData(r.data.data))
      .catch((err) => toast.error(err.response?.data?.message || t('Erreur serveur.')))
      .finally(() => setLoading(false));
  }, [week, t]);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (!data) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader className="animate-spin" /></div>;
  if (!data.vehicles.length) {
    return <div className="ged-card" style={{ padding: 30, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>{t('Aucune ambulance avec inventaire.')}</div>;
  }

  const sunday = shiftWeek(data.weekStart, 1);
  const lastDay = new Date(`${sunday}T12:00:00Z`);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  const navBtn = { width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
  const th = { padding: '10px 12px', fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', whiteSpace: 'nowrap' };

  const cellView = (v, day) => {
    const cell = v.cells?.[day.date];
    if (!cell && !v.days.includes(day.weekday)) return <span style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>—</span>;
    if (!cell) {
      const st = day.date === data.today ? { c: '#b45309', txt: t('À faire aujourd\'hui') } : day.date < data.today ? { c: '#b91c1c', txt: t('Non fait') } : { c: 'var(--fg-muted)', txt: t('À venir') };
      return <span style={{ fontSize: 13, fontWeight: 700, color: st.c }}>{st.txt}</span>;
    }
    const bad = cell.shortages + cell.expiring;
    return (
      <button type="button" onClick={() => openCheckPdf(vehiclesAPI, cell.id, 'inventory')} title={t('Fiche PDF')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', background: cell.critical ? '#fee2e2' : bad ? '#ffedd5' : '#dcfce7' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: cell.critical ? '#b91c1c' : bad ? '#c2410c' : '#15803d' }}>
            {cell.critical ? `🚨 ${t('Critique')}` : bad ? `⚠ ${t('{{count}} à réassortir', { count: bad })}` : `✓ ${t('Complet')}`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {cell.by} · {fmtDateTime(cell.at)}{cell.answered < cell.total ? ` · ${t('partiel {{n}}/{{total}}', { n: cell.answered, total: cell.total })}` : ''}
          </div>
        </div>
        <FileText size={15} color="var(--fg-muted)" />
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" style={navBtn} onClick={() => setWeek(shiftWeek(data.weekStart, -1))} aria-label={t('Semaine précédente')}><ChevronLeft size={16} /></button>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', minWidth: 190, textAlign: 'center' }}>
          {t('Semaine du {{from}} au {{to}}', { from: fmtDay(data.weekStart), to: fmtDay(lastDay.toISOString().slice(0, 10)) })}
        </div>
        <button type="button" style={navBtn} onClick={() => setWeek(shiftWeek(data.weekStart, 1))} aria-label={t('Semaine suivante')}><ChevronRight size={16} /></button>
        {week && <button type="button" onClick={() => setWeek(null)} style={{ ...navBtn, width: 'auto', padding: '0 12px', fontSize: 13, fontWeight: 600 }}>{t('Cette semaine')}</button>}
        {loading && <Loader size={16} className="animate-spin" />}
      </div>

      {/* Grille de la semaine (comme la fiche papier : une colonne par ambulance) */}
      <div className="ged-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 160 + data.vehicles.length * 210 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 140 }}>{t('Jour')}</th>
              {data.vehicles.map((v) => (
                <th key={v.id} style={th}>
                  <div style={{ color: 'var(--fg)', fontSize: 13 }}>{v.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>{v.immatriculation} <StatusBadge status={v.status} reason={v.unavailableReason} /></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.days.map((day) => (
              <tr key={day.date} style={{ background: day.date === data.today ? '#fffbeb' : 'transparent' }}>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--surface-3)', fontSize: 13, fontWeight: 700, color: 'var(--fg)', whiteSpace: 'nowrap' }}>
                  {t(WEEKDAYS[day.weekday])} {fmtDay(day.date)}
                </td>
                {data.vehicles.map((v) => (
                  <td key={v.id} style={{ padding: '6px 10px', borderBottom: '1px solid var(--surface-3)' }}>{cellView(v, day)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manques ouverts de chaque ambulance (jusqu'au réarmement) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {data.vehicles.map((v) => {
          const list = v.shortages || [];
          const tone = list.some((s) => s.critical) ? '#dc2626' : list.length ? '#ea580c' : '#16a34a';
          return (
            <div key={v.id} className="ged-card" style={{ padding: 14, borderColor: `color-mix(in srgb, ${tone} 30%, var(--border))` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <PackageOpen size={17} color={tone} />
                <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: 'var(--fg)' }}>{t('Non réarmé')} · {v.label}</div>
                <button type="button" onClick={() => navigate('/vehicules?tab=manques')} style={{ border: 'none', background: 'none', color: 'var(--brand)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t('Gérer')} →</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8 }}>
                {v.last ? t('Dernier inventaire : {{date}} par {{name}}', { date: fmtDateTime(v.last.at), name: v.last.by }) : t('Aucun inventaire enregistré.')}
              </div>
              {!list.length && <div style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>{t('Tout est réarmé.')}</div>}
              {list.map((s) => (
                <div key={s.id} style={{ display: 'flex', gap: 8, fontSize: 13, padding: '6px 0', borderTop: '1px solid var(--surface-3)', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--fg)' }}>{t(s.label)}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: s.kind === 'manque' ? '#c2410c' : '#dc2626' }}>{shortageWhat(s, t)}</div>
                  </div>
                  <ShortageStatus s={s} compact />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
