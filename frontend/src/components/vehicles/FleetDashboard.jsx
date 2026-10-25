// frontend/src/components/vehicles/FleetDashboard.jsx
// Tableau de bord (cheffe de pôle RO SAU, chef sécurité logistique) : missions
// avec l'état des contrôles départ / retour par section, alertes, conformité,
// état des véhicules (remise en service après une anomalie critique).
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Loader, AlertTriangle, RefreshCw, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { vehiclesAPI } from '../../services/api';
import { LEVELS, MISSION_STATUS, fmtDateTime, levelOf, openCheckPdf } from './fleetUi';
import { StatusBadge } from './VehicleChecksTab';

const iso = (d) => d.toISOString().slice(0, 10);

function SectionChips({ phase }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: LEVELS[levelOf(phase.pct)].color }}>{phase.pct} %</span>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {phase.sections.map((s) => (
          <button key={s.key} type="button" disabled={!s.done} onClick={() => s.done && openCheckPdf(vehiclesAPI, s.checkId)}
            title={s.done ? t('{{section}} : {{name}}, {{date}} — ouvrir la fiche', { section: t(s.label), name: s.by, date: fmtDateTime(s.at) }) : t('{{section}} : non fait', { section: t(s.label) })}
            style={{ fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '2px 7px', cursor: s.done ? 'pointer' : 'default',
              border: `1px solid ${!s.done ? '#fecaca' : s.anomalies ? '#fdba74' : '#bbf7d0'}`,
              background: !s.done ? '#fef2f2' : s.anomalies ? '#fff7ed' : '#f0fdf4',
              color: !s.done ? '#b91c1c' : s.anomalies ? '#c2410c' : '#15803d' }}>
            {s.done ? '✓' : '✗'} {t(s.label)}{s.anomalies ? ` ⚠${s.anomalies}` : ''}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FleetDashboard({ onVehiclesChanged }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('30');
  const [vehicleId, setVehicleId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const to = new Date(Date.now() + 7 * 86400000);
    const from = new Date(Date.now() - Number(period) * 86400000);
    vehiclesAPI.missions({ from: iso(from), to: iso(to), vehicleId: vehicleId || undefined })
      .then((r) => setData(r.data.data))
      .catch((err) => toast.error(err.response?.data?.message || t('Erreur serveur.')))
      .finally(() => setLoading(false));
  }, [period, vehicleId, t]);
  useEffect(() => { load(); }, [load]);

  const reactivate = async (v) => {
    try {
      await vehiclesAPI.setStatus(v.id, 'disponible');
      toast.success(t('{{label}} remis en service.', { label: v.label }));
      load(); onVehiclesChanged?.();
    } catch (err) { toast.error(err.response?.data?.message || t('Erreur serveur.')); }
  };

  const stat = (label, value, sub, color) => (
    <div className="ged-card" style={{ padding: 14, flex: '1 1 150px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || 'var(--fg)', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{sub}</div>}
    </div>
  );
  const pctOf = (n, d) => (d ? `${Math.round((n / d) * 100)} %` : '—');
  const s = data?.stats;
  const field = { height: 34, padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} style={field} aria-label={t('Période')}>
          <option value="7">{t('7 derniers jours')}</option>
          <option value="30">{t('30 derniers jours')}</option>
          <option value="90">{t('3 derniers mois')}</option>
          <option value="365">{t('12 derniers mois')}</option>
        </select>
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} style={field} aria-label={t('Véhicule')}>
          <option value="">{t('Tous les véhicules')}</option>
          {(data?.vehicles || []).map((v) => <option key={v.id} value={v.id}>{v.label} — {v.immatriculation}</option>)}
        </select>
        <button type="button" onClick={load} style={{ ...field, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><RefreshCw size={14} /> {t('Actualiser')}</button>
      </div>

      {s && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {stat(t('Missions'), s.missions)}
          {stat(t('Départs contrôlés'), pctOf(s.departComplete, s.relevant), t('{{n}} sur {{total}} (100 % de la check-list)', { n: s.departComplete, total: s.relevant }))}
          {stat(t('Retours contrôlés'), pctOf(s.retourComplete, s.finished), t('{{n}} sur {{total}} missions terminées', { n: s.retourComplete, total: s.finished }))}
          {stat(t('Départs sans contrôle'), s.withoutDepartCheck, null, s.withoutDepartCheck ? '#dc2626' : undefined)}
          {stat(t('Anomalies signalées'), s.anomalies, null, s.anomalies ? '#ea580c' : undefined)}
        </div>
      )}

      {/* Véhicules indisponibles */}
      {(data?.vehicles || []).filter((v) => v.status === 'indisponible').map((v) => (
        <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 'var(--radius-3)', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <Wrench size={16} color="#dc2626" />
          <div style={{ flex: 1, minWidth: 200, fontSize: 13 }}>
            <strong>{v.label}</strong> ({v.immatriculation}) — {t('indisponible')} : {v.unavailableReason}
          </div>
          <button type="button" onClick={() => reactivate(v)} style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid #16a34a', background: '#fff', color: '#15803d', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {t('Remettre en service')}
          </button>
        </div>
      ))}

      {loading ? (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader className="animate-spin" /></div>
      ) : !data?.missions?.length ? (
        <div className="ged-card" style={{ padding: 30, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>{t('Aucune mission sur la période.')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.missions.map((m) => {
            const alert = m.alerts.departMissing || m.alerts.retourMissing;
            return (
              <div key={m.id} className="ged-card" style={{ padding: 12, borderLeft: `4px solid ${alert ? '#dc2626' : m.alerts.anomalies ? '#ea580c' : '#16a34a'}` }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ flex: '2 1 240px', minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
                      {m.document ? (
                        <button type="button" onClick={() => navigate(`/documents/${m.document.id}`)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand)', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>{m.document.title}</button>
                      ) : (m.title || t('Mission'))}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
                      {m.vehicle.label} ({m.vehicle.immatriculation}) · {t(MISSION_STATUS[m.status] || m.status)}
                      {' · '}{m.departedAt ? t('parti le {{d}}', { d: fmtDateTime(m.departedAt) }) : t('prévu le {{d}}', { d: fmtDateTime(m.plannedDepartureAt) })}
                      {m.returnedAt ? ` · ${t('rentré le {{d}}', { d: fmtDateTime(m.returnedAt) })}` : ''}
                    </div>
                    {m.crew?.length > 0 && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>{m.crew.map((c) => c.name).filter(Boolean).join(', ')}</div>}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {m.urgent && !m.document && <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', background: '#fef3c7', borderRadius: 999, padding: '2px 8px' }}>{t('Sortie urgente sans ordre de mission')}</span>}
                      {m.omAfterDeparture && <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: 999, padding: '2px 8px' }}>{t('OM créé après le départ')}</span>}
                      {m.alerts.departMissing && <span style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', background: '#fee2e2', borderRadius: 999, padding: '2px 8px', display: 'inline-flex', gap: 4, alignItems: 'center' }}><AlertTriangle size={11} /> {t('Départ non contrôlé')}</span>}
                      {m.alerts.retourMissing && <span style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', background: '#fee2e2', borderRadius: 999, padding: '2px 8px', display: 'inline-flex', gap: 4, alignItems: 'center' }}><AlertTriangle size={11} /> {t('Retour non contrôlé')}</span>}
                    </div>
                  </div>
                  <div style={{ flex: '1 1 150px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 4 }}>{t('Départ')}</div>
                    <SectionChips phase={m.depart} />
                  </div>
                  <div style={{ flex: '1 1 150px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 4 }}>{t('Retour')}</div>
                    {m.status === 'planifiee' ? <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>—</span> : <SectionChips phase={m.retour} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading && data && (
        <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
          {t('Statuts des véhicules :')} {(data.vehicles || []).map((v) => <span key={v.id} style={{ marginRight: 8 }}>{v.label} <StatusBadge status={v.status} reason={v.unavailableReason} /></span>)}
        </div>
      )}
    </div>
  );
}
