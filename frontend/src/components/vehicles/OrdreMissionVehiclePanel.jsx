// frontend/src/components/vehicles/OrdreMissionVehiclePanel.jsx
// Visionneuse d'un ordre de mission RO SAU : ambulance et état de ses
// contrôles départ / retour (clic = fiche PDF). Utile au validateur de l'OM.
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ambulance } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import { SectionChips } from './FleetDashboard';
import { MISSION_STATUS } from './fleetUi';
import { StatusBadge } from './VehicleChecksTab';

export default function OrdreMissionVehiclePanel({ documentId, secTitle }) {
  const { t } = useTranslation();
  const [m, setM] = useState(undefined);
  useEffect(() => {
    let alive = true;
    setM(undefined);
    vehiclesAPI.byDocument(documentId).then((r) => { if (alive) setM(r.data.data); }).catch(() => { if (alive) setM(null); });
    return () => { alive = false; };
  }, [documentId]);
  if (!m) return null;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={secTitle}>{t('Ambulance')}</div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', padding: 12, background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <Ambulance size={15} color="var(--brand)" />
          <strong style={{ fontSize: 13, color: 'var(--fg)' }}>{m.vehicle.label}</strong>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{m.vehicle.immatriculation} · {t(MISSION_STATUS[m.status] || m.status)}</span>
          <StatusBadge status={m.vehicle.status} reason={m.vehicle.unavailableReason} />
        </div>
        {m.omAfterDeparture && <div style={{ fontSize: 11, color: '#1d4ed8', marginBottom: 8 }}>{t('OM créé après le départ')}</div>}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 4 }}>{t('Départ')}</div>
            <SectionChips phase={m.depart} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 4 }}>{t('Retour')}</div>
            {m.status === 'planifiee' ? <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>—</span> : <SectionChips phase={m.retour} />}
          </div>
        </div>
      </div>
    </div>
  );
}
