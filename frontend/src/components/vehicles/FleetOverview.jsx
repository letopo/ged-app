// frontend/src/components/vehicles/FleetOverview.jsx
// Onglet « Suivi du parc » (chef sécurité logistique, responsables) : état de
// tous les véhicules, échéances dépassées ou proches, coûts carburant et entretien.
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Loader, CalendarClock, ChevronRight } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import { StatusBadge } from './VehicleChecksTab';
import { DeadlineBadge, money, km, frDate } from './fleetForms';

export default function FleetOverview({ onOpenVehicle, refreshKey }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    vehiclesAPI.overview().then((r) => setData(r.data.data)).catch((err) => { toast.error(err.response?.data?.message || t('Erreur serveur.')); setData({ vehicles: [], deadlines: [], totals: {} }); });
  }, [t]);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (!data) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader className="animate-spin" /></div>;
  const tt = data.totals;
  const stat = (label, value, color) => (
    <div className="ged-card" style={{ padding: 12, flex: '1 1 130px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || 'var(--fg)', marginTop: 4 }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {stat(t('Véhicules'), tt.vehicles ?? 0)}
        {stat(t('Disponibles'), tt.available ?? 0, '#16a34a')}
        {stat(t('En mission'), tt.onMission ?? 0, '#2563eb')}
        {stat(t('Indisponibles'), tt.unavailable ?? 0, tt.unavailable ? '#dc2626' : undefined)}
        {stat(t('Échéances dépassées'), tt.overdue ?? 0, tt.overdue ? '#dc2626' : undefined)}
        {stat(t('Carburant (30 j)'), money(tt.fuel30Amount))}
        {stat(t('Entretien (année)'), money(tt.maintenanceYearCost))}
      </div>

      {data.deadlines.length > 0 && (
        <div className="ged-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>
            <CalendarClock size={16} color="#ea580c" /> {t('Échéances à traiter')}
          </div>
          {data.deadlines.map((d) => (
            <button key={d.id} type="button" onClick={() => onOpenVehicle(d.vehicle.id, 'echeances')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', border: 'none', borderTop: '1px solid var(--surface-3)', background: 'none', cursor: 'pointer', textAlign: 'left', flexWrap: 'wrap' }}>
              <span style={{ flex: '1 1 220px', fontSize: 13, color: 'var(--fg)' }}><strong>{d.vehicle.label}</strong> ({d.vehicle.immatriculation}) — {d.label}</span>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                {[d.dueDate && frDate(d.dueDate), d.dueMileage && km(d.dueMileage)].filter(Boolean).join(' · ')}
                {d.days != null ? ` · ${d.days < 0 ? t('depuis {{n}} j', { n: -d.days }) : t('dans {{n}} j', { n: d.days })}` : ''}
              </span>
              <DeadlineBadge status={d.status} />
            </button>
          ))}
        </div>
      )}

      <div className="ged-card" style={{ padding: 0, overflow: 'hidden' }}>
        {data.vehicles.length === 0 && <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>{t('Aucun véhicule.')}</div>}
        {data.vehicles.map((v) => {
          const worst = v.deadlines[0];
          return (
            <button key={v.id} type="button" onClick={() => onOpenVehicle(v.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: 'none', borderBottom: '1px solid var(--surface-3)', background: 'none', cursor: 'pointer', textAlign: 'left', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{v.label} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--fg-muted)' }}>{v.immatriculation}</span></div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{[v.brand && `${v.brand} ${v.model || ''}`, km(v.mileage)].filter(Boolean).join(' · ')}</div>
              </div>
              <StatusBadge status={v.status} reason={v.unavailableReason} />
              {worst && worst.status !== 'ok' && <span title={worst.label}><DeadlineBadge status={worst.status} /></span>}
              <span style={{ fontSize: 12, color: 'var(--fg-muted)', minWidth: 150, textAlign: 'right' }}>
                {t('Carburant 30 j')} : {money(v.fuel30Amount)}<br />{t('Entretien année')} : {money(v.maintenanceYearCost)}{v.openMaintenances ? ` · ${t('{{n}} en cours', { n: v.openMaintenances })}` : ''}
              </span>
              <ChevronRight size={16} color="var(--fg-subtle)" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
