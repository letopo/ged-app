// frontend/src/components/vehicles/ShortagesTab.jsx
// Onglet « Manques » (demande RO SAU, 09/11/2026) : ce qui manque dans chaque
// ambulance et où en est la commande. Un manque reste affiché jusqu'à ce que
// quelqu'un le marque réarmé.
//  - À commander → Commandé (bon papier envoyé à la pharmacie) → Réarmé
//  - Responsables (Chef de pôle RO SAU…) : cochent les articles → « Commandé »
//  - Infirmier de garde : « Réarmer » → coche l'article et la quantité remise
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Loader, PackageOpen, PackageCheck, Minus, Plus, Check, ShoppingCart, ChevronDown, ChevronRight, Undo2, X } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import { StatusBadge } from './VehicleChecksTab';
import { fmtDateTime } from './fleetUi';

const qtyLabel = (n, unit) => `${n}${unit ? ` ${unit}` : ''}`;
const fmtD = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '');

/** Texte du manque : « manque 3 boîtes », « périme ce mois »… */
export function shortageWhat(s, t) {
  if (s.kind === 'peremption') return t('périme ce mois-ci');
  if (s.kind === 'panne') return t('hors service');
  if (s.kind === 'niveau') return t('sous le minimum');
  return t('manque {{n}}', { n: qtyLabel(s.quantity ?? '?', s.unit) });
}

/** Où en est le manque : pastille colorée. */
export function ShortageStatus({ s, compact = false }) {
  const { t } = useTranslation();
  const extra = s.status === 'commande' && s.quantity !== null && s.quantity > (s.orderedQty || 0) ? s.quantity - (s.orderedQty || 0) : 0;
  const pill = (bg, color, txt) => <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>{txt}</span>;
  if (s.status === 'commande') {
    return (
      <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        {pill('#dbeafe', '#1d4ed8', compact ? t('Commandé le {{d}}', { d: fmtD(s.orderedAt) }) : t('Commandé le {{d}} · attend en pharmacie', { d: fmtD(s.orderedAt) }))}
        {extra > 0 && pill('#ffedd5', '#c2410c', t('+{{n}} à commander', { n: extra }))}
      </span>
    );
  }
  if (s.status === 'rearme') return pill('#dcfce7', '#15803d', s.closedReason === 'inventaire' ? t('Complet à l\'inventaire') : t('Réarmé'));
  if (s.status === 'annule') return pill('var(--surface-3)', 'var(--fg-muted)', t('Classé sans suite'));
  return pill('#ffedd5', '#c2410c', t('À commander depuis le {{d}}', { d: fmtD(s.openedAt) }));
}

const isQty = (s) => s.kind === 'manque' && s.quantity !== null;

