// frontend/src/components/sage/FacturationAssistee.jsx
// Facturation assistée d'un BPC (10/11/2026), en attendant le module Objets
// Métiers de Sage. La GED n'écrit jamais dans Sage :
//  1. Préparer : on coche les BL du BPC
//  2. La facturation transforme exactement ces BL en UNE facture dans Sage
//  3. Vérifier : la GED retrouve la facture et contrôle qu'elle reprend tous les BL
//  4. Envoyer en signature : liasse + circuit « Circuit Facture PHP »
import React, { useCallback, useEffect, useState } from 'react';
import { Loader, Copy, CheckCircle2, AlertTriangle, Send, RefreshCw, X, ClipboardCheck, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { sageBlAPI } from '../../services/phpService';

const fmtMoney = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
const fmtDate = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');

export const PREP_STATUS = {
  a_transformer: { label: 'À transformer dans Sage', color: 'var(--warning)', bg: 'var(--warning-soft)' },
  incomplete: { label: 'Facture incomplète', color: 'var(--danger)', bg: 'var(--danger-soft)' },
  facturee: { label: 'Facturée', color: 'var(--success)', bg: 'var(--success-soft)' },
  annulee: { label: 'Annulée', color: 'var(--fg-muted)', bg: 'var(--surface-3)' },
};

export function PrepBadge({ status, t }) {
  const s = PREP_STATUS[status] || PREP_STATUS.a_transformer;
  return <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: s.color, background: s.bg, whiteSpace: 'nowrap' }}>{t(s.label)}</span>;
}

const btn = (primary, disabled) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 'var(--radius-2)', fontSize: 13, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
  border: primary ? 'none' : '1px solid var(--border)', background: primary ? 'var(--brand)' : 'var(--surface)', color: primary ? '#fff' : 'var(--fg)',
});

async function copy(text, t) {
  try { await navigator.clipboard.writeText(text); toast.success(t('Numéros copiés.')); }
  catch { toast.error(t('Copie impossible : sélectionnez les numéros à la main.')); }
}

/** Ce que la facturation fait dans Sage, avec les numéros à reprendre. */
function SageSteps({ prep, t }) {
  const pieces = prep.bl.map((b) => b.piece);
  return (
    <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-2)', background: 'var(--brand-soft)', fontSize: 12.5, color: 'var(--fg)' }}>
      <div style={{ fontWeight: 650, marginBottom: 4 }}>{t('Dans Sage, comme d’habitude :')}</div>
      <div>{t('Documents des ventes du client {{tiers}} → sélectionner exactement ces {{n}} BL → les transformer en une seule facture.', { tiers: prep.compteTiers, n: pieces.length })}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 8 }}>
        {pieces.map((p) => <code key={p} style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }}>{p}</code>)}
        <button type="button" onClick={() => copy(pieces.join('\n'), t)} style={{ ...btn(false), height: 28, fontSize: 12 }}><Copy size={13} /> {t('Copier les numéros')}</button>
      </div>
      <div style={{ marginTop: 6, color: 'var(--fg-muted)' }}>{t('Ensuite, cliquez sur « Vérifier dans Sage » : la GED retrouve la facture et contrôle qu’il ne manque aucun BL.')}</div>
    </div>
  );
}

