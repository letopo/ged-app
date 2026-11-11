// frontend/src/components/php/PhpParcoursModal.jsx
// Fiche Patient PHP › « Parcours hospitalier » (étape B, 11/11/2026) : une frise
// qui réunit le Module PHP (consultations), le DME (consultations,
// hospitalisations, bulletins d'examens) et Sage (BL, factures), avec contrôles
// croisés. Lecture seule, tout est lu en direct.
import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Loader, Stethoscope, Hospital, FlaskConical, Receipt, FileText, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { phpPatientAPI } from '../../services/phpService';

const KINDS = {
  consultation_php: { label: 'Consultation (Module PHP)', icon: Stethoscope, color: 'var(--brand)', source: 'ged' },
  consultation_dme: { label: 'Consultation (DME)', icon: Stethoscope, color: '#0d9488', source: 'dme' },
  hospitalisation: { label: 'Hospitalisation (DME)', icon: Hospital, color: '#b45309', source: 'dme' },
  bulletin: { label: 'Bulletin d’examens (DME)', icon: FlaskConical, color: '#7c3aed', source: 'dme' },
  bl: { label: 'BL (Sage)', icon: FileText, color: '#475569', source: 'sage' },
  facture: { label: 'Facture (Sage)', icon: Receipt, color: '#059669', source: 'sage' },
};
const FILTERS = [
  ['all', 'Tout'], ['ged', 'Module PHP'], ['dme', 'DME'], ['sage', 'Sage'], ['controle', 'À regarder'],
];
const fmtDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const fmtMoney = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
const monthLabel = (d) => new Date(`${d.slice(0, 7)}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
const ISSUES = { pharmacie: 'pharmacie', laboratoire: 'laboratoire', radiologie: 'radiologie', specialiste: 'spécialiste', repos: 'repos', hospitalisation: 'hospitalisation', operation: 'opération', transfert: 'transfert', deces: 'décès', retour_travail: 'retour au travail', en_cours: 'en cours', non_presente: 'non présenté' };

function Kpi({ label, value, sub, color }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || 'var(--fg)', whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{sub}</div>}
    </div>
  );
}

function EventRow({ e, personnes, t }) {
  const k = KINDS[e.kind];
  const Icon = k.icon;
  const famille = e.personne && e.personne !== 'agent' ? personnes[e.personne]?.nom : null;
  const tag = (txt, color, bg) => <span style={{ padding: '1px 7px', borderRadius: 999, fontSize: 10.5, fontWeight: 600, color, background: bg, whiteSpace: 'nowrap' }}>{txt}</span>;
  return (
    <div style={{ display: 'flex', gap: 10, padding: '9px 0', borderTop: '1px solid var(--border)', opacity: e.annule ? 0.55 : 1 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: k.color }}><Icon size={15} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>{fmtDate(e.date)}{e.fin ? ` → ${fmtDate(e.fin)}` : ''}</span>
          <strong style={{ fontSize: 13, color: 'var(--fg)' }}>{e.titre}</strong>
          {famille && tag(t('Famille : {{n}}', { n: famille }), '#15803d', 'var(--success-soft)')}
          {e.kind === 'bl' && (e.facture ? tag(t('Facturé ({{f}})', { f: e.facture }), 'var(--success)', 'var(--success-soft)') : tag(t('Non facturé'), 'var(--warning)', 'var(--warning-soft)'))}
          {e.kind === 'facture' && tag(e.comptabilisee ? t('Comptabilisée') : t('Non comptabilisée'), e.comptabilisee ? 'var(--success)' : 'var(--warning)', e.comptabilisee ? 'var(--success-soft)' : 'var(--warning-soft)')}
          {e.kind === 'hospitalisation' && e.statut === 'en_cours' && tag(t('En cours'), 'var(--brand)', 'var(--brand-soft)')}
          {e.kind === 'hospitalisation' && e.insolvable && tag(t('Insolvable'), 'var(--danger)', 'var(--danger-soft)')}
          {e.kind === 'bulletin' && tag(e.signe ? t('Signé') : t('Non signé'), e.signe ? 'var(--success)' : 'var(--fg-muted)', e.signe ? 'var(--success-soft)' : 'var(--surface-2)')}
          {e.annule && tag(t('Annulée'), 'var(--fg-muted)', 'var(--surface-2)')}
          {e.montant != null && <span style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtMoney(e.montant)}</span>}
        </div>
        {e.detail && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{e.detail}</div>}
        {(e.lieu || e.medecin || e.issue) && (
          <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 2 }}>
            {[e.lieu, e.medecin && t('Dr {{n}}', { n: e.medecin }), e.issue && t('Suite : {{s}}', { s: t(ISSUES[e.issue] || e.issue) })].filter(Boolean).join(' · ')}
          </div>
        )}
        {e.documentId && (
          <Link to={`/documents/${e.documentId}`} style={{ fontSize: 11.5, color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <ExternalLink size={11} /> {t('Voir la facture dans la GED')}
          </Link>
        )}
        {e.controle === 'sans_bl' && (
          <div style={{ fontSize: 11.5, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <AlertTriangle size={12} /> {t('Aucun BL dans Sage pour ce passage (du jour d’avant à 3 jours après) : oubli de facturation ?')}
          </div>
        )}
        {e.controle === 'sans_dme' && (
          <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <Info size={12} /> {t('Pas de trace de ce passage dans le DME.')}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PhpParcoursModal({ patient, onClose, t }) {
  const [months, setMonths] = useState(12);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [personne, setPersonne] = useState('');

  useEffect(() => {
    setData(null); setError(null);
    phpPatientAPI.parcours(patient.id, months)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.message || t('Erreur')));
  }, [patient.id, months]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const events = useMemo(() => (data?.events || []).filter((e) => {
    if (personne && e.personne !== personne) return false;
    if (filter === 'all') return true;
    if (filter === 'controle') return e.controle === 'sans_bl' || (e.kind === 'bl' && !e.facture);
    return e.source === filter;
  }), [data, filter, personne]);

  const byMonth = useMemo(() => {
    const m = new Map();
    events.forEach((e) => { const k = (e.date || '').slice(0, 7); if (!m.has(k)) m.set(k, []); m.get(k).push(e); });
    return [...m.entries()];
  }, [events]);

  const tot = data?.totaux;
  const sansBl = data ? data.events.filter((e) => e.controle === 'sans_bl').length : 0;
  const sansDme = data ? data.events.filter((e) => e.controle === 'sans_dme').length : 0;
  const familles = data ? Object.entries(data.personnes).filter(([k]) => k !== 'agent') : [];
  const chip = (active) => ({ height: 30, padding: '0 12px', borderRadius: 999, border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`, background: active ? 'var(--brand-soft)' : 'var(--surface)', color: active ? 'var(--brand)' : 'var(--fg-muted)', fontSize: 12.5, fontWeight: active ? 650 : 500, cursor: 'pointer', whiteSpace: 'nowrap' });

  return ReactDOM.createPortal(
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(980px, 100%)', maxHeight: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', borderRadius: 14, boxShadow: 'var(--shadow-3, 0 20px 50px rgba(0,0,0,.3))', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>{t('Parcours hospitalier')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>{patient.nom} {patient.prenom} · {t('mat. {{m}}', { m: patient.matricule })}</div>
          </div>
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} style={{ height: 32, padding: '0 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13 }}>
            {[3, 6, 12, 24].map((m) => <option key={m} value={m}>{t('{{count}} derniers mois', { count: m })}</option>)}
          </select>
          <button type="button" onClick={onClose} aria-label={t('Fermer')} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '14px 18px 18px' }}>
          {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
          {!data && !error && <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}><Loader size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />{t('Lecture du Module PHP, du DME et de Sage…')}</div>}
          {data && (
            <>
              {Object.entries(data.erreurs || {}).map(([src, msg]) => (
                <div key={src} style={{ fontSize: 12.5, color: 'var(--warning)', background: 'var(--warning-soft)', padding: '8px 10px', borderRadius: 8, marginBottom: 8 }}>
                  {src === 'dme' ? t('DME') : t('Sage')} : {msg} {t('Le reste du parcours est affiché.')}
                </div>
              ))}
              {!data.comptes.length && !data.erreurs?.sage && (
                <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', background: 'var(--surface-2)', padding: '8px 10px', borderRadius: 8, marginBottom: 8 }}>
                  {t('Aucun compte tiers Sage pour ce patient : ajoutez-en un dans « Comptes tiers Sage » pour voir ses BL, ses factures et ses passages dans le DME.')}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
                <Kpi label={t('Consultations Module PHP')} value={tot.consultationsPhp} />
                <Kpi label={t('Passages au DME')} value={tot.consultationsDme} sub={t('{{h}} hospitalisation(s) · {{b}} bulletin(s)', { h: tot.hospitalisations, b: tot.bulletins })} />
                <Kpi label={t('BL')} value={tot.bl} sub={fmtMoney(tot.montantBl)} />
                <Kpi label={t('Non facturé')} value={fmtMoney(tot.montantNonFacture)} sub={t('{{n}} BL', { n: tot.blNonFactures })} color={tot.montantNonFacture ? 'var(--warning)' : undefined} />
                <Kpi label={t('Factures')} value={tot.factures} />
                <Kpi label={t('Passages DME sans BL')} value={sansBl} color={sansBl ? 'var(--warning)' : 'var(--success)'} sub={t('{{n}} BL sans trace DME', { n: sansDme })} />
              </div>

              <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginBottom: 10 }}>
                {t('Comptes Sage utilisés : {{c}}', { c: data.comptes.map((c) => `${c.compte}${c.etat === 'propose' ? ' (' + t('proposé') + ')' : ''}`).join(', ') || '—' })}
                {' · '}
                {data.dmePatients.length ? t('Dossier(s) DME : {{d}}', { d: data.dmePatients.map((p) => p.dossier).join(', ') }) : t('Aucun dossier trouvé dans le DME')}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                {FILTERS.map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id)} style={chip(filter === id)}>{t(label)}</button>)}
                {familles.length > 0 && (
                  <select value={personne} onChange={(e) => setPersonne(e.target.value)} style={{ marginLeft: 'auto', height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 12.5 }}>
                    <option value="">{t('Agent et famille')}</option>
                    <option value="agent">{t('Agent seulement')}</option>
                    {familles.map(([k, p]) => <option key={k} value={k}>{t('Famille : {{n}}', { n: p.nom })}</option>)}
                  </select>
                )}
              </div>
              {filter === 'controle' && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 6 }}>{t('Passages au DME sans BL, et BL pas encore facturés.')}</div>}

              {byMonth.map(([m, list]) => (
                <div key={m} style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--fg-muted)', padding: '4px 0' }}>{m ? monthLabel(m) : '—'} <span style={{ fontWeight: 400 }}>({list.length})</span></div>
                  {list.map((e) => <EventRow key={e.id} e={e} personnes={data.personnes} t={t} />)}
                </div>
              ))}
              {!events.length && <div style={{ padding: 30, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>{t('Rien sur cette période.')}</div>}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
