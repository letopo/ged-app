// backend/src/utils/montantEnLettres.js
// Montant en toutes lettres, orthographe traditionnelle (comme les bordereaux
// Sage) : 35280 → « trente-cinq mille deux cent quatre-vingts ».
const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function moinsDeCent(n) {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10), u = n % 10;
  if (d === 7 || d === 9) {                       // soixante-dix…, quatre-vingt-dix…
    return d === 7 && u === 1 ? 'soixante et onze' : `${DIZAINES[d]}-${UNITES[10 + u]}`;
  }
  if (u === 0) return d === 8 ? 'quatre-vingts' : DIZAINES[d];
  if (u === 1 && d !== 8) return `${DIZAINES[d]} et un`;
  return `${DIZAINES[d]}-${UNITES[u]}`;
}

// `finale` : « cents » / « quatre-vingts » ne prennent le s qu'en fin de nombre
function moinsDeMille(n, finale) {
  const c = Math.floor(n / 100), r = n % 100;
  const parts = [];
  if (c > 0) parts.push(c === 1 ? 'cent' : `${UNITES[c]} cent${r === 0 && finale ? 's' : ''}`);
  if (r > 0) parts.push(r === 80 && !finale ? 'quatre-vingt' : moinsDeCent(r));
  return parts.join(' ');
}

/** Entier positif en lettres (jusqu'aux milliards). */
export function nombreEnLettres(value) {
  let n = Math.round(Math.abs(Number(value) || 0));
  if (n === 0) return 'zéro';
  const parts = [];
  const milliards = Math.floor(n / 1e9); n %= 1e9;
  const millions = Math.floor(n / 1e6); n %= 1e6;
  const milliers = Math.floor(n / 1e3); n %= 1e3;
  if (milliards) parts.push(`${moinsDeMille(milliards, true)} milliard${milliards > 1 ? 's' : ''}`);
  if (millions) parts.push(`${moinsDeMille(millions, true)} million${millions > 1 ? 's' : ''}`);
  if (milliers) parts.push(milliers === 1 ? 'mille' : `${moinsDeMille(milliers, false)} mille`);
  if (n) parts.push(moinsDeMille(n, true));
  return parts.join(' ');
}

/** « Soixante mille six cent soixante-quatre francs CFA » */
export function montantEnLettres(value, devise = 'francs CFA') {
  const s = nombreEnLettres(value);
  // « deux millions de francs », mais « deux millions trois cents francs »
  const de = /(million|milliard)s?$/.test(s) ? ' de' : '';
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}${de} ${devise}`;
}
