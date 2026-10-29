// frontend/src/components/Campaign.jsx
// Affichage des événements de campaigns.js : bannière (ou compte à rebours)
// sur le tableau de bord, pastille à côté du logo, confettis une fois par jour.
// Rien ne capte les clics hors de la bannière, rien n'apparaît à l'impression.
import { useEffect, useRef } from 'react';
import CAMPAIGNS from '../campaigns';

const PREVIEW_KEY = 'campaign-preview';
const readStorage = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const writeStorage = (key, value) => {
  try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* navigation privée */ }
};

// Aperçu d'un événement avant sa date : ?evt=<id> (jours de l'événement),
// ?evt=<id>:teaser (compte à rebours), ?evt=0 pour l'arrêter
try {
  const p = new URLSearchParams(window.location.search).get('evt');
  if (p === '0') writeStorage(PREVIEW_KEY, null);
  else if (p) writeStorage(PREVIEW_KEY, p);
} catch { /* ignore */ }

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000);

/** Événement du moment pour cet utilisateur : { campaign, phase: 'teaser' | 'live', daysLeft } ou null. */
export function currentCampaign(user, d = new Date()) {
  const today = dayKey(d);
  const preview = readStorage(PREVIEW_KEY);
  for (const c of CAMPAIGNS) {
    if (c.tenants && !c.tenants.includes(user?.tenantId)) continue;
    if (preview === `${c.id}:teaser` && c.teaserFrom) return { campaign: c, phase: 'teaser', daysLeft: daysBetween(c.teaserFrom, c.start) };
    if (preview === c.id || (today >= c.start && today <= c.end)) return { campaign: c, phase: 'live', daysLeft: 0 };
    if (c.teaserFrom && today >= c.teaserFrom && today < c.start) {
      return { campaign: c, phase: 'teaser', daysLeft: daysBetween(today, c.start) };
    }
  }
  return null;
}

/* ── Bannière du tableau de bord ──────────────────────────────────────── */

export function CampaignBanner({ user }) {
  const current = currentCampaign(user);
  if (!current) return null;
  const { campaign: c, phase, daysLeft } = current;
  const [deep, accent, light] = c.colors;

  if (phase === 'teaser') {
    if (!c.teaser) return null;
    return (
      <div className="campaign-banner" style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
        padding: '10px 16px', borderRadius: 'var(--radius-3, 10px)',
        border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`,
        background: `color-mix(in srgb, ${accent} 10%, var(--surface))`,
        color: 'var(--fg)', fontSize: 13,
      }}>
        <span style={{ fontSize: 18 }}>{c.emoji}</span>
        <span>{c.teaser.replace('{{days}}', daysLeft)}</span>
      </div>
    );
  }

  return (
    <div className="campaign-banner" style={{
      position: 'relative', overflow: 'hidden', marginBottom: 20,
      padding: '18px 22px', borderRadius: 'var(--radius-3, 12px)',
      background: `linear-gradient(120deg, ${deep} 0%, color-mix(in srgb, ${deep} 75%, ${accent}) 100%)`,
      color: light, boxShadow: `0 6px 20px color-mix(in srgb, ${deep} 30%, transparent)`,
    }}>
      {c.badge && (
        <div aria-hidden="true" style={{
          position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)',
          fontSize: 88, fontWeight: 800, lineHeight: 1, color: accent, opacity: 0.22, letterSpacing: '-3px',
          pointerEvents: 'none',
        }}>{c.badge.split(' ')[0]}</div>
      )}
      <div style={{ position: 'relative', fontSize: 18, fontWeight: 700, letterSpacing: '-0.2px' }}>
        {c.emoji} {c.title}
      </div>
      {c.message && (
        <div style={{ position: 'relative', fontSize: 13, marginTop: 6, opacity: 0.9, maxWidth: 720 }}>{c.message}</div>
      )}
    </div>
  );
}

/* ── Pastille à côté du logo ──────────────────────────────────────────── */

export function CampaignBadge({ user }) {
  const current = currentCampaign(user);
  if (!current || current.phase !== 'live' || !current.campaign.badge) return null;
  const [deep, accent] = current.campaign.colors;
  return (
    <span className="campaign-badge" style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
      background: accent, color: deep, whiteSpace: 'nowrap', letterSpacing: '0.2px',
    }}>{current.campaign.badge}</span>
  );
}

/* ── Confettis (une fois par jour et par événement) ───────────────────── */

export function CampaignConfetti({ user }) {
  const canvasRef = useRef(null);
  const current = currentCampaign(user);
  const c = current?.phase === 'live' && current.campaign.confetti ? current.campaign : null;

  useEffect(() => {
    if (!c) return undefined;
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined; } catch { /* ignore */ }
    const seenKey = `campaign-confetti-${c.id}`;
    const today = dayKey(new Date());
    if (readStorage(seenKey) === today && readStorage(PREVIEW_KEY) !== c.id) return undefined;
    writeStorage(seenKey, today);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = [...c.colors, '#e63946', '#2a9d8f'];
    const pieces = Array.from({ length: Math.min(160, Math.round(w / 8)) }, () => ({
      x: Math.random() * w, y: -20 - Math.random() * h * 0.6,
      vx: -40 + Math.random() * 80, vy: 120 + Math.random() * 160,
      size: 5 + Math.random() * 6, rot: Math.random() * Math.PI, vr: -6 + Math.random() * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    const DURATION = 4500;
    let raf = 0, start = 0, last = 0;
    const frame = (now) => {
      if (!start) { start = now; last = now; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const elapsed = now - start;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = elapsed > DURATION - 800 ? Math.max(0, (DURATION - elapsed) / 800) : 1;
      for (const p of pieces) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (elapsed < DURATION) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [c]);

  if (!c) return null;
  return (
    <canvas ref={canvasRef} aria-hidden="true" className="campaign-confetti"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 31 }} />
  );
}
