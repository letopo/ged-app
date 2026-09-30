// frontend/src/components/MailSettingsPanel.jsx
// Réglage de la messagerie (SMTP) d'un tenant : Paramètres › Messagerie (tenant
// courant) ou Clients SaaS (superadmin, `tenantId` fourni). Le mot de passe
// n'est jamais renvoyé par le serveur : on n'envoie qu'un nouveau mot de passe.
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, Mail, Send, Save, Eye, EyeOff, CheckCircle, AlertCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { mailSettingsAPI } from '../services/api';
import { inputStyle, hintStyle, btn, Field, Notice } from './SettingsFormParts';

const EMPTY = { enabled: false, host: '', port: '', security: 'starttls', username: '', fromName: '', fromEmail: '', replyTo: '', adminCanManage: false };
const GMAIL = { host: 'smtp.gmail.com', port: 587, security: 'starttls' };

export default function MailSettingsPanel({ tenantId = null, onAccessChange }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);       // réponse du serveur
  const [form, setForm] = useState(EMPTY);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [testTo, setTestTo] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const apply = (payload) => {
    setData(payload);
    const s = payload.settings;
    // Formulaire vierge : envoi coché (remplir la page, c'est vouloir envoyer ;
    // enregistrer sans cocher couperait tous les e-mails de l'organisation)
    setForm(s ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map(k => [k, s[k] ?? EMPTY[k]])) } : { ...EMPTY, enabled: true });
    setPassword('');
  };

  useEffect(() => {
    mailSettingsAPI.get(tenantId)
      .then(res => { apply(res.data); onAccessChange?.(res.data.canManage); })
      .catch(err => { setData({ error: err.response?.data?.message || t('Impossible de charger les réglages.') }); onAccessChange?.(false); });
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Loader size={20} className="animate-spin" color="var(--brand)" /></div>;
  if (data.error) return <Notice tone="error" icon={AlertCircle}>{data.error}</Notice>;
  if (!data.canManage) return <Notice tone="info" icon={Info}>{t('La messagerie est gérée par le super-administrateur.')}</Notice>;

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const s = data.settings;
  const isGmail = /gmail\.com$/i.test(form.host.trim());
  const payload = () => ({ ...form, port: form.port === '' ? '' : Number(form.port), ...(password ? { password } : {}) });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await mailSettingsAPI.save(payload(), tenantId);
      apply(res.data);
      toast.success(res.data.message || t('Enregistré'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur lors de l’enregistrement'));
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await mailSettingsAPI.test({ ...payload(), to: testTo }, tenantId);
      setTestResult({ ok: true, message: res.data.message });
    } catch (err) {
      setTestResult({ ok: false, message: err.response?.data?.message || t('Échec de l’envoi.') });
    } finally {
      setTesting(false);
    }
  };

  const fmt = (d) => (d ? new Date(d).toLocaleString() : null);

  return (
    <form onSubmit={save}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Mail size={20} /> {t('Messagerie')}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
        {t('Compte utilisé pour envoyer les notifications par e-mail de {{org}} (tâches de validation, documents reçus…).', { org: data.tenant?.name })}
      </p>

      {/* État actuel */}
      {data.source === 'server' ? (
        <Notice tone="info" icon={Info}>
          {data.server.enabled && data.server.configured
            ? t('Aucun réglage propre : les e-mails partent actuellement avec la messagerie configurée sur le serveur.')
            : t('Aucun réglage propre et la messagerie du serveur est désactivée : aucun e-mail n’est envoyé pour le moment.')}
        </Notice>
      ) : s?.lastError && (!s.lastSentAt || new Date(s.lastErrorAt) > new Date(s.lastSentAt)) ? (
        <Notice tone="error" icon={AlertCircle}>
          {t('Dernier envoi en échec le {{date}} :', { date: fmt(s.lastErrorAt) })} {s.lastError}
        </Notice>
      ) : s?.lastSentAt ? (
        <Notice tone="ok" icon={CheckCircle}>{t('Dernier e-mail envoyé le {{date}}.', { date: fmt(s.lastSentAt) })}</Notice>
      ) : null}
      {s?.passwordUnreadable && (
        <Notice tone="error" icon={AlertCircle}>{t('Le mot de passe enregistré ne peut plus être lu (clé de chiffrement du serveur changée) : ressaisissez-le.')}</Notice>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
        <input type="checkbox" checked={form.enabled} onChange={set('enabled')} style={{ width: 16, height: 16, accentColor: 'var(--brand)' }} />
        {t('Envoyer les notifications par e-mail')}
      </label>
      {!form.enabled && s && (
        <div style={{ ...hintStyle, marginTop: -12, marginBottom: 16 }}>{t('Désactivé : aucun e-mail ne part pour cette organisation (les notifications dans l’application restent actives).')}</div>
      )}

      {/* Serveur */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, margin: '4px 0 10px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{t('Serveur d’envoi (SMTP)')}</div>
        <button type="button" onClick={() => setForm(f => ({ ...f, ...GMAIL }))} style={{ ...btn(false), height: 28, fontSize: 12, fontWeight: 500 }}>
          {t('Remplir pour Gmail')}
        </button>
      </div>
      <div className="mail-grid">
        <Field label={t('Serveur')}><input style={inputStyle} value={form.host} onChange={set('host')} placeholder="smtp.gmail.com" /></Field>
        <Field label={t('Port')}><input style={inputStyle} value={form.port} onChange={set('port')} inputMode="numeric" placeholder="587" /></Field>
        <Field label={t('Sécurité')}>
          <select style={inputStyle} value={form.security} onChange={set('security')}>
            <option value="starttls">{t('STARTTLS (port 587)')}</option>
            <option value="ssl">{t('SSL/TLS (port 465)')}</option>
            <option value="none">{t('Aucune (réseau interne)')}</option>
          </select>
        </Field>
      </div>
      <Field label={t('Compte (identifiant)')} hint={isGmail ? t('Adresse Gmail complète, ex. notifications@gmail.com') : null}>
        <input style={inputStyle} value={form.username} onChange={set('username')} autoComplete="off" placeholder="notifications@exemple.com" />
      </Field>
      <Field label={t('Mot de passe')}
        hint={s?.hasPassword && !password ? t('Un mot de passe est enregistré. Laissez vide pour le conserver.') : null}>
        <div style={{ position: 'relative' }}>
          <input style={{ ...inputStyle, paddingRight: 38 }} type={showPassword ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)} autoComplete="new-password"
            placeholder={s?.hasPassword ? '••••••••••••' : ''} />
          <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={t('Afficher le mot de passe')}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4 }}>
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </Field>
      {isGmail && (
        <Notice tone="info" icon={Info}>
          <b>{t('Gmail : utilisez un « mot de passe d’application »')}</b>, {t('pas le mot de passe habituel du compte (Google le refuse).')}
          <ol style={{ margin: '6px 0 0', paddingLeft: 18, listStyle: 'decimal' }}>
            <li>{t('Activez la validation en deux étapes sur le compte Google.')}</li>
            <li>{t('Ouvrez')} <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)' }}>myaccount.google.com/apppasswords</a>{t(', créez un mot de passe nommé « GED ».')}</li>
            <li>{t('Collez ici les 16 caractères affichés (les espaces sont retirés automatiquement).')}</li>
          </ol>
          <div style={{ marginTop: 6 }}>{t('Gmail envoie toujours depuis l’adresse du compte : l’adresse d’expéditeur ci-dessous doit être ce compte ou un alias déclaré dans Gmail.')}</div>
        </Notice>
      )}

      {/* Expéditeur */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '8px 0 10px' }}>{t('Expéditeur')}</div>
      <Field label={t('Nom affiché')} hint={t('Par défaut : « GED {{org}} »', { org: data.tenant?.name })}>
        <input style={inputStyle} value={form.fromName} onChange={set('fromName')} placeholder={`GED ${data.tenant?.name || ''}`} />
      </Field>
      <div className="mail-grid mail-grid-2">
        <Field label={t('Adresse d’expéditeur')} hint={t('Par défaut : le compte ci-dessus')}>
          <input style={inputStyle} value={form.fromEmail} onChange={set('fromEmail')} placeholder={form.username || 'notifications@exemple.com'} />
        </Field>
        <Field label={t('Adresse de réponse')} hint={t('Facultatif : où arrivent les réponses')}>
          <input style={inputStyle} value={form.replyTo} onChange={set('replyTo')} placeholder="secretariat@exemple.com" />
        </Field>
      </div>

      {data.canDelegate && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '8px 0 20px', cursor: 'pointer', fontSize: 13, color: 'var(--fg)' }}>
          <input type="checkbox" checked={form.adminCanManage} onChange={set('adminCanManage')} style={{ width: 16, height: 16, marginTop: 1, accentColor: 'var(--brand)' }} />
          <span>
            {t('Autoriser les administrateurs de {{org}} à gérer ces réglages', { org: data.tenant?.name })}
            <span style={{ display: 'block', ...hintStyle }}>{t('Ils ne verront que la messagerie de leur organisation. Réservé au super-administrateur.')}</span>
          </span>
        </label>
      )}

      {/* Test */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', padding: 14, marginBottom: 20, background: 'var(--surface-2)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>{t('Tester avant d’enregistrer')}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input style={{ ...inputStyle, flex: '1 1 220px', background: 'var(--surface)' }} value={testTo} onChange={e => setTestTo(e.target.value)} placeholder={t('Destinataire du test')} />
          <button type="button" onClick={test} disabled={testing || !form.host} style={{ ...btn(false), opacity: testing || !form.host ? 0.6 : 1 }}>
            {testing ? <Loader size={13} className="animate-spin" /> : <Send size={13} />} {t('Envoyer un e-mail de test')}
          </button>
        </div>
        {testResult && (
          <div style={{ marginTop: 10, marginBottom: -16 }}>
            <Notice tone={testResult.ok ? 'ok' : 'error'} icon={testResult.ok ? CheckCircle : AlertCircle}>{testResult.message}</Notice>
          </div>
        )}
        {!testResult && s?.lastTestAt && (
          <div style={{ ...hintStyle, marginTop: 8 }}>
            {s.lastTestOk ? t('Dernier test réussi le {{date}}.', { date: fmt(s.lastTestAt) }) : t('Dernier test échoué le {{date}} : {{error}}', { date: fmt(s.lastTestAt), error: s.lastTestError })}
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
