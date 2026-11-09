// frontend/src/components/AppLockPanel.jsx
// Paramètres › Sécurité, dans l'application Android uniquement : verrouillage de
// l'appli par empreinte, visage ou code du téléphone (android/.../GedVerrouillage.java).
// Toute modification est confirmée par l'empreinte ou le code.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint } from 'lucide-react';
import toast from 'react-hot-toast';
import { lireVerrouillageAndroid, reglerVerrouillageAndroid } from '../utils/androidApp';

const DELAIS = [
  { s: 0, label: 'Immédiatement' },
  { s: 60, label: 'Après 1 minute' },
  { s: 300, label: 'Après 5 minutes' },
  { s: 900, label: 'Après 15 minutes' },
  { s: 3600, label: 'Après 1 heure' },
];

export default function AppLockPanel() {
  const { t } = useTranslation();
  const [etat, setEtat] = useState(() => lireVerrouillageAndroid());
  const [attente, setAttente] = useState(false);

  useEffect(() => {
    const recu = (e) => {
      setAttente(false);
      setEtat(e.detail);
      if (e.detail?.ok) toast.success(t('Réglage enregistré.'));
    };
    window.addEventListener('ged-verrouillage', recu);
    return () => window.removeEventListener('ged-verrouillage', recu);
  }, [t]);

  if (!etat) return null;

  const changer = (actif, delai) => {
    setAttente(true);
    reglerVerrouillageAndroid(actif, delai);
  };

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '24px 28px', marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Fingerprint size={22} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{t('Verrouillage de l’application')}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>
            {t('À l’ouverture de l’application, et quand vous y revenez, le téléphone demande votre empreinte, votre visage ou son code avant d’afficher la GED.')}
          </div>
        </div>
      </div>

      {!etat.disponible ? (
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 16 }}>
          {t('Aucune empreinte ni code de verrouillage n’est configuré sur ce téléphone : réglez-les dans les paramètres Android pour utiliser cette protection.')}
        </div>
      ) : (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, cursor: attente ? 'wait' : 'pointer' }}>
            <input type="checkbox" checked={!!etat.actif} disabled={attente}
              onChange={(e) => changer(e.target.checked, etat.delai)}
              style={{ width: 20, height: 20, accentColor: 'var(--brand)' }} />
            {t('Verrouiller l’application')}
          </label>
          {etat.actif && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--fg-muted)' }}>
              {t('Redemander quand je reviens dans l’application')}
              <select value={etat.delai} disabled={attente}
                onChange={(e) => changer(true, Number(e.target.value))}
                style={{ height: 40, padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 14 }}>
                {DELAIS.map(d => <option key={d.s} value={d.s}>{t(d.label)}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
