// frontend/src/pages/ParcVehicules.jsx
// Parc véhicules — étape 1 : ambulances RO SAU.
//  - Contrôles      : équipage (chauffeur → Véhicule, soignant → Matériel), sur téléphone
//  - Tableau de bord : cheffe de pôle RO SAU / chef sécurité logistique
//  - Véhicules      : fiches du parc
//  - Check-list     : points de contrôle modifiables
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Truck, ClipboardCheck, LayoutDashboard, ListChecks, Loader, ShieldCheck, Gauge } from 'lucide-react';
import toast from 'react-hot-toast';
import { vehiclesAPI } from '../services/api';
import VehicleChecksTab from '../components/vehicles/VehicleChecksTab';
import FleetDashboard from '../components/vehicles/FleetDashboard';
import VehiclesAdmin from '../components/vehicles/VehiclesAdmin';
import ChecklistEditor from '../components/vehicles/ChecklistEditor';
import FleetOverview from '../components/vehicles/FleetOverview';
import VehicleDetail from '../components/vehicles/VehicleDetail';

// Superadmin : ouvrir (ou non) le module aux administrateurs de l'organisation
function AdminAccessSwitch() {
  const { t } = useTranslation();
  const [value, setValue] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { vehiclesAPI.settings().then((r) => setValue(!!r.data.data.adminAccess)).catch(() => setValue(false)); }, []);
  if (value === null) return null;
  const toggle = async () => {
    setSaving(true);
    try {
      const r = await vehiclesAPI.updateSettings({ adminAccess: !value });
      setValue(!!r.data.data.adminAccess);
      toast.success(r.data.data.adminAccess ? t('Les administrateurs ont maintenant accès au parc véhicules.') : t('Le parc véhicules est retiré aux administrateurs.'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur serveur.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="ged-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', marginBottom: 16, flexWrap: 'wrap' }}>
      <ShieldCheck size={18} color="var(--brand)" />
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{t('Accès des administrateurs')}</div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          {value
            ? t('Les administrateurs voient et gèrent le parc véhicules (fiches, check-list, tableau de bord).')
            : t('Seuls vous (superadmin), le chef sécurité logistique et les responsables des véhicules y ont accès.')}
        </div>
      </div>
      <button type="button" role="switch" aria-checked={value} aria-label={t('Accès des administrateurs')} onClick={toggle} disabled={saving}
        style={{ width: 46, height: 26, borderRadius: 999, border: 'none', cursor: saving ? 'wait' : 'pointer', padding: 3, background: value ? 'var(--brand)' : 'var(--surface-3)', display: 'flex', justifyContent: value ? 'flex-end' : 'flex-start', transition: 'background .15s' }}>
        <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
      </button>
    </div>
  );
}

export default function ParcVehicules() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [fleet, setFleet] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  // Fiche véhicule ouverte (?tab=suivi&vehicle=… depuis une alerte d'échéance)
  const [detail, setDetail] = useState(() => (params.get('tab') === 'suivi' && params.get('vehicle') ? { id: params.get('vehicle'), tab: 'echeances' } : null));
  const [refreshKey, setRefreshKey] = useState(0);

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
  const detailVehicle = detail ? vehicles.find((v) => v.id === detail.id) : null;
  const tabs = [
    { key: 'controles', label: t('Contrôles'), icon: ClipboardCheck, show: true },
    { key: 'tableau', label: t('Tableau de bord'), icon: LayoutDashboard, show: !!fleet?.canDashboard },
    { key: 'suivi', label: t('Suivi du parc'), icon: Gauge, show: canManageAny },
    { key: 'vehicules', label: t('Véhicules'), icon: Truck, show: canManageAny },
    { key: 'checklist', label: t('Check-list'), icon: ListChecks, show: canManageAny },
  ].filter((x) => x.show);
  const wanted = params.get('tab');
  const tab = tabs.some((x) => x.key === wanted) ? wanted : (params.get('vehicle') ? 'controles' : (fleet?.canDashboard && !fleet?.canCheck ? 'tableau' : 'controles'));

  if (!fleet) return <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><Loader className="animate-spin" /></div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 4px 40px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--fg)', margin: 0 }}>{t('Parc véhicules')}</h1>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>{t('Contrôle des véhicules avant et après chaque sortie, carnet de bord, carburant, entretien et échéances.')}</div>
      </div>

      {fleet?.superAdmin && <AdminAccessSwitch />}

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

      {tab === 'suivi' && <FleetOverview refreshKey={refreshKey} onOpenVehicle={(id, sub) => setDetail({ id, tab: sub })} />}
      {tab === 'controles' && <VehicleChecksTab vehicles={vehicles.filter((v) => v.isActive)} loading={loading} onChanged={() => loadVehicles()} initialVehicleId={params.get('tab') === 'suivi' ? null : params.get('vehicle')} onOpenDetail={(id) => setDetail({ id })} />}
      {tab === 'tableau' && <FleetDashboard onVehiclesChanged={() => loadVehicles()} />}
      {tab === 'vehicules' && <VehiclesAdmin vehicles={vehicles} fleet={fleet} onChanged={() => loadVehicles()} onOpen={(id) => setDetail({ id })} />}
      {detailVehicle && (
        <VehicleDetail key={detailVehicle.id} vehicle={detailVehicle} initialTab={detail.tab}
          onClose={() => setDetail(null)} onChanged={() => { loadVehicles(); setRefreshKey((k) => k + 1); }} />
      )}
      {tab === 'checklist' && <ChecklistEditor />}
    </div>
  );
}
