// frontend/src/components/caisse/CaissePermanence.jsx
// Finances › Caisse pharmacie › « Caisse de permanence » (11/11/2026) : remplace
// le classeur « CAISSE HSJM.xlsx ». Séances de jour (7 h-16 h 30) et de nuit
// (16 h 30-7 h) : passation (montant reçu compté), mouvements (cautions, autres
// recettes, sorties ; espèces ou Orange Money), clôture avec comptage et écart.
// 12/11/2026 : fiche PDF de la séance envoyée en signature (Caissière pharmacie →
// Caissière) ; suppression d'une séance par les administrateurs (séances de test).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import { Loader, Sun, Moon, Plus, X, Lock, Search, AlertTriangle, History, Ban, Eye, Send, Trash2, FileCheck } from 'lucide-react';
import { caissePharmacieAPI } from '../../services/phpService';
import { showPdfPreview } from '../PdfPreviewModal';

const fmt = (n) => (n == null ? '—' : `${Number(n).toLocaleString('fr-FR')}`);
const fmtF = (n) => (n == null ? '—' : `${Number(n).toLocaleString('fr-FR')} FCFA`);
const fmtDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const fmtShort = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '—');
const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');
const toNum = (v) => { const n = Number(String(v ?? '').replace(/[\s.  ]/g, '')); return Number.isFinite(n) ? n : NaN; };
const isoToday = () => new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 10);
const isoAgo = (n) => new Date(Date.now() + 3600 * 1000 - n * 86_400_000).toISOString().slice(0, 10);
const PERIODES = { jour: { label: 'Jour', heures: '7 h – 16 h 30', icon: Sun }, nuit: { label: 'Nuit', heures: '16 h 30 – 7 h', icon: Moon } };
const TYPES = { caution: 'Caution', recette: 'Autre recette', sortie: 'Sortie' };
const COUPURES = [10000, 5000, 2000, 1000, 500, 100, 50, 25, 10, 5];
const errMsg = (e, t) => e.response?.data?.message || t('Erreur serveur.');

const input = { height: 36, padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 14, minWidth: 0 };
const btn = (primary, disabled, danger) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 'var(--radius-2)', fontSize: 13.5, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, border: primary || danger ? 'none' : '1px solid var(--border)', background: danger ? 'var(--danger)' : primary ? 'var(--brand)' : 'var(--surface)', color: primary || danger ? '#fff' : 'var(--fg)', whiteSpace: 'nowrap' });
const label = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg-muted)', minWidth: 0 };

function Tile({ title, value, sub, color }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>{title}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: color || 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{sub}</div>}
    </div>
  );
}

function PeriodeBadge({ periode, t }) {
  const p = PERIODES[periode];
  const Icon = p.icon;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: periode === 'jour' ? 'var(--warning-soft)' : 'var(--brand-soft)', color: periode === 'jour' ? 'var(--warning)' : 'var(--brand)' }}><Icon size={12} /> {t(p.label)}</span>;
}

function Ecart({ value, t }) {
  if (value == null) return null;
  const color = value === 0 ? 'var(--success)' : 'var(--danger)';
  return <span style={{ color, fontWeight: 600 }}>{value === 0 ? t('Aucun écart') : `${value > 0 ? '+' : ''}${fmt(value)} FCFA`}</span>;
}

