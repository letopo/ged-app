// frontend/src/components/vehicles/PendingVehicleChecks.jsx
// « Contrôles d'ambulance à faire » (Mes tâches, tableau de bord) : missions
// où l'utilisateur fait partie de l'équipage et dont sa partie du contrôle
// (Véhicule pour le chauffeur, Matériel pour le soignant) n'est pas faite, et
// inventaire de l'ambulance attendu aujourd'hui (membres du service).
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Ambulance, ChevronRight } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import { fmtDateTime } from './fleetUi';

export default function PendingVehicleChecks({ style }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;
    vehiclesAPI.myPending().then((r) => { if (alive) setItems(r.data.data || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!items.length) return null;
  return (
    <div className="ged-card" style={{ padding: 14, borderLeft: '4px solid #ea580c', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: 'var(--fg)', marginBottom: 8 }}>
        <Ambulance size={18} color="#ea580c" /> {t('Contrôles d\'ambulance à faire')}
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#ea580c', borderRadius: 999, padding: '1px 8px' }}>{items.length}</span>
      </div>
      {items.map((it) => (
        <button key={it.type === 'inventaire' ? `inv-${it.vehicle.id}` : `${it.missionId}-${it.phase}`} type="button" onClick={() => navigate(`/vehicules?vehicle=${it.vehicle.id}`)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', border: 'none', borderTop: '1px solid var(--surface-3)', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
          {it.type === 'inventaire' ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
                {t('Inventaire du jour')} · {it.vehicle.label} <span style={{ fontWeight: 400, color: 'var(--fg-muted)' }}>({it.vehicle.immatriculation})</span>
              </div>
              <div style={{ fontSize: 12, color: '#c2410c', fontWeight: 600 }}>{t('Matériel, consommables, médicaments et DSA')}</div>
            </div>
          ) : (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
                {it.phase === 'depart' ? t('Départ') : t('Retour')} · {it.vehicle.label} <span style={{ fontWeight: 400, color: 'var(--fg-muted)' }}>({it.vehicle.immatriculation})</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.title || t('Mission')}
                {it.phase === 'depart' && it.plannedDepartureAt ? ` · ${t('départ le {{date}}', { date: fmtDateTime(it.plannedDepartureAt) })}` : ''}
              </div>
              <div style={{ fontSize: 12, color: '#c2410c', fontWeight: 600 }}>
                {t('À contrôler : {{sections}}', { sections: it.sections.map((s) => t(s.label)).join(', ') })}
              </div>
            </div>
          )}
          <ChevronRight size={18} color="var(--fg-subtle)" />
        </button>
      ))}
    </div>
  );
}
