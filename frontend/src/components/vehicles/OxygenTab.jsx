// frontend/src/components/vehicles/OxygenTab.jsx
// Onglet « Oxygène » (retours de la responsable RO SAU, 17/11/2026) :
//  - carte oxygène : bouteilles à bord, en réserve (pleines / vides), commandées ;
//  - consommation calculée d'une prise de poste à l'autre (7 j, 30 j, par jour) ;
//  - commandes : le Biomédical (prévenu quand il faut commander) enregistre la
//    commande ou signale qu'elle est déjà faite ; à la livraison : « Reçue ».
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Loader, Plus, CheckCircle2, X, PackageCheck, Truck, Phone } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import { fmtDateTime } from './fleetUi';
import { OxygenBanner } from './ShiftForm';

const fmtDay = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—');
const today = () => new Date().toISOString().slice(0, 10);
const ORDER_STATUS = {
  commandee: { label: 'Commandée', color: '#c2410c', bg: '#ffedd5' },
  recue: { label: 'Reçue', color: '#15803d', bg: '#dcfce7' },
  annulee: { label: 'Annulée', color: '#64748b', bg: '#f1f5f9' },
};
const input = { boxSizing: 'border-box', width: '100%', height: 40, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--fg)', fontSize: 14 };
const btn = (primary) => ({ height: 40, padding: '0 14px', borderRadius: 8, border: primary ? 'none' : '1px solid var(--border)', background: primary ? 'var(--brand)' : 'var(--surface)', color: primary ? '#fff' : 'var(--fg)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 });

function Tile({ label, value, sub, color }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, background: 'var(--surface-2)', minWidth: 0 }}>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || 'var(--fg)', lineHeight: 1.2 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Commande : dans la GED, ou « déjà faite » (téléphone, bon papier…)
function OrderForm({ source, onCancel, onDone }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ quantity: 4, supplier: '', orderedOn: today(), expectedOn: '', note: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await vehiclesAPI.orderOxygen({ ...f, quantity: Number(f.quantity), expectedOn: f.expectedOn || null, source });
      toast.success(source === 'externe' ? t('Commande signalée') : t('Commande enregistrée'));
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur lors de l\'enregistrement'));
    } finally {
      setBusy(false);
    }
  };
  const label = (txt) => <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>{txt}</span>;
  return (
    <form onSubmit={submit} className="ged-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, borderColor: 'color-mix(in srgb, var(--brand) 35%, var(--border))' }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)' }}>
        {source === 'externe' ? t('Signaler une commande déjà faite') : t('Passer une commande d\'oxygène')}
      </div>
      {source === 'externe' && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('La commande a été passée hors de la GED (téléphone, bon papier…) : enregistrez-la ici pour que tout le monde sache qu\'elle est en cours.')}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <label>{label(t('Nombre de bouteilles'))}<input type="number" min="1" max="200" required value={f.quantity} onChange={set('quantity')} style={input} /></label>
        <label>{label(t('Fournisseur'))}<input type="text" maxLength={150} value={f.supplier} onChange={set('supplier')} placeholder={t('Facultatif')} style={input} /></label>
        <label>{label(t('Commandée le'))}<input type="date" required max={today()} value={f.orderedOn} onChange={set('orderedOn')} style={input} /></label>
        <label>{label(t('Livraison prévue le'))}<input type="date" min={f.orderedOn} value={f.expectedOn} onChange={set('expectedOn')} style={input} /></label>
      </div>
      <label>{label(t('Remarque'))}<input type="text" maxLength={500} value={f.note} onChange={set('note')} placeholder={t('Facultatif')} style={input} /></label>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button type="button" onClick={onCancel} style={btn(false)}>{t('Annuler')}</button>
        <button type="submit" disabled={busy} style={btn(true)}>{busy ? <Loader size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {t('Enregistrer')}</button>
      </div>
    </form>
  );
}