// ── Tableau des mouvements (même colonnes que le classeur) ───────────────────
function Mouvements({ seance, canEdit, onAnnuler, t }) {
  const th = { padding: '7px 8px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
  const td = { padding: '7px 8px', borderBottom: '1px solid var(--border)', fontSize: 13, verticalAlign: 'top' };
  const num = { ...td, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={th}>{t('Heure')}</th><th style={th}>{t('Nom')}</th>
          <th style={{ ...th, textAlign: 'right' }}>{t('Cautions')}</th><th style={{ ...th, textAlign: 'right' }}>{t('Autres')}</th>
          <th style={{ ...th, textAlign: 'right' }}>{t('Sorties')}</th><th style={{ ...th, textAlign: 'right' }}>{t('Solde')}</th>{canEdit && <th style={th} />}
        </tr></thead>
        <tbody>
          <tr><td style={td} /><td style={{ ...td, color: 'var(--fg-muted)' }}>{t('Solde d’ouverture')}</td><td style={num} /><td style={num} /><td style={num} /><td style={{ ...num, fontWeight: 600 }}>{fmt(seance.soldeOuverture)}</td>{canEdit && <td style={td} />}</tr>
          {seance.mouvements.map((m) => (
            <tr key={m.id} style={{ opacity: m.annule ? 0.5 : 1 }}>
              <td style={{ ...td, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>{fmtTime(m.heure)}</td>
              <td style={td}>
                <div style={{ textDecoration: m.annule ? 'line-through' : 'none' }}>{m.patientNom || m.libelle}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                  {[m.patientNom && m.libelle, m.mode === 'orange_money' && 'Orange Money', m.saisiParNom !== seance.caissiereNom && m.saisiParNom].filter(Boolean).join(' · ')}
                </div>
                {m.annule && <div style={{ fontSize: 11, color: 'var(--danger)' }}>{t('Annulé par {{n}} : {{m}}', { n: m.annuleParNom, m: m.motifAnnulation })}</div>}
              </td>
              <td style={num}>{m.type === 'caution' ? fmt(m.montant) : ''}</td>
              <td style={num}>{m.type === 'recette' ? fmt(m.montant) : ''}</td>
              <td style={{ ...num, color: 'var(--danger)' }}>{m.type === 'sortie' ? fmt(m.montant) : ''}</td>
              <td style={{ ...num, fontWeight: 600 }}>{fmt(m.solde)}</td>
              {canEdit && <td style={td}>{!m.annule && <button type="button" onClick={() => onAnnuler(m)} title={t('Annuler ce mouvement')} style={{ border: 'none', background: 'none', color: 'var(--fg-subtle)', cursor: 'pointer', padding: 2 }}><Ban size={14} /></button>}</td>}
            </tr>
          ))}
          {!seance.mouvements.length && <tr><td colSpan={canEdit ? 7 : 6} style={{ ...td, textAlign: 'center', color: 'var(--fg-subtle)', padding: 20 }}>{t('Aucun mouvement pour l’instant.')}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Totaux({ seance, t }) {
  const x = seance.totaux;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
      <Tile title={t('Solde d’ouverture')} value={fmtF(x.soldeOuverture)} />
      <Tile title={t('Cautions')} value={fmtF(x.cautions)} />
      <Tile title={t('Autres recettes')} value={fmtF(x.recettes)} />
      <Tile title={t('Sorties')} value={fmtF(x.sorties)} color={x.sorties ? 'var(--danger)' : undefined} />
      <Tile title={t('Orange Money')} value={fmtF(x.orangeMoney)} sub={t('hors tiroir')} />
      <Tile title={t('Espèces attendues')} value={fmtF(x.especesTheoriques)} color="var(--brand)" sub={t('dans le tiroir')} />
    </div>
  );
}

// ── Saisie d'un mouvement ────────────────────────────────────────────────────
function SaisieMouvement({ seance, libelles, onSaved, t }) {
  const [type, setType] = useState('caution');
  const [libelle, setLibelle] = useState('Caution');
  const [libre, setLibre] = useState('');
  const [patientNom, setPatientNom] = useState('');
  const [mode, setMode] = useState('especes');
  const [montant, setMontant] = useState('');
  const [busy, setBusy] = useState(false);
  const nomRef = useRef(null);
  const options = libelles?.[type] || [];
  const autre = libelle === '__autre';

  const changeType = (ty) => { setType(ty); setLibelle(libelles?.[ty]?.[0] || ''); setLibre(''); if (ty === 'sortie') setMode('especes'); };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await caissePharmacieAPI.permanenceMouvement(seance.id, { type, mode, libelle: autre ? libre : libelle, patientNom, montant });
      onSaved(r.data.seance);
      setPatientNom(''); setMontant(''); nomRef.current?.focus();
    } catch (err) { toast.error(errMsg(err, t)); } finally { setBusy(false); }
  };
  const seg = (active, color) => ({ ...btn(false, false), height: 32, padding: '0 12px', borderColor: active ? color : 'var(--border)', background: active ? 'var(--surface-2)' : 'var(--surface)', color: active ? color : 'var(--fg-muted)' });

  return (
    <form onSubmit={submit} className="ged-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.entries(TYPES).map(([k, l]) => <button key={k} type="button" onClick={() => changeType(k)} style={seg(type === k, k === 'sortie' ? 'var(--danger)' : 'var(--brand)')}>{t(l)}</button>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, alignItems: 'end' }}>
        <label style={label}>{type === 'sortie' ? t('Bénéficiaire / détail') : t('Nom du patient')}{type === 'caution' ? ' *' : ''}
          <input ref={nomRef} value={patientNom} onChange={(e) => setPatientNom(e.target.value)} style={input} placeholder={type === 'caution' ? t('ex. BB DONTSA MERLISE') : ''} />
        </label>
        <label style={label}>{t('Libellé')}
          <select value={libelle} onChange={(e) => setLibelle(e.target.value)} style={input}>
            {options.map((o) => <option key={o} value={o}>{t(o)}</option>)}
            <option value="__autre">{t('Autre…')}</option>
          </select>
        </label>
        {autre && <label style={label}>{t('Libellé libre')}<input value={libre} onChange={(e) => setLibre(e.target.value)} style={input} /></label>}
        {type !== 'sortie' && (
          <label style={label}>{t('Paiement')}
            <select value={mode} onChange={(e) => setMode(e.target.value)} style={input}>
              <option value="especes">{t('Espèces')}</option>
              <option value="orange_money">Orange Money</option>
            </select>
          </label>
        )}
        <label style={label}>{t('Montant (FCFA)')} *
          <input value={montant} onChange={(e) => setMontant(e.target.value)} inputMode="numeric" style={{ ...input, fontVariantNumeric: 'tabular-nums' }} />
        </label>
        <button type="submit" disabled={busy || !montant} style={btn(true, busy || !montant)}>{busy ? <Loader size={14} className="animate-spin" /> : <Plus size={15} />} {t('Ajouter')}</button>
      </div>
    </form>
  );
}

// ── Fenêtres ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 520 }) {
  return ReactDOM.createPortal(
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: `min(${width}px, 100%)`, maxHeight: '100%', overflowY: 'auto', background: 'var(--bg)', borderRadius: 14, boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <strong style={{ flex: 1, fontSize: 15 }}>{title}</strong>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function ClotureModal({ seance, onClose, onDone, t }) {
  const [especes, setEspeces] = useState('');
  const [useBillets, setUseBillets] = useState(false);
  const [billets, setBillets] = useState({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const totalBillets = COUPURES.reduce((s, c) => s + c * (Number(billets[c]) || 0), 0);
  const compte = useBillets ? totalBillets : toNum(especes);
  const attendu = seance.totaux.especesTheoriques;
  const ecart = Number.isFinite(compte) && (useBillets || especes !== '') ? compte - attendu : null;
  const submit = async () => {
    setBusy(true);
    try {
      const body = useBillets ? { billetage: billets, especesComptees: totalBillets, note } : { especesComptees: especes, note };
      const r = await caissePharmacieAPI.permanenceCloturer(seance.id, body);
      toast.success(t('Séance clôturée.'));
      onDone(r.data.seance);
    } catch (e) { toast.error(errMsg(e, t)); } finally { setBusy(false); }
  };
  return (
    <Modal title={t('Clôturer la séance')} onClose={onClose}>
      <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 10 }}>{t('Comptez les espèces du tiroir. L’Orange Money ({{om}}) n’est pas dans le tiroir.', { om: fmtF(seance.totaux.orangeMoney) })}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '8px 0', borderBottom: '1px solid var(--border)' }}><span>{t('Espèces attendues')}</span><strong>{fmtF(attendu)}</strong></div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, margin: '10px 0' }}>
        <input type="checkbox" checked={useBillets} onChange={(e) => setUseBillets(e.target.checked)} /> {t('Compter billet par billet')}
      </label>
      {useBillets ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          {COUPURES.map((c) => (
            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span style={{ width: 60, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(c)}</span> ×
              <input value={billets[c] || ''} onChange={(e) => setBillets({ ...billets, [c]: e.target.value.replace(/\D/g, '') })} inputMode="numeric" style={{ ...input, width: 70, height: 30 }} />
            </label>
          ))}
          <div style={{ gridColumn: '1 / -1', textAlign: 'right', fontSize: 14 }}>{t('Total compté')} : <strong>{fmtF(totalBillets)}</strong></div>
        </div>
      ) : (
        <label style={label}>{t('Espèces comptées (FCFA)')}<input autoFocus value={especes} onChange={(e) => setEspeces(e.target.value)} inputMode="numeric" style={input} /></label>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '10px 0' }}><span>{t('Écart')}</span>{ecart == null ? '—' : <Ecart value={ecart} t={t} />}</div>
      {ecart != null && ecart !== 0 && (
        <label style={label}>{t('Explication de l’écart')} *<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} style={{ ...input, height: 'auto', padding: 8 }} /></label>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button type="button" onClick={onClose} style={btn(false)}>{t('Annuler')}</button>
        <button type="button" onClick={submit} disabled={busy || ecart == null || (ecart !== 0 && !note.trim())} style={btn(true, busy || ecart == null || (ecart !== 0 && !note.trim()))}>
          {busy ? <Loader size={14} className="animate-spin" /> : <Lock size={14} />} {t('Clôturer')}
        </button>
      </div>
    </Modal>
  );
}

function AnnulerModal({ mouvement, onClose, onDone, t }) {
  const [motif, setMotif] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { const r = await caissePharmacieAPI.permanenceAnnuler(mouvement.id, motif); onDone(r.data.seance); } catch (e) { toast.error(errMsg(e, t)); } finally { setBusy(false); }
  };
  return (
    <Modal title={t('Annuler un mouvement')} onClose={onClose} width={440}>
      <div style={{ fontSize: 13.5, marginBottom: 10 }}>{mouvement.patientNom || mouvement.libelle} · <strong>{fmtF(mouvement.montant)}</strong></div>
      <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginBottom: 8 }}>{t('Le mouvement reste visible, barré, avec le motif.')}</div>
      <label style={label}>{t('Motif')} *<input autoFocus value={motif} onChange={(e) => setMotif(e.target.value)} style={input} placeholder={t('ex. saisi deux fois, mauvais montant')} /></label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button type="button" onClick={onClose} style={btn(false)}>{t('Retour')}</button>
        <button type="button" onClick={submit} disabled={busy || !motif.trim()} style={btn(false, busy || !motif.trim(), true)}>{t('Annuler le mouvement')}</button>
      </div>
    </Modal>
  );
}

