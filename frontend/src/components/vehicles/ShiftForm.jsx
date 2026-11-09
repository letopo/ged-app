// frontend/src/components/vehicles/ShiftForm.jsx
// Fiche « Prise de poste » du matin (RO SAU) : les ambulances sur une seule
// fiche — on coche le matériel vital de l'une puis de l'autre, on compte les
// bouteilles d'oxygène à bord — puis le stock d'oxygène en réserve (pleines /
// vides). Signée puis figée (fiche PDF transmise au Chef de pôle RO SAU).
import React, { useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { X, Minus, Plus, PenLine, Check, CheckCheck, FileText, AlertTriangle } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { SignPadScreen, signButtonStyle } from '../SignatureSession';
import { openCheckPdf, OXYGEN, oxygenLevel } from './fleetUi';

const isAnswered = (it, a) => !!a?.status || (it.kind === 'level' && a?.value !== null && a?.value !== undefined && a?.value !== '');
const isBad = (it, a) => a?.status === 'ko' || a?.status === 'absent' || (it.kind === 'level' && a?.value !== null && a?.value !== undefined && a?.value !== '' && Number(a.value) < (it.min || 0));

export function OxygenBanner({ level, short = [], style }) {
  const { t } = useTranslation();
  if (!level) return null;
  const o = OXYGEN[level];
  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, background: o.bg, color: o.color, fontSize: 13, fontWeight: 700, ...style }}>
      {level === 'ok' ? '🟢' : level === 'commander' ? '🟠' : '🔴'} {t(o.label)}
      {short.length > 0 && <div style={{ fontWeight: 500, fontSize: 12, marginTop: 2 }}>{t('Moins de 2 bouteilles : {{list}}', { list: short.join(', ') })}</div>}
    </div>
  );
}

export function Counter({ value, onChange, label, hint }) {
  const { t } = useTranslation();
  const stepBtn = { width: 40, height: 40, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };
  const set = (n) => onChange(n === null ? null : Math.max(0, Math.min(99, n)));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" style={stepBtn} aria-label={t('Moins')} onClick={() => set(value === null ? 0 : value - 1)}><Minus size={16} /></button>
        <input type="number" inputMode="numeric" min="0" value={value ?? ''} placeholder="—" aria-label={label}
          onChange={(e) => set(e.target.value === '' ? null : Math.round(Number(e.target.value)) || 0)}
          style={{ boxSizing: 'border-box', width: 64, height: 40, textAlign: 'center', fontWeight: 800, fontSize: 16, border: `1px solid ${value === null ? 'var(--border)' : '#86efac'}`, borderRadius: 8, background: 'var(--surface)', color: 'var(--fg)' }} />
        <button type="button" style={stepBtn} aria-label={t('Plus')} onClick={() => set(value === null ? 1 : value + 1)}><Plus size={16} /></button>
      </div>
    </div>
  );
}

