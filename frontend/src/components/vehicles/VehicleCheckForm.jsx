// frontend/src/components/vehicles/VehicleCheckForm.jsx
// Contrôle d'une section (Véhicule → chauffeur, Matériel médical → soignant)
// au départ ou au retour : chaque point OK / Pas OK / Absent (ou niveau en %),
// commentaire et photo en cas d'anomalie, kilométrage, puis signature.
// Une fois enregistré, le contrôle est figé (heure du serveur, fiche PDF).
import React, { useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { X, Camera, Loader, AlertTriangle, PenLine, Check, Gauge } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { SignPadScreen, signButtonStyle } from '../SignatureSession';

const STATUS_BTNS = [
  { key: 'ok', label: 'OK', color: '#16a34a', bg: '#dcfce7' },
  { key: 'ko', label: 'Pas OK', color: '#dc2626', bg: '#fee2e2' },
  { key: 'absent', label: 'Absent', color: '#9333ea', bg: '#f3e8ff' },
];
const LEVEL_PRESETS = [100, 75, 50, 25];

// Photo réduite (≤ 1600 px, JPEG) avant envoi : réseau mobile
async function compressPhoto(file) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8));
    return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export default function VehicleCheckForm({ vehicle, phase, section, mission, onClose, onDone }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [answers, setAnswers] = useState({}); // itemId → { status, value, comment, photoPath, photoUrl }
  const [mileage, setMileage] = useState('');
  const [comment, setComment] = useState('');
  const [destination, setDestination] = useState('');
  const newTrip = phase === 'depart' && !mission && vehicle.vehicleType !== 'ambulance';
  const [step, setStep] = useState('form'); // form | sign | saving
  const [uploading, setUploading] = useState(null);
  const fileRef = useRef(null);
  const photoFor = useRef(null);

  const items = section.items || [];
  const answeredCount = useMemo(() => items.filter((it) => answers[it.id]?.status).length, [answers, items]);
  const anomalies = items.filter((it) => ['ko', 'absent'].includes(answers[it.id]?.status));
  const mileageOk = !section.askMileage || (mileage !== '' && Number(mileage) >= 0);
  const pct = items.length ? Math.round((answeredCount / items.length) * 100) : 0;

  const setAnswer = (id, patch) => setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const setLevel = (it, value) => {
    const v = value === '' ? null : Math.max(0, Math.min(100, Math.round(Number(value))));
    setAnswer(it.id, { value: v, status: v === null ? null : v < (it.min || 0) ? 'ko' : 'ok' });
  };

  const takePhoto = (itemId) => { photoFor.current = itemId; fileRef.current?.click(); };
  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const itemId = photoFor.current;
    if (!file || !itemId) return;
    setUploading(itemId);
    try {
      const small = await compressPhoto(file);
      const res = await vehiclesAPI.uploadPhoto(small);
      setAnswer(itemId, { photoPath: res.data.data.path, photoUrl: URL.createObjectURL(small) });
    } catch (err) {
      toast.error(err.response?.data?.message || t('Photo non envoyée.'));
    } finally {
      setUploading(null);
    }
  };

  const submit = async ({ png }) => {
    setStep('saving');
    try {
      await vehiclesAPI.submitCheck(vehicle.id, {
        phase, sectionKey: section.key, missionId: mission?.id || undefined,
        answers: items.map((it) => ({ itemId: it.id, status: answers[it.id]?.status || null, value: answers[it.id]?.value ?? null, comment: answers[it.id]?.comment || null, photoPath: answers[it.id]?.photoPath || null })),
        mileage: section.askMileage ? Number(mileage) : undefined,
        comment, signature: png, destination: newTrip ? destination : undefined,
      });
      toast.success(t('Contrôle enregistré.'));
      onDone?.();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur lors de l\'enregistrement du contrôle.'));
      setStep('form');
    }
  };

  const phaseLabel = phase === 'depart' ? t('Contrôle départ') : t('Contrôle retour');
  const field = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 14 };

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'var(--bg, #f6f7f9)', display: 'flex', flexDirection: 'column' }}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onPhoto} />

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{phaseLabel} · {t(section.label)}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {vehicle.label} — {vehicle.immatriculation}{section.role ? ` · ${t(section.role)}` : ''}
          </div>
        </div>
        <button onClick={onClose} disabled={step === 'saving'} aria-label={t('Fermer')}
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>
      <div style={{ height: 4, background: 'var(--surface-3)', flexShrink: 0 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#16a34a' : pct >= 50 ? '#ea580c' : '#ca8a04', transition: 'width .2s' }} />
      </div>

      {/* Points de contrôle */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 20px', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', padding: '8px 10px', borderRadius: 'var(--radius-2)', background: 'var(--surface-2)' }}>
            {mission?.title
              ? <>{t('Mission')} : <strong style={{ color: 'var(--fg)' }}>{mission.title}</strong></>
              : newTrip
                ? t('Nouvelle sortie : indiquez la destination ci-dessous (carnet de bord).')
                : phase === 'depart'
                ? t('Aucun ordre de mission pour l\'instant : ce contrôle ouvre une sortie urgente, qui sera rattachée à l\'ordre de mission dès sa création.')
                : t('Retour de mission')}
          </div>

          {newTrip && (
            <label style={{ display: 'block', padding: 12, borderRadius: 'var(--radius-3)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>{t('Destination / motif de la sortie')}</span>
              <input value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={255} placeholder={t('Ex : Douala — achats pharmacie')} style={field} />
            </label>
          )}

          {section.askMileage && (
            <label style={{ display: 'block', padding: 12, borderRadius: 'var(--radius-3)', background: 'var(--surface)', border: `1px solid ${mileageOk ? 'var(--border)' : '#f59e0b'}` }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}><Gauge size={15} /> {t('Kilométrage (compteur)')} *</span>
              <input type="number" inputMode="numeric" min="0" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder={vehicle.mileage ? t('Dernier relevé : {{km}} km', { km: vehicle.mileage.toLocaleString('fr-FR') }) : 'km'} style={field} />
            </label>
          )}

          {items.map((it, idx) => {
            const a = answers[it.id] || {};
            const bad = a.status === 'ko' || a.status === 'absent';
            return (
              <div key={it.id} style={{ padding: 12, borderRadius: 'var(--radius-3)', background: 'var(--surface)', border: `1px solid ${bad ? '#fca5a5' : a.status ? '#bbf7d0' : 'var(--border)'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-subtle)', minWidth: 20, paddingTop: 1 }}>{idx + 1}.</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{t(it.label)}</span>
                  {it.critical && <span title={t('Point critique : en anomalie au retour, le véhicule devient indisponible')} style={{ fontSize: 10, fontWeight: 700, color: '#b91c1c', background: '#fee2e2', borderRadius: 999, padding: '2px 7px', flexShrink: 0 }}>{t('Critique')}</span>}
                </div>

                {it.kind === 'level' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {LEVEL_PRESETS.map((p) => (
                      <button key={p} type="button" onClick={() => setLevel(it, p)}
                        style={{ minWidth: 52, height: 40, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${a.value === p ? 'var(--brand)' : 'var(--border)'}`, background: a.value === p ? 'var(--brand-soft)' : 'var(--surface)', color: 'var(--fg)' }}>
                        {p === 100 ? t('Plein') : `${p} %`}
                      </button>
                    ))}
                    <input type="number" inputMode="numeric" min="0" max="100" value={a.value ?? ''} onChange={(e) => setLevel(it, e.target.value)} placeholder="%" aria-label={t('Niveau en %')} style={{ ...field, width: 80 }} />
                    <button type="button" onClick={() => setAnswer(it.id, { status: a.status === 'absent' ? null : 'absent', value: null })}
                      style={{ height: 40, padding: '0 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${a.status === 'absent' ? '#9333ea' : 'var(--border)'}`, background: a.status === 'absent' ? '#f3e8ff' : 'var(--surface)', color: a.status === 'absent' ? '#7e22ce' : 'var(--fg-muted)' }}>
                      {t('Absent')}
                    </button>
                    {a.status === 'ko' && <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{t('Sous le minimum ({{min}} %)', { min: it.min })}</span>}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {STATUS_BTNS.map((b) => {
                      const on = a.status === b.key;
                      return (
                        <button key={b.key} type="button" onClick={() => setAnswer(it.id, { status: on ? null : b.key })}
                          style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${on ? b.color : 'var(--border)'}`, background: on ? b.bg : 'var(--surface)', color: on ? b.color : 'var(--fg-muted)' }}>
                          {on && <Check size={14} />}{t(b.label)}
                        </button>
                      );
                    })}
                  </div>
                )}

                {bad && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'flex-start' }}>
                    <input value={a.comment || ''} onChange={(e) => setAnswer(it.id, { comment: e.target.value })} placeholder={t('Préciser le problème…')} maxLength={500} style={{ ...field, flex: 1 }} />
                    <button type="button" onClick={() => takePhoto(it.id)} disabled={uploading === it.id} aria-label={t('Photo')}
                      style={{ width: 44, height: 40, flexShrink: 0, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', padding: 0 }}>
                      {uploading === it.id ? <Loader size={16} className="animate-spin" /> : a.photoUrl ? <img src={a.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={17} />}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>{t('Observations')}</span>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={2000} placeholder={t('Remarques générales (facultatif)')} style={{ ...field, resize: 'vertical' }} />
          </label>
        </div>
      </div>

      {/* Bas : résumé + signature */}
      <div style={{ padding: '10px 14px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))', background: 'var(--surface)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', fontSize: 12, color: 'var(--fg-muted)' }}>
            <strong style={{ color: 'var(--fg)' }}>{t('{{n}}/{{total}} points vérifiés', { n: answeredCount, total: items.length })}</strong>
            {anomalies.length > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}> · {t('{{count}} anomalie(s)', { count: anomalies.length })}</span>}
            {answeredCount > 0 && answeredCount < items.length && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#b45309', marginTop: 2 }}><AlertTriangle size={12} /> {t('Fiche incomplète : elle sera enregistrée comme partielle.')}</div>
            )}
          </div>
          <button type="button" disabled={!answeredCount || !mileageOk} onClick={() => setStep('sign')} style={{ ...signButtonStyle(true, !answeredCount || !mileageOk), height: 46 }}>
            <PenLine size={17} /> {t('Signer et enregistrer')}
          </button>
        </div>
      </div>

      {(step === 'sign' || step === 'saving') && (
        <SignPadScreen signerName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()} busy={step === 'saving'}
          subtitle={t('{{phase}} · {{section}} — {{name}} : je certifie avoir effectué ce contrôle.', { phase: phaseLabel, section: t(section.label), name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() })}
          onBack={() => setStep('form')} onValidate={submit} />
      )}
    </div>,
    document.body
  );
}
