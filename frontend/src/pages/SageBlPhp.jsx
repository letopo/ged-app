// frontend/src/pages/SageBlPhp.jsx
// Finances › BL PHP en attente de facturation.
// Lecture directe de Sage (rien n'est importé dans la GED) : BL des employés et
// familles PHP pas encore transformés en facture, regroupés en BPC de 3 jours
// (BPC en cours = Date Entrée du Malade → +2 jours). Onglet « Contrôle des
// 3 jours » : factures qui regroupent des BL au-delà de la durée d'un BPC.
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, RefreshCw, Download, Search, ChevronDown, ChevronRight, AlertCircle, Shield, X, Users, Clock, FileWarning, Hourglass } from 'lucide-react';
import toast from 'react-hot-toast';
import { sageBlAPI } from '../services/phpService';

const fmtMoney = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
const fmtMoneyShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1e6) return `${(v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M FCFA`;
  if (v >= 1e3) return `${Math.round(v / 1e3).toLocaleString('fr-FR')} k FCFA`;
  return fmtMoney(v);
};
const fmtDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const PAGE_SIZE = 50;

const STATUS = {
  in_progress: { label: 'BPC en cours', color: 'var(--brand)', bg: 'var(--brand-soft)' },
  to_invoice:  { label: 'À facturer',   color: 'var(--warning)', bg: 'var(--warning-soft)' },
  late:        { label: 'En retard',    color: 'var(--danger)', bg: 'var(--danger-soft)' },
};

