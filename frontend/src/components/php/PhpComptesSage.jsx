// frontend/src/components/php/PhpComptesSage.jsx
// Fiche Patient PHP › « Comptes tiers Sage » (étape A, 11/11/2026).
// La GED propose les comptes Sage qui portent le matricule de l'agent ; le
// module PHP confirme ou écarte, et peut ajouter un compte à la main.
// Ces comptes serviront au parcours hospitalier (BL, factures, DME).
import React, { useEffect, useState } from 'react';
import { Check, X, Plus, Loader, RotateCcw, Users, Wallet, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { phpPatientAPI } from '../../services/phpService';

const fmtDate = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR') : null);
const ETATS = {
  confirme: { label: 'Confirmé', color: 'var(--success)', bg: 'var(--success-soft)' },
  propose: { label: 'Proposé', color: 'var(--brand)', bg: 'var(--brand-soft)' },
  ecarte: { label: 'Écarté', color: 'var(--fg-subtle)', bg: 'var(--surface-2)' },
};

function CompteRow({ c, canWrite, busy, onDecide, onReset, t }) {
  const e = ETATS[c.etat];
  const iconBtn = (color) => ({ width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color, cursor: busy ? 'wait' : 'pointer' });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid var(--border)', opacity: c.etat === 'ecarte' ? 0.6 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' }}>{c.compte}</span>
          <span style={{ padding: '1px 7px', borderRadius: 999, fontSize: 10.5, fontWeight: 600, color: e.color, background: e.bg }}>{t(e.label)}</span>
          {c.source === 'manuel' && <span style={{ fontSize: 10.5, color: 'var(--fg-subtle)' }}>{t('ajouté à la main')}</span>}
          {c.enSommeil && <span style={{ fontSize: 10.5, color: 'var(--fg-subtle)' }}>{t('en sommeil dans Sage')}</span>}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.introuvable ? t('Introuvable dans Sage') : [c.intitule, c.matricule && t('mat. {{m}}', { m: c.matricule }), c.dateEntree && t('dernière entrée {{d}}', { d: fmtDate(c.dateEntree) })].filter(Boolean).join(' · ')}
        </div>
        {c.confirmeAilleurs && (
          <div style={{ fontSize: 11, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={11} /> {t('Déjà confirmé pour {{n}}', { n: c.confirmeAilleurs.nom })}
          </div>
        )}
      </div>
      {canWrite && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {c.etat !== 'confirme' && !c.introuvable && (
            <button type="button" disabled={busy} onClick={() => onDecide([c.compte], 'confirme')} title={t('Confirmer : c’est bien ce patient')} style={iconBtn('var(--success)')}><Check size={14} /></button>
          )}
          {c.etat === 'propose' && (
            <button type="button" disabled={busy} onClick={() => onDecide([c.compte], 'ecarte')} title={t('Écarter : ce n’est pas ce patient')} style={iconBtn('var(--danger)')}><X size={14} /></button>
          )}
          {c.etat !== 'propose' && (
            <button type="button" disabled={busy} onClick={() => onReset(c.compte)} title={c.source === 'manuel' ? t('Retirer ce compte') : t('Annuler la décision')} style={iconBtn('var(--fg-muted)')}>
              {c.source === 'manuel' ? <X size={14} /> : <RotateCcw size={13} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function PhpComptesSage({ patientId, canWrite, t }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [compte, setCompte] = useState('');
  const [showEcartes, setShowEcartes] = useState(false);

  const load = (refresh) => {
    setError(null);
    if (refresh) setBusy(true);
    phpPatientAPI.comptesSage(patientId, refresh)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.message || t('Sage injoignable.')))
      .finally(() => setBusy(false));
  };
  useEffect(() => { setData(null); setAdding(false); setCompte(''); load(false); }, [patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (p) => {
    setBusy(true);
    p.then((r) => setData(r.data))
      .catch((e) => toast.error(e.response?.data?.message || t('Erreur')))
      .finally(() => setBusy(false));
  };
  const onDecide = (comptes, statut) => run(phpPatientAPI.decideComptesSage(patientId, comptes, statut));
  const onReset = (c) => run(phpPatientAPI.resetCompteSage(patientId, c));
  const onAdd = (e) => {
    e.preventDefault();
    if (!compte.trim()) return;
    setBusy(true);
    phpPatientAPI.addCompteSage(patientId, compte.trim())
      .then((r) => { setData(r.data); setCompte(''); setAdding(false); toast.success(t('Compte ajouté')); })
      .catch((err) => toast.error(err.response?.data?.message || t('Erreur')))
      .finally(() => setBusy(false));
  };

  const section = (title, Icon, list, emptyText) => {
    const visibles = list.filter((c) => c.etat !== 'ecarte' || showEcartes);
    const proposes = list.filter((c) => c.etat === 'propose' && !c.confirmeAilleurs).map((c) => c.compte);
    return (
      <div style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', padding: '4px 0' }}>
          <Icon size={13} /> {title} <span style={{ fontWeight: 400 }}>({list.filter((c) => c.etat !== 'ecarte').length})</span>
          {canWrite && proposes.length > 1 && (
            <button type="button" disabled={busy} onClick={() => onDecide(proposes, 'confirme')} style={{ marginLeft: 'auto', fontSize: 11.5, border: 'none', background: 'none', color: 'var(--success)', cursor: 'pointer', fontWeight: 600 }}>
              {t('Tout confirmer ({{n}})', { n: proposes.length })}
            </button>
          )}
        </div>
        {visibles.length
          ? visibles.map((c) => <CompteRow key={c.compte} c={c} canWrite={canWrite} busy={busy} onDecide={onDecide} onReset={onReset} t={t} />)
          : <div style={{ fontSize: 12, color: 'var(--fg-subtle)', padding: '4px 0 6px' }}>{emptyText}</div>}
      </div>
    );
  };

  const ecartes = data ? [...data.employe, ...data.famille].filter((c) => c.etat === 'ecarte').length : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)', margin: 0 }}>{t('Comptes tiers Sage')}</h3>
        {busy && <Loader size={12} className="animate-spin" style={{ color: 'var(--fg-subtle)' }} />}
        <button type="button" onClick={() => load(true)} disabled={busy} title={t('Relire Sage')} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: 'var(--fg-subtle)', cursor: 'pointer', padding: 2 }}><RefreshCw size={13} /></button>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--danger)', padding: '4px 0' }}>{error}</div>}
      {!data && !error && <div style={{ padding: 10, textAlign: 'center' }}><Loader size={16} className="animate-spin" /></div>}
      {data && (
        <>
          {section(t('Comptes de l’agent'), Wallet, data.employe, t('Aucun compte Employé PHP avec le matricule {{m}} dans Sage.', { m: data.matricule }))}
          {section(t('Famille'), Users, data.famille, t('Aucun compte Famille PHP rattaché à ce matricule.'))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            {canWrite && !adding && (
              <button type="button" onClick={() => setAdding(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, border: 'none', background: 'none', color: 'var(--brand)', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                <Plus size={13} /> {t('Ajouter un compte à la main')}
              </button>
            )}
            {ecartes > 0 && (
              <button type="button" onClick={() => setShowEcartes((v) => !v)} style={{ fontSize: 12, border: 'none', background: 'none', color: 'var(--fg-subtle)', cursor: 'pointer', padding: 0, marginLeft: 'auto' }}>
                {showEcartes ? t('Masquer les comptes écartés') : t('Voir les comptes écartés ({{n}})', { n: ecartes })}
              </button>
            )}
          </div>
          {adding && (
            <form onSubmit={onAdd} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input autoFocus value={compte} onChange={(e) => setCompte(e.target.value)} placeholder={t('N° de compte tiers Sage (ex. 418123456)')}
                style={{ flex: 1, minWidth: 0, height: 30, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 12.5, fontFamily: 'var(--font-mono)' }} />
              <button type="submit" disabled={busy || !compte.trim()} style={{ height: 30, padding: '0 10px', borderRadius: 6, border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t('Ajouter')}</button>
              <button type="button" onClick={() => { setAdding(false); setCompte(''); }} style={{ height: 30, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-muted)', fontSize: 12, cursor: 'pointer' }}>{t('Annuler')}</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
