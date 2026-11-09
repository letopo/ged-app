// frontend/src/pages/ApplicationAndroidPage.jsx
// « Application Android » : télécharger l'APK de la GED (bouton + QR code à
// scanner avec le téléphone), ou, depuis l'APK, voir sa version et se mettre à jour.
// L'APK est publiée par scripts/publier-apk.sh dans /telechargements/.
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { Smartphone, Download, CheckCircle, RefreshCw, Loader } from 'lucide-react';
import { isAndroidApp, versionAppAndroid, lireVersionPubliee, ouvrirMiseAJourAndroid, URL_APK } from '../utils/androidApp';

const carte = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' };
const bouton = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, padding: '0 22px',
  borderRadius: 10, border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 15, fontWeight: 600,
  textDecoration: 'none', cursor: 'pointer',
};

const fmtTaille = (o) => (o ? `${(o / 1024 / 1024).toFixed(1).replace('.', ',')} Mo` : '');

export default function ApplicationAndroidPage() {
  const { t, i18n } = useTranslation();
  const dansApk = isAndroidApp();
  const installee = dansApk ? versionAppAndroid() : null;
  const [publiee, setPubliee] = useState(undefined); // undefined : chargement ; null : aucune
  const [qr, setQr] = useState(null);

  // QR code en HTTP : un téléphone sans le certificat de l'hôpital peut télécharger
  // l'APK ; celle-ci contient ensuite le certificat. Page ouverte en « localhost »
  // (sur le serveur lui-même) : le téléphone ne pourrait pas joindre cette adresse,
  // on demande l'adresse réseau du serveur.
  const hoteLocal = /^(localhost|127\.|\[?::1\]?)/i.test(window.location.hostname);
  const [adresse, setAdresse] = useState(hoteLocal ? '' : window.location.hostname);
  const hoteQr = adresse.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  const lienQr = hoteQr ? `http://${hoteQr}${URL_APK}` : '';

  useEffect(() => { lireVersionPubliee().then(setPubliee); }, []);
  useEffect(() => {
    if (dansApk || !lienQr) { setQr(null); return; }
    QRCode.toDataURL(lienQr, { margin: 1, width: 220, color: { dark: '#14213D', light: '#FFFFFF' } })
      .then(setQr).catch(() => setQr(null));
  }, [dansApk, lienQr]);

  const aJour = installee && publiee && Number(installee.code) >= Number(publiee.versionCode);
  const dateStr = publiee?.date ? new Date(publiee.date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <Smartphone size={26} color="var(--brand)" />
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--fg)' }}>{t('Application Android')}</h1>
      </div>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, margin: '0 0 22px', lineHeight: 1.5 }}>
        {t('La GED dans une vraie application : notifications même appli fermée, verrouillage par empreinte, téléchargement et partage des documents.')}
      </p>

      {publiee === undefined && <Loader className="animate-spin" size={20} color="var(--fg-muted)" />}
      {publiee === null && (
        <div style={carte}>{t('Aucune version de l’application n’est encore disponible sur ce serveur.')}</div>
      )}

      {publiee && dansApk && (
        <div style={carte}>
          {aJour ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--success)', fontWeight: 600 }}>
              <CheckCircle size={20} /> {t('Votre application est à jour (version {{v}}).', { v: installee?.nom })}
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t('Mise à jour disponible')}</div>
              <p style={{ color: 'var(--fg-muted)', fontSize: 14, margin: '0 0 16px' }}>
                {t('Version installée : {{a}}. Nouvelle version : {{n}} ({{taille}}).', { a: installee?.nom || '?', n: publiee.versionName, taille: fmtTaille(publiee.taille) })}
              </p>
              {/* Téléchargement par le navigateur du téléphone, comme la 1re installation */}
              <button type="button" onClick={ouvrirMiseAJourAndroid} style={bouton}>
                <RefreshCw size={18} /> {t('Mettre à jour')}
              </button>
              <p style={{ color: 'var(--fg-muted)', fontSize: 12.5, margin: '12px 0 0' }}>
                {t('Le navigateur télécharge la nouvelle version : ouvrez le fichier puis confirmez la mise à jour. Vos réglages sont conservés.')}
              </p>
            </>
          )}
        </div>
      )}

      {publiee && !dansApk && (
        <div style={{ display: 'grid', gap: 16 }}>
          {hoteLocal && (
            <div style={{ ...carte, borderColor: 'var(--warning, #d97706)' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{t('Adresse du serveur pour le QR code')}</div>
              <p style={{ color: 'var(--fg-muted)', fontSize: 13, margin: '0 0 10px' }}>
                {t('Cette page est ouverte en « localhost » : un téléphone ne peut pas joindre cette adresse. Indiquez l’adresse du serveur sur le réseau (par exemple 192.168.1.186).')}
              </p>
              <input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="192.168.1.186"
                inputMode="url" autoCapitalize="off" spellCheck={false}
                style={{ width: '100%', maxWidth: 320, height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 14 }} />
            </div>
          )}
          <div style={{ ...carte, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
            {qr && (
              <img src={qr} alt={t('QR code de téléchargement')} width={180} height={180}
                style={{ borderRadius: 10, border: '1px solid var(--border)', background: '#fff' }} />
            )}
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                {t('Version {{v}}', { v: publiee.versionName })}
                <span style={{ fontWeight: 400, color: 'var(--fg-muted)', fontSize: 13 }}> · {fmtTaille(publiee.taille)}{dateStr ? ` · ${dateStr}` : ''}</span>
              </div>
              <p style={{ color: 'var(--fg-muted)', fontSize: 14, margin: '0 0 14px', lineHeight: 1.5 }}>
                {t('Scannez ce QR code avec l’appareil photo du téléphone, ou ouvrez cette page sur le téléphone et touchez « Télécharger ».')}
              </p>
              {lienQr && <div style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: '-6px 0 14px', wordBreak: 'break-all' }}>{lienQr}</div>}
              <a href={URL_APK} download={`GED-HSJM-${publiee.versionName}.apk`} style={bouton}>
                <Download size={18} /> {t('Télécharger l’application')}
              </a>
            </div>
          </div>

          <div style={carte}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{t('Installation')}</div>
            <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--fg)', fontSize: 14, lineHeight: 1.7 }}>
              <li>{t('Téléchargez le fichier (QR code ou bouton ci-dessus), puis ouvrez-le.')}</li>
              <li>{t('Android demande d’autoriser l’installation d’applications depuis le navigateur : acceptez.')}</li>
              <li>{t('Ouvrez « GED HSJM », choisissez le serveur de l’hôpital, puis connectez-vous.')}</li>
              <li>{t('Autorisez les notifications. Il n’est pas nécessaire d’installer le certificat de l’hôpital.')}</li>
            </ol>
          </div>

          <div style={{ fontSize: 12, color: 'var(--fg-subtle)', wordBreak: 'break-all' }}>
            {t('Empreinte SHA-256 du fichier')} : {publiee.sha256}
          </div>
        </div>
      )}
    </div>
  );
}