function VehicleShortages({ v, onChanged }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('view'); // view | restock
  const [picked, setPicked] = useState({}); // id → qty (réarmement) | true (commande)
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRecent, setShowRecent] = useState(false);

  const list = v.shortages;
  const toOrder = list.filter((s) => s.status === 'a_commander' || (s.status === 'commande' && isQty(s) && s.quantity > (s.orderedQty || 0)));
  const ordered = list.filter((s) => s.status === 'commande');
  const pickedIds = Object.keys(picked).filter((id) => picked[id] !== undefined && picked[id] !== false);

  const reset = () => { setPicked({}); setNote(''); setMode('view'); };
  const toggle = (s) => setPicked((p) => {
    const next = { ...p };
    if (next[s.id] !== undefined && next[s.id] !== false) delete next[s.id];
    else next[s.id] = mode === 'restock' ? (isQty(s) ? s.quantity : null) : true;
    return next;
  });
  const setQty = (s, n) => setPicked((p) => ({ ...p, [s.id]: Math.max(1, Math.min(s.quantity, n)) }));

  const order = async () => {
    setBusy(true);
    try {
      await vehiclesAPI.orderShortages(pickedIds, note);
      toast.success(t('{{count}} article(s) marqué(s) commandé(s).', { count: pickedIds.length }));
      reset();
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur serveur.'));
    } finally { setBusy(false); }
  };
  const restock = async () => {
    setBusy(true);
    try {
      const r = await vehiclesAPI.restock(v.id, pickedIds.map((id) => ({ id, qty: picked[id] })));
      const { closed, partial } = r.data.data;
      toast.success(partial ? t('Réarmement enregistré : {{closed}} réglé(s), {{partial}} en partie.', { closed, partial }) : t('Réarmement enregistré : {{closed}} article(s) réglé(s).', { closed }));
      reset();
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur lors de l\'enregistrement du réarmement.'));
    } finally { setBusy(false); }
  };
  const setStatus = async (s, status) => {
    try {
      await vehiclesAPI.setShortageStatus(s.id, status);
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur serveur.'));
    }
  };

  const tone = list.some((s) => s.critical) ? '#dc2626' : list.length ? '#ea580c' : '#16a34a';
  const btn = (primary, disabled) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, border: primary ? 'none' : '1px solid var(--border)', background: primary ? 'var(--brand)' : 'var(--surface)', color: primary ? '#fff' : 'var(--fg)' });
  const stepBtn = { width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };
  const selectable = (s) => (mode === 'restock' ? true : v.canManage && toOrder.includes(s));
  const linkBtn = { border: 'none', background: 'none', padding: 0, fontSize: 11, color: 'var(--fg-muted)', textDecoration: 'underline', cursor: 'pointer' };

  return (
    <div className="ged-card" style={{ padding: 0, overflow: 'hidden', borderColor: `color-mix(in srgb, ${tone} 30%, var(--border))` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <PackageOpen size={18} color={tone} />
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {v.label} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)' }}>{v.immatriculation}</span>
            <StatusBadge status={v.status} reason={v.unavailableReason} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            {list.length
              ? t('{{open}} article(s) non réarmé(s) · {{toOrder}} à commander · {{ordered}} commandé(s)', { open: list.length, toOrder: toOrder.length, ordered: ordered.length })
              : t('Rien ne manque : tout est réarmé.')}
          </div>
        </div>
        {list.length > 0 && mode === 'view' && (
          <button type="button" onClick={() => { setPicked({}); setMode('restock'); }} style={btn(true)}><PackageCheck size={15} /> {t('Réarmer')}</button>
        )}
        {mode === 'restock' && <button type="button" onClick={reset} style={btn(false)}><X size={15} /> {t('Annuler')}</button>}
      </div>

      {mode === 'restock' && (
        <div style={{ padding: '8px 14px', fontSize: 12, color: '#1d4ed8', background: '#eff6ff', borderBottom: '1px solid var(--border)' }}>
          {t('Cochez ce que vous avez remis dans l\'ambulance et la quantité. Un article remis en partie reste ouvert pour le reste.')}
        </div>
      )}

      {list.map((s) => {
        const on = picked[s.id] !== undefined && picked[s.id] !== false;
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: '1px solid var(--surface-3)', flexWrap: 'wrap', background: on ? 'color-mix(in srgb, var(--brand) 7%, transparent)' : 'transparent' }}>
            {selectable(s) ? (
              <button type="button" onClick={() => toggle(s)} aria-pressed={on} aria-label={t('Cocher')}
                style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${on ? 'var(--brand)' : 'var(--border)'}`, background: on ? 'var(--brand)' : 'var(--surface)' }}>
                {on && <Check size={15} color="#fff" />}
              </button>
            ) : <span style={{ width: 26, flexShrink: 0 }} />}
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                {t(s.label)}
                {s.critical && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#b91c1c', background: '#fee2e2', borderRadius: 999, padding: '1px 6px' }}>{t('Critique')}</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                <strong style={{ color: s.kind === 'manque' ? '#c2410c' : '#dc2626' }}>{shortageWhat(s, t)}</strong>
                <ShortageStatus s={s} />
                {s.orderNote && <span>· {s.orderNote}</span>}
                {s.section && <span style={{ color: 'var(--fg-subtle)' }}>· {t(s.section)}</span>}
              </div>
              {v.canManage && mode === 'view' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                  {s.status === 'commande' && <button type="button" style={linkBtn} onClick={() => setStatus(s, 'a_commander')}><Undo2 size={10} /> {t('Annuler la commande')}</button>}
                  <button type="button" style={linkBtn} onClick={() => setStatus(s, 'annule')}>{t('Classer sans suite')}</button>
                </div>
              )}
            </div>
            {mode === 'restock' && on && isQty(s) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('Remis')}</span>
                <button type="button" style={stepBtn} aria-label={t('Moins')} onClick={() => setQty(s, picked[s.id] - 1)}><Minus size={14} /></button>
                <span style={{ minWidth: 34, textAlign: 'center', fontSize: 15, fontWeight: 800 }}>{picked[s.id]}</span>
                <button type="button" style={stepBtn} aria-label={t('Plus')} onClick={() => setQty(s, picked[s.id] + 1)}><Plus size={14} /></button>
                <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>/ {s.quantity}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Barre d'action : commande (responsables) ou réarmement */}
      {mode === 'view' && v.canManage && toOrder.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexWrap: 'wrap' }}>
          <button type="button" style={{ ...linkBtn, fontSize: 12 }} onClick={() => setPicked(Object.fromEntries(toOrder.map((s) => [s.id, true])))}>{t('Tout cocher (à commander)')}</button>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} placeholder={t('Bon papier n° … (facultatif)')}
            style={{ flex: '1 1 180px', height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--fg)', fontSize: 13 }} />
          <button type="button" disabled={!pickedIds.length || busy} onClick={order} style={btn(true, !pickedIds.length || busy)}>
            {busy ? <Loader size={15} className="animate-spin" /> : <ShoppingCart size={15} />} {t('Marquer commandé ({{n}})', { n: pickedIds.length })}
          </button>
        </div>
      )}
      {mode === 'restock' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <button type="button" disabled={!pickedIds.length || busy} onClick={restock} style={btn(true, !pickedIds.length || busy)}>
            {busy ? <Loader size={15} className="animate-spin" /> : <PackageCheck size={15} />} {t('Enregistrer le réarmement ({{n}})', { n: pickedIds.length })}
          </button>
        </div>
      )}

      {v.recent?.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <button type="button" onClick={() => setShowRecent((x) => !x)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)' }}>
            {showRecent ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {t('Réglés ces 7 derniers jours ({{n}})', { n: v.recent.length })}
          </button>
          {showRecent && v.recent.map((s) => (
            <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 14px 6px 34px', fontSize: 12, color: 'var(--fg-muted)', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{t(s.label)}</span>
              <ShortageStatus s={s} compact />
              <span>{fmtDateTime(s.closedAt)}{s.closedByName ? ` · ${s.closedByName}` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShortagesTab({ refreshKey }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const load = useCallback(() => {
    vehiclesAPI.shortages()
      .then((r) => setData(r.data.data || []))
      .catch((err) => { toast.error(err.response?.data?.message || t('Erreur serveur.')); setData([]); });
  }, [t]);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (!data) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader className="animate-spin" /></div>;
  if (!data.length) return <div className="ged-card" style={{ padding: 30, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>{t('Aucune ambulance avec inventaire.')}</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
        {t('Un manque relevé à l\'inventaire reste ici jusqu\'à ce qu\'il soit réarmé : À commander → Commandé (bon envoyé à la pharmacie) → Réarmé.')}
      </div>
      {data.map((v) => <VehicleShortages key={v.id} v={v} onChanged={load} />)}
    </div>
  );
}
