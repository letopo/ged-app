// frontend/src/pages/BonsCommande.jsx
// Finances › Bons de commande (12/11/2026) : le bon est préparé dans Sage (BCF ou
// BLF) ; ici on saisit son numéro (ou on le choisit dans la liste), la GED le lit
// dans Sage, montre le même document que l'impression Sage et l'envoie en
// signature : Émetteur → DG ou DGA → Comptable (pour paiement).
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader, ShoppingCart, Search, Eye, Send, FileCheck, RefreshCw } from 'lucide-react';
import { bonsCommandeAPI } from '../services/phpService';
import { showPdfPreview } from '../components/PdfPreviewModal';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const fmtDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR') : '—');
const isoAgo = (n) => new Date(Date.now() + 3600 * 1000 - n * 86_400_000).toISOString().slice(0, 10);
const DOC_STATUS = { approved: 'Signé', rejected: 'Refusé' };
const input = { height: 36, padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 14, minWidth: 0 };
const btn = (primary, disabled) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 'var(--radius-2)', fontSize: 13.5, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, border: primary ? 'none' : '1px solid var(--border)', background: primary ? 'var(--brand)' : 'var(--surface)', color: primary ? '#fff' : 'var(--fg)', whiteSpace: 'nowrap' });
const label = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg-muted)', minWidth: 0 };
const errMsg = (e, t) => e.response?.data?.message || t('Erreur serveur.');

function DocBadge({ doc, t }) {
  if (!doc) return <span style={{ color: 'var(--fg-subtle)' }}>{t('Pas envoyé')}</span>;
  const color = doc.status === 'approved' ? 'var(--success)' : doc.status === 'rejected' ? 'var(--danger)' : 'var(--brand)';
  return <span style={{ color, fontWeight: 600 }}>{t(DOC_STATUS[doc.status] || 'En signature')}</span>;
}

