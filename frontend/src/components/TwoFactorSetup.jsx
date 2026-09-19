import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || '/api';

export default function TwoFactorSetup() {
  const { token } = useAuth();
  const [status, setStatus]   = useState(null);   // null | 'enabled' | 'disabled'
  const [step, setStep]       = useState('idle'); // idle | setup | confirm_disable
  const [qrCode, setQrCode]   = useState('');
  const [secret, setSecret]   = useState('');
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`${API}/auth/2fa/status`, { headers })
      .then(r => r.json())
      .then(d => setStatus(d.totpEnabled ? 'enabled' : 'disabled'))
      .catch(() => setStatus('disabled'));
  }, [token]);

  const startSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/2fa/setup`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep('setup');
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmEnable = async () => {
    if (!code || code.length < 6) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/2fa/enable`, {
        method: 'POST', headers,
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('2FA activée !');
      setStatus('enabled');
      setStep('idle');
      setCode('');
      setQrCode('');
      setSecret('');
    } catch (err) {
      toast.error(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const confirmDisable = async () => {
    if (!code || code.length < 6) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/2fa/disable`, {
        method: 'POST', headers,
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('2FA désactivée.');
      setStatus('disabled');
      setStep('idle');
      setCode('');
    } catch (err) {
      toast.error(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  if (status === null) return null;

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 12,
      border: '1px solid var(--border)', padding: '24px 28px', marginTop: 24
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 22 }}>🔐</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Double authentification (2FA)</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            Sécurisez votre compte avec Google Authenticator ou Authy
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            background: status === 'enabled' ? '#dcfce7' : '#fee2e2',
            color: status === 'enabled' ? '#166534' : '#991b1b',
            padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600
          }}>
            {status === 'enabled' ? 'Activée' : 'Désactivée'}
          </span>
        </div>
      </div>

      {/* ── Idle ── */}
      {step === 'idle' && status === 'disabled' && (
        <button
          onClick={startSetup}
          disabled={loading}
          style={{
            background: 'var(--brand)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '9px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14
          }}
        >
          {loading ? 'Chargement…' : 'Configurer la 2FA'}
        </button>
      )}

      {step === 'idle' && status === 'enabled' && (
        <button
          onClick={() => { setStep('confirm_disable'); setCode(''); setTimeout(() => inputRef.current?.focus(), 100); }}
          style={{
            background: 'transparent', color: '#dc2626', border: '1px solid #dc2626',
            borderRadius: 8, padding: '9px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14
          }}
        >
          Désactiver la 2FA
        </button>
      )}

      {/* ── Setup : QR code ── */}
      {step === 'setup' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            <strong>Étape 1 :</strong> Scannez ce QR code avec <strong>Google Authenticator</strong> ou <strong>Authy</strong>.<br />
            <strong>Étape 2 :</strong> Entrez le code à 6 chiffres généré par l'application.
          </p>

          {qrCode && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <img src={qrCode} alt="QR Code 2FA" style={{ width: 180, height: 180, borderRadius: 8, border: '1px solid var(--border)' }} />
            </div>
          )}

          {secret && (
            <div style={{
              background: 'var(--bg)', borderRadius: 8, padding: '10px 16px',
              fontFamily: 'monospace', fontSize: 13, color: 'var(--fg-muted)',
              textAlign: 'center', marginBottom: 20, wordBreak: 'break-all',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: 11, marginBottom: 4 }}>Clé manuelle (si QR indisponible)</div>
              <strong style={{ color: 'var(--fg)', letterSpacing: 2 }}>{secret}</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Code à 6 chiffres"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && confirmEnable()}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--input-bg)',
                color: 'var(--fg)', fontSize: 18, letterSpacing: 6, fontWeight: 700,
                textAlign: 'center'
              }}
            />
            <button
              onClick={confirmEnable}
              disabled={loading || code.length < 6}
              style={{
                background: 'var(--brand)', color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 20px', fontWeight: 600,
                cursor: loading || code.length < 6 ? 'not-allowed' : 'pointer',
                opacity: loading || code.length < 6 ? 0.6 : 1, fontSize: 14
              }}
            >
              {loading ? '…' : 'Activer'}
            </button>
            <button
              onClick={() => { setStep('idle'); setCode(''); setQrCode(''); setSecret(''); }}
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 16px', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 14
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Désactivation ── */}
      {step === 'confirm_disable' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
            Entrez votre code Google Authenticator pour confirmer la désactivation.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Code à 6 chiffres"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && confirmDisable()}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 8,
                border: '1px solid #dc2626', background: 'var(--input-bg)',
                color: 'var(--fg)', fontSize: 18, letterSpacing: 6, fontWeight: 700,
                textAlign: 'center'
              }}
            />
            <button
              onClick={confirmDisable}
              disabled={loading || code.length < 6}
              style={{
                background: '#dc2626', color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 20px', fontWeight: 600,
                cursor: loading || code.length < 6 ? 'not-allowed' : 'pointer',
                opacity: loading || code.length < 6 ? 0.6 : 1, fontSize: 14
              }}
            >
              {loading ? '…' : 'Désactiver'}
            </button>
            <button
              onClick={() => { setStep('idle'); setCode(''); }}
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 16px', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 14
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
