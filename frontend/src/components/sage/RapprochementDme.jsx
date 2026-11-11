// frontend/src/components/sage/RapprochementDme.jsx
// Finances › BL PHP › onglet « Rapprochement DME » (étape 2 de la liasse PHP,
// 11/11/2026) : pour chaque BL PHP de Sage d'une période, le patient du DME qui
// a le même compte tiers. Sert à vérifier le rapprochement avant d'aller
// chercher les ordonnances et bulletins d'examens du patient.
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { Loader, Search, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import Pagination, { usePageSize } from '../Pagination';
import { sageBlAPI } from '../../services/phpService';

const STATUTS = {
  trouve:        { label: 'Trouvé',               color: 'var(--success)', bg: 'var(--success-soft)', aide: 'Un seul patient du DME a ce compte tiers et son nom correspond.' },
  trouve_nom:    { label: 'Trouvé par le nom',    color: 'var(--success)', bg: 'var(--success-soft)', aide: 'Plusieurs patients du DME ont ce compte tiers ; le nom du client Sage a permis de choisir.' },
  nom_different: { label: 'Nom différent',        color: 'var(--warning)', bg: 'var(--warning-soft)', aide: 'Un seul patient du DME a ce compte tiers, mais son nom ne ressemble pas au nom du client Sage : à vérifier.' },
  plusieurs:     { label: 'Plusieurs patients',   color: 'var(--warning)', bg: 'var(--warning-soft)', aide: 'Plusieurs patients du DME ont ce compte tiers et le nom ne suffit pas à choisir.' },
  absent:        { label: 'Absent du DME',        color: 'var(--danger)',  bg: 'var(--danger-soft)',  aide: 'Aucun patient du DME n’a ce compte tiers (compte non saisi dans le DME, ou saisi autrement).' },
};

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const fmtDate = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR') : '—');
const fmtMoney = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
const nomPatient = (p) => [p?.nom, p?.prenom].filter(Boolean).join(' ');

const Badge = ({ statut, t }) => {
  const s = STATUTS[statut];
  return <span title={t(s.aide)} style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: s.color, background: s.bg, whiteSpace: 'nowrap' }}>{t(s.label)}</span>;
};

