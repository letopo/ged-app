// frontend/src/components/Register.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { UserPlus, Mail, Lock, User, Loader, AlertCircle, CheckCircle } from 'lucide-react';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '', firstName: '', lastName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!formData.username || !formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setError(t('Veuillez remplir tous les champs obligatoires')); return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(t('Les mots de passe ne correspondent pas')); return;
    }
    if (formData.password.length < 6) {
      setError(t('Le mot de passe doit contenir au moins 6 caractères')); return;
    }

    try {
      setLoading(true);
      await authAPI.register({
        username: formData.username, email: formData.email, password: formData.password,
        firstName: formData.firstName, lastName: formData.lastName
      });
      setSuccess(t('Compte créé avec succès ! Redirection...'));
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || t('Erreur lors de la création du compte'));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-3)',
    background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  };
  const inputWithIconStyle = { ...inputStyle, paddingLeft: 40 };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--brand-soft) 0%, var(--surface-2) 100%)',
      padding: '32px 16px',
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
              <UserPlus size={30} style={{ color: 'var(--brand)' }} />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{t('Créer un compte')}</h2>
            <p style={{ color: 'var(--fg-muted)', marginTop: 8, fontSize: 14 }}>{t('Rejoignez notre plateforme GED')}</p>
          </div>

          {error && (
            <div style={{ marginBottom: 20, padding: 14, background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-3)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ marginBottom: 20, padding: 14, background: 'var(--success-soft)', border: '1px solid var(--success)', borderRadius: 'var(--radius-3)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: 'var(--success)', fontSize: 13 }}>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>{t('Prénom *')}</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} style={inputStyle} disabled={loading} />
              </div>
              <div>
                <label style={labelStyle}>{t('Nom *')}</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} style={inputStyle} disabled={loading} />
              </div>
            </div>

            {[
              { label: t("Nom d'utilisateur *"), name: 'username', type: 'text', Icon: User },
              { label: t('Email *'), name: 'email', type: 'email', Icon: Mail },
              { label: t('Mot de passe *'), name: 'password', type: 'password', Icon: Lock },
              { label: t('Confirmer le mot de passe *'), name: 'confirmPassword', type: 'password', Icon: Lock },
            ].map(({ label, name, type, Icon }) => (
              <div key={name}>
                <label style={labelStyle}>{label}</label>
                <div style={{ position: 'relative' }}>
                  <Icon size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
                  <input type={type} name={name} value={formData[name]} onChange={handleChange}
                    style={inputWithIconStyle} disabled={loading} />
                </div>
              </div>
            ))}

            <button type="submit" disabled={loading} style={{
              marginTop: 4, width: '100%', padding: '12px 16px',
              background: 'var(--brand)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-3)', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background .15s',
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--brand-active)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
            >
              {loading
                ? <><Loader size={18} className="animate-spin" />{t('Création en cours...')}</>
                : <><UserPlus size={18} />{t('Créer mon compte')}</>}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
              {t('Vous avez déjà un compte ?')}{' '}
              <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 500, textDecoration: 'none' }}>
                {t('Se connecter')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
