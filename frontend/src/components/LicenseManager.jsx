// frontend/src/components/LicenseManager.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { ShieldCheck, ShieldAlert, Key } from 'lucide-react';
import toast from 'react-hot-toast';

const LicenseManager = () => {
  const { t } = useTranslation();
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { checkStatus(); }, []);

  const checkStatus = async () => {
    try {
      const res = await api.get('/license/status');
      setStatus(res.data);
    } catch (error) {
      console.error('Erreur statut licence', error);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/license/activate', { licenseKey });
      if (res.data.success) {
        toast.success(t('Licence activée avec succès !'));
        setStatus({ active: true, client: res.data.info.clientName, expiresAt: res.data.info.expiresAt });
        setLicenseKey('');
      }
    } catch (error) {
      toast.error(t('Erreur : {{message}}', { message: error.response?.data?.message || t('Clé invalide') }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: 24, background: 'var(--surface)', borderRadius: 'var(--radius-3)',
      boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)',
      maxWidth: 512, margin: '40px auto',
    }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Key size={20} style={{ color: 'var(--brand)' }} />
        {t('Gestion de la Licence')}
      </h2>

      {/* État actuel */}
      <div style={{
        padding: 16, borderRadius: 'var(--radius-3)', marginBottom: 24,
        background: status?.active ? 'var(--success-soft)' : 'var(--danger-soft)',
        border: `1px solid ${status?.active ? 'var(--success)' : 'var(--danger)'}`,
      }}>
        {status?.active ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <ShieldCheck size={22} style={{ color: 'var(--success)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <h3 style={{ fontWeight: 700, color: 'var(--success)', fontSize: 14, margin: '0 0 4px' }}>{t('Licence Active')}</h3>
              <p style={{ fontSize: 13, color: 'var(--fg)', margin: '0 0 2px' }}>{t('Client : {{client}}', { client: status.client })}</p>
              <p style={{ fontSize: 13, color: 'var(--fg)', margin: 0 }}>{t('Expire le : {{date}}', { date: new Date(status.expiresAt).toLocaleDateString() })}</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShieldAlert size={22} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <h3 style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 14, margin: 0 }}>{t('Aucune licence valide détectée')}</h3>
          </div>
        )}
      </div>

      {/* Activation */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 8 }}>
          {t('Activer une nouvelle clé')}
        </label>
        <textarea
          value={licenseKey}
          onChange={e => setLicenseKey(e.target.value)}
          placeholder={t('Collez votre clé de licence ici (eyJh...)')}
          style={{
            width: '100%', padding: 12, height: 96, fontSize: 12,
            fontFamily: 'var(--font-mono)', border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-3)', background: 'var(--surface-2)',
            color: 'var(--fg)', resize: 'none', outline: 'none', marginBottom: 16,
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={handleActivate}
          disabled={loading || !licenseKey}
          style={{
            width: '100%', padding: '10px 16px',
            background: 'var(--brand)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-3)',
            fontSize: 14, fontWeight: 500, cursor: (loading || !licenseKey) ? 'not-allowed' : 'pointer',
            opacity: (loading || !licenseKey) ? 0.5 : 1, transition: 'background .15s',
          }}
          onMouseEnter={e => { if (!loading && licenseKey) e.currentTarget.style.background = 'var(--brand-active)'; }}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
        >
          {loading ? t('Vérification...') : t('Activer la licence')}
        </button>
      </div>
    </div>
  );
};

export default LicenseManager;
