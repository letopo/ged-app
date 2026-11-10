// frontend/src/components/vehicles/ShiftTab.jsx
// Onglet « Prise de poste » (RO SAU) : état de l'oxygène, prise de poste du
// jour (faite / à faire), bouton pour la remplir, historique des fiches PDF.
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader, Sunrise, FileText, CheckCircle2, Truck } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import { StatusBadge, ShortageBadge } from './VehicleChecksTab';
import { fmtDateTime, openCheckPdf, OXYGEN } from './fleetUi';
import ShiftForm, { OxygenBanner } from './ShiftForm';

export default function ShiftTab({ refreshKey, onChanged }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  // ?open=soignant|chauffeur (ou 1) : ouvre directement la fiche
  const [open, setOpen] = useState(params.get('open') || null);

  const load = useCallback(() => {
    vehiclesAPI.shiftState()
      .then((r) => { setData(r.data.data); setError(null); })
      .catch((err) => { setError(err.response?.data?.message || t('Erreur serveur.')); if (err.response?.status !== 403) toast.error(err.response?.data?.message || t('Erreur serveur.')); });
  }, [t]);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (error) return <div className="ged-card" style={{ padding: 30, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>{error}</div>;
  if (!data) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader className="animate-spin" /></div>;

  const myParts = data.myParts || ['soignant'];
  const partTitle = (p) => (p === 'chauffeur' ? t('Partie chauffeur : véhicule') : t('Partie soignant : matériel médical et oxygène'));
  const partHelp = (p) => (p === 'chauffeur'
    ? t('Carburant, huile, freins, pneus, feux, gyrophare… et kilométrage, pour chaque ambulance.')
    : t('Matériel vital de chaque ambulance, bouteilles d\'oxygène à bord et stock en réserve.'));
  const statusOf = (p) => {
    const done = data.todayChecks.filter((x) => x.part === p);
    const covered = new Set(done.flatMap((x) => x.vehicles.map((v) => v.vehicleId)));
    return { done, missing: data.ambulances.filter((v) => v.parts?.[p] && !covered.has(v.id)) };
  };
  const ox = data.oxygen;
  const openPart = open === '1' || open === 'true' ? myParts[0] : myParts.includes(open) ? open : null;
  const close = () => { setOpen(null); if (params.get('open')) { params.delete('open'); setParams(params, { replace: true }); } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Prise de poste du jour : une carte par partie (chauffeur / soignant) */}
      {myParts.map((p) => {
        const { done, missing } = statusOf(p);
        return (
          <div key={p} className="ged-card" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', borderColor: missing.length ? 'color-mix(in srgb, #ea580c 35%, var(--border))' : 'color-mix(in srgb, #16a34a 30%, var(--border))' }}>
            {p === 'chauffeur' ? <Truck size={26} color={missing.length ? '#ea580c' : '#16a34a'} /> : <Sunrise size={26} color={missing.length ? '#ea580c' : '#16a34a'} />}
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)' }}>{t('Prise de poste du jour')} · {partTitle(p)}</div>
              {done.map((x) => (
                <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#15803d', fontWeight: 600, marginTop: 2, flexWrap: 'wrap' }}>
                  <CheckCircle2 size={15} /> {t('Faite par {{name}} le {{date}}', { name: x.by, date: fmtDateTime(x.at) })}
                  {x.anomalies > 0 && <span style={{ color: x.critical ? '#b91c1c' : '#c2410c' }}>· {t('{{count}} anomalie(s)', { count: x.anomalies })}</span>}
                </div>
              ))}
              {missing.length > 0 && <div style={{ fontSize: 13, color: '#c2410c', fontWeight: 600, marginTop: 2 }}>{t('À faire : {{list}}', { list: missing.map((v) => v.label).join(', ') })}</div>}
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>{partHelp(p)}</div>
            </div>
            <button type="button" onClick={() => setOpen(p)}
              style={{ height: 44, padding: '0 18px', borderRadius: 10, border: missing.length ? 'none' : '1px solid var(--border)', background: missing.length ? 'var(--brand)' : 'var(--surface)', color: missing.length ? '#fff' : 'var(--fg)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {missing.length ? t('Faire la prise de poste') : t('Refaire une prise de poste')}
            </button>
          </div>
        );
      })}

      {/* Oxygène (partie soignant) */}
      {myParts.includes('soignant') && <div className="ged-card" style={{ padding: 16, borderColor: ox?.level ? `color-mix(in srgb, ${OXYGEN[ox.level].color} 35%, var(--border))` : undefined }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)', marginBottom: 8 }}>{t('Oxygène')}</div>
        {!ox ? (
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Pas encore compté : il le sera à la prochaine prise de poste.')}</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 10 }}>
              {ox.onboard.map((o) => (
                <div key={o.vehicleId} style={{ padding: 10, borderRadius: 8, background: 'var(--surface-2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{o.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: o.bottles === null || o.bottles === undefined ? 'var(--fg-subtle)' : o.bottles < data.perAmbulance ? '#dc2626' : 'var(--fg)' }}>{o.bottles ?? '—'}<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}> / {data.perAmbulance}</span></div>
                </div>
              ))}
              <div style={{ padding: 10, borderRadius: 8, background: 'var(--surface-2)' }}>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('Réserve pleines')}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: ox.reserveFull === 0 ? '#dc2626' : 'var(--fg)' }}>{ox.reserveFull ?? '—'}</div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'var(--surface-2)' }}>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('Réserve vides')}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg)' }}>{ox.reserveEmpty ?? '—'}</div>
              </div>
            </div>
            <OxygenBanner level={ox.level} short={ox.short} />
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 6 }}>{t('Compté le {{date}} par {{name}} · {{total}} bouteille(s) au total', { date: fmtDateTime(ox.at), name: ox.by, total: ox.total })}</div>
          </>
        )}
      </div>}

      {/* Ambulances */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {data.ambulances.map((v) => (
          <div key={v.id} className="ged-card" style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 14, color: 'var(--fg)' }}>{v.label}</strong>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{v.immatriculation}</span>
            <StatusBadge status={v.status} reason={v.unavailableReason} />
            <ShortageBadge shortages={v.shortages} />
          </div>
        ))}
      </div>

      {/* Historique */}
      {data.history.length > 0 && (
        <div className="ged-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: 'var(--fg)', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>{t('Dernières prises de poste')}</div>
          {data.history.map((s) => (
            <button key={s.id} type="button" onClick={() => openCheckPdf(vehiclesAPI, s.id, 'shift')} disabled={!s.documentId}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', border: 'none', borderTop: '1px solid var(--surface-3)', background: 'none', cursor: s.documentId ? 'pointer' : 'default', textAlign: 'left', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', minWidth: 110 }}>{fmtDateTime(s.at)}</span>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)', flex: '1 1 160px' }}>{s.part === 'chauffeur' ? t('Chauffeur') : t('Soignant')} · {s.by} · {s.vehicles.map((v) => `${v.label} ${v.answered}/${v.total}`).join(' · ')}</span>
              {s.anomalies > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: s.critical ? '#b91c1c' : '#c2410c' }}>{t('{{count}} anomalie(s)', { count: s.anomalies })}</span>}
              {s.oxygenLevel && s.oxygenLevel !== 'ok' && <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '1px 8px', color: OXYGEN[s.oxygenLevel].color, background: OXYGEN[s.oxygenLevel].bg }}>{s.oxygenLevel === 'urgent' ? t('O₂ urgent') : t('O₂ à commander')}</span>}
              {s.documentId && <FileText size={15} color="var(--fg-muted)" />}
            </button>
          ))}
        </div>
      )}

      {openPart && <ShiftForm state={data} part={openPart} onClose={close} onDone={() => { load(); onChanged?.(); }} />}
    </div>
  );
}
