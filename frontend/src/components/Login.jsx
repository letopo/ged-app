// frontend/src/components/Login.jsx - VERSION AVEC REDIRECTION PAR RÔLE

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { LogIn, Mail, Lock, Loader, AlertCircle } from 'lucide-react';
import TwoFactorVerify from './TwoFactorVerify';

export default function Login({ onLogin }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const redirectByRole = (role) => {
    if (role === 'gardien') navigate('/portail');
    else if (role === 'agent_accueil_php' || role === 'agent_accueil_normal') navigate('/accueil');
    else if (role === 'caissier') navigate('/caisse');
    else navigate('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.username || !formData.password) { setError(t('Veuillez remplir tous les champs')); return; }

    try {
      setLoading(true);
      const response = await authAPI.login(formData);
      const data = response.data;

      if (data.requires2FA) {
        setTempToken(data.tempToken);
        setShow2FA(true);
        return;
      }

      if (onLogin) onLogin(data.token, data.user);
      redirectByRole(data.user.role);
    } catch (err) {
      setError(err.response?.data?.error || t('Erreur lors de la connexion'));
    } finally {
      setLoading(false);
    }
  };

  const handle2FASuccess = (data) => {
    if (onLogin) onLogin(data.token, data.user);
    redirectByRole(data.user.role);
  };

  if (show2FA) {
    return (
      <TwoFactorVerify
        tempToken={tempToken}
        onSuccess={handle2FASuccess}
        onBack={() => { setShow2FA(false); setTempToken(''); }}
      />
    );
  }

  const inputStyle = {
    width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-3)',
    background: 'var(--surface)', color: 'var(--fg)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 8 };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--brand-soft) 0%, var(--surface-2) 100%)',
      padding: '0 16px',
    }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-4)',
          boxShadow: 'var(--shadow-3)', border: '1px solid var(--border)', padding: 32,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, background: 'var(--brand-soft)', borderRadius: '50%', marginBottom: 16,
            }}>
              <LogIn size={30} style={{ color: 'var(--brand)' }} />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{t('Connexion')}</h2>
            <p style={{ color: 'var(--fg-muted)', marginTop: 8, fontSize: 14 }}>{t('Accédez à votre espace GED')}</p>
          </div>

          {error && (
            <div style={{
              marginBottom: 24, padding: 16,
              background: 'var(--danger-soft)', border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-3)', display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <AlertCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>{t("Nom d'utilisateur")}</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
                <input type="text" name="username" value={formData.username} onChange={handleChange}
                  style={inputStyle} placeholder={t("Entrez votre nom d'utilisateur")} disabled={loading} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t('Mot de passe')}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
                <input type="password" name="password" value={formData.password} onChange={handleChange}
                  style={inputStyle} placeholder={t('Entrez votre mot de passe')} disabled={loading} />
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px 16px',
              background: 'var(--brand)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-3)', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background .15s',
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--brand-active)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
            >
              {loading ? <><Loader size={18} className="animate-spin" />{t('Connexion en cours...')}</> : <><LogIn size={18} />{t('Se connecter')}</>}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
              {t('Pas encore de compte ?')}{' '}
              <Link to="/register" style={{ color: 'var(--brand)', fontWeight: 500, textDecoration: 'none' }}>
                {t('Créer un compte')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
