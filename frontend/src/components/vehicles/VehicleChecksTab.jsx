// frontend/src/components/vehicles/VehicleChecksTab.jsx
// Onglet « Contrôles » (équipage) : une carte par ambulance, puis les contrôles
// départ / retour par section (Véhicule → chauffeur, Matériel → soignant).
import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Loader, X, CheckCircle2, Circle, FileText, ArrowUpRight, ArrowDownLeft, Truck } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import VehicleCheckForm from './VehicleCheckForm';
import { LEVELS, STATUS, fmtDateTime, openCheckPdf } from './fleetUi';

export function ReadinessBadge({ readiness }) {
  const { t } = useTranslation();
  const lv = LEVELS[readiness?.level || 'aucun'];
  return (
    <span title={readiness?.at ? t('Dernier contrôle ({{phase}}) le {{date}}', { phase: readiness.phase === 'depart' ? t('départ') : t('retour'), date: fmtDateTime(readiness.at) }) : t('Aucun contrôle')}
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

// Contrôles d'une ambulance : départ / retour, une ligne par section
function VehiclePanel({ vehicleId, onClose, onChanged }) {
  const { t } = useTranslation();
  const [state, setState] = useState(null);
  const [form, setForm] = useState(null); // { phase, section, mission }

  const load = useCallback(() => {
    vehiclesAPI.state(vehicleId).then((r) => setState(r.data.data)).catch((err) => { toast.error(err.response?.data?.message || t('Erreur serveur.')); onClose(); });
  }, [vehicleId, onClose, t]);
  useEffect(() => { load(); }, [load]);

  if (!state) {
    return ReactDOM.createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9400, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader className="animate-spin" color="#fff" /></div>,
      document.body
    );
  }

  const { vehicle, sections, mission, lastFinishedMission, checks } = state;
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
          {disabledReason || (target?.title || (phase === 'depart' ? t('Sortie urgente (l\'ordre de mission sera rattaché ensuite)') : ''))}
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
              {vehicle.immatriculation} <StatusBadge status={vehicle.status} reason={vehicle.unavailableReason} /> <ReadinessBadge readiness={vehicle.readiness} />
            </div>
            {vehicle.status === 'indisponible' && vehicle.unavailableReason && (
              <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{vehicle.unavailableReason}</div>
            )}
          </div>
          <button onClick={onClose} aria-label={t('Fermer')} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {phaseBlock('depart', departMission)}
          {phaseBlock('retour', retourMission)}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function VehicleChecksTab({ vehicles, loading, onChanged, initialVehicleId }) {
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
            style={{ textAlign: 'left', padding: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, borderLeft: `4px solid ${LEVELS[v.readiness?.level || 'aucun'].color}` }}>
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
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', minHeight: 16 }}>
              {v.currentMission
                ? (v.currentMission.documentTitle || v.currentMission.title || t('Mission'))
                  + (v.currentMission.status === 'en_cours' ? ` · ${t('partie le {{date}}', { date: fmtDateTime(v.currentMission.departedAt) })}` : ` · ${t('prévue le {{date}}', { date: fmtDateTime(v.currentMission.plannedDepartureAt) })}`)
                : v.status === 'indisponible' ? v.unavailableReason : t('Aucune mission prévue')}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>{t('Faire un contrôle')} →</span>
          </button>
        ))}
      </div>
      {openId && <VehiclePanel vehicleId={openId} onClose={closePanel} onChanged={onChanged} />}
    </>
  );
}