// ── Ouverture d'une séance (passation) ───────────────────────────────────────
function Ouverture({ etat, onOpened, t }) {
  const p = etat.proposition;
  const [date, setDate] = useState(p.date);
  const [periode, setPeriode] = useState(p.periode);
  const [recu, setRecu] = useState('');
  const [initial, setInitial] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const transmis = p.premiere ? toNum(initial) : p.soldeOuverture;
  const ecart = recu !== '' && Number.isFinite(toNum(recu)) && Number.isFinite(transmis) ? toNum(recu) - transmis : null;
  const ok = recu !== '' && ecart != null && (ecart === 0 || note.trim()) && (!p.premiere || initial !== '');
  const submit = async () => {
    setBusy(true);
    try {
      const r = await caissePharmacieAPI.permanenceOuvrir({ date, periode, montantRecu: recu, soldeInitial: p.premiere ? initial : undefined, note });
      toast.success(t('Séance ouverte.'));
      onOpened(r.data.seance);
    } catch (e) { toast.error(errMsg(e, t)); } finally { setBusy(false); }
  };
  return (
    <div className="ged-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <strong style={{ fontSize: 15 }}>{t('Prendre la caisse')}</strong>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label style={label}>{t('Date')}<input type="date" value={date} max={isoToday()} onChange={(e) => setDate(e.target.value)} style={input} /></label>
        <label style={label}>{t('Service')}
          <select value={periode} onChange={(e) => setPeriode(e.target.value)} style={input}>
            {Object.entries(PERIODES).map(([k, v]) => <option key={k} value={k}>{t(v.label)} ({v.heures})</option>)}
          </select>
        </label>
      </div>
      {p.sautees > 0 && date === p.date && periode === p.periode && (
        <div style={{ fontSize: 12.5, color: 'var(--warning)', display: 'flex', gap: 6 }}><AlertTriangle size={14} /> {t('{{n}} séance(s) sans caisse depuis la dernière clôture.', { n: p.sautees })}</div>
      )}
      {p.premiere ? (
        <label style={label}>{t('Solde de départ (espèces en caisse, première séance)')} *<input value={initial} onChange={(e) => setInitial(e.target.value)} inputMode="numeric" style={input} /></label>
      ) : (
        <div style={{ fontSize: 13.5 }}>
          {t('Solde transmis par {{n}} ({{s}}) :', { n: p.precedente.caissiereNom, s: `${fmtShort(p.precedente.date)} ${t(PERIODES[p.precedente.periode].label).toLowerCase()}` })} <strong>{fmtF(p.soldeOuverture)}</strong>
        </div>
      )}
      <label style={label}>{t('Montant reçu, compté à la prise de service')} *<input value={recu} onChange={(e) => setRecu(e.target.value)} inputMode="numeric" style={input} /></label>
      {ecart != null && <div style={{ fontSize: 13.5 }}>{t('Écart')} : <Ecart value={ecart} t={t} /></div>}
      {ecart != null && ecart !== 0 && <label style={label}>{t('Explication de l’écart')} *<input value={note} onChange={(e) => setNote(e.target.value)} style={input} /></label>}
      <div><button type="button" onClick={submit} disabled={busy || !ok} style={btn(true, busy || !ok)}>{busy && <Loader size={14} className="animate-spin" />} {t('Ouvrir la séance')}</button></div>
    </div>
  );
}