function OrderRow({ o, access, onChanged }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(null); // receive | cancel
  const [qty, setQty] = useState(o.quantity);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const st = ORDER_STATUS[o.status] || ORDER_STATUS.commandee;
  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); toast.success(ok); setMode(null); onChanged(); } catch (err) { toast.error(err.response?.data?.message || t('Erreur')); } finally { setBusy(false); }
  };
  return (
    <div style={{ padding: '10px 14px', borderTop: '1px solid var(--surface-3)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 8px', color: st.color, background: st.bg }}>{t(st.label)}</span>
        <strong style={{ fontSize: 14, color: 'var(--fg)' }}>{t('{{count}} bouteille(s)', { count: o.quantity })}</strong>
        <span style={{ fontSize: 12, color: 'var(--fg-muted)', flex: '1 1 220px' }}>
          {o.source === 'externe' ? t('Commande faite hors GED') : t('Commandée')} {t('le {{d}}', { d: fmtDay(o.orderedOn) })} {o.orderedBy ? `· ${o.orderedBy}` : ''}
          {o.supplier ? ` · ${o.supplier}` : ''}
          {o.status === 'commandee' && o.expectedOn ? ` · ${t('livraison prévue le {{d}}', { d: fmtDay(o.expectedOn) })}` : ''}
          {o.status === 'recue' ? ` · ${t('{{n}} reçue(s) le {{d}} par {{name}}', { n: o.receivedQuantity, d: fmtDateTime(o.receivedAt), name: o.receivedBy })}` : ''}
          {o.status === 'annulee' && o.cancelReason ? ` · ${o.cancelReason}` : ''}
        </span>
        {o.status === 'commandee' && !mode && (
          <div style={{ display: 'flex', gap: 6 }}>
            {access.canReceive && <button type="button" onClick={() => setMode('receive')} style={{ ...btn(true), height: 34 }}><PackageCheck size={14} /> {t('Reçue')}</button>}
            {access.canOrder && <button type="button" onClick={() => setMode('cancel')} style={{ ...btn(false), height: 34 }}><X size={14} /> {t('Annuler')}</button>}
          </div>
        )}
      </div>
      {o.note && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{o.note}</div>}
      {mode === 'receive' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--fg)' }}>{t('Bouteilles reçues')}</span>
          <input type="number" min="1" max="200" value={qty} onChange={(e) => setQty(e.target.value)} style={{ ...input, width: 90 }} />
          <button type="button" disabled={busy} onClick={() => run(() => vehiclesAPI.receiveOxygen(o.id, Number(qty)), t('Livraison enregistrée'))} style={btn(true)}>{t('Confirmer la réception')}</button>
          <button type="button" onClick={() => setMode(null)} style={btn(false)}>{t('Annuler')}</button>
        </div>
      )}
      {mode === 'cancel' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="text" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Motif de l\'annulation')} style={{ ...input, flex: '1 1 220px', width: 'auto' }} />
          <button type="button" disabled={busy || !reason.trim()} onClick={() => run(() => vehiclesAPI.cancelOxygen(o.id, reason), t('Commande annulée'))} style={btn(true)}>{t('Annuler la commande')}</button>
          <button type="button" onClick={() => setMode(null)} style={btn(false)}>{t('Retour')}</button>
        </div>
      )}
    </div>
  );
}

