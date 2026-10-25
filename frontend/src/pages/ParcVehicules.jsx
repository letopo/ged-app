// frontend/src/pages/ParcVehicules.jsx
// Parc véhicules — étape 1 : ambulances RO SAU.
//  - Contrôles      : équipage (chauffeur → Véhicule, soignant → Matériel), sur téléphone
//  - Tableau de bord : cheffe de pôle RO SAU / chef sécurité logistique
//  - Véhicules      : fiches du parc
//  - Check-list     : points de contrôle modifiables
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Truck, ClipboardCheck, LayoutDashboard, ListChecks, Loader } from 'lucide-react';
import { vehiclesAPI } from '../services/api';
import VehicleChecksTab from '../components/vehicles/VehicleChecksTab';
import FleetDashboard from '../components/vehicles/FleetDashboard';
import VehiclesAdmin from '../components/vehicles/VehiclesAdmin';
import ChecklistEditor from '../components/vehicles/ChecklistEditor';

export default function ParcVehicules() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [fleet, setFleet] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadVehicles = useCallback((f = fleet) => {
    setLoading(true);
    vehiclesAPI.list(f?.fleetManager ? { all: 1 } : undefined)
      .then((r) => setVehicles(r.data.data || []))
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, [fleet]);

  useEffect(() => {
    vehiclesAPI.me().then((r) => { setFleet(r.data.data); loadVehicles(r.data.data); }).catch(() => setFleet({ hasModule: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canManageAny = fleet?.canCreate || vehicles.some((v) => v.canManage);
  const tabs = [
    { key: 'controles', label: t('Contrôles'), icon: ClipboardCheck, show: true },
    { key: 'tableau', label: t('Tableau de bord'), icon: LayoutDashboard, show: !!fleet?.canDashboard },
    { key: 'vehicules', label: t('Véhicules'), icon: Truck, show: canManageAny },
    { key: 'checklist', label: t('Check-list'), icon: ListChecks, show: canManageAny },
  ].filter((x) => x.show);
  const wanted = params.get('tab');
  const tab = tabs.some((x) => x.key === wanted) ? wanted : (fleet?.canDashboard && !fleet?.canCheck ? 'tableau' : 'controles');

  if (!fleet) return <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><Loader className="animate-spin" /></div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 4px 40px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--fg)', margin: 0 }}>{t('Parc véhicules')}</h1>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>{t('Contrôle des ambulances avant et après chaque mission : véhicule par le chauffeur, matériel médical par l\'infirmier.')}</div>
      </div>

      <div role="tablist" style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} role="tab" aria-selected={tab === key} type="button" onClick={() => setParams({ tab: key })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              fontSize: 13, fontWeight: tab === key ? 700 : 500, color: tab === key ? 'var(--fg)' : 'var(--fg-muted)',
              borderBottom: `2px solid ${tab === key ? 'var(--brand)' : 'transparent'}`, marginBottom: -1 }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'controles' && <VehicleChecksTab vehicles={vehicles.filter((v) => v.isActive)} loading={loading} onChanged={() => loadVehicles()} />}
      {tab === 'tableau' && <FleetDashboard onVehiclesChanged={() => loadVehicles()} />}
      {tab === 'vehicules' && <VehiclesAdmin vehicles={vehicles} fleet={fleet} onChanged={() => loadVehicles()} />}
      {tab === 'checklist' && <ChecklistEditor />}
    </div>
  );
}
