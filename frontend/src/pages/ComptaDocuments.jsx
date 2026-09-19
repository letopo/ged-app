// frontend/src/pages/ComptaDocuments.jsx — Module Comptabilité (pièces de caisse scannées)
// Accès : comptable et administrateur uniquement.
// Scan → import GED → extraction IA (Claude vision) → tableau façon Excel + export CSV.
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Calculator, Upload, Download, Trash2, RefreshCw, Loader2,
  FileText, AlertCircle, CheckCircle, X, Save, ExternalLink, Filter, Sigma,
  TrendingUp, TrendingDown, Plus, Link2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { comptaAPI } from '../services/comptaService';

const emptyDraft = () => ({
  documentId: null,
  numeroOrdre: '',
  dateReception: new Date().toISOString().slice(0, 10),
  libelle: '',
  datePiece: '',
  numeroPiece: '',
  numeroComptable: '',
  montant: '',
  devise: 'XAF',
  typeMouvement: 'inconnu',
  extraction: null,
  multiLignes: false,
  lignes: [{ libelle: '', montant: '', numeroComptable: '' }],
});

const groupColor = (groupId) => {
  if (!groupId) return null;
  const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
  let hash = 0;
  for (const c of groupId) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const fmtMontant = (v) => {
  if (v == null || v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('fr-FR') : v;
};

const TYPE_LABELS = { entree: 'Entrée', sortie: 'Sortie', inconnu: '' };
const TYPE_COLORS = {
  entree: { color: 'var(--success)', bg: 'var(--success-soft)' },
  sortie: { color: 'var(--danger)',  bg: 'var(--danger-soft)'  },
  inconnu: { color: 'var(--fg-muted)', bg: 'transparent' },
};

export default function ComptaDocuments() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [draft, setDraft] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // Filtres
  const [fType, setFType] = useState('');
  const [fDu, setFDu] = useState('');
  const [fAu, setFAu] = useState('');
  const hasFilters = !!(fType || fDu || fAu);
  const resetFilters = () => { setFType(''); setFDu(''); setFAu(''); };

  const filtered = useMemo(() => docs.filter(d => {
    if (fType && d.typeMouvement !== fType) return false;
    if (fDu && (!d.datePiece || d.datePiece < fDu)) return false;
    if (fAu && (!d.datePiece || d.datePiece > fAu)) return false;
    return true;
  }), [docs, fType, fDu, fAu]);

  const totalEntrees = useMemo(() => filtered.filter(d => d.typeMouvement === 'entree').reduce((s, d) => s + (Number(d.montant) || 0), 0), [filtered]);
  const totalSorties = useMemo(() => filtered.filter(d => d.typeMouvement === 'sortie').reduce((s, d) => s + (Number(d.montant) || 0), 0), [filtered]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await comptaAPI.getAll();
      setDocs(res.data.data || []);
      setError(null);
    } catch {
      setError('Impossible de charger les pièces comptables.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onPickFile = () => fileRef.current?.click();

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setExtracting(true);
    setNotice(null);
    setError(null);
    try {
      const res = await comptaAPI.extract(file);
      const { documentId, fields, suggestedNumeroOrdre, dateReception, extractionError } = res.data;
      const d = emptyDraft();
      d.documentId = documentId;
      d.numeroOrdre = suggestedNumeroOrdre ?? '';
      d.dateReception = dateReception || d.dateReception;
      if (fields) {
        d.datePiece     = fields.datePiece || '';
        d.numeroPiece   = fields.numeroPiece || '';
        d.devise        = fields.devise || 'XAF';
        d.typeMouvement = fields.typeMouvement || 'inconnu';
        d.extraction    = fields._raw || fields;

        if (fields.multiLignes && Array.isArray(fields.lignes) && fields.lignes.length > 1) {
          d.multiLignes = true;
          d.lignes = fields.lignes.map(l => ({
            libelle: l.libelle || '',
            montant: l.montant ?? '',
            numeroComptable: '',
          }));
          d.libelle = '';
          d.montant = '';
          setNotice(
            `Extraction terminée — ${fields.lignes.length} lignes détectées (confiance : ${fields.confiance || '?'}). Vérifiez chaque ligne.`
          );
        } else {
          d.multiLignes = false;
          d.libelle     = fields.libelle || '';
          d.montant     = fields.montant ?? '';
          d.lignes      = [{ libelle: fields.libelle || '', montant: fields.montant ?? '', numeroComptable: '' }];
          setNotice(
            fields.confiance
              ? `Extraction terminée (confiance : ${fields.confiance}). Vérifiez puis enregistrez.`
              : 'Extraction terminée. Vérifiez puis enregistrez.'
          );
        }
      } else {
        setNotice(`Pièce importée mais extraction indisponible${extractionError ? ` (${extractionError})` : ''}. Saisie manuelle possible.`);
      }
      setDraft(d);
    } catch (err) {
      setError(err.response?.data?.message || "Échec de l'import/extraction.");
    } finally {
      setExtracting(false);
    }
  };

  const reextract = async () => {
    if (!draft?.documentId) return;
    setExtracting(true);
    try {
      const res = await comptaAPI.reextract(draft.documentId);
      const f = res.data.fields;
      setDraft(d => ({
        ...d,
        libelle:       f.libelle       || d.libelle,
        datePiece:     f.datePiece     || d.datePiece,
        numeroPiece:   f.numeroPiece   || d.numeroPiece,
        montant:       f.montant       ?? d.montant,
        devise:        f.devise        || d.devise,
        typeMouvement: f.typeMouvement || d.typeMouvement,
        extraction:    f._raw          || f,
      }));
      setNotice('Nouvelle extraction appliquée.');
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la ré-extraction.');
    } finally {
      setExtracting(false);
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const payload = { ...draft, statut: 'valide' };
      if (draft.multiLignes && draft.lignes.length > 1) {
        payload.lignes = draft.lignes;
      }
      await comptaAPI.create(payload);
      setDraft(null);
      const count = draft.multiLignes ? draft.lignes.length : 1;
      setNotice(count > 1 ? `${count} lignes enregistrées.` : 'Pièce enregistrée.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const removeDoc = async (id) => {
    if (!window.confirm('Supprimer cette pièce ? (le fichier archivé reste dans la GED)')) return;
    try {
      await comptaAPI.delete(id);
      setDocs(ds => ds.filter(d => d.id !== id));
    } catch {
      setError('Échec de la suppression.');
    }
  };

  const exportCsv = () => {
    const headers = ['N° ORDRE', 'DATE RÉCEPTION', 'LIBELLÉ', 'DATE PIÈCE', 'N° RÉFÉRENCE', 'N° COMPTABLE', 'MONTANT', 'TYPE'];
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const typeLabel = (t) => t === 'entree' ? 'Entrée' : t === 'sortie' ? 'Sortie' : '';
    const rows = filtered.map(d => [
      d.numeroOrdre ?? '', d.dateReception ?? '', d.libelle ?? '',
      d.datePiece ?? '', d.numeroPiece ?? '', d.numeroComptable ?? '',
      d.montant ?? '', typeLabel(d.typeMouvement),
    ].map(esc).join(';'));
    rows.push(['', '', '', '', '', 'ENTRÉES', totalEntrees, ''].map(esc).join(';'));
    rows.push(['', '', '', '', '', 'SORTIES', totalSorties, ''].map(esc).join(';'));
    rows.push(['', '', '', '', '', 'SOLDE', totalEntrees - totalSorties, ''].map(esc).join(';'));
    const csv = '﻿' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = hasFilters ? 'comptabilite_pieces_filtre.csv' : 'comptabilite_pieces.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const setF = (k) => (e) => setDraft(d => ({ ...d, [k]: e.target.value }));

  const inputStyle = { background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' };
  const cellInput = 'w-full px-2 py-1.5 text-sm rounded-md outline-none';

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ background: 'var(--surface-2)' }}>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <Calculator size={22} style={{ color: 'var(--brand)' }} /> Comptabilité — Pièces de caisse
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
            Scannez une pièce : les champs sont extraits automatiquement, vous validez.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors"
            style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
            <Download size={16} /> Export Excel (CSV)
          </button>
          <button onClick={onPickFile} disabled={extracting}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg text-white transition-colors disabled:opacity-60"
            style={{ background: 'var(--brand)' }}>
            {extracting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {extracting ? 'Extraction…' : 'Importer une pièce'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
            onChange={onFileSelected} className="hidden" />
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg text-sm"
          style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg text-sm"
          style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
          <CheckCircle size={16} /> {notice}
          <button onClick={() => setNotice(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Brouillon en validation */}
      {draft && (
        <div className="mb-5 p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--brand)', boxShadow: 'var(--shadow-3)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <FileText size={16} style={{ color: 'var(--brand)' }} /> Vérifier la pièce extraite
            </h2>
            <button onClick={() => setDraft(null)} style={{ color: 'var(--fg-muted)' }}><X size={18} /></button>
          </div>
          {/* Champs communs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <Field label="N° ORDRE">
              <input type="number" value={draft.numeroOrdre} onChange={setF('numeroOrdre')} className={cellInput} style={inputStyle} />
            </Field>
            <Field label="DATE RÉCEPTION">
              <input type="date" value={draft.dateReception} onChange={setF('dateReception')} className={cellInput} style={inputStyle} />
            </Field>
            <Field label="DATE PIÈCE" hint="🤖 extrait">
              <input type="date" value={draft.datePiece || ''} onChange={setF('datePiece')} className={cellInput} style={inputStyle} />
            </Field>
            <Field label="N° RÉFÉRENCE" hint="🤖 extrait">
              <input value={draft.numeroPiece} onChange={setF('numeroPiece')} className={cellInput} style={inputStyle} />
            </Field>
            <Field label="TYPE" hint="🤖 extrait">
              <select value={draft.typeMouvement} onChange={setF('typeMouvement')} className={cellInput} style={inputStyle}>
                <option value="entree">Entrée (recette)</option>
                <option value="sortie">Sortie (décaissement)</option>
                <option value="inconnu">Non déterminé</option>
              </select>
            </Field>
            {/* Bascule multi-lignes */}
            <div className="flex items-end pb-0.5">
              <button
                type="button"
                onClick={() => setDraft(d => ({ ...d, multiLignes: !d.multiLignes }))}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors"
                style={{
                  background: draft.multiLignes ? 'color-mix(in srgb, var(--brand) 12%, transparent)' : 'var(--surface-2)',
                  color: draft.multiLignes ? 'var(--brand)' : 'var(--fg-muted)',
                  border: `1px solid ${draft.multiLignes ? 'var(--brand)' : 'var(--border)'}`,
                }}>
                <Link2 size={13} /> Pièce multi-lignes {draft.multiLignes ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Ligne unique */}
          {!draft.multiLignes && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="LIBELLÉ" hint="🤖 extrait">
                <input value={draft.libelle} onChange={setF('libelle')} placeholder="Objet de la pièce…" className={cellInput} style={inputStyle} />
              </Field>
              <Field label="MONTANT" hint="🤖 extrait">
                <input type="number" value={draft.montant} onChange={setF('montant')} className={cellInput} style={inputStyle} />
              </Field>
              <Field label="N° COMPTABLE">
                <input value={draft.numeroComptable} onChange={setF('numeroComptable')} placeholder="Ex: 571000…" className={cellInput} style={inputStyle} />
              </Field>
            </div>
          )}

          {/* Lignes multiples */}
          {draft.multiLignes && (
            <div>
              <div className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--brand)' }}>
                <Link2 size={13} /> {draft.lignes.length} ligne{draft.lignes.length > 1 ? 's' : ''} — chaque ligne sera une entrée séparée dans le registre
              </div>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--fg-muted)', width: 30 }}>#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>LIBELLÉ / DÉSIGNATION <span style={{ color: 'var(--brand)' }}>🤖</span></th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--fg-muted)', width: 150 }}>MONTANT <span style={{ color: 'var(--brand)' }}>🤖</span></th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--fg-muted)', width: 150 }}>N° COMPTABLE</th>
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.lignes.map((ligne, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                        <td className="px-3 py-1.5 text-xs font-bold" style={{ color: 'var(--fg-muted)' }}>{i + 1}</td>
                        <td className="px-2 py-1">
                          <input
                            value={ligne.libelle}
                            onChange={e => setDraft(d => {
                              const lignes = [...d.lignes];
                              lignes[i] = { ...lignes[i], libelle: e.target.value };
                              return { ...d, lignes };
                            })}
                            placeholder={`Désignation ligne ${i + 1}…`}
                            className="w-full px-2 py-1 text-sm rounded outline-none"
                            style={inputStyle}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            value={ligne.montant}
                            onChange={e => setDraft(d => {
                              const lignes = [...d.lignes];
                              lignes[i] = { ...lignes[i], montant: e.target.value };
                              return { ...d, lignes };
                            })}
                            placeholder="0"
                            className="w-full px-2 py-1 text-sm rounded outline-none text-right"
                            style={inputStyle}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            value={ligne.numeroComptable}
                            onChange={e => setDraft(d => {
                              const lignes = [...d.lignes];
                              lignes[i] = { ...lignes[i], numeroComptable: e.target.value };
                              return { ...d, lignes };
                            })}
                            placeholder="571000…"
                            className="w-full px-2 py-1 text-sm rounded outline-none"
                            style={inputStyle}
                          />
                        </td>
                        <td className="px-1 py-1 text-center">
                          {draft.lignes.length > 1 && (
                            <button
                              onClick={() => setDraft(d => ({ ...d, lignes: d.lignes.filter((_, j) => j !== i) }))}
                              className="p-1 rounded" style={{ color: 'var(--danger)' }}>
                              <X size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                      <td colSpan={2} className="px-3 py-1.5">
                        <button
                          onClick={() => setDraft(d => ({ ...d, lignes: [...d.lignes, { libelle: '', montant: '', numeroComptable: '' }] }))}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                          style={{ color: 'var(--brand)', background: 'color-mix(in srgb, var(--brand) 10%, transparent)', border: '1px solid var(--brand)' }}>
                          <Plus size={12} /> Ajouter une ligne
                        </button>
                      </td>
                      <td className="px-3 py-1.5 text-right text-sm font-bold" style={{ color: 'var(--fg)' }}>
                        {fmtMontant(draft.lignes.reduce((s, l) => s + (Number(l.montant) || 0), 0))} FCFA
                      </td>
                      <td colSpan={2} className="px-3 py-1.5 text-xs" style={{ color: 'var(--fg-muted)' }}>Total</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mt-4">
            <button onClick={saveDraft} disabled={saving}
              className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg text-white disabled:opacity-60"
              style={{ background: 'var(--success)' }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
            </button>
            <button onClick={reextract} disabled={extracting || !draft.documentId}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg disabled:opacity-60"
              style={{ background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
              <RefreshCw size={15} className={extracting ? 'animate-spin' : ''} /> Ré-extraire
            </button>
            {draft.documentId && (
              <Link to={`/documents/${draft.documentId}`} target="_blank"
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg"
                style={{ background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
                <ExternalLink size={15} /> Voir la pièce
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Filtres + Totaux */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-4">
        <div className="flex flex-wrap items-end gap-3 flex-1 p-3 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1 text-xs font-semibold pb-2" style={{ color: 'var(--fg-muted)' }}>
            <Filter size={15} /> Filtres
          </div>
          <label className="block">
            <span className="text-xs font-medium block mb-1" style={{ color: 'var(--fg-muted)' }}>Type</span>
            <select value={fType} onChange={e => setFType(e.target.value)}
              className="px-2 py-1.5 text-sm rounded-md outline-none min-w-[140px]"
              style={{ background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
              <option value="">Tous</option>
              <option value="entree">Entrées</option>
              <option value="sortie">Sorties</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium block mb-1" style={{ color: 'var(--fg-muted)' }}>Date pièce — du</span>
            <input type="date" value={fDu} onChange={e => setFDu(e.target.value)}
              className="px-2 py-1.5 text-sm rounded-md outline-none"
              style={{ background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)' }} />
          </label>
          <label className="block">
            <span className="text-xs font-medium block mb-1" style={{ color: 'var(--fg-muted)' }}>au</span>
            <input type="date" value={fAu} onChange={e => setFAu(e.target.value)}
              className="px-2 py-1.5 text-sm rounded-md outline-none"
              style={{ background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)' }} />
          </label>
          {hasFilters && (
            <button onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md"
              style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
              <X size={14} /> Réinitialiser
            </button>
          )}
        </div>

        {/* Encarts totaux */}
        <div className="flex gap-2">
          <div className="px-4 py-3 rounded-xl min-w-[160px]"
            style={{ background: 'var(--success-soft)', border: '1px solid var(--success)' }}>
            <div className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color: 'var(--success)' }}>
              <TrendingUp size={13} /> Entrées
            </div>
            <div className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
              {fmtMontant(totalEntrees) || '0'} <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>FCFA</span>
            </div>
          </div>
          <div className="px-4 py-3 rounded-xl min-w-[160px]"
            style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}>
            <div className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color: 'var(--danger)' }}>
              <TrendingDown size={13} /> Sorties
            </div>
            <div className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
              {fmtMontant(totalSorties) || '0'} <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>FCFA</span>
            </div>
          </div>
          <div className="px-4 py-3 rounded-xl min-w-[160px]"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)' }}>
            <div className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color: 'var(--brand)' }}>
              <Sigma size={13} /> Solde
            </div>
            <div className="text-xl font-bold" style={{ color: totalEntrees - totalSorties >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {fmtMontant(totalEntrees - totalSorties) || '0'} <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>FCFA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
                {['N° ORDRE', 'DATE RÉC.', 'LIBELLÉ', 'DATE PIÈCE', 'N° RÉFÉRENCE', 'N° COMPTABLE', 'MONTANT', 'TYPE', ''].map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-3 py-8 text-center" style={{ color: 'var(--fg-muted)' }}>
                  <Loader2 size={18} className="animate-spin inline mr-2" /> Chargement…
                </td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-10 text-center" style={{ color: 'var(--fg-muted)' }}>
                  Aucune pièce. Cliquez « Importer une pièce » pour commencer.
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-10 text-center" style={{ color: 'var(--fg-muted)' }}>
                  Aucun résultat. <button onClick={resetFilters} className="underline" style={{ color: 'var(--brand)' }}>Réinitialiser les filtres</button>
                </td></tr>
              ) : (() => {
                // Construire la map group_id → indices pour calculer position dans le groupe
                const groupMap = {};
                filtered.forEach((d, i) => {
                  if (d.groupId) {
                    if (!groupMap[d.groupId]) groupMap[d.groupId] = [];
                    groupMap[d.groupId].push(i);
                  }
                });
                return filtered.map((d, i) => {
                  const color = groupColor(d.groupId);
                  const groupIndices = d.groupId ? groupMap[d.groupId] : null;
                  const posInGroup = groupIndices ? groupIndices.indexOf(i) : -1;
                  const isFirst = posInGroup === 0;
                  const isLast  = groupIndices ? posInGroup === groupIndices.length - 1 : true;
                  const groupSize = groupIndices?.length || 1;

                  return (
                    <tr key={d.id} style={{
                      borderBottom: isLast ? '2px solid var(--border)' : '1px solid color-mix(in srgb, var(--border) 40%, transparent)',
                      background: d.groupId
                        ? `color-mix(in srgb, ${color} ${isFirst ? '7%' : '4%'}, var(--surface))`
                        : 'transparent',
                    }}>
                      {/* Indicateur de groupe — barre colorée à gauche */}
                      <td className="py-2 whitespace-nowrap" style={{
                        paddingLeft: 0,
                        borderLeft: d.groupId ? `4px solid ${color}` : '4px solid transparent',
                        paddingRight: 8,
                      }}>
                        <span style={{ paddingLeft: 8, color: 'var(--fg)' }}>{d.numeroOrdre}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>{d.dateReception}</td>
                      <td className="px-3 py-2 max-w-[220px] font-medium" title={d.libelle} style={{ color: 'var(--fg)' }}>
                        {d.groupId && (
                          <span className="inline-flex items-center gap-1 mr-1.5 px-1.5 py-0.5 rounded text-xs font-bold"
                            style={{ background: `${color}22`, color, verticalAlign: 'middle' }}>
                            <Link2 size={10} />
                            {isFirst ? `${groupSize} lignes` : `└ ${posInGroup + 1}/${groupSize}`}
                          </span>
                        )}
                        <span className="truncate">{d.libelle}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>
                        {isFirst || !d.groupId ? d.datePiece : ''}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--fg)' }}>
                        {isFirst || !d.groupId ? d.numeroPiece : ''}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>{d.numeroComptable}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap font-semibold" style={{ color: 'var(--fg)' }}>
                        {fmtMontant(d.montant)} {d.devise !== 'XAF' ? d.devise : ''}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {d.typeMouvement !== 'inconnu' && (isFirst || !d.groupId) && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ color: TYPE_COLORS[d.typeMouvement].color, background: TYPE_COLORS[d.typeMouvement].bg }}>
                            {TYPE_LABELS[d.typeMouvement]}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1 justify-end">
                          {d.documentId && (isFirst || !d.groupId) && (
                            <Link to={`/documents/${d.documentId}`} target="_blank" title="Voir la pièce"
                              className="p-1.5 rounded-md" style={{ color: 'var(--fg-muted)' }}>
                              <ExternalLink size={15} />
                            </Link>
                          )}
                          <button onClick={() => removeDoc(d.id)} title="Supprimer"
                            className="p-1.5 rounded-md" style={{ color: 'var(--danger)' }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--surface-2)', borderTop: '2px solid var(--border)' }}>
                  <td colSpan={6} className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--fg-muted)', paddingLeft: 12 }}>
                    {hasFilters ? 'Totaux filtrés' : 'Totaux globaux'} ({filtered.length} ligne{filtered.length > 1 ? 's' : ''})
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap" style={{ color: 'var(--fg)' }}>
                    <div className="text-xs" style={{ color: 'var(--success)' }}>+{fmtMontant(totalEntrees)} FCFA</div>
                    <div className="text-xs" style={{ color: 'var(--danger)' }}>−{fmtMontant(totalSorties)} FCFA</div>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium flex items-center gap-1 mb-1" style={{ color: 'var(--fg-muted)' }}>
        {label} {hint && <span style={{ color: 'var(--brand)' }}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}
