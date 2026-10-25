// frontend/src/components/vehicles/VehicleSelect.jsx
// Choix de l'ambulance dans l'ordre de mission RO SAU : couleur selon le
// dernier contrôle (🟢 100 % · 🟠 ≥ 50 % · 🟡 partiel · 🔴 aucun). Une ambulance
// déjà en mission n'est pas proposée, sauf sortie urgente sans ordre de
// mission (contrôle de départ fait avant l'OM) : on la rattache à cet OM.
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import { LEVELS, fmtDateTime } from './fleetUi';

export default function VehicleSelect({ value, onChange, style }) {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState(null);

  useEffect(() => {
    vehiclesAPI.options('ambulance').then((r) => setVehicles(r.data.data || [])).catch(() => setVehicles([]));
  }, []);

  if (vehicles === null) return <div style={{ fontSize: 13, color: 'var(--fg-muted)', display: 'flex', gap: 6, alignItems: 'center' }}><Loader size={14} className="animate-spin" /> {t('Chargement des ambulances…')}</div>;
  if (!vehicles.length) return <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Aucune ambulance enregistrée dans le parc véhicules.')}</div>;

  const urgentOrphan = (v) => v.status === 'en_mission' && v.currentMission && !v.currentMission.documentId;
  const visible = vehicles.filter((v) => v.status !== 'en_mission' || urgentOrphan(v) || v.id === value);
  const selected = vehicles.find((v) => v.id === value);
  const optionLabel = (v) => {
    if (urgentOrphan(v)) return `🚑 ${v.label} — ${v.immatriculation} · ${t('sortie urgente en cours (à rattacher)')}`;
    if (v.status === 'indisponible') return `⛔ ${v.label} — ${v.immatriculation} · ${t('indisponible')}`;
    const lv = LEVELS[v.readiness?.level || 'aucun'];
    return `${lv.emoji} ${v.label} — ${v.immatriculation} · ${v.readiness?.pct ? t('contrôlée à {{pct}} %', { pct: v.readiness.pct }) : t('non contrôlée')}`;
  };

  return (
    <div style={style}>
      <select value={value || ''} required onChange={(e) => onChange(vehicles.find((v) => v.id === e.target.value) || null)}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13 }}>
        <option value="">{t('-- Choisir une ambulance --')}</option>
        {visible.map((v) => (
          <option key={v.id} value={v.id} disabled={v.status === 'indisponible'}>{optionLabel(v)}</option>
        ))}
      </select>
      {selected && (
        <div style={{ marginTop: 6, fontSize: 12, padding: '6px 10px', borderRadius: 'var(--radius-2)',
          background: urgentOrphan(selected) ? '#dbeafe' : LEVELS[selected.readiness?.level || 'aucun'].bg,
          color: urgentOrphan(selected) ? '#1d4ed8' : LEVELS[selected.readiness?.level || 'aucun'].color }}>
          {urgentOrphan(selected)
            ? t('Sortie urgente partie le {{date}} : ses contrôles seront rattachés à cet ordre de mission.', { date: fmtDateTime(selected.currentMission.departedAt) })
            : selected.readiness?.at
              ? t('Dernier contrôle ({{phase}}) le {{date}} : {{pct}} % de la check-list{{anom}}.', {
                phase: selected.readiness.phase === 'depart' ? t('départ') : t('retour'),
                date: fmtDateTime(selected.readiness.at), pct: selected.readiness.pct,
                anom: selected.readiness.anomalies ? ` · ${t('{{count}} anomalie(s)', { count: selected.readiness.anomalies })}` : '',
              })
              : t('Aucun contrôle enregistré pour cette ambulance.')}
        </div>
      )}
      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--fg-subtle)' }}>
        {t('🟢 contrôlée · 🟠 à moitié · 🟡 partiellement · 🔴 non contrôlée — une ambulance en mission n\'apparaît pas.')}
      </div>
    </div>
  );
}
