// frontend/src/components/DeviceSessionsPanel.jsx
// Paramètres › Sécurité › Appareils connectés : appareils où le compte est
// connecté (navigateur, système, IP, dates), déconnexion d'un appareil ou de
// tous les autres (téléphone perdu, poste prêté…).
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, Monitor, Smartphone, Tablet, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { getTokenExpiry, isRememberedSession } from '../utils/authSession';

const DEVICE_ICONS = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };

// « il y a 3 min », « hier »… (moins d'une minute : « à l'instant »)
function relative(date, lang, t) {
  const diff = (new Date(date).getTime() - Date.now()) / 1000;
  if (Math.abs(diff) < 60) return t('à l’instant');
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  for (const [unit, sec] of [['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (Math.abs(diff) >= sec) return rtf.format(Math.round(diff / sec), unit);
  }
  return rtf.format(Math.round(diff), 'second');
}

const badge = (bg, fg) => ({ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: bg, color: fg, whiteSpace: 'nowrap' });
const button = (busy) => ({
  height: 32, padding: '0 12px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)',
  background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6, opacity: busy ? 0.7 : 1, flexShrink: 0,
});

export default function DeviceSessionsPanel() {
  const { t, i18n } = useTranslation();
  const { token, logout } = useAuth();
  const [sessions, setSessions] = useState(null);
  const [currentKnown, setCurrentKnown] = useState(true);
  const [busy, setBusy] = useState(null); // id de l'appareil en cours, 'others'
  const remembered = isRememberedSession(token);
  const expiry = getTokenExpiry(token);
  const lang = i18n.language;
  const fmtDate = (d) => new Date(d).toLocaleString(lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const load = useCallback(() => {
    authAPI.getDeviceSessions()
      .then(res => { setSessions(res.data.sessions); setCurrentKnown(res.data.currentKnown); })
      .catch(() => setSessions([]));
  }, []);
  useEffect(() => { load(); }, [load, token]);

  const revoke = async (s) => {
    setBusy(s.id);
    try {
      await authAPI.revokeDeviceSession(s.id);
      if (s.current) { logout(); return; }
      toast.success(t('Appareil déconnecté.'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || t('Erreur lors de la déconnexion de l’appareil.'));
    } finally {
      setBusy(null);
    }
  };

  const logoutOthers = async () => {
    setBusy('others');
    try {
      await authAPI.logoutOtherDevices(); // nouveau jeton repris par services/api.js
      toast.success(t('Vos autres appareils ont été déconnectés.'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || t('Erreur lors de la déconnexion des autres appareils.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '24px 28px', marginTop: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{t('Appareils connectés')}</div>
      <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>
        {remembered
          ? t('Cet appareil reste connecté (« Rester connecté sur cet appareil »).')
          : t('Cet appareil se déconnecte après une période d’inactivité.')}
        {expiry && <> {t('Reconnexion demandée le {{date}}.', { date: new Date(expiry).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' }) })}</>}
      </div>

      {sessions === null ? (
        <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}><Loader size={18} className="animate-spin" color="var(--brand)" /></div>
      ) : (
        <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map(s => {
            const Icon = DEVICE_ICONS[s.type] || Monitor;
            const name = [s.browser, s.os].filter(Boolean).join(' · ') || t('Appareil inconnu');
            return (
              <li key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 14px',
                border: `1px solid ${s.current ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 10, background: 'var(--surface-2)',
              }}>
                <Icon size={22} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span>
                    {s.current && <span style={badge('var(--brand-soft)', 'var(--brand)')}>{t('Cet appareil')}</span>}
                    {s.remember && <span style={badge('var(--surface)', 'var(--fg-muted)')}>{t('Rester connecté')}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3, overflowWrap: 'anywhere' }}>
                    {s.ip && <>{t('IP {{ip}}', { ip: s.ip })} · </>}
                    {t('Connecté le {{date}}', { date: fmtDate(s.createdAt) })} · {t('Dernière activité : {{when}}', { when: s.current ? t('maintenant') : relative(s.lastSeenAt, lang, t) })}
                  </div>
                </div>
                <button type="button" onClick={() => revoke(s)} disabled={busy !== null} style={button(busy === s.id)}>
                  {busy === s.id ? <Loader size={13} className="animate-spin" /> : <LogOut size={13} />}
                  {s.current ? t('Se déconnecter') : t('Déconnecter')}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!currentKnown && (
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 10 }}>
          {t('Les connexions ouvertes avant cette mise à jour n’apparaissent pas ici : « Déconnecter mes autres appareils » les ferme aussi.')}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', flex: '1 1 240px' }}>
          {t('Téléphone perdu, ordinateur prêté ou oublié ouvert : déconnectez tous vos autres appareils. Celui-ci reste connecté.')}
        </div>
        <button type="button" onClick={logoutOthers} disabled={busy !== null}
          style={{ ...button(busy === 'others'), height: 36, fontSize: 13 }}>
          {busy === 'others' && <Loader size={13} className="animate-spin" />}
          {t('Déconnecter mes autres appareils')}
        </button>
      </div>
    </div>
  );
}