function StatusBadge({ b, t }) {
  const s = STATUS[b.status];
  const detail = b.status === 'in_progress'
    ? t('J{{n}} sur 3', { n: b.jour })
    : t('BPC terminé depuis {{n}} j', { n: b.joursDepuisFin });
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ alignSelf: 'flex-start', padding: '2px 8px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: s.color, background: s.bg, whiteSpace: 'nowrap' }}>{t(s.label)}</span>
      <span style={{ fontSize: 11, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>{detail}</span>
    </span>
  );
}

const TypeBadge = ({ type, t }) => (type ? (
  <span style={{ padding: '1px 7px', borderRadius: 999, fontSize: 11, whiteSpace: 'nowrap', background: type === 'Employé PHP' ? 'var(--brand-soft)' : 'var(--success-soft)', color: type === 'Employé PHP' ? 'var(--brand)' : 'var(--success)' }}>{t(type)}</span>
) : null);

function Kpi({ icon: Icon, label, value, sub, color = 'var(--fg)', active, onClick }) {
  return (
    <button type="button" onClick={onClick} className="ged-card" style={{ textAlign: 'left', padding: '14px 16px', minWidth: 0, cursor: onClick ? 'pointer' : 'default', border: active ? '1.5px solid var(--brand)' : undefined, background: 'var(--surface)', font: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)', fontWeight: 500, marginBottom: 6 }}>
        <Icon size={14} style={{ color }} /> {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>{sub}</div>}
    </button>
  );
}

// Détail d'un BPC : ses BL et leurs actes (chargés à l'ouverture)
function BpcDetail({ bpc, t }) {
  const [lines, setLines] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    sageBlAPI.lines(bpc.bl.map(b => b.piece))
      .then(r => setLines(r.data.lines))
      .catch(e => setError(e.response?.data?.message || t('Actes indisponibles')));
  }, [bpc.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const p = bpc.patient;
  return (
    <div style={{ padding: '12px 16px 16px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>
        <span>{t('Compte tiers')} : <strong style={{ color: 'var(--fg)' }}>{p.compteTiers}</strong></span>
        {p.matricule && <span>{t('Matricule')} : <strong style={{ color: 'var(--fg)' }}>{p.matricule}</strong></span>}
        {p.nomAssure && <span>{t('Assuré')} : <strong style={{ color: 'var(--fg)' }}>{p.nomAssure}</strong></span>}
        {p.secteur && <span>{t('Secteur')} : <strong style={{ color: 'var(--fg)' }}>{p.secteur}</strong></span>}
        <span>{t('Date d’entrée (Sage)')} : <strong style={{ color: 'var(--fg)' }}>{fmtDate(p.dateEntree)}</strong></span>
        {p.plafond && <span style={{ color: bpc.depassePlafond ? 'var(--danger)' : undefined }}>{t('Plafond')} : <strong>{fmtMoney(p.plafond)}</strong></span>}
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>}
      {!lines && !error && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}><Loader size={13} className="animate-spin" style={{ verticalAlign: -2 }} /> {t('Chargement des actes…')}</div>}
      {lines && bpc.bl.map(b => {
        const actes = lines.filter(l => l.piece === b.piece);
        return (
          <div key={b.piece} style={{ marginBottom: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, padding: '7px 10px', fontSize: 12.5, background: 'var(--surface-2)' }}>
              <span><strong style={{ fontFamily: 'var(--font-mono)' }}>{b.piece}</strong> · {fmtDate(b.date)}{b.service ? ` · ${b.service}` : ''}</span>
              <strong>{fmtMoney(b.montant)}</strong>
            </div>
            {actes.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 10px', fontSize: 12, borderTop: '1px solid var(--border)' }}>
                <span style={{ flex: 1, minWidth: 0 }}>{a.designation}</span>
                <span style={{ color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{a.quantite} × {Number(a.prixUnitaire).toLocaleString('fr-FR')}</span>
                <span style={{ whiteSpace: 'nowrap', minWidth: 80, textAlign: 'right' }}>{Number(a.montant).toLocaleString('fr-FR')}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// Accès (superadmin) : postes autorisés à voir ce tableau de bord
function AccessModal({ onClose, t }) {
  const [data, setData] = useState(null);
  const [sel, setSel] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { sageBlAPI.access().then(r => { setData(r.data); setSel(r.data.allowed); }); }, []);
  const save = async () => {
    setSaving(true);
    try { await sageBlAPI.updateAccess(sel); toast.success(t('Accès mis à jour.')); onClose(); }
    catch (e) { toast.error(e.response?.data?.message || t('Erreur')); }
    finally { setSaving(false); }
  };
  return (
    <div className="da-modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div className="da-modal" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: 'var(--surface)', borderRadius: 'var(--radius-4)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-3)', padding: 20, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <strong style={{ fontSize: 15 }}>{t('Qui peut voir ce tableau de bord ?')}</strong>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--fg-muted)', margin: '0 0 12px' }}>{t('Le superadmin y a toujours accès. Cochez les postes autorisés ; les titulaires se gèrent dans Administration › Postes & Fonctions.')}</p>
        {!data ? <Loader size={18} className="animate-spin" /> : (
          <div style={{ maxHeight: '50vh', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)' }}>
            {data.postes.map(p => (
              <label key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={sel.includes(p.code)} onChange={e => setSel(v => e.target.checked ? [...v, p.code] : v.filter(c => c !== p.code))} style={{ accentColor: 'var(--brand)' }} />
                {p.label} <span style={{ color: 'var(--fg-subtle)', fontSize: 11.5 }}>({p.code})</span>
              </label>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={{ height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}>{t('Annuler')}</button>
          <button onClick={save} disabled={saving || !data} style={{ height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {saving && <Loader size={13} className="animate-spin" />}{t('Enregistrer')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ControlTab({ t }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setData(null); setError(null);
    sageBlAPI.controle(days).then(r => setData(r.data)).catch(e => setError(e.response?.data?.message || t('Erreur')));
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps
  const pct = data?.factures ? Math.round((data.horsDelai.length / data.factures) * 100) : 0;
  return (
    <div className="ged-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', maxWidth: 680 }}>
          {data
            ? t('{{n}} facture(s) sur {{total}} ({{p}} %) regroupent des BL espacés de plus de 3 jours, alors qu’un BPC ne couvre que 3 jours.', { n: data.horsDelai.length, total: data.factures, p: pct })
            : t('Factures PHP qui regroupent des BL espacés de plus de 3 jours.')}
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ height: 32, padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}>
          {[7, 30, 90, 365].map(d => <option key={d} value={d}>{t('{{count}} derniers jours', { count: d })}</option>)}
        </select>
      </div>
      {error && <div style={{ padding: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
      {!data && !error && <div style={{ padding: 30, textAlign: 'center' }}><Loader size={20} className="animate-spin" /></div>}
      {data && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead><tr style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)', textAlign: 'left' }}>
              {['Facture', 'Date', 'Patient', 'BL', 'Période des BL', 'Écart', 'Montant'].map(h => <th key={h} style={{ padding: '8px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{t(h)}</th>)}
            </tr></thead>
            <tbody>
              {data.horsDelai.map(f => (
                <tr key={f.piece} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}><span style={{ fontFamily: 'var(--font-mono)' }}>{f.piece}</span><div style={{ fontSize: 11, color: f.comptabilisee ? 'var(--fg-subtle)' : 'var(--warning)' }}>{f.comptabilisee ? t('Comptabilisée') : t('Non comptabilisée')}</div></td>
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{fmtDate(f.date)}</td>
                  <td style={{ padding: '7px 12px' }}>{f.patient.nom} <TypeBadge type={f.patient.type} t={t} /><div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{f.patient.compteTiers}</div></td>
                  <td style={{ padding: '7px 12px' }}>{f.nbBl}</td>
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{fmtDate(f.premierBl)} → {fmtDate(f.dernierBl)}</td>
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap', fontWeight: 600, color: f.ecartJours > 30 ? 'var(--danger)' : 'var(--warning)' }}>{t('{{n}} j', { n: f.ecartJours })}</td>
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap', textAlign: 'right' }}>{fmtMoney(f.total)}</td>
                </tr>
              ))}
              {!data.horsDelai.length && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)' }}>{t('Toutes les factures respectent la durée du BPC.')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SageBlPhp() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('bpc');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [service, setService] = useState('all');
  const [secteur, setSecteur] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [page, setPage] = useState(1);
  const [canEditAccess, setCanEditAccess] = useState(false);
  const [showAccess, setShowAccess] = useState(false);

  const load = async (refresh = false) => {
    setLoading(true); setError(null);
    try { const r = await sageBlAPI.summary(refresh); setData(r.data); }
    catch (e) { setError(e.response?.data?.message || t('Impossible de lire Sage.')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); sageBlAPI.access().then(r => setCanEditAccess(r.data.canEdit)).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bpcs = data?.bpcs || [];
  const services = useMemo(() => [...new Set(bpcs.flatMap(b => b.services))].sort(), [bpcs]);
  const secteurs = useMemo(() => [...new Set(bpcs.map(b => b.patient.secteur).filter(Boolean))].sort(), [bpcs]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const order = { to_invoice: 0, late: 1, in_progress: 2 };
    return bpcs.filter(b =>
      (status === 'all' || b.status === status)
      && (type === 'all' || b.patient.type === type)
      && (service === 'all' || b.services.includes(service))
      && (secteur === 'all' || b.patient.secteur === secteur)
      && (!needle || [b.patient.nom, b.patient.compteTiers, b.patient.matricule, b.patient.nomAssure, ...b.bl.map(x => x.piece)].some(v => (v || '').toLowerCase().includes(needle))))
      .sort((a, c) => order[a.status] - order[c.status] || a.joursDepuisFin - c.joursDepuisFin || c.total - a.total);
  }, [bpcs, status, type, service, secteur, q]);
  useEffect(() => { setPage(1); setOpen(null); }, [status, type, service, secteur, q]);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const k = data?.kpis;

  const exportCsv = () => {
    const rows = [[t('Patient'), t('Compte tiers'), t('Type'), t('Matricule'), t('Assuré'), t('Secteur'), t('Début BPC'), t('Fin BPC'), t('État'), t('Jours depuis la fin'), t('BL'), t('Services'), t('Montant TTC')]];
    filtered.forEach(b => rows.push([b.patient.nom, b.patient.compteTiers, b.patient.type || '', b.patient.matricule || '', b.patient.nomAssure || '', b.patient.secteur || '', fmtDate(b.start), fmtDate(b.end), t(STATUS[b.status].label), b.joursDepuisFin, b.bl.map(x => x.piece).join(' '), b.services.join(' '), b.total]));
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `bl-php-en-attente-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const sel = { height: 34, padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, maxWidth: '100%' };
  const btn = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, cursor: 'pointer' };

  return (
    <div className="stats-page animate-pageFade">
      <div className="stats-header">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 4px' }}>{t('BL PHP en attente de facturation')}</h1>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            {t('Actes des employés et familles PHP pas encore facturés, regroupés par Bon de Prise en Charge (3 jours). Lecture directe de Sage.')}
            {data?.generatedAt && <> · {t('Mis à jour à {{h}}', { h: new Date(data.generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) })}</>}
          </div>
        </div>
        <div className="stats-actions" style={{ flexWrap: 'wrap' }}>
          {canEditAccess && <button style={btn} onClick={() => setShowAccess(true)}><Shield size={14} /> {t('Accès')}</button>}
          <button style={btn} onClick={exportCsv} disabled={!filtered.length}><Download size={14} /> {t('Exporter')}</button>
          <button style={btn} onClick={() => load(true)} disabled={loading}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t('Actualiser')}</button>
        </div>
      </div>

      {error && <div className="ged-card" style={{ padding: 16, marginBottom: 16, color: 'var(--danger)', display: 'flex', gap: 8, alignItems: 'center' }}><AlertCircle size={16} /> {error}</div>}
      {!data && loading && <div style={{ padding: 60, textAlign: 'center' }}><Loader size={24} className="animate-spin" color="var(--fg-muted)" /></div>}

      {k && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 14 }}>
            <Kpi icon={Users} label={t('BL en attente')} value={k.bl.toLocaleString('fr-FR')} sub={`${fmtMoneyShort(k.montant)} · ${t('{{n}} patients', { n: k.patients.toLocaleString('fr-FR') })}`} active={status === 'all'} onClick={() => setStatus('all')} />
            <Kpi icon={Hourglass} label={t('BPC en cours')} value={k.enCours.bpc} sub={fmtMoneyShort(k.enCours.montant)} color="var(--brand)" active={status === 'in_progress'} onClick={() => setStatus('in_progress')} />
            <Kpi icon={Clock} label={t('À facturer')} value={k.aFacturer.bpc} sub={`${fmtMoneyShort(k.aFacturer.montant)} · ${t('BPC terminé')}`} color="var(--warning)" active={status === 'to_invoice'} onClick={() => setStatus('to_invoice')} />
            <Kpi icon={FileWarning} label={t('En retard (> 30 j)')} value={k.enRetard.bpc} sub={fmtMoneyShort(k.enRetard.montant)} color="var(--danger)" active={status === 'late'} onClick={() => setStatus('late')} />
          </div>

          {/* Ancienneté des montants non facturés */}
          <div className="ged-card" style={{ padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 8 }}>{t('Ancienneté des montants non facturés')}</div>
            <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: 'var(--surface-3)' }}>
              {k.anciennete.map((a, i) => a.montant ? <div key={a.label} title={`${a.label} : ${fmtMoney(a.montant)}`} style={{ width: `${(a.montant / k.montant) * 100}%`, background: ['var(--brand)', 'var(--warning)', '#f97316', 'var(--danger)'][i] }} /> : null)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px', marginTop: 8, fontSize: 12, color: 'var(--fg-muted)' }}>
              {k.anciennete.map((a, i) => (
                <span key={a.label}><span style={{ color: ['var(--brand)', 'var(--warning)', '#f97316', 'var(--danger)'][i] }}>●</span> {t(a.label)} : <strong style={{ color: 'var(--fg)' }}>{fmtMoneyShort(a.montant)}</strong> ({t('{{n}} BL', { n: a.bl })})</span>
              ))}
              {k.parType.map(p => <span key={p.type} style={{ marginLeft: 'auto' }}>{t(p.type)} : <strong style={{ color: 'var(--fg)' }}>{fmtMoneyShort(p.montant)}</strong></span>)}
            </div>
          </div>

          {/* Onglets */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
            {[['bpc', t('BPC en attente')], ['controle', t('Contrôle des 3 jours')]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{ padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: tab === id ? 650 : 500, color: tab === id ? 'var(--brand)' : 'var(--fg-muted)', borderBottom: `2px solid ${tab === id ? 'var(--brand)' : 'transparent'}`, marginBottom: -1 }}>{label}</button>
            ))}
          </div>

          {tab === 'controle' ? <ControlTab t={t} /> : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Patient, compte tiers, matricule, assuré, n° de BL…')} style={{ ...sel, width: '100%', paddingLeft: 30, boxSizing: 'border-box' }} />
                </div>
                <select value={status} onChange={e => setStatus(e.target.value)} style={sel}>
                  <option value="all">{t('Tous les états')}</option>
                  {Object.entries(STATUS).map(([id, s]) => <option key={id} value={id}>{t(s.label)}</option>)}
                </select>
                <select value={type} onChange={e => setType(e.target.value)} style={sel}>
                  <option value="all">{t('Employés et familles')}</option>
                  <option value="Employé PHP">{t('Employé PHP')}</option>
                  <option value="Famille PHP">{t('Famille PHP')}</option>
                </select>
                <select value={service} onChange={e => setService(e.target.value)} style={sel}>
                  <option value="all">{t('Tous les services')}</option>
                  {services.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={secteur} onChange={e => setSecteur(e.target.value)} style={sel}>
                  <option value="all">{t('Tous les secteurs')}</option>
                  {secteurs.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="ged-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', fontSize: 12.5, color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)' }}>
                  {t('{{n}} BPC · {{bl}} BL · {{m}}', { n: filtered.length.toLocaleString('fr-FR'), bl: filtered.reduce((s, b) => s + b.bl.length, 0).toLocaleString('fr-FR'), m: fmtMoney(filtered.reduce((s, b) => s + b.total, 0)) })}
                </div>
                {pageItems.map(b => (
                  <Fragment key={b.id}>
                    <button type="button" onClick={() => setOpen(open === b.id ? null : b.id)} className="blphp-row">
                      <span style={{ color: 'var(--fg-subtle)', display: 'flex' }}>{open === b.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                      <span className="blphp-patient">
                        <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{b.patient.nom}</span> <TypeBadge type={b.patient.type} t={t} />
                        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--fg-subtle)' }}>
                          {b.patient.compteTiers}{b.patient.matricule ? ` · ${t('Mat.')} ${b.patient.matricule}` : ''}{b.patient.secteur ? ` · ${b.patient.secteur}` : ''}
                          {b.patient.type === 'Famille PHP' && b.patient.nomAssure ? ` · ${t('Assuré')} : ${b.patient.nomAssure}` : ''}
                        </span>
                      </span>
                      <span className="blphp-period">{fmtDate(b.start)} → {fmtDate(b.end)}</span>
                      <span className="blphp-status"><StatusBadge b={b} t={t} /></span>
                      <span className="blphp-services">
                        {t('{{n}} BL', { n: b.bl.length })}{b.services.length ? ` · ${b.services.slice(0, 3).join(', ')}${b.services.length > 3 ? '…' : ''}` : ''}
                      </span>
                      <span className="blphp-amount" style={{ color: b.depassePlafond ? 'var(--danger)' : 'var(--fg)' }}>{fmtMoney(b.total)}</span>
                    </button>
                    {open === b.id && <BpcDetail bpc={b} t={t} />}
                  </Fragment>
                ))}
                {!filtered.length && <div style={{ padding: 30, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>{t('Aucun BPC ne correspond.')}</div>}
                {pages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12.5, color: 'var(--fg-muted)' }}>
                    <span>{t('Page {{page}} sur {{pages}}', { page, pages })}</span>
                    <span style={{ display: 'flex', gap: 6 }}>
                      <button style={btn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('Précédent')}</button>
                      <button style={btn} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>{t('Suivant')}</button>
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
      {showAccess && <AccessModal onClose={() => setShowAccess(false)} t={t} />}
    </div>
  );
}
