// frontend/src/components/SignaturePad.jsx
// Zone de signature au doigt, au stylet (tablette) ou au stylet d'une tablette
// graphique branchée sur le PC (Wacom, XP-Pen… : le navigateur les voit comme
// un stylet, avec la pression). Le tracé est gardé en points pour être
// redessiné net à l'export (PNG transparent, recadré sur la signature).
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

const INK = '#1f2a52';

// Épaisseur du trait : pression du stylet, sinon vitesse (plus fin quand on va vite)
function strokeWidth(pt, prev, base) {
  if (pt.pressure > 0 && pt.pressure !== 0.5 && pt.type === 'pen') return base * (0.35 + pt.pressure * 1.3);
  if (!prev) return base;
  const dt = Math.max(1, pt.t - prev.t);
  const v = Math.hypot(pt.x - prev.x, pt.y - prev.y) / dt; // px/ms
  return base * Math.max(0.45, Math.min(1.25, 1.3 - v * 0.35));
}

function drawStrokes(ctx, strokes, scale, offsetX = 0, offsetY = 0) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  const X = (p) => (p.x - offsetX) * scale;
  const Y = (p) => (p.y - offsetY) * scale;
  for (const s of strokes) {
    if (s.length === 1) {
      ctx.beginPath();
      ctx.arc(X(s[0]), Y(s[0]), (s[0].w * scale) / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    // Courbes passant par les milieux des segments (trait lissé), une par
    // segment pour que l'épaisseur suive la pression / la vitesse
    let fromX = X(s[0]);
    let fromY = Y(s[0]);
    for (let i = 1; i < s.length; i++) {
      const b = s[i];
      const c = s[i + 1];
      const toX = c ? (X(b) + X(c)) / 2 : X(b);
      const toY = c ? (Y(b) + Y(c)) / 2 : Y(b);
      ctx.beginPath();
      ctx.lineWidth = ((s[i - 1].w + b.w) / 2) * scale;
      ctx.moveTo(fromX, fromY);
      ctx.quadraticCurveTo(X(b), Y(b), toX, toY);
      ctx.stroke();
      fromX = toX;
      fromY = toY;
    }
  }
}

const SignaturePad = forwardRef(function SignaturePad({ onChange, height = 260 }, ref) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const strokes = useRef([]);
  const current = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const pointerTypes = useRef({});

  const base = () => Math.max(2.2, Math.min(4.5, sizeRef.current.w / 220));

  const redraw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    drawStrokes(ctx, strokes.current, dpr);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    if (!wrap || !cv) return undefined;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const prev = sizeRef.current;
      // Le tracé suit le redimensionnement (rotation de la tablette)
      if (prev.w && r.width && prev.w !== r.width) {
        const k = r.width / prev.w;
        strokes.current = strokes.current.map((s) => s.map((p) => ({ ...p, x: p.x * k, y: p.y * k, w: p.w * k })));
      }
      sizeRef.current = { w: r.width, h: r.height };
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw]);

  const inkLength = () => strokes.current.reduce((sum, s) => sum + s.reduce((a, p, i) => (i ? a + Math.hypot(p.x - s[i - 1].x, p.y - s[i - 1].y) : a), 0), 0);
  const notify = () => onChange?.({ empty: strokes.current.length === 0, ink: inkLength() });

  const point = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, pressure: e.pressure, type: e.pointerType, t: e.timeStamp };
  };

  const onDown = (e) => {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    pointerTypes.current[e.pointerType] = (pointerTypes.current[e.pointerType] || 0) + 1;
    const p = point(e);
    p.w = strokeWidth(p, null, base());
    current.current = [p];
    strokes.current.push(current.current);
    redraw();
  };

  const onMove = (e) => {
    const s = current.current;
    if (!s) return;
    e.preventDefault();
    const events = e.getCoalescedEvents?.() || [e];
    for (const ev of events) {
      const p = point(ev);
      const prev = s[s.length - 1];
      if (Math.hypot(p.x - prev.x, p.y - prev.y) < 0.8) continue;
      // Lissage de l'épaisseur pour éviter les à-coups
      p.w = prev.w * 0.6 + strokeWidth(p, prev, base()) * 0.4;
      s.push(p);
    }
    redraw();
  };

  const onUp = () => {
    if (!current.current) return;
    current.current = null;
    notify();
  };

  useImperativeHandle(ref, () => ({
    clear() { strokes.current = []; redraw(); notify(); },
    undo() { strokes.current.pop(); redraw(); notify(); },
    isEmpty: () => strokes.current.length === 0,
    inkLength,
    // Appareil le plus utilisé pour signer : 'touch' | 'pen' | 'mouse'
    pointerType: () => Object.entries(pointerTypes.current).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    // PNG transparent recadré sur le tracé, en haute définition
    toPng(scale = 3) {
      const all = strokes.current.flat();
      if (!all.length) return null;
      const pad = Math.max(...all.map((p) => p.w)) + 4;
      const minX = Math.min(...all.map((p) => p.x)) - pad;
      const minY = Math.min(...all.map((p) => p.y)) - pad;
      const maxX = Math.max(...all.map((p) => p.x)) + pad;
      const maxY = Math.max(...all.map((p) => p.y)) + pad;
      const k = Math.min(scale, 2400 / Math.max(1, maxX - minX));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round((maxX - minX) * k));
      cv.height = Math.max(1, Math.round((maxY - minY) * k));
      drawStrokes(cv.getContext('2d'), strokes.current, k, minX, minY);
      return cv.toDataURL('image/png');
    },
  }));

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height, background: '#fff', borderRadius: 12, border: '1px solid #d6dae3', overflow: 'hidden', touchAction: 'none', userSelect: 'none' }}>
      {/* Ligne d'appui, comme sur un formulaire papier */}
      <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: '26%', borderBottom: '1.5px dashed #b8bfcc', pointerEvents: 'none' }} />
      <span style={{ position: 'absolute', left: '8%', bottom: 'calc(26% + 6px)', fontSize: 22, color: '#b8bfcc', pointerEvents: 'none' }}>✕</span>
      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onLostPointerCapture={onUp}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }}
      />
    </div>
  );
});

export default SignaturePad;
