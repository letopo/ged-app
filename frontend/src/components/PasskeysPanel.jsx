// frontend/src/components/PasskeysPanel.jsx
// Paramètres › Sécurité : connexion sans mot de passe (empreinte, Face ID, code
// PIN du téléphone ou de Windows Hello). Facultative, appareil par appareil ;
// le mot de passe reste toujours valable.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint, Loader, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { passkeySupport, hasDeviceUnlock, registerThisDevice, isCancelled } from '../utils/passkeys';

const button = (busy, primary) => ({
  height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)', fontSize: 13, fontWeight: 600,
  border: primary ? 'none' : '1px solid var(--border)', background: primary ? 'var(--brand)' : 'var(--surface-2)',
  color: primary ? '#fff' : 'var(--fg)', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1,
  display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
});

export default function PasskeysPanel() {
  const { t, i18n } = useTranslation();
  const support = passkeySupport();
  const [passkeys, setPasskeys] = useState(null);
  const [deviceUnlock, setDeviceUnlock] = useState(null);
  const [busy, setBusy] = useState(null); // 'add' | id
  const fmt = (d) => new Date(d).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });

  const load = useCallback(() => {
    authAPI.getPasskeys().then(res => setPasskeys(res.data.passkeys)).catch(() => setPasskeys([]));
  }, []);
  useEffect(() => { load(); hasDeviceUnlock().then(setDeviceUnlock); }, [load]);

  const add = async () => {
    setBusy('add');
    try {
      await registerThisDevice();
      toast.success(t('Connexion sans mot de passe activée sur cet appareil.'));
      load();
    } catch (err) {
      if (err?.name === 'InvalidStateError') toast(t('Cet appareil est déjà enregistré.'));
      else if (!isCancelled(err)) toast.error(err.response?.data?.error || t('Activation impossible sur cet appareil.'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (p) => {
    setBusy(p.id);
    try {
      await authAPI.deletePasskey(p.id);
      toast.success(t('Appareil retiré.'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || t('Erreur lors du retrait de l’appareil.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '24px 28px', marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <Fingerprint size={22} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{t('Connexion sans mot de passe')}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>
            {t('Facultatif : connectez-vous avec l’empreinte, Face ID ou le code PIN de votre téléphone ou de Windows. À activer sur chaque appareil ; votre mot de passe reste toujours valable.')}
          </div>
        </div>
        {support.supported && !support.needsDomain && (
          <button type="button" onClick={add} disabled={busy !== null} style={{ ...button(busy === 'add', true), alignSelf: 'center' }}>
            {busy === 'add' ? <Loader size={13} className="animate-spin" /> : <Plus size={14} />}
            {t('Activer sur cet appareil')}
          </button>
        )}
      </div>

      {!support.supported && (
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 12 }}>{t('Ce navigateur ne permet pas la connexion sans mot de passe.')}</div>
      )}
      {support.needsDomain && (
        <div style={{ fontSize: 13, color: 'var(--warning, #b45309)', marginTop: 12 }}>
          {t('Pour l’activer, ouvrez la GED par son nom (ex. https://ged.hsjmcam.net) et non par une adresse IP.')}
        </div>
      )}
      {support.supported && !support.needsDomain && deviceUnlock === false && (
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 12 }}>
          {t('Cet ordinateur n’a ni lecteur d’empreinte ni code PIN Windows Hello configuré : vous pourrez utiliser votre téléphone (un QR code s’affiche), ou continuer avec votre mot de passe.')}
        </div>
      )}

      {passkeys === null ? (
        <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}><Loader size={18} className="animate-spin" color="var(--brand)" /></div>
      ) : passkeys.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {passkeys.map(p => (
            <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-2)' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name || t('Appareil inconnu')}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
                  {t('Activé le {{date}}', { date: fmt(p.createdAt) })}
                  {' · '}
                  {p.lastUsedAt ? t('Dernière utilisation le {{date}}', { date: fmt(p.lastUsedAt) }) : t('Jamais utilisé')}
                </div>
              </div>
              <button type="button" onClick={() => remove(p)} disabled={busy !== null} style={button(busy === p.id)}>
                {busy === p.id ? <Loader size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {t('Retirer')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