export default function OxygenTab({ refreshKey }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null); // ged | externe

  const load = useCallback(() => {
    vehiclesAPI.oxygen()
      .then((r) => { setData(r.data.data); setError(null); })
      .catch((err) => setError(err.response?.data?.message || t('Impossible de charger l\'oxygène.')));
  }, [t]);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (error) return <div className="ged-card" style={{ padding: 20, color: 'var(--fg-muted)', fontSize: 13 }}>{error}</div>;
  if (!data) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader className="animate-spin" /></div>;

  const { stock, consumption: c, orders, access, ordered, perAmbulance } = data;
  const open = orders.filter((o) => o.status === 'commandee');
  const closed = orders.filter((o) => o.status !== 'commandee');
  const needOrder = stock && ['commander', 'urgent'].includes(stock.level);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Carte oxygène */}
      <div className="ged-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)' }}>{t('Carte oxygène')}</div>
          {stock && <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>{t('Compté le {{date}} par {{name}}', { date: fmtDateTime(stock.at), name: stock.by })}</div>}
        </div>
        {!stock ? (
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Pas encore compté : les bouteilles le seront à la prochaine prise de poste (partie soignant).')}</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 10 }}>
              {stock.onboard.map((o) => (
                <Tile key={o.vehicleId} label={o.label} value={o.bottles} sub={t('à bord · normalement {{n}}', { n: perAmbulance })}
                  color={o.bottles !== null && o.bottles < perAmbulance ? '#dc2626' : undefined} />
              ))}
              <Tile label={t('Réserve : pleines')} value={stock.reserveFull} color={stock.reserveFull === 0 ? '#dc2626' : undefined} />
              <Tile label={t('Réserve : vides')} value={stock.reserveEmpty} />
              <Tile label={t('Commandées')} value={ordered} sub={open.length ? t('{{count}} commande(s) en cours', { count: open.length }) : t('aucune commande en cours')} color={ordered ? '#c2410c' : undefined} />
              <Tile label={t('Total à l\'hôpital')} value={stock.total} sub={t('{{n}} pleine(s)', { n: stock.full ?? '—' })} />
            </div>
            <OxygenBanner level={stock.level} short={stock.short} />
            {needOrder && ordered > 0 && (
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Truck size={15} /> {t('Commande en cours : {{n}} bouteille(s) attendue(s).', { n: ordered })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Consommation */}
      <div className="ged-card" style={{ padding: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)', marginBottom: 10 }}>{t('Consommation')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
          <Tile label={t('7 derniers jours')} value={c.week} sub={t('bouteilles consommées')} />
          <Tile label={t('30 derniers jours')} value={c.month} sub={t('bouteilles consommées')} />
          <Tile label={t('Moyenne')} value={c.perDay ?? '—'} sub={t('bouteille(s) par jour')} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 8 }}>
          {t('Calculée entre deux prises de poste : bouteilles pleines avant + bouteilles reçues − bouteilles pleines après.')}
        </div>
        {c.history.length > 0 ? (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {c.history.map((x, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', borderTop: i ? '1px solid var(--surface-3)' : 'none', fontSize: 13, flexWrap: 'wrap' }}>
                <span style={{ minWidth: 190, color: 'var(--fg-muted)' }}>{fmtDateTime(x.from)} → {fmtDateTime(x.to)}</span>
                <span style={{ flex: '1 1 180px', color: 'var(--fg-muted)' }}>{t('{{a}} pleines → {{b}} pleines', { a: x.before, b: x.after })}{x.received ? ` · ${t('{{n}} reçue(s)', { n: x.received })}` : ''}</span>
                <strong style={{ color: x.used ? 'var(--fg)' : 'var(--fg-subtle)' }}>{t('{{count}} consommée(s)', { count: x.used })}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Il faut au moins deux prises de poste complètes (toutes les bouteilles comptées) pour calculer la consommation.')}</div>
        )}
      </div>

      {/* Commandes */}
      <div className="ged-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: '1 1 200px', fontSize: 16, fontWeight: 800, color: 'var(--fg)' }}>{t('Commandes d\'oxygène')}</div>
          {access.canOrder && !form && (
            <>
              <button type="button" onClick={() => setForm('ged')} style={btn(true)}><Plus size={15} /> {t('Passer une commande')}</button>
              <button type="button" onClick={() => setForm('externe')} style={btn(false)}><Phone size={15} /> {t('Commande déjà faite')}</button>
            </>
          )}
        </div>
        {!access.canOrder && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--fg-muted)' }}>{t('Les commandes sont passées par le service Biomédical, prévenu automatiquement quand il faut commander. Vous pouvez enregistrer la livraison (« Reçue »).')}</div>}
        {form && <div style={{ padding: 14 }}><OrderForm source={form} onCancel={() => setForm(null)} onDone={() => { setForm(null); load(); }} /></div>}
        {open.length === 0 && closed.length === 0 && !form && <div style={{ padding: '14px', fontSize: 13, color: 'var(--fg-muted)' }}>{t('Aucune commande enregistrée.')}</div>}
        {[...open, ...closed].map((o) => <OrderRow key={o.id} o={o} access={access} onChanged={load} />)}
      </div>
    </div>
  );
}
