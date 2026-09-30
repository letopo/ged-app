// frontend/src/components/ConfidentialityPanel.jsx
// Paramètres › Confidentialité : types de documents réservés à certains postes
// (administrateurs). Règles appliquées côté serveur (utils/categoryAccess.js).
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, Save, Plus, Trash2, Lock, Info, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { categoryAccessAPI } from '../services/api';
import { inputStyle, hintStyle, btn, Notice } from './SettingsFormParts';

const newRule = () => ({ key: Math.random().toString(36).slice(2), category: '', allowedPostes: [], includeParticipants: true });

export default function ConfidentialityPanel() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [rules, setRules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const apply = (payload) => {
    setData(payload);
    setRules(payload.rules.map(r => ({ ...r, key: r.id })));
    setDirty(false);
  };

  useEffect(() => {
    categoryAccessAPI.get().then(res => apply(res.data))
      .catch(err => setData({ error: err.response?.data?.message || t('Impossible de charger les réglages.') }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Loader size={20} className="animate-spin" color="var(--brand)" /></div>;
  if (data.error) return <Notice tone="error" icon={AlertCircle}>{data.error}</Notice>;

  const update = (key, patch) => { setRules(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r))); setDirty(true); };
  const togglePoste = (rule, code) => update(rule.key, {
    allowedPostes: rule.allowedPostes.includes(code) ? rule.allowedPostes.filter(c => c !== code) : [...rule.allowedPostes, code],
  });
  const names = rules.map(r => r.category.trim().toLowerCase()).filter(Boolean);
  const duplicate = names.find((n, i) => names.indexOf(n) !== i);
  const incomplete = rules.some(r => !r.category.trim());

  const save = async () => {
    setSaving(true);
    try {
      const res = await categoryAccessAPI.save(rules.map(({ category, allowedPostes, includeParticipants }) => ({ category: category.trim(), allowedPostes, includeParticipants })));
      apply(res.data);
      toast.success(res.data.message || t('Enregistré'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur lors de l’enregistrement'));
    } finally { setSaving(false); }
  };

  const posteLabel = (code) => data.postes.find(p => p.code === code)?.label || code;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Lock size={20} /> {t('Confidentialité')}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
        {t('Réservez certains types de documents à des postes précis (ex. les attestations aux RH, les pièces comptables à la Comptabilité).')}
      </p>
      <Notice tone="info" icon={Info}>
        {t('Un type réservé n’est visible que par les administrateurs et les titulaires des postes cochés, même dans un service partagé ou les archives. Les autres types de documents suivent les règles habituelles.')}
      </Notice>

      <datalist id="conf-categories">{data.categories.map(c => <option key={c} value={c} />)}</datalist>

      {rules.length === 0 && (
        <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-3)', padding: '28px 16px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13, marginBottom: 12 }}>
          {t('Aucun type de document réservé : chaque document suit les règles habituelles.')}
        </div>
      )}

      {rules.map(rule => (
        <div key={rule.key} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', padding: 14, marginBottom: 10, background: 'var(--surface)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input style={{ ...inputStyle, fontWeight: 600 }} list="conf-categories" value={rule.category} maxLength={150}
              onChange={e => update(rule.key, { category: e.target.value })} placeholder={t('Type de document (ex. Fiche de paie)')} />
            <button type="button" onClick={() => { setRules(rs => rs.filter(r => r.key !== rule.key)); setDirty(true); }}
              aria-label={t('Supprimer la règle')} title={t('Supprimer la règle')}
              style={{ ...btn(false), padding: '0 10px', color: 'var(--danger)', flexShrink: 0 }}>
              <Trash2 size={14} />
            </button>
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>{t('Visible par (en plus des administrateurs) :')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {data.postes.map(p => {
              const on = rule.allowedPostes.includes(p.code);
              return (
                <button type="button" key={p.code} onClick={() => togglePoste(rule, p.code)}
                  style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 99, cursor: 'pointer',
                    border: `1px solid ${on ? 'var(--brand)' : 'var(--border)'}`,
                    background: on ? 'var(--brand-soft)' : 'transparent', color: on ? 'var(--brand)' : 'var(--fg-muted)', fontWeight: on ? 600 : 400,
                  }}>
                  {on ? '✓ ' : ''}{p.label}
                </button>
              );
            })}
          </div>
          {rule.allowedPostes.length === 0 && (
            <div style={{ ...hintStyle, marginTop: -4, marginBottom: 8 }}>{t('Aucun poste coché : seuls les administrateurs voient ce type de document.')}</div>
          )}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--fg)', cursor: 'pointer' }}>
            <input type="checkbox" checked={rule.includeParticipants} onChange={e => update(rule.key, { includeParticipants: e.target.checked })}
              style={{ width: 15, height: 15, marginTop: 2, accentColor: 'var(--brand)' }} />
            <span>
              {t('L’auteur, les validateurs et les destinataires du document y ont aussi accès')}
              {!rule.includeParticipants && (
                <span style={{ display: 'block', ...hintStyle }}>
                  {t('Décoché : même la personne qui a créé ou validé le document ne le voit plus si elle n’a pas l’un des postes cochés.')}
                  {rule.allowedPostes.length > 0 && ` (${rule.allowedPostes.map(posteLabel).join(', ')})`}
                </span>
              )}
            </span>
          </label>
        </div>
      ))}

      <button type="button" onClick={() => { setRules(rs => [...rs, newRule()]); setDirty(true); }} style={{ ...btn(false), marginBottom: 20 }}>
        <Plus size={14} /> {t('Réserver un type de document')}
      </button>

      {(duplicate || incomplete) && (
        <Notice tone="error" icon={AlertCircle}>
          {duplicate ? t('Le type « {{name}} » apparaît deux fois.', { name: duplicate }) : t('Indiquez le type de document de chaque règle.')}
        </Notice>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={save} disabled={saving || !dirty || Boolean(duplicate) || incomplete}
          style={{ ...btn(true), opacity: saving || !dirty || duplicate || incomplete ? 0.55 : 1 }}>
          {saving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />} {t('Enregistrer')}
        </button>
      </div>
    </div>
  );
}