/** Résultat du rapprochement avec Sage (factures trouvées, BL manquants ou oubliés). */
function CheckResult({ prep, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
      {prep.factures.map((f) => (
        <div key={f.piece} style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', alignItems: 'center' }}>
          <CheckCircle2 size={14} color="var(--success)" />
          <span>{t('Facture')} <strong style={{ fontFamily: 'var(--font-mono)' }}>{f.piece}</strong> {t('du {{d}}', { d: fmtDate(f.date) })} · {t('{{n}} BL', { n: f.bl.length })} · {fmtMoney(f.montant)}</span>
          {f.comptabilisee && <span style={{ color: 'var(--fg-muted)' }}>· {t('comptabilisée')}</span>}
          {f.ged?.documentId
            ? <a href={`/documents/${f.ged.documentId}`} style={{ color: 'var(--brand)', fontWeight: 600 }}><FileText size={12} style={{ verticalAlign: -2 }} /> {t('dans le circuit de signature')}</a>
            : <span style={{ color: 'var(--fg-muted)' }}>· {t('pas encore en signature')}</span>}
          {f.autresBl?.length > 0 && <span style={{ color: 'var(--warning)' }}>· {t('reprend aussi : {{l}}', { l: f.autresBl.join(', ') })}</span>}
        </div>
      ))}
      {prep.manquants.length > 0 && (
        <div style={{ color: 'var(--danger)', display: 'flex', gap: 6 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{prep.status === 'a_transformer' ? t('À transformer dans Sage : {{l}}', { l: prep.manquants.join(', ') }) : t('BL préparés absents de la facture : {{l}}', { l: prep.manquants.join(', ') })}</span>
        </div>
      )}
      {prep.factures.length > 1 && <div style={{ color: 'var(--danger)' }}><AlertTriangle size={14} style={{ verticalAlign: -2 }} /> {t('Le BPC a été facturé en plusieurs factures.')}</div>}
      {prep.oublies.length > 0 && (
        <div style={{ color: 'var(--warning)', display: 'flex', gap: 6 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{t('Autres BL de ce patient restés en BL sur la période du BPC : {{l}}', { l: prep.oublies.map((b) => `${b.piece} (${fmtMoney(b.montant)})`).join(', ') })}</span>
        </div>
      )}
      {prep.checkedAt && <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>{t('Vérifié dans Sage le {{d}}', { d: fmtDateTime(prep.checkedAt) })}</div>}
    </div>
  );
}

/** Actions d'une préparation : vérifier, envoyer en signature, annuler. */
function PrepActions({ prep, t, onChanged }) {
  const [busy, setBusy] = useState(null);
  const run = async (what, fn) => {
    setBusy(what);
    try { await fn(); onChanged?.(); }
    catch (e) {
      const msg = e.response?.data?.message || t('Erreur serveur.');
      if (what === 'sign' && e.response?.status === 409 && /incomplète|plusieurs/.test(msg)) {
        toast.error(`${msg} ${t('Corrigez dans Sage, puis vérifiez à nouveau.')}`, { duration: 7000 });
      } else toast.error(msg);
    } finally { setBusy(null); }
  };
  const inGed = prep.factures.length > 0 && prep.factures.every((f) => f.ged?.documentId);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {prep.status !== 'annulee' && (
        <button type="button" style={btn(prep.status !== 'facturee', !!busy)} disabled={!!busy}
          onClick={() => run('check', async () => {
            const r = await sageBlAPI.checkPreparations([prep.id]);
            toast.success(r.data.facturees ? t('Facture trouvée dans Sage.') : t('Vérifié dans Sage.'));
          })}>
          {busy === 'check' ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />} {t('Vérifier dans Sage')}
        </button>
      )}
      {prep.status === 'facturee' && !inGed && (
        <button type="button" style={btn(true, !!busy)} disabled={!!busy}
          onClick={() => run('sign', async () => { const r = await sageBlAPI.sendToSignature(prep.id); toast.success(r.data.message); })}>
          {busy === 'sign' ? <Loader size={14} className="animate-spin" /> : <Send size={14} />} {t('Envoyer en signature')}
        </button>
      )}
      {['a_transformer', 'incomplete'].includes(prep.status) && (
        <button type="button" style={btn(false, !!busy)} disabled={!!busy}
          onClick={() => run('cancel', async () => { await sageBlAPI.cancelPreparation(prep.id); toast.success(t('Préparation annulée.')); })}>
          <X size={14} /> {t('Annuler la préparation')}
        </button>
      )}
    </div>
  );
}

/**
 * Dans le détail d'un BPC : cocher les BL puis « Préparer la facture ».
 * Si le BPC est déjà préparé, rappelle où il en est.
 */
export function PrepareBox({ bpc, t, onPrepared, onOpenTab }) {
  const [checked, setChecked] = useState(() => new Set(bpc.bl.map((b) => b.piece)));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [prep, setPrep] = useState(null);

  if (bpc.preparation && !prep) {
    return (
      <div style={{ marginBottom: 12, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', fontSize: 12.5 }}>
        <ClipboardCheck size={16} color="var(--brand)" />
        <span style={{ flex: '1 1 240px' }}>{t('Facture préparée le {{d}} par {{n}} ({{c}} BL).', { d: fmtDateTime(bpc.preparation.createdAt), n: bpc.preparation.preparedByName || '—', c: bpc.preparation.bl.length })}</span>
        <PrepBadge status={bpc.preparation.status} t={t} />
        <button type="button" style={btn(false)} onClick={onOpenTab}>{t('Voir dans « Facturation assistée »')}</button>
      </div>
    );
  }
  if (prep) {
    return (
      <div style={{ marginBottom: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 650 }}><ClipboardCheck size={16} color="var(--brand)" /> {t('Facture préparée')} <PrepBadge status={prep.status} t={t} /></div>
        {prep.status === 'a_transformer' ? <SageSteps prep={prep} t={t} /> : <CheckResult prep={prep} t={t} />}
        <PrepActions prep={prep} t={t} onChanged={async () => {
          const r = await sageBlAPI.preparations('toutes');
          const fresh = r.data.preparations.find((x) => x.id === prep.id);
          if (fresh) setPrep(fresh);
        }} />
      </div>
    );
  }

  const selected = bpc.bl.filter((b) => checked.has(b.piece));
  const total = selected.reduce((s, b) => s + b.montant, 0);
  const toggle = (p) => setChecked((prev) => { const n = new Set(prev); if (n.has(p)) n.delete(p); else n.add(p); return n; });
  const submit = async () => {
    setBusy(true);
    try {
      const r = await sageBlAPI.prepare({
        tiers: bpc.patient.compteTiers, start: bpc.start, end: bpc.end, pieces: selected.map((b) => b.piece), note,
        patientNom: bpc.patient.nom, compteCollectif: bpc.patient.compteCollectif, patientType: bpc.patient.type,
      });
      setPrep(r.data.preparation);
      toast.success(t('Facture préparée : transformez maintenant ces BL dans Sage.'));
      onPrepared?.();
    } catch (e) {
      toast.error(e.response?.data?.message || t('Erreur serveur.'), { duration: 6000 });
    } finally { setBusy(false); }
  };

  return (
    <div style={{ marginBottom: 12, padding: 12, border: '1px solid var(--brand)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 650 }}><ClipboardCheck size={16} color="var(--brand)" /> {t('Facturation assistée')}</div>
      {bpc.status === 'in_progress' && <div style={{ fontSize: 12, color: 'var(--warning)' }}>{t('BPC encore en cours (J{{n}} sur 3) : d’autres BL peuvent encore arriver.', { n: bpc.jour })}</div>}
      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('Cochez les BL à mettre dans la facture (tous, normalement), puis préparez-la.')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
        {bpc.bl.map((b) => (
          <label key={b.piece} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={checked.has(b.piece)} onChange={() => toggle(b.piece)} />
            <span style={{ fontFamily: 'var(--font-mono)' }}>{b.piece}</span>
            <span style={{ color: 'var(--fg-muted)' }}>{fmtDate(b.date)}{b.service ? ` · ${b.service}` : ''} · {fmtMoney(b.montant)}</span>
          </label>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t('Remarque (facultatif)')}
        style={{ height: 32, padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 12.5 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" style={btn(true, busy || !selected.length)} disabled={busy || !selected.length} onClick={submit}>
          {busy ? <Loader size={14} className="animate-spin" /> : <ClipboardCheck size={14} />} {t('Préparer la facture ({{n}} BL · {{m}})', { n: selected.length, m: fmtMoney(total) })}
        </button>
        {selected.length < bpc.bl.length && <span style={{ fontSize: 12, color: 'var(--warning)' }}>{t('{{n}} BL non cochés resteront à facturer.', { n: bpc.bl.length - selected.length })}</span>}
      </div>
    </div>
  );
}

/** Onglet « Facturation assistée » : toutes les préparations et leur état. */
export function PreparationsTab({ t }) {
  const [filter, setFilter] = useState('ouvertes');
  const [data, setData] = useState(null);
  const [checking, setChecking] = useState(false);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try { const r = await sageBlAPI.preparations(filter); setData(r.data); }
    catch (e) { toast.error(e.response?.data?.message || t('Erreur serveur.')); setData({ preparations: [], counts: {} }); }
  }, [filter, t]);

  // À l'ouverture : rapprochement des préparations ouvertes avec Sage, puis liste
  const checkAll = useCallback(async () => {
    setChecking(true);
    try { await sageBlAPI.checkPreparations(); } catch (e) { toast.error(e.response?.data?.message || t('Sage injoignable.')); }
    finally { setChecking(false); load(); }
  }, [load, t]);
  useEffect(() => { checkAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const c = data?.counts || {};
  const chip = (id, label, n) => (
    <button key={id} type="button" onClick={() => setFilter(id)}
      style={{ height: 30, padding: '0 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: `1px solid ${filter === id ? 'var(--brand)' : 'var(--border)'}`, background: filter === id ? 'var(--brand-soft)' : 'var(--surface)', color: filter === id ? 'var(--brand)' : 'var(--fg)' }}>
      {label}{n !== undefined ? ` (${n})` : ''}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="ged-card" style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--fg-muted)' }}>
        {t('La GED prépare la liste des BL de chaque BPC, la facturation les transforme en une facture dans Sage, puis la GED vérifie la facture (lecture seule) et l’envoie en signature. Rien n’est écrit dans Sage par la GED.')}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {chip('ouvertes', t('À suivre'), (c.a_transformer || 0) + (c.incomplete || 0))}
        {chip('a_transformer', t('À transformer'), c.a_transformer || 0)}
        {chip('incomplete', t('Incomplètes'), c.incomplete || 0)}
        {chip('facturee', t('Facturées'), c.facturee || 0)}
        {chip('annulee', t('Annulées'), c.annulee || 0)}
        <button type="button" onClick={checkAll} disabled={checking} style={{ ...btn(false, checking), marginLeft: 'auto' }}>
          {checking ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />} {t('Vérifier tout dans Sage')}
        </button>
      </div>
      <div className="ged-card" style={{ padding: 0, overflow: 'hidden' }}>
        {!data && <div style={{ padding: 30, textAlign: 'center' }}><Loader size={20} className="animate-spin" color="var(--fg-muted)" /></div>}
        {data && !data.preparations.length && (
          <div style={{ padding: 30, textAlign: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>
            {filter === 'ouvertes' ? t('Aucune facture préparée en attente. Ouvrez un BPC dans « BPC en attente » pour en préparer une.') : t('Rien ici.')}
          </div>
        )}
        {data?.preparations.map((p) => (
          <div key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)}
              style={{ width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'var(--fg)' }}>
              <span style={{ color: 'var(--fg-subtle)', display: 'flex' }}>{open === p.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
              <span style={{ flex: '1 1 220px', minWidth: 0 }}>
                <strong>{p.patientNom || p.compteTiers}</strong>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--fg-subtle)' }}>{p.compteTiers} · {t('BPC du {{a}} au {{b}}', { a: fmtDate(p.start), b: fmtDate(p.end) })} · {t('préparée le {{d}} par {{n}}', { d: fmtDateTime(p.createdAt), n: p.preparedByName || '—' })}</span>
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>{t('{{n}} BL', { n: p.bl.length })}</span>
              <PrepBadge status={p.status} t={t} />
              <strong style={{ minWidth: 110, textAlign: 'right' }}>{fmtMoney(p.montant)}</strong>
            </button>
            {open === p.id && (
              <div style={{ padding: '4px 14px 14px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.status === 'a_transformer' ? <SageSteps prep={p} t={t} /> : <CheckResult prep={p} t={t} />}
                {p.note && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('Remarque')} : {p.note}</div>}
                <PrepActions prep={p} t={t} onChanged={load} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