export default function RapprochementDme({ t }) {
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(iso(new Date()));
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtre, setFiltre] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('rapprochement-dme', 25);

  const load = () => {
    setLoading(true); setError(null);
    sageBlAPI.dme(from, to)
      .then((r) => { setData(r.data); setPage(1); })
      .catch((e) => setError(e.response?.data?.message || t('Erreur')))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.rows || []).filter((r) => (!filtre || r.statut === filtre) && (!q
      || [r.bl, r.compte, r.nomSage, r.facture, r.patient?.dossier, nomPatient(r.patient)].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [data, filtre, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);
  const r = data?.resume;
  const input = { height: 32, padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13 };
  const th = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
  const td = { padding: '8px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'top' };

  return (
    <div className="ged-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', flex: '1 1 320px' }}>
          {t('Pour chaque BL PHP de Sage (facturé ou non), le patient du DME qui a le même compte tiers. Étape préalable pour joindre ses ordonnances et bulletins d’examens à la liasse.')}
        </div>
        <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>{t('Du')} <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={input} /></label>
        <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>{t('au')} <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={input} /></label>
        <button type="button" onClick={load} disabled={loading} style={{ ...input, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
          {loading ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />} {t('Afficher')}
        </button>
      </div>

      {error && <div style={{ padding: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
      {!data && !error && <div style={{ padding: 30, textAlign: 'center' }}><Loader size={20} className="animate-spin" /></div>}

      {r && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <button type="button" onClick={() => { setFiltre(''); setPage(1); }} style={{ ...input, cursor: 'pointer', fontWeight: !filtre ? 650 : 500, borderColor: !filtre ? 'var(--brand)' : 'var(--border)' }}>
              {t('Tous')} · {r.total}
            </button>
            {Object.keys(STATUTS).map((k) => (
              <button key={k} type="button" title={t(STATUTS[k].aide)} onClick={() => { setFiltre(filtre === k ? '' : k); setPage(1); }}
                style={{ ...input, cursor: 'pointer', fontWeight: filtre === k ? 650 : 500, borderColor: filtre === k ? STATUTS[k].color : 'var(--border)', color: STATUTS[k].color }}>
                {t(STATUTS[k].label)} · {r[k]}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 13 }}>
              {t('Rapprochés')} : <strong style={{ color: r.taux >= 80 ? 'var(--success)' : 'var(--warning)' }}>{r.rapproches} / {r.total} ({r.taux} %)</strong>
            </span>
          </div>

          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 26, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t('Rechercher : BL, facture, compte tiers, nom, n° de dossier…')}
              style={{ ...input, width: '100%', paddingLeft: 30, boxSizing: 'border-box' }} />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead><tr>
                <th style={th}>{t('Date')}</th><th style={th}>{t('BL')}</th><th style={th}>{t('Client Sage')}</th>
                <th style={th}>{t('Patient du DME')}</th><th style={th}>{t('Statut')}</th><th style={{ ...th, textAlign: 'right' }}>{t('Montant')}</th>
              </tr></thead>
              <tbody>
                {shown.map((row) => {
                  const key = `${row.bl}|${row.compte}`;
                  const canOpen = row.candidats.length > 1;
                  return (
                    <Fragment key={key}>
                      <tr onClick={() => canOpen && setOpen(open === key ? null : key)} style={{ cursor: canOpen ? 'pointer' : 'default' }}>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(row.date)}</td>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{row.bl}</span>
                          <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{row.facture ? t('Facture {{n}}', { n: row.facture }) : t('Non facturé')}</div>
                        </td>
                        <td style={td}>
                          {row.nomSage}
                          <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>{row.compte}{row.type ? ` · ${t(row.type)}` : ''}</div>
                        </td>
                        <td style={td}>
                          {row.patient ? (
                            <>
                              {nomPatient(row.patient)}
                              <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{t('Dossier {{n}}', { n: row.patient.dossier || '—' })}{row.patient.naissance ? ` · ${t('né(e) le {{d}}', { d: fmtDate(row.patient.naissance) })}` : ''}</div>
                            </>
                          ) : canOpen ? (
                            <span style={{ color: 'var(--fg-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {open === key ? <ChevronDown size={13} /> : <ChevronRight size={13} />} {t('{{n}} patients sur ce compte', { n: row.candidats.length })}
                            </span>
                          ) : <span style={{ color: 'var(--fg-subtle)' }}>—</span>}
                        </td>
                        <td style={td}><Badge statut={row.statut} t={t} /></td>
                        <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtMoney(row.montant)}</td>
                      </tr>
                      {open === key && (
                        <tr><td colSpan={6} style={{ ...td, background: 'var(--surface-2, var(--bg))', padding: '8px 16px 10px 40px' }}>
                          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>{t('Patients du DME avec le compte {{c}} :', { c: row.compte })}</div>
                          {row.candidats.map((c) => (
                            <div key={c.id} style={{ fontSize: 12.5, padding: '2px 0', fontWeight: row.patient?.id === c.id ? 650 : 400 }}>
                              {nomPatient(c)} · {t('Dossier {{n}}', { n: c.dossier || '—' })}{c.naissance ? ` · ${fmtDate(c.naissance)}` : ''}{c.typeClient ? ` · ${c.typeClient}` : ''}
                              {!c.actif && <span style={{ color: 'var(--fg-subtle)' }}> · {t('inactif')}</span>}
                            </div>
                          ))}
                        </td></tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {!filtered.length && <div style={{ padding: 30, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>{t('Aucun BL ne correspond.')}</div>}
          </div>
          <Pagination page={page} totalPages={pages} total={filtered.length} pageSize={pageSize}
            onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
            style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }} />
        </>
      )}
    </div>
  );
}