// ── Suppression (administrateurs) ───────────────────────────────────────────
function SupprimerModal({ seance, onClose, onDone, t }) {
  const [motif, setMotif] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await caissePharmacieAPI.permanenceSupprimer(seance.id, motif); toast.success(t('Séance supprimée.')); onDone(); } catch (e) { toast.error(errMsg(e, t)); } finally { setBusy(false); }
  };
  return (
    <Modal title={t('Supprimer la séance')} onClose={onClose} width={460}>
      <div style={{ fontSize: 13.5, marginBottom: 8 }}>
        <span style={{ textTransform: 'capitalize' }}>{fmtDate(seance.date)}</span> · {t(PERIODES[seance.periode].label)} · {seance.caissiereNom}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--danger)', marginBottom: 10, display: 'flex', gap: 6 }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{t('La séance et tous ses mouvements seront effacés. Si elle était en signature, le document est arrêté. Le contenu reste consultable dans le journal d’audit.')}</span>
      </div>
      <label style={label}>{t('Motif')} *<input autoFocus value={motif} onChange={(e) => setMotif(e.target.value)} style={input} placeholder={t('ex. séance de test')} /></label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button type="button" onClick={onClose} style={btn(false)}>{t('Retour')}</button>
        <button type="button" onClick={submit} disabled={busy || !motif.trim()} style={btn(false, busy || !motif.trim(), true)}>{busy ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />} {t('Supprimer')}</button>
      </div>
    </Modal>
  );
}

