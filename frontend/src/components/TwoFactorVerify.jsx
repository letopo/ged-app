import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || '/api';

export default function TwoFactorVerify({ tempToken, onSuccess, onBack }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => { refs[0].current?.focus(); }, []);

  const handleChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    if (digit && i < 5) refs[i + 1].current?.focus();
    if (next.every(d => d !== '')) {
      submit(next.join(''));
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
    if (e.key === 'Enter' && code.every(d => d !== '')) {
      submit(code.join(''));
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      submit(pasted);
    }
  };

  const submit = async (fullCode) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/2fa/verify-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code: fullCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code invalide');
      onSuccess(data);
    } catch (err) {
      toast.error(err.message);
      setCode(['', '', '', '', '', '']);
      setTimeout(() => refs[0].current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', fontFamily: 'var(--font-sans)'
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 16, padding: '40px 36px',
        boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 380, textAlign: 'center'
      }}>
        {/* Icône */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--brand-soft)', margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26
        }}>
          🔐
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>
          Double authentification
        </h2>
        <p style={{ margin: '0 0 28px', fontSize: 14, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
          Ouvrez <strong>Google Authenticator</strong> et entrez le code à 6 chiffres.
        </p>

        {/* Champs 6 chiffres */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              disabled={loading}
              style={{
                width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700,
                borderRadius: 10, border: `2px solid ${digit ? 'var(--brand)' : 'var(--border)'}`,
                background: 'var(--input-bg)', color: 'var(--fg)',
                outline: 'none', transition: 'border-color 0.15s',
                caretColor: 'var(--brand)'
              }}
            />
          ))}
        </div>

        <button
          onClick={() => submit(code.join(''))}
          disabled={loading || code.some(d => !d)}
          style={{
            width: '100%', padding: '12px', borderRadius: 10,
            background: 'var(--brand)', color: '#fff', border: 'none',
            fontWeight: 700, fontSize: 15, cursor: loading || code.some(d => !d) ? 'not-allowed' : 'pointer',
            opacity: loading || code.some(d => !d) ? 0.6 : 1, marginBottom: 12
          }}
        >
          {loading ? 'Vérification…' : 'Valider'}
        </button>

        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: 'var(--fg-muted)',
            fontSize: 13, cursor: 'pointer', textDecoration: 'underline'
          }}
        >
          Retour à la connexion
        </button>
      </div>
    </div>
  );
}
