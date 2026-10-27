// backend/src/utils/deviceLabel.js
// Description lisible d'un appareil à partir de son User-Agent, pour la liste
// « Appareils connectés » (Paramètres › Sécurité). Volontairement simple : on
// ne reconnaît que les navigateurs et systèmes courants à l'hôpital.

const BROWSERS = [
  [/EdgA?\/|Edg\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/CriOS\/|Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const SYSTEMS = [
  [/Windows NT/, 'Windows'],
  [/Android/, 'Android'],
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

const first = (ua, list) => list.find(([re]) => re.test(ua))?.[1] || null;

/** { browser, os, type: 'mobile' | 'tablet' | 'desktop' } ; champs null si inconnus. */
export function describeDevice(userAgent) {
  const ua = String(userAgent || '');
  const os = first(ua, SYSTEMS);
  const tablet = os === 'iPad' || (os === 'Android' && !/Mobile/.test(ua));
  const mobile = !tablet && (os === 'iPhone' || os === 'Android' || /Mobile/.test(ua));
  return { browser: first(ua, BROWSERS), os, type: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop' };
}

/** Adresse IP du client, sans le préfixe IPv4 mappé en IPv6 (::ffff:). */
export const clientIp = (req) => String(req?.ip || req?.socket?.remoteAddress || '').replace(/^::ffff:/, '').slice(0, 64) || null;