// ── Une pièce : contenu lu dans Sage + envoi en signature ────────────────────
function Piece({ piece, onSent, t }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selections, setSelections] = useState({});
  const [sending, setSending] = useState(false);
  const load = () => { setData(null); setError(null); bonsCommandeAPI.get(piece).then((r) => setData(r.data)).catch((e) => setError(errMsg(e, t))); };
  useEffect(() => { load(); }, [piece]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="ged-card" style={{ padding: 14, color: 'var(--danger)', fontSize: 13.5 }}>{error}</div>;
  if (!data) return <div className="ged-card" style={{ padding: 30, textAlign: 'center' }}><Loader size={18} className="animate-spin" /></div>;
  const { bc, circuit, deja } = data;
  const steps = circuit?.steps || [];
  const enCours = deja.find((d) => d.status !== 'rejected');
  const missing = steps.some((s) => s.needsSelection && !selections[s.key]);
  const canSend = bc.lignes.length > 0 && !circuit?.error && !missing && !sending;
  const apercu = () => showPdfPreview({ title: `${bc.typeLabel} ${bc.piece}`, fileName: `${bc.piece}.pdf`, load: () => bonsCommandeAPI.pdf(bc.piece).then((r) => r.data) });
  const send = async (force = false) => {
    setSending(true);
    try {
      const r = await bonsCommandeAPI.send(bc.piece, { selections, force });
      toast.success(r.data.message, { duration: 6000 });
      onSent?.();
      navigate(`/documents/${r.data.documentId}`);
    } catch (e) { toast.error(errMsg(e, t)); } finally { setSending(false); }
  };
  const th = { padding: '7px 8px', fontSize: 11.5, fontWeight: 600, color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'left' };
  const td = { padding: '7px 8px', borderBottom: '1px solid var(--border)', fontSize: 13 };
  const num = { ...td, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="ged-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t(bc.typeLabel)}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{bc.piece}</div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
              {fmtDate(bc.date)} · {t('Dépôt')} {bc.depot.intitule || bc.depot.numero}{bc.emetteur ? ` · ${t('Émetteur Sage')} : ${bc.emetteur}` : ''}{bc.reference ? ` · ${t('Réf.')} ${bc.reference}` : ''}
            </div>
          </div>
          <div style={{ minWidth: 200 }}>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('Fournisseur')}</div>
            <div style={{ fontWeight: 650 }}>{bc.fournisseur.intitule || bc.fournisseur.numero}</div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>{[bc.fournisseur.numero, bc.fournisseur.contact].filter(Boolean).join(' · ')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('Net à payer')}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--brand)' }}>{fmt(bc.totaux.netAPayer)} <span style={{ fontSize: 12 }}>FCFA</span></div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>{t('Référence')}</th><th style={th}>{t('Désignation')}</th>
              <th style={{ ...th, textAlign: 'right' }}>{t('Qté')}</th><th style={th}>{t('Condition.')}</th>
              <th style={{ ...th, textAlign: 'right' }}>{t('P.U. H.T.')}</th><th style={{ ...th, textAlign: 'right' }}>{t('Rem.')}</th>
              <th style={{ ...th, textAlign: 'right' }}>{t('Montant TTC')}</th>
            </tr></thead>
            <tbody>
              {bc.lignes.map((l, i) => (
                <tr key={i}>
                  <td style={{ ...td, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{l.reference}</td><td style={td}>{l.designation}</td>
                  <td style={num}>{l.quantite ? fmt(l.quantite) : ''}</td><td style={td}>{l.conditionnement}</td>
                  <td style={num}>{l.prixUnitaire ? fmt(l.prixUnitaire) : ''}</td><td style={num}>{l.remise}</td>
                  <td style={{ ...num, fontWeight: 600 }}>{l.montantTTC ? fmt(l.montantTTC) : ''}</td>
                </tr>
              ))}
              {!bc.lignes.length && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: 'var(--danger)' }}>{t('Aucune ligne dans Sage.')}</td></tr>}
            </tbody>
            <tfoot><tr style={{ fontWeight: 700 }}>
              <td colSpan={5} style={{ padding: '8px', textAlign: 'right' }}>{t('Total remise')} : {fmt(bc.totaux.totalRemise)}</td>
              <td colSpan={2} style={{ padding: '8px', textAlign: 'right' }}>{t('NET A PAYER')} : {fmt(bc.totaux.netAPayer)}</td>
            </tr></tfoot>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={apercu} style={btn(false)}><Eye size={14} /> {t('Aperçu PDF')}</button>
          <button type="button" onClick={load} style={btn(false)}><RefreshCw size={14} /> {t('Relire dans Sage')}</button>
        </div>
      </div>

      <div className="ged-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <strong style={{ fontSize: 14 }}>{t('Envoyer en signature')}</strong>
        {deja.length > 0 && (
          <div style={{ fontSize: 12.5, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {deja.map((d) => (
              <a key={d.id} href={`/documents/${d.id}`} style={{ color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <FileCheck size={13} /> {t('Envoyé le {{d}}', { d: new Date(d.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) })} · <DocBadge doc={d} t={t} />
              </a>
            ))}
          </div>
        )}
        {circuit?.error ? <div style={{ color: 'var(--danger)', fontSize: 13 }}>{circuit.error}</div> : (
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {enCours ? (
            <>
              <span style={{ fontSize: 13, color: 'var(--warning)' }}>{t('Ce bon est déjà en signature.')}</span>
              <button type="button" onClick={() => send(true)} disabled={!canSend} style={btn(false, !canSend)}>{t('Renvoyer quand même (bon modifié dans Sage)')}</button>
            </>
          ) : (
            <button type="button" onClick={() => send(false)} disabled={!canSend} style={btn(true, !canSend)}>
              {sending ? <Loader size={14} className="animate-spin" /> : <Send size={14} />} {t('Envoyer le bon en signature')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BonsCommande() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const piece = params.get('piece') || '';
  const [saisie, setSaisie] = useState(piece);
  const [from, setFrom] = useState(isoAgo(14));
  const [to, setTo] = useState(isoAgo(0));
  const [depot, setDepot] = useState('');
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(false);
  const loadList = () => {
    setLoading(true);
    bonsCommandeAPI.list({ from, to, depot: depot || undefined, q: q || undefined })
      .then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e, t))).finally(() => setLoading(false));
  };
  useEffect(() => { loadList(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const open = (p) => { const v = String(p || '').trim().toUpperCase(); setSaisie(v); setParams(v ? { piece: v } : {}); };
  const th = { padding: '7px 8px', fontSize: 11.5, fontWeight: 600, color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'left' };
  const td = { padding: '7px 8px', borderBottom: '1px solid var(--border)', fontSize: 13, whiteSpace: 'nowrap' };

  return (
    <div className="animate-pageFade" style={{ maxWidth: 1000, margin: '0 auto', padding: '8px 4px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}><ShoppingCart size={20} /> {t('Bons de commande')}</h1>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Préparez le bon dans Sage et enregistrez-le, puis saisissez son numéro ici : la GED le lit dans Sage et l’envoie en signature (vous → DG ou DGA → Comptable).')}</div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); open(saisie); }} className="ged-card" style={{ padding: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        <label style={{ ...label, flex: 1, minWidth: 200 }}>{t('Numéro de la pièce Sage')}
          <input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="BCF0000003331" style={{ ...input, textTransform: 'uppercase', fontSize: 15 }} autoFocus />
        </label>
        <button type="submit" disabled={!saisie.trim()} style={btn(true, !saisie.trim())}><Search size={14} /> {t('Afficher')}</button>
      </form>

      {piece && <Piece key={piece} piece={piece} onSent={loadList} t={t} />}

      <div className="ged-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <strong style={{ fontSize: 14, marginRight: 'auto' }}>{t('Pièces d’achat récentes dans Sage')}</strong>
          <label style={label}>{t('Du')}<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...input, height: 32 }} /></label>
          <label style={label}>{t('Au')}<input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...input, height: 32 }} /></label>
          <label style={label}>{t('Dépôt')}
            <select value={depot} onChange={(e) => setDepot(e.target.value)} style={{ ...input, height: 32 }}>
              <option value="">{t('Tous')}</option>
              {(list?.depots || []).map((d) => <option key={d.numero} value={d.numero}>{d.intitule}</option>)}
            </select>
          </label>
          <label style={label}>{t('N° ou fournisseur')}<input value={q} onChange={(e) => setQ(e.target.value)} style={{ ...input, height: 32, width: 150 }} /></label>
          <button type="button" onClick={loadList} style={{ ...btn(false), height: 32 }}>{loading ? <Loader size={14} className="animate-spin" /> : t('Afficher')}</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>{t('Date')}</th><th style={th}>{t('Pièce')}</th><th style={th}>{t('Fournisseur')}</th><th style={th}>{t('Dépôt')}</th>
              <th style={{ ...th, textAlign: 'right' }}>{t('Montant')}</th><th style={th}>{t('Signature')}</th>
            </tr></thead>
            <tbody>
              {(list?.pieces || []).map((p) => (
                <tr key={p.piece} onClick={() => open(p.piece)} style={{ cursor: 'pointer', background: p.piece === piece ? 'var(--brand-soft)' : undefined }}>
                  <td style={td}>{fmtDate(p.date)}</td>
                  <td style={td}><strong>{p.piece}</strong> <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>{p.type === 13 ? t('réception') : t('commande')}</span></td>
                  <td style={{ ...td, whiteSpace: 'normal' }}>{p.fournisseur}</td>
                  <td style={td}>{p.depot.intitule}</td>
                  <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.montant)}</td>
                  <td style={td}><DocBadge doc={p.document} t={t} /></td>
                </tr>
              ))}
              {list && !list.pieces.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--fg-subtle)', padding: 20 }}>{t('Aucune pièce sur cette période.')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
