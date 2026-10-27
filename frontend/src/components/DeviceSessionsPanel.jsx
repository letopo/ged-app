// frontend/src/components/DeviceSessionsPanel.jsx
// Paramètres › Sécurité : session de cet appareil (« Rester connecté » ou non)
// et « Déconnecter mes autres appareils » (téléphone perdu, poste prêté…).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, MonitorSmartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { getTokenExpiry, isRememberedSession } from '../utils/authSession';

export default function DeviceSessionsPanel() {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const remembered = isRememberedSession(token);
  const expiry = getTokenExpiry(token);

  const logoutOthers = async () => {
    setLoading(true);
    try {
      await authAPI.logoutOtherDevices(); // nouveau jeton repris par services/api.js
      toast.success(t('Vos autres appareils ont été déconnectés.'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('Erreur lors de la déconnexion des autres appareils.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '24px 28px', marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <MonitorSmartphone size={22} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{t('Appareils connectés')}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>
            {remembered
              ? t('Cet appareil reste connecté (« Rester connecté sur cet appareil »).')
              : t('Cet appareil se déconnecte après une période d’inactivité.')}
            {expiry && <> {t('Reconnexion demandée le {{date}}.', { date: new Date(expiry).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }) })}</>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 8 }}>
            {t('Téléphone perdu, ordinateur prêté ou oublié ouvert : déconnectez tous vos autres appareils. Celui-ci reste connecté.')}
          </div>
        </div>
        <button type="button" onClick={logoutOthers} disabled={loading} style={{
          height: 36, padding: '0 16px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)',
          background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1, alignSelf: 'center',
        }}>
          {loading && <Loader size={13} className="animate-spin" />}
          {t('Déconnecter mes autres appareils')}
        </button>
      </div>
    </div>
  );
}
