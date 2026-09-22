// frontend/src/pages/PhpFactures.jsx — Module factures PHP (secrétaire)
// Scan → import GED → extraction IA (Claude vision) → tableau façon Excel.
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Receipt, ArrowLeft, Upload, Download, Trash2, RefreshCw, Loader2,
  FileText, AlertCircle, CheckCircle, X, Save, ExternalLink, Filter, Sigma,
} from 'lucide-react';
import { phpFactureAPI } from '../services/phpService';
import i18n from '../i18n/config';

const emptyDraft = () => ({
  documentId: null,
  numeroOrdre: '',
  dateReception: new Date().toISOString().slice(0, 10),
  fournisseur: '',
  dateFacture: '',
  numeroFacture: '',
  numeroComptable: '',
  montant: '',
  devise: 'XAF',
  extraction: null,
});

const BCP47_LOCALES = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA' };

const fmtMontant = (v) => {
  if (v == null || v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(BCP47_LOCALES[i18n.language] || 'fr-FR') : v;
};

export default function PhpFactures() {
  const { t } = useTranslation();
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [draft, setDraft] = useState(null);       // ligne en cours de validation
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // Filtres
  const [fFournisseur, setFFournisseur] = useState('');  // '' = tous
  const [fDu, setFDu] = useState('');                    // date facture >= (AAAA-MM-JJ)
  const [fAu, setFAu] = useState('');                    // date facture <=
  const hasFilters = !!(fFournisseur || fDu || fAu);
  const resetFilters = () => { setFFournisseur(''); setFDu(''); setFAu(''); };

  // Liste des fournisseurs distincts (pour le menu déroulant)
  const fournisseurs = useMemo(() => {
    const set = new Set(factures.map(f => f.fournisseur).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [factures]);

  // Factures filtrées
  const filtered = useMemo(() => {
    return factures.filter(f => {
      if (fFournisseur && f.fournisseur !== fFournisseur) return false;
      if (fDu && (!f.dateFacture || f.dateFacture < fDu)) return false;
      if (fAu && (!f.dateFacture || f.dateFacture > fAu)) return false;
      return true;
    });
  }, [factures, fFournisseur, fDu, fAu]);

  // Total (somme des montants) sur la sélection courante
  const total = useMemo(
    () => filtered.reduce((s, f) => s + (Number(f.montant) || 0), 0),
    [filtered]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await phpFactureAPI.getAll();
      setFactures(res.data.data || []);
      setError(null);
    } catch (e) {
      setError(t("Impossible de charger les factures."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Import + extraction
  const onPickFile = () => fileRef.current?.click();

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de re-sélectionner le même fichier
    if (!file) return;

    setExtracting(true);
    setNotice(null);
    setError(null);
    try {
      const res = await phpFactureAPI.extract(file);
      const { documentId, fields, suggestedNumeroOrdre, dateReception, extractionError } = res.data;
      const d = emptyDraft();
      d.documentId = documentId;
      d.numeroOrdre = suggestedNumeroOrdre ?? '';
      d.dateReception = dateReception || d.dateReception;
      if (fields) {
        d.fournisseur = fields.fournisseur || '';
        d.dateFacture = fields.dateFacture || '';
        d.numeroFacture = fields.numeroFacture || '';
        d.montant = fields.montant ?? '';
        d.devise = fields.devise || 'XAF';
        d.extraction = fields._raw || fields;
        setNotice(
          fields.confiance
            ? t('Extraction terminée (confiance : {{confiance}}). Vérifiez puis enregistrez.', { confiance: fields.confiance })
            : t('Extraction terminée. Vérifiez puis enregistrez.')
        );
      } else {
        setNotice(extractionError
          ? t('Pièce importée mais extraction indisponible ({{error}}). Saisie manuelle possible.', { error: extractionError })
          : t('Pièce importée mais extraction indisponible. Saisie manuelle possible.'));
      }
      setDraft(d);
    } catch (err) {
      setError(err.response?.data?.message || t("Échec de l'import/extraction."));
    } finally {
      setExtracting(false);
    }
  };

  const reextract = async () => {
    if (!draft?.documentId) return;
    setExtracting(true);
    try {
      const res = await phpFactureAPI.reextract(draft.documentId);
      const f = res.data.fields;
      setDraft(d => ({
        ...d,
        fournisseur: f.fournisseur || d.fournisseur,
        dateFacture: f.dateFacture || d.dateFacture,
        numeroFacture: f.numeroFacture || d.numeroFacture,
        montant: f.montant ?? d.montant,
        devise: f.devise || d.devise,
        extraction: f._raw || f,
      }));
      setNotice(t('Nouvelle extraction appliquée.'));
    } catch (err) {
      setError(err.response?.data?.message || t('Échec de la ré-extraction.'));
    } finally {
      setExtracting(false);
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await phpFactureAPI.create({ ...draft, statut: 'valide' });
      setDraft(null);
      setNotice(t('Facture enregistrée.'));
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t("Échec de l'enregistrement."));
    } finally {
      setSaving(false);
    }
  };

  const removeFacture = async (id) => {
    if (!window.confirm(t('Supprimer cette facture ? (la pièce archivée reste dans la GED)'))) return;
    try {
      await phpFactureAPI.delete(id);
      setFactures(fs => fs.filter(f => f.id !== id));
    } catch {
      setError(t('Échec de la suppression.'));
    }
  };

  // Export CSV (Excel FR : séparateur « ; », BOM UTF-8) — sur la sélection filtrée
  const exportCsv = () => {
    const headers = [t('N° DATE'), t('DATE'), t('DESIGNATION'), t('DATE FACTURE'), t('N° FACTURE'), t('N° C'), t('MONTANT')];
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filtered.map(f => [
      f.numeroOrdre ?? '', f.dateReception ?? '', f.fournisseur ?? '',
      f.dateFacture ?? '', f.numeroFacture ?? '', f.numeroComptable ?? '', f.montant ?? '',
    ].map(esc).join(';'));
    // Ligne de total
    rows.push(['', '', '', '', '', t('TOTAL'), total].map(esc).join(';'));
    const csv = '﻿' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = hasFilters ? 'factures_php_filtre.csv' : 'factures_php.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const setF = (k) => (e) => setDraft(d => ({ ...d, [k]: e.target.value }));

  const inputStyle = {
    background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)',
  };
  const cellInput = "w-full px-2 py-1.5 text-sm rounded-md outline-none";

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ background: 'var(--surface-2)' }}>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/php" className="p-1 rounded-lg transition-colors" style={{ color: 'var(--fg-muted)' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <Receipt size={22} style={{ color: 'var(--brand)' }} /> {t('Factures prestataires')}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              {t('Scannez une facture : les champs sont extraits automatiquement, vous validez.')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors"
            style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
            <Download size={16} /> {t('Export Excel (CSV)')}
          </button>
          <button onClick={onPickFile} disabled={extracting}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg text-white transition-colors disabled:opacity-60"
            style={{ background: 'var(--brand)' }}>
            {extracting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {extracting ? t('Extraction…') : t('Importer une facture')}
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
              <FileText size={16} style={{ color: 'var(--brand)' }} /> {t('Vérifier la facture extraite')}
            </h2>
            <button onClick={() => setDraft(null)} style={{ color: 'var(--fg-muted)' }}><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label={t('N° DATE')}>
              <input type="number" value={draft.numeroOrdre} onChange={setF('numeroOrdre')} className={cellInput} style={inputStyle} />
            </Field>
            <Field label={t('DATE (réception)')}>
              <input type="date" value={draft.dateReception} onChange={setF('dateReception')} className={cellInput} style={inputStyle} />
            </Field>
            <Field label={t('DESIGNATION (fournisseur)')} hint={`🤖 ${t('extrait')}`}>
              <input value={draft.fournisseur} onChange={setF('fournisseur')} className={cellInput} style={inputStyle} />
            </Field>
            <Field label={t('DATE FACTURE')} hint={`🤖 ${t('extrait')}`}>
              <input type="date" value={draft.dateFacture || ''} onChange={setF('dateFacture')} className={cellInput} style={inputStyle} />
            </Field>
            <Field label={t('N° FACTURE')} hint={`🤖 ${t('extrait')}`}>
              <input value={draft.numeroFacture} onChange={setF('numeroFacture')} className={cellInput} style={inputStyle} />
            </Field>
            <Field label={t('N° C (code comptable)')}>
              <input value={draft.numeroComptable} onChange={setF('numeroComptable')} placeholder={t('Ex: PHFCAZ…')} className={cellInput} style={inputStyle} />
            </Field>
            <Field label={t('MONTANT')} hint={`🤖 ${t('extrait')}`}>
              <input type="number" value={draft.montant} onChange={setF('montant')} className={cellInput} style={inputStyle} />
            </Field>
            <Field label={t('Devise')}>
              <input value={draft.devise} onChange={setF('devise')} className={cellInput} style={inputStyle} />
            </Field>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button onClick={saveDraft} disabled={saving}
              className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg text-white disabled:opacity-60"
              style={{ background: 'var(--success)' }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {t('Enregistrer')}
            </button>
            <button onClick={reextract} disabled={extracting || !draft.documentId}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg disabled:opacity-60"
              style={{ background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
              <RefreshCw size={15} className={extracting ? 'animate-spin' : ''} /> {t('Ré-extraire')}
            </button>
            {draft.documentId && (
              <Link to={`/documents/${draft.documentId}`} target="_blank"
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg"
                style={{ background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
                <ExternalLink size={15} /> {t('Voir la pièce')}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Filtres + Total */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-4">
        <div className="flex flex-wrap items-end gap-3 flex-1 p-3 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1 text-xs font-semibold pb-2" style={{ color: 'var(--fg-muted)' }}>
            <Filter size={15} /> {t('Filtres')}
          </div>
          <label className="block">
            <span className="text-xs font-medium block mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Fournisseur')}</span>
            <select value={fFournisseur} onChange={e => setFFournisseur(e.target.value)}
              className="px-2 py-1.5 text-sm rounded-md outline-none min-w-[180px]"
              style={{ background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
              <option value="">{t('Tous')}</option>
              {fournisseurs.map(nom => <option key={nom} value={nom}>{nom}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium block mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Date facture — du')}</span>
            <input type="date" value={fDu} onChange={e => setFDu(e.target.value)}
              className="px-2 py-1.5 text-sm rounded-md outline-none"
              style={{ background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)' }} />
          </label>
          <label className="block">
            <span className="text-xs font-medium block mb-1" style={{ color: 'var(--fg-muted)' }}>{t('au')}</span>
            <input type="date" value={fAu} onChange={e => setFAu(e.target.value)}
              className="px-2 py-1.5 text-sm rounded-md outline-none"
              style={{ background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)' }} />
          </label>
          {hasFilters && (
            <button onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md"
              style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
              <X size={14} /> {t('Réinitialiser')}
            </button>
          )}
        </div>

        {/* Encart total — global ou adapté aux filtres */}
        <div className="px-4 py-3 rounded-xl min-w-[230px]"
          style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)' }}>
          <div className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color: 'var(--brand)' }}>
            <Sigma size={14} /> {hasFilters ? t('Total filtré') : t('Total global')}
          </div>
          <div className="text-2xl font-bold leading-none" style={{ color: 'var(--fg)' }}>
            {fmtMontant(total) || '0'} <span className="text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>FCFA</span>
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
            {t('{{count}} facture(s)', { count: filtered.length })}
            {hasFilters ? ` ${t('sur {{total}}', { total: factures.length })}` : ''}
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
                {[t('N° DATE'), t('DATE'), t('DESIGNATION'), t('DATE FACTURE'), t('N° FACTURE'), t('N° C'), t('MONTANT'), ''].map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center" style={{ color: 'var(--fg-muted)' }}>
                  <Loader2 size={18} className="animate-spin inline mr-2" /> {t('Chargement…')}
                </td></tr>
              ) : factures.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-10 text-center" style={{ color: 'var(--fg-muted)' }}>
                  {t('Aucune facture. Cliquez « Importer une facture » pour commencer.')}
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-10 text-center" style={{ color: 'var(--fg-muted)' }}>
                  {t('Aucun résultat pour ces filtres.')} <button onClick={resetFilters} className="underline" style={{ color: 'var(--brand)' }}>{t('Réinitialiser')}</button>
                </td></tr>
              ) : filtered.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-3 py-2" style={{ color: 'var(--fg)' }}>{f.numeroOrdre}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>{f.dateReception}</td>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--fg)' }}>{f.fournisseur}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>{f.dateFacture}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--fg)' }}>{f.numeroFacture}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>{f.numeroComptable}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap font-semibold" style={{ color: 'var(--fg)' }}>
                    {fmtMontant(f.montant)} {f.devise !== 'XAF' ? f.devise : ''}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1 justify-end">
                      {f.documentId && (
                        <Link to={`/documents/${f.documentId}`} target="_blank" title={t('Voir la pièce')}
                          className="p-1.5 rounded-md" style={{ color: 'var(--fg-muted)' }}>
                          <ExternalLink size={15} />
                        </Link>
                      )}
                      <button onClick={() => removeFacture(f.id)} title={t('Supprimer')}
                        className="p-1.5 rounded-md" style={{ color: 'var(--danger)' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--surface-2)', borderTop: '2px solid var(--border)' }}>
                  <td colSpan={6} className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--fg-muted)' }}>
                    {hasFilters ? t('Total filtré') : t('Total global')} ({filtered.length})
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap font-bold" style={{ color: 'var(--fg)' }}>
                    {fmtMontant(total)} FCFA
                  </td>
                  <td></td>
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
