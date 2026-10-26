// frontend/src/components/vehicles/VehicleInventoryForm.jsx
// Inventaire hebdomadaire d'une ambulance (fiche RO SAU, lun / mer / ven) :
// quantité présente pour chaque article (manque si sous la quantité requise),
// case « périme ce mois » pour les médicaments, pression d'O2, DSA. Signé puis
// figé (fiche PDF) ; les manques forment la liste de réassort.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { X, Loader, Minus, Plus, PenLine, Check, CheckCheck, CalendarX, AlertTriangle, FileText } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { SignPadScreen, signButtonStyle } from '../SignatureSession';
import { openCheckPdf } from './fleetUi';

const qtyLabel = (n, unit) => `${n}${unit ? ` ${unit}` : ''}`;

// Une ligne est-elle relevée ? (Oui / Non n'est qu'une information)
const isAnswered = (it, a) => {
  if (!a) return false;
  if (it.kind === 'qty') return a.present !== null && a.present !== undefined && a.present !== '';
  if (it.kind === 'level') return a.value !== null && a.value !== undefined && a.value !== '';
  if (it.kind === 'check') return !!a.status;
  return false;
};
const isShort = (it, a) => {
  if (!isAnswered(it, a)) return false;
  if (it.kind === 'qty') return Number(a.present) < (it.required || 0);
  if (it.kind === 'level') return Number(a.value) < (it.min || 0);
  if (it.kind === 'check') return a.status === 'ko';
  return false;
};

