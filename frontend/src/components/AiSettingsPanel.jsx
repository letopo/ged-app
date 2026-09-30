// frontend/src/components/AiSettingsPanel.jsx
// Paramètres › IA · OCR : clé d'API Anthropic et modèle utilisés pour lire
// automatiquement factures PHP et pièces comptables. Tenant courant, ou
// `tenantId` fourni (Clients SaaS, superadmin). La clé n'est jamais renvoyée.
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, Sparkles, Save, Eye, EyeOff, CheckCircle, AlertCircle, Info, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { integrationsAPI } from '../services/api';
import { inputStyle, hintStyle, btn, Field, Notice, SectionTitle, EnableToggle } from './SettingsFormParts';

export default function AiSettingsPanel({ tenantId = null }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [enabled, setEnabled] = useState(true);
  const [model, setModel] = useState('');
  const [adminCanManage, setAdminCanManage] = useState(false);
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const apply = (payload) => {
    setData(payload);
    const i = payload.integration || {};
    // Sans réglage propre : case cochée (remplir la page, c'est vouloir l'utiliser)
    setEnabled(payload.source === 'tenant' ? Boolean(i.enabled) : true);
    setModel(i.config?.model || '');
    setAdminCanManage(Boolean(i.adminCanManage));
    setSecret('');
  };

  useEffect(() => {
    integrationsAPI.get('ai', tenantId)
      .then(res => apply(res.data))
      .catch(err => setData({ error: err.response?.data?.message || t('Impossible de charger les réglages.') }));
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Loader size={20} className="animate-spin" color="var(--brand)" /></div>;
  if (data.error) return <Notice tone="error" icon={AlertCircle}>{data.error}</Notice>;
  if (!data.canManage) return <Notice tone="info" icon={Info}>{t('Ce réglage est géré par le super-administrateur.')}</Notice>;

  const i = data.integration;
  const fmt = (d) => (d ? new Date(d).toLocaleString() : null);
  const payload = () => ({ enabled, config: { model }, ...(secret ? { secret } : {}), ...(data.canDelegate ? { adminCanManage } : {}) });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await integrationsAPI.save('ai', payload(), tenantId);
      apply(res.data);
      toast.success(res.data.message || t('Réglages enregistrés.'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur lors de l’enregistrement'));
    } finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await integrationsAPI.test('ai', payload(), tenantId);
      setTestResult({ ok: true, message: res.data.message });
    } catch (err) {
      setTestResult({ ok: false, message: err.response?.data?.message || t('Échec du test.') });
    } finally { setTesting(false); }
  };

  return (
    <form onSubmit={save}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={20} /> {t('IA · OCR')}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
        {t('Compte d’intelligence artificielle (Anthropic) qui lit automatiquement les factures PHP et les pièces comptables de {{org}} pour pré-remplir montants, dates et fournisseurs.', { org: data.tenant?.name })}
      </p>

      {data.source === 'server' && (
        <Notice tone="info" icon={Info}>
          {data.server?.configured
            ? t('Aucun réglage propre : la clé configurée sur le serveur est utilisée (modèle {{model}}).', { model: data.server.model })
            : t('Aucun réglage propre et aucune clé sur le serveur : la lecture automatique est indisponible.')}
        </Notice>
      )}
      {i?.secretUnreadable && (
        <Notice tone="error" icon={AlertCircle}>{t('La clé enregistrée ne peut plus être lue (clé de chiffrement du serveur changée) : ressaisissez-la.')}</Notice>
      )}

      <EnableToggle checked={enabled} onChange={e => setEnabled(e.target.checked)}>{t('Lire automatiquement les documents avec l’IA')}</EnableToggle>
      {!enabled && data.source === 'tenant' && (
        <div style={{ ...hintStyle, marginTop: -12, marginBottom: 16 }}>{t('Désactivé : les montants et dates sont saisis à la main.')}</div>
      )}

      <SectionTitle>{t('Compte Anthropic')}</SectionTitle>
      <Field label={t('Clé d’API')}
        hint={i?.hasSecret && !secret ? t('Une clé est enregistrée. Laissez vide pour la conserver.') : t('Créée sur console.anthropic.com › API Keys ; elle commence par « sk-ant- ».')}>
        <div style={{ position: 'relative' }}>
          <input style={{ ...inputStyle, paddingRight: 38 }} type={showSecret ? 'text' : 'password'} value={secret}
            onChange={e => setSecret(e.target.value)} autoComplete="new-password" placeholder={i?.hasSecret ? '••••••••••••' : 'sk-ant-…'} />
          <button type="button" onClick={() => setShowSecret(v => !v)} aria-label={t('Afficher la clé')}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4 }}>
            {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </Field>
      <Field label={t('Modèle')} hint={t('Sonnet : bon équilibre fiabilité/coût. Haiku : plus rapide et moins cher. Opus : le plus précis.')}>
        <input style={inputStyle} value={model} onChange={e => setModel(e.target.value)} list="ai-models" placeholder={data.server?.model} />
        <datalist id="ai-models">{(data.models || []).map(m => <option key={m} value={m} />)}</datalist>
      </Field>

      {data.canDelegate && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '4px 0 20px', cursor: 'pointer', fontSize: 13, color: 'var(--fg)' }}>
          <input type="checkbox" checked={adminCanManage} onChange={e => setAdminCanManage(e.target.checked)} style={{ width: 16, height: 16, marginTop: 1, accentColor: 'var(--brand)' }} />
          <span>
            {t('Autoriser les administrateurs de {{org}} à gérer ces réglages', { org: data.tenant?.name })}
            <span style={{ display: 'block', ...hintStyle }}>{t('Ils ne verront que les réglages de leur organisation. Réservé au super-administrateur.')}</span>
          </span>
        </label>
      )}

      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', padding: 14, marginBottom: 20, background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{t('Vérifier la clé et le modèle')}</div>
          <button type="button" onClick={test} disabled={testing || (!secret && !i?.hasSecret)} style={{ ...btn(false), opacity: testing || (!secret && !i?.hasSecret) ? 0.6 : 1 }}>
            {testing ? <Loader size={13} className="animate-spin" /> : <Zap size={13} />} {t('Tester')}
          </button>
        </div>
        {testResult && (
          <div style={{ marginTop: 10, marginBottom: -16 }}>
            <Notice tone={testResult.ok ? 'ok' : 'error'} icon={testResult.ok ? CheckCircle : AlertCircle}>{testResult.message}</Notice>
          </div>
        )}
        {!testResult && i?.lastTestAt && (
          <div style={{ ...hintStyle, marginTop: 8 }}>
            {i.lastTestOk ? t('Dernier test réussi le {{date}}.', { date: fmt(i.lastTestAt) }) : t('Dernier test échoué le {{date}} : {{error}}', { date: fmt(i.lastTestAt), error: i.lastTestError })}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" disabled={saving} style={{ ...btn(true), opacity: saving ? 0.7 : 1 }}>
          {saving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />} {t('Enregistrer')}
        </button>
      </div>
    </form>
  );
}