const DOC_STATUS = { approved: 'Signée', pending_validation: 'En signature', in_progress: 'En signature' };
const apercu = (seance, t) => showPdfPreview({
  title: t('Caisse de permanence · {{d}} · {{p}}', { d: fmtShort(seance.date), p: t(PERIODES[seance.periode].label) }),
  fileName: `caisse-permanence-${seance.date}-${seance.periode}.pdf`,
  load: () => caissePharmacieAPI.permanencePdf(seance.id).then((r) => r.data),
});

// ── Détail d'une séance : aperçu PDF, envoi en signature, suppression ────────
function SeanceDetail({ id, onClose, onChanged, t }) {
  const [data, setData] = useState(null);
  const [selections, setSelections] = useState({});
  const [sending, setSending] = useState(false);
  const [suppr, setSuppr] = useState(false);
  const load = () => caissePharmacieAPI.permanenceSeance(id).then((r) => setData(r.data)).catch((e) => { toast.error(errMsg(e, t)); onClose(); });
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return null;
  const detail = data.seance;
  const steps = data.circuit?.steps || [];
  const missing = steps.some((s) => s.needsSelection && !selections[s.key]);
  const send = async () => {
    setSending(true);
    try {
      const r = await caissePharmacieAPI.permanenceSoumettre(detail.id, selections);
      toast.success(r.data.message);
      await load(); onChanged?.();
    } catch (e) { toast.error(errMsg(e, t)); } finally { setSending(false); }
  };
  return (
    <Modal title={`${fmtDate(detail.date)} · ${t(PERIODES[detail.periode].label)} · ${detail.caissiereNom}`} onClose={onClose} width={860}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => apercu(detail, t)} style={btn(false)}><Eye size={14} /> {t('Aperçu PDF')}</button>
        {data.document && (
          <a href={`/documents/${data.document.id}`} style={{ ...btn(false), textDecoration: 'none', color: 'var(--success)' }}>
            <FileCheck size={14} /> {t(DOC_STATUS[data.document.status] || 'En signature')} · {t('voir le document')}
          </a>
        )}
        <span style={{ flex: 1 }} />
        {data.canDelete && <button type="button" onClick={() => setSuppr(true)} style={btn(false)}><Trash2 size={14} color="var(--danger)" /> {t('Supprimer la séance')}</button>}
      </div>
      {data.canSubmit && (
        <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--brand)', background: 'var(--brand-soft)', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <strong style={{ fontSize: 14 }}>{t('Envoyer la séance en signature')}</strong>
          {data.circuit?.error ? <div style={{ color: 'var(--danger)', fontSize: 13 }}>{data.circuit.error}</div> : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', fontSize: 13 }}>
              {steps.map((s, i) => (
                <React.Fragment key={s.key}>
                  {i > 0 && <span style={{ color: 'var(--fg-subtle)' }}>→</span>}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--fg-muted)' }}>{t(s.label)} :</span>
                    {s.holders.length === 1 ? <strong>{s.holders[0].name}</strong> : (
                      <select value={selections[s.key] || ''} onChange={(e) => setSelections((p) => ({ ...p, [s.key]: e.target.value }))} style={{ ...input, height: 32, fontSize: 13 }}>
                        <option value="">{t('— choisir —')}</option>
                        {s.holders.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    )}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
          <div>
            <button type="button" onClick={send} disabled={sending || missing || !!data.circuit?.error} style={btn(true, sending || missing || !!data.circuit?.error)}>
              {sending ? <Loader size={14} className="animate-spin" /> : <Send size={14} />} {t('Envoyer en signature')}
            </button>
          </div>
        </div>
      )}
      <Totaux seance={detail} t={t} />
      <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', margin: '10px 0' }}>
        {t('Reçu à la prise de service')} : {fmtF(detail.montantRecu)} ({t('écart')} <Ecart value={detail.ecartReception} t={t} />){detail.noteOuverture ? ` — ${detail.noteOuverture}` : ''}
        {detail.statut === 'cloturee' && <> · {t('Compté à la clôture')} : {fmtF(detail.especesComptees)} ({t('écart')} <Ecart value={detail.ecartCloture} t={t} />){detail.noteCloture ? ` — ${detail.noteCloture}` : ''}</>}
      </div>
      <Mouvements seance={detail} canEdit={false} t={t} />
      {suppr && <SupprimerModal seance={detail} onClose={() => setSuppr(false)} onDone={() => { setSuppr(false); onChanged?.(); onClose(); }} t={t} />}
    </Modal>
  );
}

// ── Historique ──────────────────────────────────────────────────────────────
function Historique({ refreshKey, onChanged, t }) {
  const [from, setFrom] = useState(isoAgo(7));
  const [to, setTo] = useState(isoToday());
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [q, setQ] = useState('');
  const [resultats, setResultats] = useState(null);
  const load = () => caissePharmacieAPI.permanenceSeances(from, to).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e, t)));
  useEffect(() => { load(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (q.trim().length < 2) { setResultats(null); return undefined; }
    const h = setTimeout(() => caissePharmacieAPI.permanenceRecherche(q.trim()).then((r) => setResultats(r.data.resultats)).catch(() => {}), 300);
    return () => clearTimeout(h);
  }, [q]);
  const open = (id) => setDetail(id);
  const th = { padding: '7px 8px', textAlign: 'right', fontSize: 11.5, fontWeight: 600, color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
  const td = { padding: '7px 8px', borderBottom: '1px solid var(--border)', fontSize: 13, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
  const x = data?.totaux;
  return (
    <div className="ged-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginRight: 'auto' }}><History size={15} /> {t('Historique')}</strong>
        <label style={label}>{t('Du')}<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...input, height: 32 }} /></label>
        <label style={label}>{t('Au')}<input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...input, height: 32 }} /></label>
        <button type="button" onClick={load} style={{ ...btn(false), height: 32 }}>{t('Afficher')}</button>
      </div>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Retrouver une caution : nom du patient…')} style={{ ...input, width: '100%', paddingLeft: 30, boxSizing: 'border-box' }} />
        {resultats && (
          <div style={{ marginTop: 8 }}>
            {resultats.map((m) => (
              <button key={m.id} type="button" onClick={() => open(m.seance.id)} style={{ display: 'flex', width: '100%', gap: 8, padding: '6px 2px', border: 'none', borderTop: '1px solid var(--border)', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: 'var(--fg)', opacity: m.annule ? 0.5 : 1 }}>
                <span style={{ flex: 1 }}>{m.patientNom} <span style={{ color: 'var(--fg-subtle)' }}>· {t(TYPES[m.type])}{m.mode === 'orange_money' ? ' · Orange Money' : ''}</span></span>
                <span style={{ color: 'var(--fg-muted)' }}>{fmtShort(m.seance.date)} {t(PERIODES[m.seance.periode].label).toLowerCase()} · {m.seance.caissiereNom}</span>
                <strong>{fmt(m.montant)}</strong>
              </button>
            ))}
            {!resultats.length && <div style={{ fontSize: 12.5, color: 'var(--fg-subtle)' }}>{t('Aucun mouvement à ce nom.')}</div>}
          </div>
        )}
      </div>
      {x && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, padding: '10px 14px', fontSize: 12.5, color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)' }}>
          <span>{t('{{n}} séance(s)', { n: x.seances })}</span>
          <span>{t('Cautions')} : <strong style={{ color: 'var(--fg)' }}>{fmtF(x.cautions)}</strong></span>
          <span>{t('Autres recettes')} : <strong style={{ color: 'var(--fg)' }}>{fmtF(x.recettes)}</strong></span>
          <span>{t('Sorties')} : <strong style={{ color: 'var(--fg)' }}>{fmtF(x.sorties)}</strong></span>
          <span>Orange Money : <strong style={{ color: 'var(--fg)' }}>{fmtF(x.orangeMoney)}</strong></span>
          <span>{t('Écarts')} : <Ecart value={x.ecarts} t={t} /></span>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={{ ...th, textAlign: 'left' }}>{t('Séance')}</th><th style={{ ...th, textAlign: 'left' }}>{t('Caissière')}</th>
            <th style={th}>{t('Ouverture')}</th><th style={th}>{t('Cautions')}</th><th style={th}>{t('Autres')}</th><th style={th}>{t('Sorties')}</th>
            <th style={th}>Orange Money</th><th style={th}>{t('Espèces comptées')}</th><th style={th}>{t('Écart')}</th><th style={{ ...th, textAlign: 'left' }}>{t('Signature')}</th>
          </tr></thead>
          <tbody>
            {data?.seances.map((s) => (
              <tr key={s.id} onClick={() => open(s.id)} style={{ cursor: 'pointer' }}>
                <td style={{ ...td, textAlign: 'left' }}><span style={{ marginRight: 6 }}>{fmtShort(s.date)}</span><PeriodeBadge periode={s.periode} t={t} /></td>
                <td style={{ ...td, textAlign: 'left' }}>{s.caissiereNom}</td>
                <td style={td}>{fmt(s.soldeOuverture)}</td><td style={td}>{fmt(s.totaux.cautions)}</td><td style={td}>{fmt(s.totaux.recettes)}</td>
                <td style={td}>{fmt(s.totaux.sorties)}</td><td style={td}>{fmt(s.totaux.orangeMoney)}</td>
                <td style={td}>{s.statut === 'ouverte' ? <span style={{ color: 'var(--brand)' }}>{t('En cours')}</span> : fmt(s.especesComptees)}</td>
                <td style={td}>{s.statut === 'cloturee' && <Ecart value={s.ecartCloture} t={t} />}</td>
                <td style={{ ...td, textAlign: 'left' }}>
                  {s.statut !== 'cloturee' ? '' : s.document
                    ? <span style={{ color: s.document.status === 'approved' ? 'var(--success)' : 'var(--brand)', fontWeight: 600 }}>{t(DOC_STATUS[s.document.status] || 'En signature')}</span>
                    : <span style={{ color: 'var(--warning)' }}>{t('À envoyer')}</span>}
                </td>
              </tr>
            ))}
            {data && !data.seances.length && <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: 'var(--fg-subtle)', padding: 20 }}>{t('Aucune séance sur cette période.')}</td></tr>}
          </tbody>
        </table>
      </div>
      {detail && <SeanceDetail id={detail} onClose={() => setDetail(null)} onChanged={() => { load(); onChanged?.(); }} t={t} />}
    </div>
  );
}

