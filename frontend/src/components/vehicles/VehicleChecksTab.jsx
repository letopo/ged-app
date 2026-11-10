// frontend/src/components/vehicles/VehicleChecksTab.jsx
// Onglet « Contrôles » (équipage) : une carte par ambulance, puis les contrôles
// départ / retour par section (Véhicule → chauffeur, Matériel → soignant).
import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader, X, CheckCircle2, Circle, FileText, ArrowUpRight, ArrowDownLeft, Truck, Fuel, Gauge, ClipboardList, Sunrise } from 'lucide-react';
import { FuelForm } from './fleetForms';
import { vehiclesAPI } from '../../services/api';
import VehicleCheckForm from './VehicleCheckForm';
import VehicleInventoryForm from './VehicleInventoryForm';
import { LEVELS, STATUS, WEEKDAYS, fmtDateTime, fmtDay, openCheckPdf } from './fleetUi';

// Articles non réarmés (manques ouverts) : rouge si un article critique manque
export function ShortageBadge({ shortages }) {
  const { t } = useTranslation();
  if (!shortages?.open) return null;
  const crit = shortages.critical > 0;
  return (
    <span title={crit ? shortages.criticalLabels?.join(', ') : undefined}
      style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 8px', background: crit ? '#fee2e2' : '#ffedd5', color: crit ? '#b91c1c' : '#c2410c' }}>
      {crit ? '⚠ ' : ''}{t('{{count}} non réarmé(s)', { count: shortages.open })}
    </span>
  );
}

export function ReadinessBadge({ readiness }) {
  const { t } = useTranslation();
  const lv = LEVELS[readiness?.level || 'aucun'];
  return (
    <span title={readiness?.at ? t('Dernier contrôle ({{phase}}) le {{date}}', { phase: readiness.phase === 'prise' ? t('prise de poste') : readiness.phase === 'depart' ? t('départ') : t('retour'), date: fmtDateTime(readiness.at) }) : t('Aucun contrôle')}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: lv.color, background: lv.bg, borderRadius: 999, padding: '3px 9px' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: lv.color }} />
      {readiness?.at ? `${readiness.pct} %` : t('Non contrôlé')}
      {readiness?.anomalies ? ` · ⚠ ${readiness.anomalies}` : ''}
    </span>
  );
}

export function StatusBadge({ status, reason }) {
  const { t } = useTranslation();
  const st = STATUS[status] || STATUS.disponible;
  return (
    <span title={reason || undefined} style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 999, padding: '3px 9px' }}>{t(st.label)}</span>
  );
}