export default function VehicleInventoryForm({ vehicleId, onClose, onDone }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [state, setState] = useState(null);
  const [answers, setAnswers] = useState({}); // itemId → { present, expiring, value, status }
  const [comment, setComment] = useState('');
  const [step, setStep] = useState('form'); // form | sign | saving | done
  const [result, setResult] = useState(null);
  const sectionRefs = useRef({});
  const scrollRef = useRef(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    vehiclesAPI.inventoryState(vehicleId)
      .then((r) => setState(r.data.data))
      .catch((err) => { toast.error(err.response?.data?.message || t('Erreur serveur.')); onCloseRef.current?.(); });
  }, [vehicleId, t]);

  const sections = useMemo(() => state?.sections || [], [state]);
  const lastPresent = useMemo(() => new Map((state?.last?.answers || []).map((a) => [a.itemId, a])), [state]);
  const all = useMemo(() => sections.flatMap((s) => s.items || []), [sections]);
  const counted = all.filter((it) => it.kind !== 'yesno');
  const answeredCount = counted.filter((it) => isAnswered(it, answers[it.id])).length;
  const shortList = all.filter((it) => isShort(it, answers[it.id]));
  const expiringCount = all.filter((it) => it.kind === 'qty' && it.expiry && answers[it.id]?.expiring).length;
  const pct = counted.length ? Math.round((answeredCount / counted.length) * 100) : 0;

  const setAnswer = (id, patch) => setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const setPresent = (it, raw) => {
    const v = raw === '' || raw === null ? null : Math.max(0, Math.min(99999, Math.round(Number(raw))));
    setAnswer(it.id, { present: Number.isFinite(v) ? v : null });
  };
  // « Tout est complet » : lignes non relevées de la section = quantité requise / OK
  const fillSection = (s) => setAnswers((prev) => {
    const next = { ...prev };
    for (const it of s.items || []) {
      if (isAnswered(it, next[it.id])) continue;
      if (it.kind === 'qty') next[it.id] = { ...next[it.id], present: it.required };
      else if (it.kind === 'check') next[it.id] = { ...next[it.id], status: 'ok' };
    }
    return next;
  });
  const goTo = (key) => {
    const el = sectionRefs.current[key];
    const box = scrollRef.current;
    if (el && box) box.scrollTop = el.offsetTop - 8;
  };

  const submit = async ({ png }) => {
    setStep('saving');
    try {
      const res = await vehiclesAPI.submitInventory(vehicleId, {
        answers: all.map((it) => ({ itemId: it.id, ...answers[it.id] })),
        comment, signature: png,
      });
      setResult(res.data.data);
      setStep('done');
      onDone?.();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur lors de l\'enregistrement de l\'inventaire.'));
      setStep('form');
    }
  };

  const field = { boxSizing: 'border-box', height: 40, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--fg)', fontSize: 15 };
  const stepBtn = { width: 40, height: 40, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };
  const chip = (on, color, bg) => ({ height: 40, padding: '0 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, border: `1.5px solid ${on ? color : 'var(--border)'}`, background: on ? bg : 'var(--surface)', color: on ? color : 'var(--fg-muted)' });
  const signer = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  if (!state) {
    return ReactDOM.createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader className="animate-spin" color="#fff" /></div>,
      document.body
    );
  }
  const { vehicle } = state;

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'var(--bg, #f6f7f9)', display: 'flex', flexDirection: 'column' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{t('Inventaire de l\'ambulance')}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vehicle.label} — {vehicle.immatriculation}</div>
        </div>
        <button onClick={onClose} disabled={step === 'saving'} aria-label={t('Fermer')}
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>
      <div style={{ height: 4, background: 'var(--surface-3)', flexShrink: 0 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#16a34a' : pct >= 50 ? '#ea580c' : '#ca8a04', transition: 'width .2s' }} />
      </div>

      {step === 'done' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="ged-card" style={{ padding: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
              <Check size={22} color="#16a34a" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{t('Inventaire enregistré.')}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('La fiche PDF est archivée dans la GED.')}</div>
              </div>
              {result?.inventory?.id && (
                <button type="button" onClick={() => openCheckPdf(vehiclesAPI, result.inventory.id, 'inventory')} style={{ ...signButtonStyle(false), height: 38 }}><FileText size={15} /> {t('Fiche PDF')}</button>
              )}
            </div>
            {result?.restock?.length ? (
              <div className="ged-card" style={{ padding: 16, borderLeft: `4px solid ${result.inventory?.critical ? '#dc2626' : '#ea580c'}` }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg)', marginBottom: 8 }}>{t('À réapprovisionner')} ({result.restock.length})</div>
                {result.restock.map((r) => (
                  <div key={r.itemId} style={{ fontSize: 13, color: 'var(--fg)', padding: '5px 0', borderTop: '1px solid var(--surface-3)' }}>
                    <strong>{t(r.label)}</strong>{' — '}
                    {r.low ? t('{{value}} {{unit}} (minimum {{min}})', { value: r.value, unit: r.unit, min: r.min })
                      : r.ko ? t('hors service')
                      : [r.missing ? t('manque {{n}}', { n: qtyLabel(r.missing, r.unit) }) : null, r.expiring ? t('périme ce mois-ci') : null].filter(Boolean).join(' · ')}
                  </div>
                ))}
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 8 }}>
                  {result.inventory?.critical
                    ? t('Point critique en défaut : l\'ambulance est déclarée indisponible. La cheffe de pôle est prévenue.')
                    : t('La cheffe de pôle a reçu cette liste.')}
                </div>
              </div>
            ) : (
              <div className="ged-card" style={{ padding: 16, fontSize: 13, color: '#15803d', fontWeight: 600 }}>{t('Tout est complet, rien à réapprovisionner.')}</div>
            )}
            <button type="button" onClick={onClose} style={{ ...signButtonStyle(true), alignSelf: 'flex-end' }}>{t('Fermer')}</button>
          </div>
        </div>
      ) : (
        <>
          {/* Sections : accès rapide */}
          <div style={{ display: 'flex', gap: 6, padding: '8px 14px', overflowX: 'auto', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {sections.map((s) => {
              const items = (s.items || []).filter((it) => it.kind !== 'yesno');
              const done = items.filter((it) => isAnswered(it, answers[it.id])).length;
              const bad = (s.items || []).some((it) => isShort(it, answers[it.id]));
              const full = done === items.length;
              return (
                <button key={s.key} type="button" onClick={() => goTo(s.key)}
                  style={{ flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${bad ? '#fdba74' : full ? '#86efac' : 'var(--border)'}`, background: bad ? '#fff7ed' : full ? '#f0fdf4' : 'var(--surface)', color: 'var(--fg)' }}>
                  {t(s.label)} · {done}/{items.length}
                </button>
              );
            })}
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 20px', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {state.last && (
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)' }}>
                  {t('Dernier inventaire : {{date}} par {{name}}. Les quantités relevées ce jour-là sont rappelées en gris.', { date: new Date(state.last.at).toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), name: state.last.by })}
                </div>
              )}
              {sections.map((s) => (
                <div key={s.key} ref={(el) => { sectionRefs.current[s.key] = el; }} className="ged-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, fontSize: 15, fontWeight: 800, color: 'var(--fg)' }}>{t(s.label)}</div>
                    <button type="button" onClick={() => fillSection(s)} title={t('Les lignes non remplies prennent la quantité requise')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 10px', borderRadius: 8, border: '1px solid #86efac', background: '#f0fdf4', color: '#15803d', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      <CheckCheck size={14} /> {t('Tout est complet')}
                    </button>
                  </div>
                  {(s.items || []).map((it) => {
                    const a = answers[it.id] || {};
                    const short = isShort(it, a);
                    const prev = lastPresent.get(it.id);
                    return (
                      <div key={it.id} style={{ padding: '10px 14px', borderTop: '1px solid var(--surface-3)', background: short ? '#fff7ed' : 'transparent', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                            {t(it.label)}
                            {it.critical && <span title={t('Point critique : en défaut, l\'ambulance devient indisponible')} style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#b91c1c', background: '#fee2e2', borderRadius: 999, padding: '1px 6px' }}>{t('Critique')}</span>}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                            {it.kind === 'qty' && t('Requis : {{q}}', { q: qtyLabel(it.required, it.unit) })}
                            {it.kind === 'level' && t('Minimum : {{min}} {{unit}}', { min: it.min, unit: it.unit || '%' })}
                            {prev && it.kind === 'qty' && prev.present !== null && prev.present !== undefined && <span style={{ color: 'var(--fg-subtle)' }}> · {t('dernier : {{n}}', { n: prev.present })}</span>}
                            {short && it.kind === 'qty' && <strong style={{ color: '#c2410c' }}> · {t('manque {{n}}', { n: qtyLabel((it.required || 0) - Number(a.present), it.unit) })}</strong>}
                            {short && it.kind === 'level' && <strong style={{ color: '#dc2626' }}> · {t('sous le minimum')}</strong>}
                          </div>
                        </div>

                        {it.kind === 'qty' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button type="button" style={stepBtn} aria-label={t('Moins')} onClick={() => setPresent(it, a.present === null || a.present === undefined ? Math.max(0, it.required - 1) : Math.max(0, Number(a.present) - 1))}><Minus size={16} /></button>
                            <input type="number" inputMode="numeric" min="0" value={a.present ?? ''} onChange={(e) => setPresent(it, e.target.value)}
                              placeholder="—" aria-label={t('Quantité présente')} style={{ ...field, width: 64, textAlign: 'center', fontWeight: 700, borderColor: short ? '#fb923c' : isAnswered(it, a) ? '#86efac' : 'var(--border)' }} />
                            <button type="button" style={stepBtn} aria-label={t('Plus')} onClick={() => setPresent(it, a.present === null || a.present === undefined ? it.required : Number(a.present) + 1)}><Plus size={16} /></button>
                            {it.expiry && (
                              <button type="button" onClick={() => setAnswer(it.id, { expiring: !a.expiring })} title={t('La date de péremption tombe dans le mois en cours')}
                                style={chip(!!a.expiring, '#dc2626', '#fee2e2')}>
                                <CalendarX size={14} /> {t('Périme ce mois')}
                              </button>
                            )}
                          </div>
                        )}

                        {it.kind === 'level' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input type="number" inputMode="numeric" min="0" max={it.unit === 'bar' ? it.max || 300 : 100} value={a.value ?? ''}
                              onChange={(e) => setAnswer(it.id, { value: e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))) })}
                              placeholder="—" aria-label={t('Valeur')} style={{ ...field, width: 90, textAlign: 'center', fontWeight: 700, borderColor: short ? '#f87171' : isAnswered(it, a) ? '#86efac' : 'var(--border)' }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-muted)' }}>{it.unit || '%'}</span>
                          </div>
                        )}

                        {it.kind === 'check' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={() => setAnswer(it.id, { status: a.status === 'ok' ? null : 'ok' })} style={chip(a.status === 'ok', '#16a34a', '#dcfce7')}>{a.status === 'ok' && <Check size={14} />}{t('OK')}</button>
                            <button type="button" onClick={() => setAnswer(it.id, { status: a.status === 'ko' ? null : 'ko' })} style={chip(a.status === 'ko', '#dc2626', '#fee2e2')}>{t('Pas OK')}</button>
                          </div>
                        )}

                        {it.kind === 'yesno' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={() => setAnswer(it.id, { value: a.value === true ? null : true })} style={chip(a.value === true, 'var(--brand)', 'var(--brand-soft)')}>{t('Oui')}</button>
                            <button type="button" onClick={() => setAnswer(it.id, { value: a.value === false ? null : false })} style={chip(a.value === false, 'var(--brand)', 'var(--brand-soft)')}>{t('Non')}</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>{t('Observations')}</span>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={2000} placeholder={t('Remarques générales (facultatif)')}
                  style={{ width: '100%', boxSizing: 'border-box', padding: 10, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--fg)', fontSize: 14, resize: 'vertical' }} />
              </label>
            </div>
          </div>

          {/* Bas : résumé + signature */}
          <div style={{ padding: '10px 14px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))', background: 'var(--surface)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', fontSize: 12, color: 'var(--fg-muted)' }}>
                <strong style={{ color: 'var(--fg)' }}>{t('{{n}}/{{total}} lignes relevées', { n: answeredCount, total: counted.length })}</strong>
                {shortList.length > 0 && <span style={{ color: '#c2410c', fontWeight: 600 }}> · {t('{{count}} manque(s)', { count: shortList.length })}</span>}
                {expiringCount > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}> · {t('{{count}} péremption(s)', { count: expiringCount })}</span>}
                {answeredCount > 0 && answeredCount < counted.length && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#b45309', marginTop: 2 }}><AlertTriangle size={12} /> {t('Inventaire incomplet : il sera enregistré comme partiel.')}</div>
                )}
              </div>
              <button type="button" disabled={!answeredCount} onClick={() => setStep('sign')} style={{ ...signButtonStyle(true, !answeredCount), height: 46 }}>
                <PenLine size={17} /> {t('Signer et enregistrer')}
              </button>
            </div>
          </div>
        </>
      )}

      {(step === 'sign' || step === 'saving') && (
        <SignPadScreen signerName={signer} busy={step === 'saving'}
          subtitle={t('Inventaire · {{vehicle}} — {{name}} : je certifie avoir effectué cet inventaire.', { vehicle: vehicle.label, name: signer })}
          onBack={() => setStep('form')} onValidate={submit} />
      )}
    </div>,
    document.body
  );
}