// ── Onglet ──────────────────────────────────────────────────────────────────
export default function CaissePermanence({ t }) {
  const [etat, setEtat] = useState(null);
  const [error, setError] = useState(null);
  const [cloture, setCloture] = useState(false);
  const [annuler, setAnnuler] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aEnvoyer, setAEnvoyer] = useState(null); // séance qu'on vient de clôturer → proposer l'envoi en signature
  const [suppr, setSuppr] = useState(false);
  const load = () => caissePharmacieAPI.permanence().then((r) => { setEtat(r.data); setError(null); }).catch((e) => setError(errMsg(e, t)));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const seance = etat?.ouverte;
  const canEdit = !!(etat?.canWrite && seance && seance.caissiereId === etat.me);
  const setSeance = (s) => { setEtat((e) => ({ ...e, ouverte: s.statut === 'ouverte' ? s : null })); };
  const afterChange = () => { load(); setRefreshKey((k) => k + 1); };

  const title = useMemo(() => seance && (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <PeriodeBadge periode={seance.periode} t={t} />
      <strong style={{ fontSize: 15, textTransform: 'capitalize' }}>{fmtDate(seance.date)}</strong>
      <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>· {t('Caissière')} : {seance.caissiereNom} · {t('ouverte à {{h}}', { h: fmtTime(seance.ouverteAt) })}</span>
    </div>
  ), [seance, t]);

  if (error) return <div className="ged-card" style={{ padding: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>;
  if (!etat) return <div style={{ padding: 40, textAlign: 'center' }}><Loader size={20} className="animate-spin" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {seance ? (
        <div className="ged-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>{title}</div>
            {canEdit && <button type="button" onClick={() => apercu(seance, t)} style={btn(false)}><Eye size={14} /> {t('Aperçu PDF')}</button>}
            {canEdit && <button type="button" onClick={() => setCloture(true)} style={btn(false)}><Lock size={14} /> {t('Clôturer la séance')}</button>}
            {etat.canDelete && <button type="button" onClick={() => setSuppr(true)} title={t('Supprimer la séance')} style={btn(false)}><Trash2 size={14} color="var(--danger)" /></button>}
          </div>
          {!canEdit && <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>{t('Seule la caissière de la séance peut saisir et clôturer.')}</div>}
          <Totaux seance={seance} t={t} />
          {canEdit && <SaisieMouvement seance={seance} libelles={etat.libelles} onSaved={(s) => setSeance(s)} t={t} />}
          <Mouvements seance={seance} canEdit={canEdit} onAnnuler={setAnnuler} t={t} />
        </div>
      ) : etat.canWrite ? (
        <Ouverture etat={etat} onOpened={afterChange} t={t} />
      ) : (
        <div className="ged-card" style={{ padding: 16, fontSize: 13, color: 'var(--fg-muted)' }}>{t('Aucune séance ouverte pour le moment.')}</div>
      )}

      <Historique refreshKey={refreshKey} onChanged={load} t={t} />

      {cloture && seance && <ClotureModal seance={seance} onClose={() => setCloture(false)} onDone={(s) => { setCloture(false); afterChange(); setAEnvoyer(s.id); }} t={t} />}
      {aEnvoyer && <SeanceDetail id={aEnvoyer} onClose={() => setAEnvoyer(null)} onChanged={afterChange} t={t} />}
      {suppr && seance && <SupprimerModal seance={seance} onClose={() => setSuppr(false)} onDone={() => { setSuppr(false); afterChange(); }} t={t} />}
      {annuler && <AnnulerModal mouvement={annuler} onClose={() => setAnnuler(null)} onDone={(s) => { setAnnuler(null); setSeance(s); }} t={t} />}
    </div>
  );
}
