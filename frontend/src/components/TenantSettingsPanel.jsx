// frontend/src/components/TenantSettingsPanel.jsx
// Paramètres › Délais et session : réglages généraux de l'organisation
// (administrateurs). Valeurs et bornes fournies par GET /api/tenant-settings.
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, Save, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { tenantSettingsAPI } from '../services/api';
import { setTenantSettings, TENANT_SETTINGS_DEFAULTS } from '../hooks/useTenantSettings';

const inputStyle = {
  width: 110, height: 38, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 14, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
};

// Ordre d'affichage, groupes, unités et effets de chaque réglage
const FIELDS = [
  { group: 'Validation des documents', key: 'workflowDeadlineDays', label: 'Délai pour valider un document', unit: 'jours',
    help: 'Au-delà, l’étape expire et le document revient en brouillon ; son auteur est prévenu.',
    when: 'S’applique aux étapes de validation qui commencent après l’enregistrement.' },
  { group: 'Validation des documents', key: 'lateDays', label: 'Signaler une tâche « en retard » après', unit: 'jours',
    help: 'Utilisé par l’Accueil (Synthèse du jour, documents urgents).', when: 'Immédiat.' },
  { group: 'Session', key: 'sessionIdleMinutes', label: 'Déconnexion après une inactivité de', unit: 'minutes',
    help: 'Un avertissement s’affiche 2 minutes avant.', when: 'Au prochain chargement de la GED.' },
  { group: 'Session', key: 'sessionMaxDays', label: 'Reconnexion obligatoire au bout de', unit: 'jours',
    help: 'Même en cas d’activité, l’utilisateur doit se reconnecter après ce délai.', when: 'À la prochaine connexion de chaque utilisateur.' },
  { group: 'Fichiers', key: 'maxUploadMb', label: 'Taille maximale d’un fichier envoyé', unit: 'Mo',
    help: 'Documents, pièces jointes, factures, cartes Trello.', when: 'Immédiat.' },
];

export default function TenantSettingsPanel() {
  const { t } = useTranslation();
  const [limits, setLimits] = useState(null);
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const apply = (data) => {
    setLimits(data.limits);
    setSaved(data.settings);
    setForm(Object.fromEntries(Object.entries(data.settings).map(([k, v]) => [k, String(v)])));
  };

  useEffect(() => {
    tenantSettingsAPI.get().then(res => apply(res.data)).catch(() => toast.error(t('Impossible de charger les réglages.')));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!limits) return <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Loader size={20} className="animate-spin" color="var(--brand)" /></div>;

  const invalid = (key) => {
    const n = Number(form[key]);
    return !Number.isInteger(n) || n < limits[key].min || n > limits[key].max;
  };
  const changed = FIELDS.some(f => String(saved[f.key]) !== form[f.key]);
  const hasError = FIELDS.some(f => invalid(f.key));

  const save = async (e) => {
    e.preventDefault();
    if (hasError) return;
    setSaving(true);
    try {
      const res = await tenantSettingsAPI.save(Object.fromEntries(FIELDS.map(f => [f.key, Number(form[f.key])])));
      apply(res.data);
      setTenantSettings(res.data.settings); // Accueil, Upload, session : sans recharger la page
      toast.success(t('Réglages enregistrés.'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur lors de l’enregistrement'));
    } finally {
      setSaving(false);
    }
  };

  let lastGroup = null;
  return (
    <form onSubmit={save}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 6px' }}>{t('Délais et session')}</h2>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 24 }}>
        {t('Règles appliquées à toute l’organisation. Les valeurs par défaut sont celles d’origine de la GED.')}
      </p>

      {FIELDS.map(f => {
        const header = f.group !== lastGroup;
        lastGroup = f.group;
        const { min, max } = limits[f.key];
        const bad = invalid(f.key);
        const isDefault = Number(form[f.key]) === TENANT_SETTINGS_DEFAULTS[f.key];
        return (
          <React.Fragment key={f.key}>
            {header && (
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '20px 0 10px' }}>
                {t(f.group)}
              </div>
            )}
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', padding: '14px 16px', marginBottom: 10, background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <label htmlFor={`ts-${f.key}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', flex: '1 1 220px' }}>{t(f.label)}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input id={`ts-${f.key}`} type="number" inputMode="numeric" min={min} max={max} step={1}
                    value={form[f.key] ?? ''} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                    style={{ ...inputStyle, borderColor: bad ? 'var(--danger)' : 'var(--border)' }} />
                  <span style={{ fontSize: 13, color: 'var(--fg-muted)', minWidth: 52 }}>{t(f.unit)}</span>
                  {!isDefault && (
                    <button type="button" title={t('Valeur par défaut : {{value}}', { value: TENANT_SETTINGS_DEFAULTS[f.key] })}
                      onClick={() => setForm(v => ({ ...v, [f.key]: String(TENANT_SETTINGS_DEFAULTS[f.key]) }))}
                      style={{ border: 'none', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4, display: 'inline-flex' }}>
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 8, lineHeight: 1.5 }}>
                {t(f.help)}{' '}
                <span style={{ color: 'var(--fg-subtle)' }}>
                  {t('Par défaut : {{value}} {{unit}}.', { value: TENANT_SETTINGS_DEFAULTS[f.key], unit: t(f.unit) })} {t(f.when)}
                </span>
              </div>
              {bad && (
                <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>
                  {t('Valeur entière entre {{min}} et {{max}}.', { min, max })}
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" disabled={saving || !changed || hasError}
          style={{ height: 36, padding: '0 18px', borderRadius: 'var(--radius-2)', background: 'var(--brand)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving || !changed || hasError ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: saving || !changed || hasError ? 0.55 : 1 }}>
          {saving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />} {t('Enregistrer')}
        </button>
      </div>
    </form>
  );
}