export default function ShiftForm({ state, onClose, onDone }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const ambulances = state.ambulances;
  const per = state.perAmbulance || 2;
  const [answers, setAnswers] = useState({}); // vehicleId → itemId → { status, value }
  const [bottles, setBottles] = useState({}); // vehicleId → n
  const [reserveFull, setReserveFull] = useState(null);
  const [reserveEmpty, setReserveEmpty] = useState(null);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState('form');
  const [result, setResult] = useState(null);
  const scrollRef = useRef(null);
  const refs = useRef({});

  const setA = (vid, iid, patch) => setAnswers((p) => ({ ...p, [vid]: { ...(p[vid] || {}), [iid]: { ...(p[vid]?.[iid] || {}), ...patch } } }));
  const allOk = (v) => setAnswers((p) => {
    const cur = { ...(p[v.id] || {}) };
    for (const it of v.items) if (!isAnswered(it, cur[it.id]) && it.kind !== 'level') cur[it.id] = { status: 'ok' };
    return { ...p, [v.id]: cur };
  });

  const stats = useMemo(() => ambulances.map((v) => {
    const a = answers[v.id] || {};
    return {
      v, done: v.items.filter((it) => isAnswered(it, a[it.id])).length, total: v.items.length,
      bad: v.items.filter((it) => isBad(it, a[it.id])).length, bottles: bottles[v.id] ?? null,
    };
  }), [ambulances, answers, bottles]);
  const anyDone = stats.some((s) => s.done || s.bottles !== null);
  const incomplete = stats.some((s) => s.done < s.total || s.bottles === null) || reserveFull === null || reserveEmpty === null;
  const level = oxygenLevel(reserveFull, ambulances.map((v) => ({ bottles: bottles[v.id] ?? null })), per);
  const short = ambulances.filter((v) => bottles[v.id] !== undefined && bottles[v.id] !== null && bottles[v.id] < per).map((v) => v.label);
  const lastBottles = (vid) => state.last?.vehicles?.find((x) => x.vehicleId === vid)?.bottles;

  const submit = async ({ png }) => {
    setStep('saving');
    try {
      const res = await vehiclesAPI.submitShift({
        vehicles: ambulances.map((v) => ({
          vehicleId: v.id, bottles: bottles[v.id] ?? null,
          answers: v.items.map((it) => {
            const a = answers[v.id]?.[it.id] || {};
            return { itemId: it.id, status: it.kind === 'level' ? undefined : a.status, value: a.value };
          }),
        })),
        reserveFull, reserveEmpty, comment, signature: png,
      });
      setResult(res.data.data);
      setStep('done');
      onDone?.();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur lors de l\'enregistrement de la prise de poste.'));
      setStep('form');
    }
  };

  const chip = (on, color, bg) => ({ height: 40, padding: '0 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, border: `1.5px solid ${on ? color : 'var(--border)'}`, background: on ? bg : 'var(--surface)', color: on ? color : 'var(--fg-muted)' });
  const signer = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const goTo = (k) => { const el = refs.current[k]; const box = scrollRef.current; if (el && box) box.scrollTop = el.offsetTop - 8; };

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'var(--bg, #f6f7f9)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{t('Prise de poste')}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{ambulances.map((v) => v.label).join(' · ')} · {t('oxygène')}</div>
        </div>
        <button onClick={onClose} disabled={step === 'saving'} aria-label={t('Fermer')}
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>
      </div>

      {step === 'done' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="ged-card" style={{ padding: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
              <Check size={22} color="#16a34a" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{t('Prise de poste enregistrée.')}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                  {result?.shift?.anomalies ? t('{{count}} anomalie(s) : les responsables sont prévenus.', { count: result.shift.anomalies }) : t('Aucune anomalie.')}
                </div>
              </div>
              {result?.shift?.id && <button type="button" onClick={() => openCheckPdf(vehiclesAPI, result.shift.id, 'shift')} style={{ ...signButtonStyle(false), height: 38 }}><FileText size={15} /> {t('Fiche PDF')}</button>}
            </div>
            <OxygenBanner level={result?.oxygen?.level} short={result?.oxygen?.short} />
            <button type="button" onClick={onClose} style={{ ...signButtonStyle(true), alignSelf: 'flex-end' }}>{t('Fermer')}</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, padding: '8px 14px', overflowX: 'auto', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {stats.map(({ v, done, total, bad, bottles: b }) => {
              const full = done === total && b !== null;
              return (
                <button key={v.id} type="button" onClick={() => goTo(v.id)}
                  style={{ flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${bad ? '#fdba74' : full ? '#86efac' : 'var(--border)'}`, background: bad ? '#fff7ed' : full ? '#f0fdf4' : 'var(--surface)', color: 'var(--fg)' }}>
                  {v.label} · {done}/{total}
                </button>
              );
            })}
            <button type="button" onClick={() => goTo('reserve')}
              style={{ flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${reserveFull !== null && reserveEmpty !== null ? '#86efac' : 'var(--border)'}`, background: 'var(--surface)', color: 'var(--fg)' }}>
              {t('Réserve d\'oxygène')}
            </button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 20px', position: 'relative' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ambulances.map((v) => {
                const a = answers[v.id] || {};
                return (
                  <div key={v.id} ref={(el) => { refs.current[v.id] = el; }} className="ged-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)' }}>{v.label} <span style={{ fontWeight: 500, fontSize: 12, color: 'var(--fg-muted)' }}>{v.immatriculation}</span></div>
                        {v.shortages?.open > 0 && <div style={{ fontSize: 12, color: v.shortages.critical ? '#b91c1c' : '#c2410c', fontWeight: 600 }}>{t('{{count}} article(s) non réarmé(s)', { count: v.shortages.open })}</div>}
                      </div>
                      <button type="button" onClick={() => allOk(v)} title={t('Les points non remplis passent à OK (la pression reste à saisir)')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 10px', borderRadius: 8, border: '1px solid #86efac', background: '#f0fdf4', color: '#15803d', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        <CheckCheck size={14} /> {t('Tout est OK')}
                      </button>
                    </div>
                    {v.items.map((it) => {
                      const x = a[it.id] || {};
                      const bad = isBad(it, x);
                      return (
                        <div key={it.id} style={{ padding: '10px 14px', borderTop: '1px solid var(--surface-3)', background: bad ? '#fff7ed' : 'transparent', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 200px', minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                            {t(it.label)}
                            {it.critical && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#b91c1c', background: '#fee2e2', borderRadius: 999, padding: '1px 6px' }}>{t('Critique')}</span>}
                            {it.kind === 'level' && <div style={{ fontSize: 12, fontWeight: 400, color: bad ? '#dc2626' : 'var(--fg-muted)' }}>{t('Minimum : {{min}} {{unit}}', { min: it.min, unit: it.unit || '%' })}</div>}
                          </div>
                          {it.kind === 'level' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input type="number" inputMode="numeric" min="0" value={x.value ?? ''} placeholder="—" aria-label={t('Valeur')}
                                onChange={(e) => setA(v.id, it.id, { value: e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))) })}
                                style={{ boxSizing: 'border-box', width: 90, height: 40, textAlign: 'center', fontWeight: 700, fontSize: 15, border: `1px solid ${bad ? '#f87171' : isAnswered(it, x) ? '#86efac' : 'var(--border)'}`, borderRadius: 8, background: 'var(--surface)', color: 'var(--fg)' }} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-muted)' }}>{it.unit || '%'}</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button type="button" onClick={() => setA(v.id, it.id, { status: x.status === 'ok' ? null : 'ok' })} style={chip(x.status === 'ok', '#16a34a', '#dcfce7')}>{x.status === 'ok' && <Check size={14} />}{t('OK')}</button>
                              <button type="button" onClick={() => setA(v.id, it.id, { status: x.status === 'ko' ? null : 'ko' })} style={chip(x.status === 'ko', '#dc2626', '#fee2e2')}>{t('Pas OK')}</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', background: 'color-mix(in srgb, #0ea5e9 6%, transparent)' }}>
                      <Counter value={bottles[v.id] ?? null} onChange={(n) => setBottles((p) => ({ ...p, [v.id]: n }))}
                        label={t('Bouteilles d\'oxygène dans l\'ambulance')}
                        hint={[t('Normalement {{n}}', { n: per }), lastBottles(v.id) !== undefined && lastBottles(v.id) !== null ? t('dernier : {{n}}', { n: lastBottles(v.id) }) : null].filter(Boolean).join(' · ')} />
                    </div>
                  </div>
                );
              })}

              <div ref={(el) => { refs.current.reserve = el; }} className="ged-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)' }}>{t('Réserve d\'oxygène')}</div>
                <Counter value={reserveFull} onChange={setReserveFull} label={t('Bouteilles pleines en réserve')} hint={state.last?.reserveFull !== null && state.last?.reserveFull !== undefined ? t('dernier : {{n}}', { n: state.last.reserveFull }) : null} />
                <Counter value={reserveEmpty} onChange={setReserveEmpty} label={t('Bouteilles vides en réserve')} hint={state.last?.reserveEmpty !== null && state.last?.reserveEmpty !== undefined ? t('dernier : {{n}}', { n: state.last.reserveEmpty }) : null} />
                <OxygenBanner level={level} short={short} />
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{t('Commander dès qu\'il ne reste plus aucune bouteille pleine en réserve ; urgent si une ambulance n\'a plus ses 2 bouteilles.')}</div>
              </div>

              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>{t('Observations')}</span>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={2000} placeholder={t('Remarques générales (facultatif)')}
                  style={{ width: '100%', boxSizing: 'border-box', padding: 10, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--fg)', fontSize: 14, resize: 'vertical' }} />
              </label>
            </div>
          </div>

          <div style={{ padding: '10px 14px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))', background: 'var(--surface)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', fontSize: 12, color: 'var(--fg-muted)' }}>
                {stats.map((s) => <span key={s.v.id} style={{ marginRight: 8 }}><strong style={{ color: 'var(--fg)' }}>{s.v.label}</strong> {s.done}/{s.total}{s.bad ? <span style={{ color: '#c2410c', fontWeight: 700 }}> · {t('{{count}} anomalie(s)', { count: s.bad })}</span> : ''}</span>)}
                {anyDone && incomplete && <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#b45309', marginTop: 2 }}><AlertTriangle size={12} /> {t('Fiche incomplète : elle sera enregistrée comme partielle.')}</div>}
              </div>
              <button type="button" disabled={!anyDone} onClick={() => setStep('sign')} style={{ ...signButtonStyle(true, !anyDone), height: 46 }}>
                <PenLine size={17} /> {t('Signer et enregistrer')}
              </button>
            </div>
          </div>
        </>
      )}

      {(step === 'sign' || step === 'saving') && (
        <SignPadScreen signerName={signer} busy={step === 'saving'}
          subtitle={t('Prise de poste · {{list}} — {{name}} : je certifie avoir effectué ce contrôle.', { list: ambulances.map((v) => v.label).join(', '), name: signer })}
          onBack={() => setStep('form')} onValidate={submit} />
      )}
    </div>,
    document.body
  );
}