// Jours d'inventaire de la semaine en cours : fait / à faire / non fait.
// Un inventaire fait un jour non prévu est affiché aussi.
export function InventoryWeek({ days, weekStart, week, today, onOpenPdf }) {
  const { t } = useTranslation();
  const doneDays = Object.keys(week || {}).map((date) => new Date(`${date}T12:00:00Z`).getUTCDay());
  const order = [...new Set([...days, ...doneDays])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {order.map((wd) => {
        const d = new Date(`${weekStart}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + ((wd + 6) % 7));
        const date = d.toISOString().slice(0, 10);
        const cell = week?.[date];
        const bad = cell && (cell.shortages || cell.expiring);
        const st = cell ? (bad ? { c: '#c2410c', bg: '#ffedd5', txt: cell.critical ? t('Critique') : t('{{count}} à réassortir', { count: cell.shortages + cell.expiring }) } : { c: '#15803d', bg: '#dcfce7', txt: t('Complet') })
          : date === today ? { c: '#b45309', bg: '#fef3c7', txt: t('À faire aujourd\'hui') }
          : date < today ? { c: '#b91c1c', bg: '#fee2e2', txt: t('Non fait') }
          : { c: 'var(--fg-muted)', bg: 'var(--surface-2)', txt: t('À venir') };
        return (
          <button key={wd} type="button" disabled={!cell} aria-current={date === today ? 'date' : undefined} onClick={() => cell && onOpenPdf?.(cell.id)} title={cell ? t('Fait par {{name}} le {{date}}', { name: cell.by, date: fmtDateTime(cell.at) }) : undefined}
            style={{ flex: '1 1 90px', minWidth: 90, padding: '6px 8px', borderRadius: 8, border: date === today ? `2px solid ${st.c}` : '2px solid transparent', background: st.bg, color: st.c, textAlign: 'left', cursor: cell ? 'pointer' : 'default' }}>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{t(WEEKDAYS[wd])} {fmtDay(date)}</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{cell ? (bad ? '⚠ ' : '✓ ') : ''}{st.txt}</div>
          </button>
        );
      })}
    </div>
  );
}

// Contrôles d'une ambulance : départ / retour, une ligne par section
function VehiclePanel({ vehicleId, onClose, onChanged, onOpenDetail }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [form, setForm] = useState(null); // { phase, section, mission }
  const [fuel, setFuel] = useState(false);
  const [inventory, setInventory] = useState(null); // semaine d'inventaire (ambulances)
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const load = useCallback(() => {
    vehiclesAPI.state(vehicleId).then((r) => {
      setState(r.data.data);
      if (r.data.data?.vehicle?.vehicleType === 'ambulance') {
        vehiclesAPI.inventoryState(vehicleId).then((x) => setInventory(x.data.data)).catch(() => setInventory(null));
      }
    }).catch((err) => { toast.error(err.response?.data?.message || t('Erreur serveur.')); onClose(); });
  }, [vehicleId, onClose, t]);
  useEffect(() => { load(); }, [load]);

  if (!state) {
    return ReactDOM.createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9400, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader className="animate-spin" color="#fff" /></div>,
      document.body
    );
  }

  const { vehicle, sections, mission, lastFinishedMission, checks } = state;
  const todayInventory = inventory?.week?.[inventory.today?.date] || null;
  const checkOf = (missionId, phase, key) => checks.find((c) => c.missionId === missionId && c.phase === phase && c.sectionKey === key);
  // Départ : mission prévue / en cours (sinon sortie urgente). Retour : mission en cours, sinon la dernière terminée.
  const departMission = mission && ['planifiee', 'en_cours'].includes(mission.status) ? mission : null;
  const retourMission = mission?.status === 'en_cours' ? mission : (lastFinishedMission || null);

  const phaseBlock = (phase, target) => {
    const Icon = phase === 'depart' ? ArrowUpRight : ArrowDownLeft;
    const disabledReason = phase === 'retour' && !target ? t('Aucune mission en cours : faites d\'abord le contrôle de départ.') : null;
    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>
          <Icon size={16} color={phase === 'depart' ? '#2563eb' : '#16a34a'} /> {phase === 'depart' ? t('Départ') : t('Retour')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>
          {disabledReason || (target?.title || (phase === 'depart' ? (vehicle.vehicleType === 'ambulance' ? t('Sortie urgente (l\'ordre de mission sera rattaché ensuite)') : t('Nouvelle sortie')) : ''))}
        </div>
        {!disabledReason && sections.map((s) => {
          const done = target ? checkOf(target.id, phase, s.key) : null;
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--surface-3)' }}>
              {done ? <CheckCircle2 size={20} color="#16a34a" /> : <Circle size={20} color="var(--fg-subtle)" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{t(s.label)} <span style={{ fontWeight: 400, color: 'var(--fg-muted)' }}>· {t(s.role || '')}</span></div>
                {done && (
                  <div style={{ fontSize: 11, color: done.anomalies ? '#dc2626' : 'var(--fg-muted)' }}>
                    {t('Fait par {{name}} le {{date}}', { name: done.performedByName, date: fmtDateTime(done.performedAt) })} · {done.answeredItems}/{done.totalItems}
                    {done.anomalies ? ` · ⚠ ${t('{{count}} anomalie(s)', { count: done.anomalies })}` : ''}
                  </div>
                )}
              </div>
              {done ? (
                <button type="button" onClick={() => openCheckPdf(vehiclesAPI, done.id)} title={t('Fiche PDF')}
                  style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={16} />
                </button>
              ) : (
                <button type="button" onClick={() => setForm({ phase, section: s, mission: target })}
                  style={{ height: 36, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {t('Contrôler')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // L'écran de contrôle est rendu À CÔTÉ du panneau, pas dedans : avec les
  // portails React, un clic dans le formulaire remonterait jusqu'au fond du
  // panneau (onClick = fermer) et fermerait tout.
  if (inventoryOpen) {
    // Le parent n'est prévenu qu'à la fermeture : il recharge la liste et
    // démonterait l'écran de résultat (liste de réassort).
    return <VehicleInventoryForm vehicleId={vehicle.id} onClose={() => { setInventoryOpen(false); load(); onChanged?.(); }} />;
  }
  if (fuel) {
    return <FuelForm vehicle={vehicle} onClose={() => setFuel(false)} onDone={() => { setFuel(false); load(); onChanged?.(); }} />;
  }
  if (form) {
    return (
      <VehicleCheckForm vehicle={vehicle} phase={form.phase} section={form.section} mission={form.mission}
        onClose={() => setForm(null)} onDone={() => { setForm(null); load(); onChanged?.(); }} />
    );
  }

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9400, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: '16px 16px 0 0', padding: 16, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)' }}>{vehicle.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
              {vehicle.immatriculation} <StatusBadge status={vehicle.status} reason={vehicle.unavailableReason} /> <ReadinessBadge readiness={vehicle.readiness} /> <ShortageBadge shortages={vehicle.shortages} />
            </div>
            {vehicle.status === 'indisponible' && vehicle.unavailableReason && (
              <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{vehicle.unavailableReason}</div>
            )}
          </div>
          <button onClick={onClose} aria-label={t('Fermer')} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {inventory?.sections?.length > 0 && (state.shiftParts || ['soignant']).includes('soignant') && (
            <div style={{ border: `1px solid ${inventory.today?.due ? '#fcd34d' : 'var(--border)'}`, borderRadius: 'var(--radius-3)', padding: 12, background: inventory.today?.due ? '#fffbeb' : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>
                <ClipboardList size={16} color="#ea580c" /> {t('Inventaire du matériel')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>
                {t('Matériel, consommables, médicaments et DSA : quantités présentes, péremptions du mois.')}
              </div>
              <InventoryWeek days={inventory.days} weekStart={inventory.weekStart} week={inventory.week} today={inventory.today?.date}
                onOpenPdf={(id) => openCheckPdf(vehiclesAPI, id, 'inventory')} />
              {todayInventory && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                  <CheckCircle2 size={16} /> {t('Inventaire du jour fait par {{name}} le {{date}}', { name: todayInventory.by, date: fmtDateTime(todayInventory.at) })}
                </div>
              )}
              <button type="button" onClick={() => setInventoryOpen(true)}
                style={{ marginTop: 10, height: 38, padding: '0 14px', borderRadius: 8, border: inventory.today?.due ? 'none' : '1px solid var(--border)', background: inventory.today?.due ? 'var(--brand)' : 'var(--surface)', color: inventory.today?.due ? '#fff' : 'var(--fg)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {todayInventory ? t('Refaire l\'inventaire') : t('Faire l\'inventaire')}
              </button>
              {vehicle.shortages?.open > 0 && (
                <button type="button" onClick={() => navigate('/vehicules?tab=manques')}
                  style={{ marginTop: 10, marginLeft: 8, height: 38, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {t('Réarmer ({{count}} non réarmé(s))', { count: vehicle.shortages.open })}
                </button>
              )}
            </div>
          )}
          {state.missionChecks === false ? (
            <div style={{ border: `1px solid ${vehicle.readiness?.today ? 'var(--border)' : '#fcd34d'}`, borderRadius: 'var(--radius-3)', padding: 12, background: vehicle.readiness?.today ? 'transparent' : '#fffbeb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>
                <Sunrise size={16} color="#ea580c" /> {t('Prise de poste')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8 }}>
                {t('Contrôlée chaque matin à la prise de poste, pas à chaque mission : le chauffeur fait la partie véhicule, l\'infirmier le matériel médical et l\'oxygène.')}
              </div>
              {(vehicle.readiness?.parts || []).map((p) => (
                <div key={p.part} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, flexWrap: 'wrap', color: (vehicle.readiness.todayParts || []).includes(p.part) ? '#15803d' : 'var(--fg-muted)' }}>
                  <CheckCircle2 size={16} /> {p.part === 'chauffeur' ? t('Véhicule') : t('Matériel médical')} : {t('{{name}} le {{date}}', { name: p.by, date: fmtDateTime(p.at) })}
                  {p.anomalies > 0 && <span style={{ color: '#c2410c' }}>· {t('{{count}} anomalie(s)', { count: p.anomalies })}</span>}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(state.shiftParts || []).map((p) => {
                  const doneToday = (vehicle.readiness?.todayParts || []).includes(p);
                  return (
                    <button key={p} type="button" onClick={() => navigate(`/vehicules?tab=prise&open=${p}`)}
                      style={{ marginTop: 10, height: 38, padding: '0 14px', borderRadius: 8, border: doneToday ? '1px solid var(--border)' : 'none', background: doneToday ? 'var(--surface)' : 'var(--brand)', color: doneToday ? 'var(--fg)' : '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {p === 'chauffeur' ? t('Prise de poste : véhicule') : t('Prise de poste : matériel médical')}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {phaseBlock('depart', departMission)}
              {phaseBlock('retour', retourMission)}
            </>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setFuel(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Fuel size={15} /> {t('Ajouter un plein')}
            </button>
            {onOpenDetail && (
              <button type="button" onClick={() => onOpenDetail(vehicle.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Gauge size={15} /> {t('Fiche du véhicule')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function VehicleChecksTab({ vehicles, loading, onChanged, initialVehicleId, onOpenDetail }) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState(initialVehicleId || null);
  const closePanel = useCallback(() => setOpenId(null), []);

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader className="animate-spin" /></div>;
  if (!vehicles.length) {
    return <div className="ged-card" style={{ padding: 30, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>{t('Aucun véhicule à contrôler pour vous.')}</div>;
  }
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {vehicles.filter((v) => v.canCheck).map((v) => (
          <button key={v.id} type="button" onClick={() => setOpenId(v.id)} className="ged-card"
            style={{ textAlign: 'left', padding: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, borderColor: `color-mix(in srgb, ${LEVELS[v.readiness?.level || 'aucun'].color} 30%, var(--border))` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Truck size={20} color="var(--brand)" /></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{v.label}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{v.immatriculation}{v.mileage ? ` · ${v.mileage.toLocaleString('fr-FR')} km` : ''}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <StatusBadge status={v.status} reason={v.unavailableReason} />
              <ReadinessBadge readiness={v.readiness} />
              <ShortageBadge shortages={v.shortages} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', minHeight: 16 }}>
              {v.currentMission
                ? (v.currentMission.documentTitle || v.currentMission.title || t('Mission'))
                  + (v.currentMission.status === 'en_cours' ? ` · ${t('partie le {{date}}', { date: fmtDateTime(v.currentMission.departedAt) })}` : ` · ${t('prévue le {{date}}', { date: fmtDateTime(v.currentMission.plannedDepartureAt) })}`)
                : v.status === 'indisponible' ? v.unavailableReason : t('Aucune mission prévue')}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>{v.missionChecks === false ? t('Ouvrir') : t('Faire un contrôle')} →</span>
          </button>
        ))}
      </div>
      {openId && <VehiclePanel vehicleId={openId} onClose={closePanel} onChanged={onChanged} onOpenDetail={onOpenDetail ? (id) => { setOpenId(null); onOpenDetail(id); } : null} />}
    </>
  );
}
