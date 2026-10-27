// frontend/src/components/BpcCompletionForm.jsx
// Bon de prise en charge, étape RH : compléter l'assuré (nom, entreprise,
// secteur, matricule, lien de filiation). Les rubriques sont écrites sur le
// bon déjà visé par le médecin ; le RH ne signe pas (le DG vise ensuite).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, ClipboardCheck } from 'lucide-react';
import PersonAutocomplete from './PersonAutocomplete';

export const BPC_CATEGORY = 'Bon de prise en charge';
const FILIATIONS = [['salarie', 'Salarié'], ['conjoint', 'Conjoint'], ['enfants', 'Enfants'], ['parents', 'Parents']];
const DEFAULT_ENTREPRISE = 'HSJM';

const input = {
  width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-2)', border: '1.5px solid var(--border)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const label = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 4 };

export default function BpcCompletionForm({ document, loading, onSubmit }) {
  const { t } = useTranslation();
  const meta = document?.metadata || {};
  const [fields, setFields] = useState({ nomAssure: '', entreprise: '', secteur: '', matricule: '', filiation: '', assureId: null, assureSource: null });
  const set = (k, v) => setFields(f => ({ ...f, [k]: v }));
  const ready = fields.nomAssure.trim() && fields.entreprise.trim() && fields.filiation;

  // Assuré choisi dans la liste du personnel : matricule, secteur et entreprise pré-remplis
  const pickAssure = (p) => setFields(f => ({
    ...f,
    nomAssure: p.label || '',
    assureId: p.id || null,
    assureSource: p.source || null,
    ...(p.id ? {
      matricule: p.matricule || f.matricule,
      secteur: p.service || f.secteur,
      entreprise: f.entreprise || DEFAULT_ENTREPRISE,
    } : {}),
  }));

  return (
    <div style={{ padding: 14, border: '2px solid var(--brand)', borderRadius: 'var(--radius-3)', background: 'var(--brand-soft)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--brand)', margin: 0 }}>{t('Compléter le bon de prise en charge')}</p>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '4px 0 0' }}>
          {t('Malade : {{nom}} · visé par le médecin. Renseignez l’assuré ; le bon part ensuite chez le DG.', { nom: meta.nomMalade || '—' })}
        </p>
      </div>
      <div>
        <span style={label}>{t("Nom de l'assuré")} *</span>
        <PersonAutocomplete value={fields.nomAssure} onSelect={pickAssure} placeholder={t('Rechercher dans le personnel ou saisir un nom')} required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        <label><span style={label}>{t('Entreprise')} *</span><input style={input} value={fields.entreprise} maxLength={80} onChange={e => set('entreprise', e.target.value)} /></label>
        <label><span style={label}>{t('Secteur')}</span><input style={input} value={fields.secteur} maxLength={60} onChange={e => set('secteur', e.target.value)} /></label>
        <label><span style={label}>{t('Matricule')}</span><input style={input} value={fields.matricule} maxLength={40} onChange={e => set('matricule', e.target.value)} /></label>
      </div>
      <div>
        <span style={label}>{t('Lien de filiation')} *</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {FILIATIONS.map(([key, text]) => (
            <label key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" name="bpc-filiation" checked={fields.filiation === key} onChange={() => set('filiation', key)} style={{ accentColor: 'var(--brand)' }} />
              {t(text)}
            </label>
          ))}
        </div>
      </div>
      <button type="button" onClick={() => onSubmit(fields)} disabled={!ready || loading} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', border: 'none',
        borderRadius: 'var(--radius-3)', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 600,
        cursor: !ready || loading ? 'not-allowed' : 'pointer', opacity: !ready || loading ? 0.6 : 1,
      }}>
        {loading ? <Loader size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
        {t('Compléter et envoyer au DG')}
      </button>
    </div>
  );
}
