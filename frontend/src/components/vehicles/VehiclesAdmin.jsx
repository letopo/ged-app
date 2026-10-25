// frontend/src/components/vehicles/VehiclesAdmin.jsx
// Onglet « Véhicules » : fiches du parc (chef sécurité logistique ; la cheffe
// de pôle RO SAU peut ajouter et modifier les ambulances).
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Plus, Pencil, X, Truck } from 'lucide-react';
import { vehiclesAPI, servicesAPI } from '../../services/api';
import { StatusBadge, ReadinessBadge } from './VehicleChecksTab';

const EMPTY = { label: '', immatriculation: '', vehicleType: 'ambulance', serviceId: '', mileage: '', notes: '', isActive: true, managerPosteCode: 'chef_pole_ro_sau' };

export default function VehiclesAdmin({ vehicles, fleet, onChanged }) {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [edit, setEdit] = useState(null); // objet en cours d'édition
  const [saving, setSaving] = useState(false);

  useEffect(() => { servicesAPI.getAll().then((r) => setServices(r.data?.data || r.data || [])).catch(() => {}); }, []);

  const open = (v) => {
    if (!v) {
      const sau = services.find((s) => s.name === 'SAU');
      setEdit({ ...EMPTY, serviceId: sau?.id || '' });
    } else {
      setEdit({ ...EMPTY, ...v, serviceId: v.serviceId || '', mileage: v.mileage ?? '', notes: v.notes || '', managerPosteCode: v.managerPosteCode || '' });
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...edit, mileage: edit.mileage === '' ? null : Number(edit.mileage) };
      if (edit.id) await vehiclesAPI.update(edit.id, payload);
      else await vehiclesAPI.create(payload);
      toast.success(t('Véhicule enregistré.'));
      setEdit(null);
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur serveur.'));
    } finally {
      setSaving(false);
    }
  };

  const field = { width: '100%', boxSizing: 'border-box', height: 38, padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 14 };
  const label = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 4 };
  const typeLabel = { ambulance: t('Ambulance'), service: t('Véhicule de service'), autre: t('Autre') };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {fleet?.canCreate && (
        <div>
          <button type="button" onClick={() => open(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Plus size={15} /> {t('Ajouter un véhicule')}
          </button>
        </div>
      )}
      <div className="ged-card" style={{ padding: 0, overflow: 'hidden' }}>
        {vehicles.filter((v) => v.canManage).length === 0 && <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>{t('Aucun véhicule.')}</div>}
        {vehicles.filter((v) => v.canManage).map((v) => (
          <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--surface-3)', flexWrap: 'wrap', opacity: v.isActive ? 1 : 0.55 }}>
            <Truck size={18} color="var(--brand)" />
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{v.label} {!v.isActive && <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>({t('retiré du parc')})</span>}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                {v.immatriculation} · {typeLabel[v.vehicleType] || v.vehicleType}
                {v.serviceId ? ` · ${services.find((s) => s.id === v.serviceId)?.name || ''}` : ''}
                {v.mileage ? ` · ${v.mileage.toLocaleString('fr-FR')} km` : ''}
              </div>
            </div>
            <StatusBadge status={v.status} reason={v.unavailableReason} />
            <ReadinessBadge readiness={v.readiness} />
            <button type="button" onClick={() => open(v)} aria-label={t('Modifier')} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={14} /></button>
          </div>
        ))}
      </div>

      {edit && (
        <div onClick={() => setEdit(null)} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 'var(--radius-4)', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>{edit.id ? t('Modifier le véhicule') : t('Nouveau véhicule')}</div>
              <button type="button" onClick={() => setEdit(null)} aria-label={t('Fermer')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><X size={18} /></button>
            </div>
            <label><span style={label}>{t('Nom')} *</span><input required value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} placeholder={t('Ex : Ambulance 1')} style={field} /></label>
            <label><span style={label}>{t('Immatriculation')} *</span><input required value={edit.immatriculation} onChange={(e) => setEdit({ ...edit, immatriculation: e.target.value.toUpperCase() })} placeholder="LT-123-AB" style={field} /></label>
            <label><span style={label}>{t('Type')}</span>
              <select value={edit.vehicleType} onChange={(e) => setEdit({ ...edit, vehicleType: e.target.value })} style={field} disabled={!fleet?.fleetManager && !!edit.id}>
                <option value="ambulance">{t('Ambulance')}</option>
                {fleet?.fleetManager && <option value="service">{t('Véhicule de service')}</option>}
                {fleet?.fleetManager && <option value="autre">{t('Autre')}</option>}
              </select>
            </label>
            <label><span style={label}>{t('Service d\'affectation (son personnel peut faire les contrôles)')}</span>
              <select value={edit.serviceId} onChange={(e) => setEdit({ ...edit, serviceId: e.target.value })} style={field}>
                <option value="">{t('— aucun —')}</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            {fleet?.fleetManager && (
              <label><span style={label}>{t('Responsable (tableau de bord, alertes)')}</span>
                <select value={edit.managerPosteCode || ''} onChange={(e) => setEdit({ ...edit, managerPosteCode: e.target.value })} style={field}>
                  <option value="">{t('Chef sécurité logistique uniquement')}</option>
                  <option value="chef_pole_ro_sau">{t('Chef de pôle RO SAU')}</option>
                </select>
              </label>
            )}
            <label><span style={label}>{t('Kilométrage')}</span><input type="number" min="0" value={edit.mileage} onChange={(e) => setEdit({ ...edit, mileage: e.target.value })} style={field} /></label>
            <label><span style={label}>{t('Notes')}</span><textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} rows={2} style={{ ...field, height: 'auto', padding: 10 }} /></label>
            {edit.id && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg)' }}>
                <input type="checkbox" checked={!edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: !e.target.checked })} /> {t('Retirer du parc (véhicule vendu, réformé…)')}
              </label>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setEdit(null)} style={{ height: 38, padding: '0 14px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer' }}>{t('Annuler')}</button>
              <button type="submit" disabled={saving} style={{ height: 38, padding: '0 16px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{t('Enregistrer')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
