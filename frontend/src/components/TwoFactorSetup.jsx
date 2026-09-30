import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || '/api';

// Double authentification : par application (TOTP) ou par code envoyé par e-mail.
// Une seule méthode active à la fois ; la désactivation demande un code.
export default function TwoFactorSetup() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [method, setMethod]   = useState(undefined); // undefined (chargement) | null | 'totp' | 'email'
  // idle | setup_totp | disable_totp | enable_email | disable_email
  const [step, setStep]       = useState('idle');
  const [qrCode, setQrCode]   = useState('');
  const [secret, setSecret]   = useState('');
  const [code, setCode]       = useState('');
  const [sentTo, setSentTo]   = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`${API}/auth/2fa/status`, { headers })
      .then(r => r.json())
      .then(d => setMethod(d.method ?? (d.totpEnabled ? 'totp' : null)))
      .catch(() => setMethod(null));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const call = async (path, body) => {
    const res = await fetch(`${API}/auth/2fa/${path}`, { method: 'POST', headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message);
    return data;
  };

  const reset = () => { setStep('idle'); setCode(''); setQrCode(''); setSecret(''); setSentTo(''); };
  const focus = () => setTimeout(() => inputRef.current?.focus(), 100);

  const run = async (fn) => {
    setLoading(true);
    try { await fn(); } catch (err) { toast.error(err.message); setCode(''); } finally { setLoading(false); }
  };

  // ── Application (TOTP) ─────────────────────────────────────────────────────
  const startTotp = () => run(async () => {
    const data = await call('setup');
    setQrCode(data.qrCode);
    setSecret(data.secret);
    setStep('setup_totp');
    focus();
  });
  const confirmTotp = () => code.length === 6 && run(async () => {
    await call('enable', { code });
    toast.success(t('2FA activée !'));
    setMethod('totp');
    reset();
  });
  const disableTotp = () => code.length === 6 && run(async () => {
    await call('disable', { code });
    toast.success(t('2FA désactivée.'));
    setMethod(null);
    reset();
  });

  // ── E-mail ─────────────────────────────────────────────────────────────────
  const sendEmailCode = (nextStep) => run(async () => {
    const data = await call('email/send');
    setSentTo(data.maskedEmail);
    setStep(nextStep);
    setCode('');
    toast.success(data.message);
    focus();
  });
  const confirmEmail = () => code.length === 6 && run(async () => {
    const data = await call('email/enable', { code });
    toast.success(data.message);
    setMethod('email');
    reset();
  });
  const disableEmail = () => code.length === 6 && run(async () => {
    const data = await call('email/disable', { code });
    toast.success(data.message);
    setMethod(null);
    reset();
  });

  if (method === undefined) return null;

  const btn = (variant) => ({
    background: variant === 'primary' ? 'var(--brand)' : variant === 'danger' ? 'transparent' : 'transparent',
    color: variant === 'primary' ? '#fff' : variant === 'danger' ? '#dc2626' : 'var(--fg)',
    border: variant === 'primary' ? 'none' : `1px solid ${variant === 'danger' ? '#dc2626' : 'var(--border)'}`,
    borderRadius: 8, padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14,
  });

  // Saisie du code + boutons (commune à tous les parcours). Fonction de rendu,
  // pas un composant : sinon le champ serait recréé (et perdrait le focus) à chaque frappe.
  const renderCodeRow = ({ onConfirm, confirmLabel, danger, onResend }) => (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder={t('Code à 6 chiffres')}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && onConfirm()}
          style={{
            flex: '1 1 160px', padding: '10px 14px', borderRadius: 8,
            border: `1px solid ${danger ? '#dc2626' : 'var(--border)'}`, background: 'var(--input-bg)',
            color: 'var(--fg)', fontSize: 18, letterSpacing: 6, fontWeight: 700, textAlign: 'center',
          }}
        />
        <button onClick={onConfirm} disabled={loading || code.length < 6}
          style={{ ...btn('primary'), ...(danger ? { background: '#dc2626' } : {}), opacity: loading || code.length < 6 ? 0.6 : 1, cursor: loading || code.length < 6 ? 'not-allowed' : 'pointer' }}>
          {loading ? '…' : confirmLabel}
        </button>
        <button onClick={reset} style={{ ...btn(), color: 'var(--fg-muted)' }}>{t('Annuler')}</button>
      </div>
      {onResend && (
        <button onClick={onResend} disabled={loading}
          style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: 13, padding: 0 }}>
          {t('Je n’ai rien reçu : renvoyer un code')}
        </button>
      )}
    </div>
  );

  const statusLabel = method === 'totp' ? t('Activée · application') : method === 'email' ? t('Activée · e-mail') : t('Désactivée');

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '24px 28px', marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 22 }}>🔐</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{t('Double authentification (2FA)')}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            {t('En plus du mot de passe, un code à 6 chiffres est demandé à la connexion.')}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            background: method ? '#dcfce7' : '#fee2e2', color: method ? '#166534' : '#991b1b',
            padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* ── Choix de la méthode ── */}
      {step === 'idle' && !method && (
        <div style={{ display: 'grid', gap: 10 }}>
          <button onClick={startTotp} disabled={loading} style={{ ...btn(), textAlign: 'left', padding: '12px 16px' }}>
            📱 {t('Avec une application')} <span style={{ fontWeight: 400, color: 'var(--fg-muted)' }}>— {t('Google Authenticator, Microsoft Authenticator, Authy… (recommandé)')}</span>
          </button>
          <button onClick={() => sendEmailCode('enable_email')} disabled={loading} style={{ ...btn(), textAlign: 'left', padding: '12px 16px' }}>
            ✉️ {t('Par e-mail')} <span style={{ fontWeight: 400, color: 'var(--fg-muted)' }}>— {t('un code est envoyé à votre adresse à chaque connexion')}</span>
          </button>
        </div>
      )}

      {step === 'idle' && method === 'totp' && (
        <button onClick={() => { setStep('disable_totp'); setCode(''); focus(); }} style={btn('danger')}>{t('Désactiver la 2FA')}</button>
      )}
      {step === 'idle' && method === 'email' && (
        <button onClick={() => sendEmailCode('disable_email')} disabled={loading} style={btn('danger')}>{t('Désactiver la 2FA')}</button>
      )}

      {/* ── Application : QR code ── */}
      {step === 'setup_totp' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            <strong>{t('Étape 1 :')}</strong> {t('Scannez ce QR code avec')} <strong>Google Authenticator</strong> {t('ou')} <strong>Authy</strong>.<br />
            <strong>{t('Étape 2 :')}</strong> {t("Entrez le code à 6 chiffres généré par l'application.")}
          </p>
          {qrCode && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <img src={qrCode} alt="QR Code 2FA" style={{ width: 180, height: 180, borderRadius: 8, border: '1px solid var(--border)' }} />
            </div>
          )}
          {secret && (
            <div style={{
              background: 'var(--bg)', borderRadius: 8, padding: '10px 16px', fontFamily: 'monospace', fontSize: 13,
              color: 'var(--fg-muted)', textAlign: 'center', marginBottom: 20, wordBreak: 'break-all', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, marginBottom: 4 }}>{t('Clé manuelle (si QR indisponible)')}</div>
              <strong style={{ color: 'var(--fg)', letterSpacing: 2 }}>{secret}</strong>
            </div>
          )}
          {renderCodeRow({ onConfirm: confirmTotp, confirmLabel: t('Activer') })}
        </div>
      )}

      {step === 'disable_totp' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
            {t('Entrez le code de votre application d’authentification pour confirmer la désactivation.')}
          </p>
          {renderCodeRow({ onConfirm: disableTotp, confirmLabel: t('Désactiver'), danger: true })}
        </div>
      )}

      {/* ── E-mail ── */}
      {(step === 'enable_email' || step === 'disable_email') && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            {t('Un code à 6 chiffres a été envoyé à {{email}} (valable 10 minutes). Pensez à regarder dans les spams.', { email: sentTo })}
            {step === 'enable_email' && <><br />{t('Le saisir prouve que vous recevez bien nos e-mails : ce code vous sera ensuite demandé à chaque connexion.')}</>}
          </p>
          {renderCodeRow({
            onConfirm: step === 'enable_email' ? confirmEmail : disableEmail,
            confirmLabel: step === 'enable_email' ? t('Activer') : t('Désactiver'),
            danger: step === 'disable_email',
            onResend: () => sendEmailCode(step),
          })}
        </div>
      )}
    </div>
  );
}
