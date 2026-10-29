// frontend/src/components/Festive.jsx
// Décor de fêtes (1er décembre → 6 janvier) : neige, guirlande sous la barre du
// haut, bonnet sur le logo, vœux sur le tableau de bord. Purement esthétique :
// rien ne capte les clics, rien n'apparaît dans les documents générés.
// Désactivable par chaque utilisateur (Paramètres › Profil), coupé d'office si
// le système demande moins d'animations. Aperçu hors saison : ?noel=1 (?noel=0 pour l'arrêter).
import { useEffect, useRef, useState } from 'react';

const PREF_KEY = 'festive';          // 'off' = décor désactivé par l'utilisateur
const PREVIEW_KEY = 'festive-preview';
const CHANGE_EVENT = 'festive-change';

const readStorage = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const writeStorage = (key, value) => {
  try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* navigation privée */ }
};

// Aperçu hors saison, mémorisé pour survivre aux changements de page
try {
  const p = new URLSearchParams(window.location.search).get('noel');
  if (p === '1') writeStorage(PREVIEW_KEY, '1');
  if (p === '0') writeStorage(PREVIEW_KEY, null);
} catch { /* ignore */ }

/** Saison des fêtes : du 1er décembre au 6 janvier inclus. */
export const isFestiveSeason = (d = new Date()) =>
  d.getMonth() === 11 || (d.getMonth() === 0 && d.getDate() <= 6) || readStorage(PREVIEW_KEY) === '1';

/** Vœux du jour (null hors saison). */
export function festiveGreeting(t, d = new Date()) {
  if (!isFestiveSeason(d)) return null;
  const m = d.getMonth(), day = d.getDate();
  if (m === 11 && (day === 24 || day === 25)) return `🎄 ${t('Joyeux Noël !')}`;
  if ((m === 11 && day === 31) || m === 0) {
    const year = m === 0 ? d.getFullYear() : d.getFullYear() + 1;
    return `🥂 ${t('Bonne année {{year}} !', { year })}`;
  }
  return `🎄 ${t('Joyeuses fêtes de fin d’année !')}`;
}

export function setFestiveEnabled(enabled) {
  writeStorage(PREF_KEY, enabled ? null : 'off');
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** { season, enabled, active } — active = décor affiché. */
export function useFestive() {
  const [, force] = useState(0);
  useEffect(() => {
    const update = () => force(n => n + 1);
    window.addEventListener(CHANGE_EVENT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(CHANGE_EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  const season = isFestiveSeason();
  const enabled = readStorage(PREF_KEY) !== 'off';
  return { season, enabled, active: season && enabled };
}

const reducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

/* ── Neige ────────────────────────────────────────────────────────────── */

export function Snowfall() {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (reducedMotion()) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, flakes = [], raf = 0, last = 0;

    const makeFlake = (y) => ({
      x: Math.random() * w, y: y ?? Math.random() * h,
      r: 1 + Math.random() * 2.6,
      vy: 18 + Math.random() * 32,          // px/s
      sway: 10 + Math.random() * 22, phase: Math.random() * Math.PI * 2,
      a: 0.35 + Math.random() * 0.45,
    });
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Peu de flocons : une ambiance, pas une tempête (moins sur téléphone)
      const count = Math.round(Math.min(70, Math.max(25, w / 22)));
      flakes = Array.from({ length: count }, () => makeFlake());
    };
    const dark = () => document.documentElement.classList.contains('dark');

    const frame = (now) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      // Flocons blancs en mode nuit, bleu glacier en mode jour (visibles sur fond clair)
      const rgb = dark() ? '255,255,255' : '148,178,214';
      for (const f of flakes) {
        f.y += f.vy * dt;
        f.phase += dt * 0.9;
        const x = f.x + Math.sin(f.phase) * f.sway;
        if (f.y - f.r > h) Object.assign(f, makeFlake(-f.r * 2));
        ctx.beginPath();
        ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${f.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { last = 0; raf = requestAnimationFrame(frame); }
    };

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas ref={canvasRef} aria-hidden="true" className="festive-snow"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 30 }} />
  );
}

/* ── Guirlande lumineuse (bas de la barre du haut) ─────────────────────── */

const BULB_COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#ffd166', '#4ea8de'];

export function Garland() {
  const bulbs = Array.from({ length: 48 }, (_, i) => i);
  return (
    <div aria-hidden="true" className="festive-garland">
      <svg className="festive-garland-wire" preserveAspectRatio="none" viewBox="0 0 100 10">
        <path d="M0 2 Q 2.5 7 5 2 T 10 2 T 15 2 T 20 2 T 25 2 T 30 2 T 35 2 T 40 2 T 45 2 T 50 2 T 55 2 T 60 2 T 65 2 T 70 2 T 75 2 T 80 2 T 85 2 T 90 2 T 95 2 T 100 2"
          fill="none" stroke="currentColor" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
      </svg>
      {bulbs.map(i => (
        <span key={i} className="festive-bulb" style={{
          left: `${(i + 0.5) * (100 / bulbs.length)}%`,
          background: BULB_COLORS[i % BULB_COLORS.length],
          color: BULB_COLORS[i % BULB_COLORS.length],
          animationDelay: `${(i % 7) * 0.35}s`,
        }} />
      ))}
    </div>
  );
}

/* ── Bonnet de Père Noël (posé sur le logo) ────────────────────────────── */

export function SantaHat({ size = 22 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" className="festive-hat"
      style={{ position: 'absolute', top: -size * 0.28, left: -size * 0.14, pointerEvents: 'none' }}>
      <path d="M8 48 C 14 26, 30 10, 50 14 C 44 20, 46 30, 52 40 Z" fill="#d62839" />
      <path d="M50 14 C 55 20, 57 28, 56 34" fill="none" stroke="#b81f30" strokeWidth="2" strokeLinecap="round" />
      <circle cx="56" cy="38" r="6" fill="#ffffff" />
      <rect x="4" y="44" width="52" height="12" rx="6" fill="#ffffff" />
    </svg>
  );
}
