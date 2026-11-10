// frontend/src/components/DmeSettingsPanel.jsx
// Paramètres › Intégrations › DME (Dossier Médical Électronique de l'hôpital) :
// base MySQL lue par la GED, en LECTURE SEULE, pour joindre à la liasse PHP les
// ordonnances signées par les patients et les bulletins d'examens.
// Le mot de passe est chiffré dans la GED et n'est jamais renvoyé.
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, Stethoscope, Eye, EyeOff, CheckCircle, AlertCircle, Info, Plug } from 'lucide-react';
import toast from 'react-hot-toast';
import { integrationsAPI } from '../services/api';
import { inputStyle, hintStyle, btn, Field, Notice, SectionTitle, EnableToggle } from './SettingsFormParts';

export default function DmeSettingsPanel({ tenantId = null }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [cfg, setCfg] = useState({});
  const [adminCanManage, setAdminCanManage] = useState(false);
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState('');

  const apply = (payload) => {
    setData(payload);
    const i = payload.integration || {};
    setEnabled(Boolean(i.enabled));
    setCfg({ ...(i.config || {}) });
    setAdminCanManage(Boolean(i.adminCanManage));
    setSecret('');
  };
  useEffect(() => {
    integrationsAPI.get('dme', tenantId)
      .then((res) => apply(res.data))
      .catch((err) => setData({ error: err.response?.data?.message || t('Impossible de charger les réglages.') }));
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Loader size={20} className="animate-spin" color="var(--brand)" /></div>;
  if (data.error) return <Notice tone="error" icon={AlertCircle}>{data.error}</Notice>;
  if (!data.canManage) return null;

  const i = data.integration;
  const set = (k) => (e) => setCfg((c) => ({ ...c, [k]: e.target.value }));
  const fmt = (d) => (d ? new Date(d).toLocaleString() : null);
  const hasPassword = Boolean(secret || i?.hasSecret);
  const payload = () => ({ enabled, config: cfg, ...(secret ? { secret } : {}), ...(data.canDelegate ? { adminCanManage } : {}) });

  const run = async (kind, fn) => {
    setBusy(kind); setResult(null);
    try {
      const res = await fn();
      if (kind === 'save') { apply(res.data); toast.success(res.data.message || t('Réglages enregistrés.')); }
      else setResult({ ok: true, message: res.data.message, tables: res.data.tables || [], writes: res.data.droitsEcriture });
    } catch (err) {
      const message = err.response?.data?.message || t('Échec.');
      if (kind === 'save') toast.error(message); else setResult({ ok: false, message });
    } finally { setBusy(null); }
  };
  const tables = (result?.tables || []).filter((x) => !filter || x.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <form onSubmit={(e) => { e.preventDefault(); run('save', () => integrationsAPI.save('dme', payload(), tenantId)); }} style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Stethoscope size={20} /> {t('Intégrations · DME')}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
        {t('Dossier Médical Électronique de l’hôpital (base MySQL). La GED y lira les ordonnances signées par les patients et les bulletins d’examens pour les joindre à la liasse des factures PHP. Lecture seule : la GED ne modifie jamais le DME.')}
      </p>
      {i?.secretUnreadable && <Notice tone="error" icon={AlertCircle}>{t('Le mot de passe enregistré ne peut plus être lu (clé de chiffrement du serveur changée) : ressaisissez-le.')}</Notice>}

      <EnableToggle checked={enabled} onChange={(e) => setEnabled(e.target.checked)}>{t('Activer la liaison avec le DME')}</EnableToggle>

      <SectionTitle>{t('Connexion à la base du DME (MySQL)')}</SectionTitle>
      <div className="mail-grid">
        <Field label={t('Serveur')} hint={t('Adresse du serveur du DME (ex. 192.168.10.79).')}>
          <input style={inputStyle} value={cfg.host || ''} onChange={set('host')} placeholder="192.168.10.79" />
        </Field>
        <Field label={t('Port')}><input style={inputStyle} value={cfg.port ?? ''} onChange={set('port')} inputMode="numeric" placeholder="3306" /></Field>
        <Field label={t('Base de données')}><input style={inputStyle} value={cfg.database || ''} onChange={set('database')} placeholder="DME_HOSPITAL" /></Field>
      </div>
      <div className="mail-grid mail-grid-2">
        <Field label={t('Utilisateur')} hint={t('Un compte MySQL en lecture seule (droit SELECT), autorisé depuis le serveur de la GED.')}>
          <input style={inputStyle} value={cfg.username || ''} onChange={set('username')} autoComplete="off" placeholder="ged" />
        </Field>
        <Field label={t('Mot de passe')} hint={i?.hasSecret && !secret ? t('Un mot de passe est enregistré. Laissez vide pour le conserver.') : null}>
          <div style={{ position: 'relative' }}>
            <input style={{ ...inputStyle, paddingRight: 38 }} type={showSecret ? 'text' : 'password'} value={secret}
              onChange={(e) => setSecret(e.target.value)} autoComplete="new-password" placeholder={i?.hasSecret ? '••••••••••••' : ''} />
            <button type="button" onClick={() => setShowSecret((v) => !v)} aria-label={t('Afficher le mot de passe')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4 }}>
              {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button type="button" onClick={() => run('test', () => integrationsAPI.test('dme', payload(), tenantId))}
          disabled={busy || !cfg.host || !hasPassword} style={{ ...btn(false), opacity: busy || !cfg.host || !hasPassword ? 0.6 : 1 }}>
          {busy === 'test' ? <Loader size={13} className="animate-spin" /> : <Plug size={13} />} {t('Tester la connexion')}
        </button>
        {result && (
          <div style={{ marginTop: 10 }}>
            <Notice tone={result.ok ? (result.writes ? 'warning' : 'ok') : 'error'} icon={result.ok ? CheckCircle : AlertCircle}>{result.message}</Notice>
            {result.ok && result.tables.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <strong style={{ fontSize: 13 }}>{t('Tables de la base')}</strong>
                  <span style={hintStyle}>{t('noms et nombre de lignes seulement, aucune donnée de patient')}</span>
                  <input style={{ ...inputStyle, height: 30, maxWidth: 200, marginLeft: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('Filtrer…')} />
                </div>
                <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      {tables.map((x) => (
                        <tr key={x.name} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '5px 8px', fontFamily: 'var(--font-mono)' }}>{x.name}</td>
                          <td style={{ padding: '5px 8px', color: 'var(--fg-muted)' }}>{x.comment || ''}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{x.rows.toLocaleString('fr-FR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        {!result && i?.lastTestAt && (
          <div style={{ ...hintStyle, marginTop: 8 }}>
            {i.lastTestOk ? t('Dernier test réussi le {{date}}.', { date: fmt(i.lastTestAt) }) : t('Dernier test échoué le {{date}} : {{error}}', { date: fmt(i.lastTestAt), error: i.lastTestError })}
          </div>
        )}
      </div>

      <Notice tone="info" icon={Info}>
        {t('Si le test indique que le serveur refuse la connexion : sur le serveur du DME, MySQL doit écouter le réseau (bind-address) et le pare-feu doit autoriser l’adresse du serveur de la GED sur le port 3306. Donnez au compte uniquement le droit SELECT sur la base.')}
      </Notice>

      {data.canDelegate && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '14px 0' }}>
          <input type="checkbox" checked={adminCanManage} onChange={(e) => setAdminCanManage(e.target.checked)} />
          {t('Autoriser les administrateurs de l’organisation à gérer ce réglage')}
        </label>
      )}
      <button type="submit" disabled={!!busy} style={btn(true)}>{busy === 'save' ? <Loader size={13} className="animate-spin" /> : null} {t('Enregistrer')}</button>
    </form>
  );
}
