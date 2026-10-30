// frontend/src/components/php/PHPImportExcel.jsx
// Import du classeur Excel du Point Focal (HSJM_Gestion_v3.xlsm) : 1. analyse
// (simulation, rien n'est écrit), 2. import. Réimportable sans doublon : les
// lignes déjà présentes sont mises à jour (backend utils/phpExcelImport.js).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, X, Loader, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { phpImportAPI } from '../../services/phpService';

const SECTIONS = [
  ['patients', 'Patients'], ['consultations', 'Consultations'], ['hospitalisations', 'Hospitalisations'],
  ['operations', 'Opérations'], ['repos', 'Repos maladie'], ['deces', 'Décès / transferts'],
  ['infirmeries', 'Infirmeries'], ['secteurs', 'Secteurs'],
];
const frDay = (d) => (d ? d.split('-').reverse().join('/') : '');

export default function PHPImportExcel({ onClose, onDone }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('choose'); // choose | analyzing | preview | importing | done
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const run = async (apply) => {
    setError(null);
    setStep(apply ? 'importing' : 'analyzing');
    try {
      const res = await phpImportAPI.importExcel(file, apply);
      setReport(res.data.report);
      setStep(apply ? 'done' : 'preview');
      if (apply) onDone?.();
    } catch (err) {
      setError(err.response?.data?.message || t('Import impossible.'));
      setStep('choose');
    }
  };

  const busy = step === 'analyzing' || step === 'importing';
  const ignores = report ? Object.entries(report.ignores || {}) : [];
  const nothingToDo = report && SECTIONS.every(([k]) => !report[k]?.created && !report[k]?.updated);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="w-full max-w-2xl rounded-xl overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-3)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <FileSpreadsheet size={18} style={{ color: 'var(--brand)' }} /> {t('Importer le fichier Excel du Point Focal')}
          </h2>
          <button onClick={onClose} disabled={busy} className="p-1.5 rounded-lg" aria-label={t('Fermer')} style={{ color: 'var(--fg-muted)' }}><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4" style={{ overflowY: 'auto' }}>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            {t('Patients, consultations (avec type de visite CS / RDV / AUTRE, n° d\'ordre et heures), hospitalisations, opérations, repos et décès. Vous pouvez réimporter le fichier à chaque mise à jour : les lignes déjà importées sont mises à jour, jamais dupliquées.')}
          </p>

          {(step === 'choose' || busy) && (
            <label className="flex items-center gap-3 p-4 rounded-lg cursor-pointer" style={{ border: '1.5px dashed var(--border)', background: 'var(--surface-2)' }}>
              <Upload size={18} style={{ color: 'var(--fg-muted)' }} />
              <span className="text-sm" style={{ color: file ? 'var(--fg)' : 'var(--fg-muted)' }}>{file ? file.name : t('Choisir le fichier .xlsm / .xlsx')}</span>
              <input type="file" accept=".xlsm,.xlsx" className="hidden" disabled={busy} onChange={e => { setFile(e.target.files?.[0] || null); setReport(null); }} />
            </label>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {busy && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
              <Loader size={16} className="animate-spin" />
              {step === 'analyzing' ? t('Lecture et analyse du fichier…') : t('Import en cours (peut prendre une minute)…')}
            </div>
          )}

          {report && (step === 'preview' || step === 'done') && (
            <>
              {step === 'done' ? (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                  <CheckCircle size={16} /> {t('Import terminé.')}
                </div>
              ) : (
                <div className="text-sm" style={{ color: 'var(--fg)' }}>
                  {report.periode && t('Consultations du {{du}} au {{au}}.', { du: frDay(report.periode.du), au: frDay(report.periode.au) })}{' '}
                  {nothingToDo ? t('La base est déjà à jour : rien à importer.') : t('Voici ce que l\'import va faire :')}
                </div>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                    <th className="text-left py-1.5">{t('Données')}</th>
                    <th className="text-right py-1.5">{t('Nouveaux')}</th>
                    <th className="text-right py-1.5">{t('Mis à jour')}</th>
                    <th className="text-right py-1.5">{t('Inchangés')}</th>
                  </tr>
                </thead>
                <tbody>
                  {SECTIONS.map(([k, label]) => report[k] && (
                    <tr key={k} style={{ borderTop: '1px solid var(--border)', color: 'var(--fg)' }}>
                      <td className="py-1.5">{t(label)}</td>
                      <td className="py-1.5 text-right font-semibold" style={{ color: report[k].created ? 'var(--success)' : 'var(--fg-subtle)' }}>{report[k].created}</td>
                      <td className="py-1.5 text-right" style={{ color: report[k].updated ? 'var(--brand)' : 'var(--fg-subtle)' }}>{report[k].updated}</td>
                      <td className="py-1.5 text-right" style={{ color: 'var(--fg-subtle)' }}>{report[k].unchanged}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ignores.length > 0 && (
                <div className="text-xs p-3 rounded-lg" style={{ background: 'var(--warning-soft, var(--surface-2))', color: 'var(--fg-muted)' }}>
                  <strong style={{ color: 'var(--fg)' }}>{t('Lignes ignorées')}</strong>
                  {ignores.map(([sheet, reasons]) => Object.entries(reasons).map(([reason, n]) => (
                    <div key={sheet + reason}>{t(sheet)} : {n} — {t(reason)}</div>
                  )))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          {step === 'done' ? (
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg font-medium" style={{ background: 'var(--brand)', color: '#fff' }}>{t('Fermer')}</button>
          ) : (
            <>
              <button onClick={onClose} disabled={busy} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--fg)' }}>{t('Annuler')}</button>
              {step === 'preview' && !nothingToDo ? (
                <button onClick={() => run(true)} className="px-4 py-2 text-sm rounded-lg font-medium" style={{ background: 'var(--brand)', color: '#fff' }}>{t('Importer')}</button>
              ) : step !== 'preview' && (
                <button onClick={() => run(false)} disabled={!file || busy} className="px-4 py-2 text-sm rounded-lg font-medium"
                  style={{ background: file && !busy ? 'var(--brand)' : 'var(--fg-subtle)', color: '#fff' }}>{t('Analyser le fichier')}</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
