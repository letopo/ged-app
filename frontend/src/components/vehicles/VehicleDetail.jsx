// frontend/src/components/vehicles/VehicleDetail.jsx
// Fiche véhicule (plein écran) : résumé, carnet de bord (sorties, km),
// carburant, entretien et échéances. Entretien / échéances : responsables ;
// carburant : aussi les conducteurs.
import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { X, Loader, Plus, Fuel, Wrench, CalendarClock, Route, Gauge, CheckCircle2, Pencil, Trash2, Paperclip } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import { StatusBadge } from './VehicleChecksTab';
import { fmtDateTime, MISSION_STATUS } from './fleetUi';
import {
  FuelForm, MaintenanceForm, DeadlineForm, DeadlineDoneForm, DeadlineBadge,
  MAINTENANCE_KINDS, MAINTENANCE_STATUS, money, km, frDate, fileUrl,
} from './fleetForms';

const TYPE_LABEL = { ambulance: 'Ambulance', service: 'Véhicule de service', autre: 'Autre' };

export default function VehicleDetail({ vehicle, onClose, onChanged, initialTab }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(initialTab || 'resume');
  const [form, setForm] = useState(null); // { type, item }

  const load = useCallback(() => {
    vehiclesAPI.details(vehicle.id).then((r) => setData(r.data.data)).catch((err) => { toast.error(err.response?.data?.message || t('Erreur serveur.')); onClose(); });
  }, [vehicle.id, onClose, t]);
  useEffect(() => { load(); }, [load]);

  const done = () => { setForm(null); load(); onChanged?.(); };
  const remove = async (fn) => {
    if (!window.confirm(t('Supprimer cette ligne ?'))) return;
    try { await fn(); load(); onChanged?.(); } catch (err) { toast.error(err.response?.data?.message || t('Erreur serveur.')); }
  };

  const manager = !!data?.canManage;
  const tabs = [
    { key: 'resume', label: t('Résumé'), icon: Gauge },
    { key: 'carnet', label: t('Carnet de bord'), icon: Route },
    { key: 'carburant', label: t('Carburant'), icon: Fuel },
    ...(manager ? [{ key: 'entretien', label: t('Entretien'), icon: Wrench }, { key: 'echeances', label: t('Échéances'), icon: CalendarClock }] : []),
  ];
  const btn = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
  const iconBtn = { width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
  const row = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--surface-3)', flexWrap: 'wrap' };
  const stat = (label, value) => (
    <div className="ged-card" style={{ padding: 12, flex: '1 1 140px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--fg)', marginTop: 4 }}>{value}</div>
    </div>
  );
  const attach = (p) => p && <a href={fileUrl(p)} target="_blank" rel="noreferrer" title={t('Pièce jointe')} style={{ color: 'var(--brand)', display: 'inline-flex' }}><Paperclip size={14} /></a>;

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9300, background: 'var(--bg, #f6f7f9)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)' }}>{vehicle.label} <span style={{ fontWeight: 500, color: 'var(--fg-muted)', fontSize: 13 }}>{vehicle.immatriculation}</span></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
            {t(TYPE_LABEL[vehicle.vehicleType] || vehicle.vehicleType)}{vehicle.brand ? ` · ${vehicle.brand} ${vehicle.model || ''}` : ''}{vehicle.year ? ` · ${vehicle.year}` : ''} · {km(vehicle.mileage)}
            <StatusBadge status={vehicle.status} reason={vehicle.unavailableReason} />
          </div>
        </div>
        <button onClick={onClose} aria-label={t('Fermer')} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>
      </div>
      <div role="tablist" style={{ display: 'flex', gap: 2, padding: '0 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: tab === key ? 700 : 500, color: tab === key ? 'var(--fg)' : 'var(--fg-muted)', borderBottom: `2px solid ${tab === key ? 'var(--brand)' : 'transparent'}`, marginBottom: -1 }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {!data ? <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader className="animate-spin" /></div> : (
            <>
              {tab === 'resume' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {stat(t('Kilométrage'), km(vehicle.mileage))}
                    {stat(t('Km parcourus (30 j)'), km(data.stats.km30))}
                    {stat(t('Consommation'), data.stats.consumption ? `${data.stats.consumption} L/100 km` : '—')}
                    {stat(t('Carburant (30 j)'), `${data.stats.fuel30Liters} L · ${money(data.stats.fuel30Amount)}`)}
                    {manager && stat(t('Entretien (12 mois)'), money(data.stats.maintenance12Cost))}
                  </div>
                  {data.deadlines.length > 0 && (
                    <div className="ged-card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>{t('Échéances')}</div>
                      {data.deadlines.map((d) => (
                        <div key={d.id} style={row}>
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--fg)' }}>{d.label}</span>
                          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{[d.dueDate && frDate(d.dueDate), d.dueMileage && km(d.dueMileage)].filter(Boolean).join(' · ') || '—'}</span>
                          <DeadlineBadge status={d.status} />
                        </div>
                      ))}
                    </div>
                  )}
                  {vehicle.vin && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('N° de châssis')} : {vehicle.vin}</div>}
                </div>
              )}

              {tab === 'carnet' && (
                <div className="ged-card" style={{ padding: 14 }}>
                  {data.trips.length === 0 && <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Aucune sortie enregistrée.')}</div>}
                  {data.trips.map((tr) => (
                    <div key={tr.id} style={row}>
                      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{tr.title || tr.destination || t('Sortie')}</div>
                        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                          {t(MISSION_STATUS[tr.status] || tr.status)} · {tr.departedAt ? fmtDateTime(tr.departedAt) : t('prévue le {{date}}', { date: fmtDateTime(tr.plannedDepartureAt) })}
                          {tr.returnedAt ? ` → ${fmtDateTime(tr.returnedAt)}` : ''}{tr.crew.length ? ` · ${tr.crew.join(', ')}` : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)', textAlign: 'right' }}>
                        {tr.kmDepart != null ? km(tr.kmDepart) : '—'} → {tr.kmRetour != null ? km(tr.kmRetour) : '—'}
                        <div style={{ fontWeight: 700, color: 'var(--fg)' }}>{tr.distance != null ? km(tr.distance) : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'carburant' && (
                <div className="ged-card" style={{ padding: 14 }}>
                  <button type="button" style={btn} onClick={() => setForm({ type: 'fuel' })}><Plus size={14} /> {t('Ajouter un plein')}</button>
                  {data.fuel.length === 0 && <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 10 }}>{t('Aucun plein enregistré.')}</div>}
                  {data.fuel.map((f) => (
                    <div key={f.id} style={row}>
                      <span style={{ fontSize: 13, color: 'var(--fg)', minWidth: 80 }}>{frDate(f.date)}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{Number(f.liters).toLocaleString('fr-FR')} L{f.fullTank ? '' : ` (${t('partiel')})`}</span>
                      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{money(f.amount)} · {km(f.mileage)}{f.station ? ` · ${f.station}` : ''} · {f.createdByName}</span>
                      {attach(f.attachmentPath)}
                      {manager && <button type="button" style={iconBtn} onClick={() => remove(() => vehiclesAPI.deleteFuel(vehicle.id, f.id))} aria-label={t('Supprimer')}><Trash2 size={13} /></button>}
                    </div>
                  ))}
                </div>
              )}

              {tab === 'entretien' && manager && (
                <div className="ged-card" style={{ padding: 14 }}>
                  <button type="button" style={btn} onClick={() => setForm({ type: 'maintenance' })}><Plus size={14} /> {t('Ajouter un entretien / une réparation')}</button>
                  {data.maintenances.length === 0 && <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 10 }}>{t('Aucun entretien enregistré.')}</div>}
                  {data.maintenances.map((m) => (
                    <div key={m.id} style={row}>
                      <span style={{ fontSize: 13, color: 'var(--fg)', minWidth: 80 }}>{frDate(m.date)}</span>
                      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{t(MAINTENANCE_KINDS[m.kind] || m.kind)} — {m.description}</div>
                        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{[m.garage, m.mileage != null && km(m.mileage), m.createdByName].filter(Boolean).join(' · ')}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 8px', background: m.status === 'terminee' ? '#dcfce7' : '#ffedd5', color: m.status === 'terminee' ? '#15803d' : '#c2410c' }}>{t(MAINTENANCE_STATUS[m.status])}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{money(m.cost)}</span>
                      {attach(m.attachmentPath)}
                      <button type="button" style={iconBtn} onClick={() => setForm({ type: 'maintenance', item: m })} aria-label={t('Modifier')}><Pencil size={13} /></button>
                      <button type="button" style={iconBtn} onClick={() => remove(() => vehiclesAPI.deleteMaintenance(vehicle.id, m.id))} aria-label={t('Supprimer')}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'echeances' && manager && (
                <div className="ged-card" style={{ padding: 14 }}>
                  <button type="button" style={btn} onClick={() => setForm({ type: 'deadline' })}><Plus size={14} /> {t('Ajouter une échéance')}</button>
                  {data.deadlines.map((d) => (
                    <div key={d.id} style={row}>
                      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{d.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                          {t('Prochaine')} : {[d.dueDate && frDate(d.dueDate), d.dueMileage && km(d.dueMileage)].filter(Boolean).join(' ou ') || t('à renseigner')}
                          {d.days != null && d.days >= 0 ? ` (${t('dans {{n}} j', { n: d.days })})` : ''}{d.kmLeft != null && d.kmLeft > 0 ? ` (${t('dans {{n}} km', { n: d.kmLeft.toLocaleString('fr-FR') })})` : ''}
                          {d.lastDoneDate ? ` · ${t('dernière le {{d}}', { d: frDate(d.lastDoneDate) })}` : ''}
                        </div>
                      </div>
                      <DeadlineBadge status={d.status} />
                      {attach(d.attachmentPath)}
                      <button type="button" onClick={() => setForm({ type: 'deadlineDone', item: d })} style={{ ...iconBtn, width: 'auto', padding: '0 10px', color: '#15803d', borderColor: '#bbf7d0', gap: 4, fontSize: 12, fontWeight: 700 }}><CheckCircle2 size={13} /> {t('Fait')}</button>
                      <button type="button" style={iconBtn} onClick={() => setForm({ type: 'deadline', item: d })} aria-label={t('Modifier')}><Pencil size={13} /></button>
                      <button type="button" style={iconBtn} onClick={() => remove(() => vehiclesAPI.deleteDeadline(vehicle.id, d.id))} aria-label={t('Supprimer')}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {form?.type === 'fuel' && <FuelForm vehicle={vehicle} onClose={() => setForm(null)} onDone={done} />}
      {form?.type === 'maintenance' && <MaintenanceForm vehicle={vehicle} initial={form.item} onClose={() => setForm(null)} onDone={done} />}
      {form?.type === 'deadline' && <DeadlineForm vehicle={vehicle} initial={form.item} onClose={() => setForm(null)} onDone={done} />}
      {form?.type === 'deadlineDone' && <DeadlineDoneForm vehicle={vehicle} deadline={form.item} onClose={() => setForm(null)} onDone={done} />}
    </div>,
    document.body
  );
}
