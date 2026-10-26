// frontend/src/components/SignatureSession.jsx
// « Faire signer » un document (ex. facture signée par le patient au guichet) :
//   1. on touche l'endroit où signer (ou la GED le trouve seule : texte du PDF,
//      sinon OCR, à la recherche de « Signature du patient / client ») ;
//   2. l'agent saisit le nom du signataire (pré-rempli si le document le donne) ;
//   3. le patient signe en plein écran (doigt, stylet, tablette graphique) ;
//   4. aperçu, puis la signature est apposée par le serveur (« Lu et approuvé »,
//      nom, date/heure du serveur) et le document est verrouillé.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { X, Loader, PenLine, Eraser, Undo2, Check, Sparkles, ArrowLeft, Lock, Tablet, Send, RefreshCw, MonitorSmartphone, Monitor } from 'lucide-react';
import { documentsAPI, getSocket, initializeSocket } from '../services/api';
import { loadPdfjs } from './PdfCanvasViewer';
import SignaturePad from './SignaturePad';
import { recognizeCanvas } from '../utils/scanOcr';

const MAX_PAGE_WIDTH = 900;
const FRAME_RATIO = 2.4;          // largeur / hauteur du cadre par défaut
const FRAME_WIDTH = 0.36;         // fraction de la largeur de page

const SIGNER_WORDS = /patient|client|malade|b[ée]n[ée]ficiaire|assur[ée]|signataire|payeur|parent|tuteur|accompagnant/i;
const STAFF_WORDS = /caissi|agent|direct|m[ée]decin|docteur|comptab|responsable|g[ée]rant|infirmi|pharmacien|chef|DG\b/i;

export const isSignableDocument = (doc) => {
  if (!doc) return false;
  const name = doc.fileName || doc.filePath || '';
  return doc.fileType === 'application/pdf' || /\.pdf$/i.test(name)
    || ['image/jpeg', 'image/jpg', 'image/png'].includes(doc.fileType) || /\.(jpe?g|png)$/i.test(name);
};

const LAST_PAD_KEY = 'ged.signature.localPad';
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function defaultFrame(page, cx, cy, pageW, pageH) {
  const w = FRAME_WIDTH;
  const h = (w * pageW) / FRAME_RATIO / pageH;
  return { page, w, h, x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h) };
}

// Cadre sous le libellé trouvé (ou à sa droite s'il n'y a plus de place dessous)
function frameNearLabel(label, pageW, pageH) {
  const w = FRAME_WIDTH;
  const h = (w * pageW) / FRAME_RATIO / pageH;
  let x = clamp(label.x0, 0.01, 0.99 - w);
  let y = label.y1 + 0.006;
  if (y + h > 0.985) {
    x = clamp(label.x1 + 0.01, 0, 1 - w);
    y = clamp((label.y0 + label.y1) / 2 - h / 2, 0, 1 - h);
  }
  return { page: label.page, w, h, x, y };
}

function scoreLabel(context) {
  let s = 1;
  if (SIGNER_WORDS.test(context)) s += 3;
  if (STAFF_WORDS.test(context)) s -= 2;
  return s;
}

const better = (a, b) => !b || a.score > b.score || (a.score === b.score && (a.page > b.page || (a.page === b.page && a.y0 > b.y0)));

// Nom du patient lu dans le texte du document (« Patient : … », « Nom du malade : … »)
function guessSignerName(text) {
  if (!text) return '';
  const re = /(?:nom\s+(?:et\s+pr[ée]noms?\s+)?(?:du\s+|de\s+l['’]\s*)?(?:patient|malade|client|assur[ée])|patient|malade|client|nom\s*(?:et|&)\s*pr[ée]noms?)\s*[:：]\s*([^\n:]{3,70})/i;
  const m = re.exec(text);
  if (!m) return '';
  const name = m[1]
    .split(/\s{2,}|\t|\s+(?:[âa]ge|sexe|n[°o]|num[ée]ro|date|t[ée]l|matricule|dossier|adresse|chambre)\b/i)[0]
    .replace(/[|_.,;]+$/g, '')
    .trim();
  if (!/[A-Za-zÀ-ÿ]{2}/.test(name) || name.split(/\s+/).length > 6) return '';
  return name;
}

// Libellé « Signature… » dans le texte d'un PDF (couche texte : PDF natif ou scan avec OCR)
async function findLabelInPdf(pdf, pageCount) {
  let best = null;
  let anyText = false;
  const lines = [];
  for (let n = pageCount; n >= 1 && n > pageCount - 6; n--) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items.filter((it) => it.str && it.str.trim());
    if (items.length) anyText = true;
    lines.unshift(tc.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join(''));
    const box = (it) => {
      const fh = Math.hypot(it.transform[2], it.transform[3]) || 10;
      const [ax, ay] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
      const [bx, by] = vp.convertToViewportPoint(it.transform[4] + (it.width || 0), it.transform[5] + fh);
      return { x0: Math.min(ax, bx) / vp.width, x1: Math.max(ax, bx) / vp.width, y0: Math.min(ay, by) / vp.height, y1: Math.max(ay, by) / vp.height };
    };
    items.forEach((it, i) => {
      if (!/signature/i.test(it.str)) return;
      const b = box(it);
      // Prolonge le libellé sur la même ligne (« Signature » + « du patient : »).
      // Le score ne regarde que ce libellé : « Signature du caissier » placé à
      // côté de « Signature du patient » ne doit pas profiter du mot « patient ».
      let labelText = it.str;
      for (let j = i + 1; j < Math.min(items.length, i + 4); j++) {
        const nb = box(items[j]);
        if (Math.abs(nb.y1 - b.y1) > (b.y1 - b.y0) * 0.6 || nb.x0 - b.x1 > 0.04 || /signature/i.test(items[j].str)) break;
        b.x1 = Math.max(b.x1, nb.x1);
        labelText += ` ${items[j].str}`;
      }
      const cand = { ...b, page: n, score: scoreLabel(labelText) };
      if (better(cand, best)) best = cand;
    });
  }
  return { label: best, anyText, text: lines.join('\n') };
}

// Même recherche par OCR (scan sans couche texte, photo)
async function findLabelByOcr(canvas, pageNumber) {
  const { words, text, width, height } = await recognizeCanvas(canvas);
  let best = null;
  words.forEach((w, i) => {
    if (!/signature/i.test(w.text)) return;
    const b = { x0: w.x0 / width, x1: w.x1 / width, y0: w.y0 / height, y1: w.y1 / height };
    let labelText = w.text;
    for (let j = i + 1; j < Math.min(words.length, i + 4); j++) {
      const n = words[j];
      if (Math.abs(n.y1 / height - b.y1) > (b.y1 - b.y0) * 0.7 || n.x0 / width - b.x1 > 0.04 || /signature/i.test(n.text)) break;
      b.x1 = Math.max(b.x1, n.x1 / width);
      labelText += ` ${n.text}`;
    }
    const cand = { ...b, page: pageNumber, score: scoreLabel(labelText) };
    if (better(cand, best)) best = cand;
  });
  return { label: best, text };
}

async function renderPdfPage(pdf, number, targetWidth) {
  const page = await pdf.getPage(number);
  const vp1 = page.getViewport({ scale: 1 });
  const vp = page.getViewport({ scale: targetWidth / vp1.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  return canvas;
}

// Même texte que celui écrit sur le PDF par le serveur (en français, comme le document)
function nowLabel() {
  const d = new Date();
  return `Le ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

// ── Une page du document ─────────────────────────────────────────────────────
export function PageView({ pdf, image, info, width, root, onTap, children }) {
  const holderRef = useRef(null);
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const height = (info.height / info.width) * width;

  useEffect(() => {
    const el = holderRef.current;
    if (!el || !pdf) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { root, rootMargin: '500px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [pdf, root]);

  useEffect(() => {
    if (!pdf || !visible || !width) return undefined;
    let task = null;
    let alive = true;
    pdf.getPage(info.number).then((page) => {
      if (!alive || !canvasRef.current) return;
      const vp1 = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = page.getViewport({ scale: (width / vp1.width) * dpr });
      const canvas = canvasRef.current;
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
      task.promise.catch(() => { /* rendu annulé */ });
    });
    return () => { alive = false; task?.cancel(); };
  }, [pdf, visible, width, info.number]);

  const handleClick = (e) => {
    if (e.target.closest('[data-sig-frame]')) return;
    const r = holderRef.current.getBoundingClientRect();
    onTap?.(info.number, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };

  return (
    <div ref={holderRef} data-page={info.number} onClick={handleClick}
      style={{ position: 'relative', width, height, margin: '0 auto 14px', background: '#fff', boxShadow: '0 1px 8px rgba(0,0,0,.28)', flexShrink: 0, cursor: onTap ? 'crosshair' : 'default' }}>
      {pdf
        ? <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        : <img src={image?.src} alt="" draggable={false} style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none' }} />}
      {children}
    </div>
  );
}

// ── Cadre de signature (déplaçable, redimensionnable) ────────────────────────
export function SignatureFrame({ frame, editable, onChange, preview }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const drag = useRef(null);

  const start = (mode) => (e) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    const pageEl = ref.current.parentElement.getBoundingClientRect();
    drag.current = { mode, sx: e.clientX, sy: e.clientY, f: { ...frame }, pw: pageEl.width, ph: pageEl.height };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / d.pw;
    const dy = (e.clientY - d.sy) / d.ph;
    if (d.mode === 'move') {
      onChange({ ...d.f, x: clamp(d.f.x + dx, 0, 1 - d.f.w), y: clamp(d.f.y + dy, 0, 1 - d.f.h) });
    } else {
      const w = clamp(d.f.w + dx, 0.12, 1 - d.f.x);
      const h = clamp(d.f.h + dy, 0.035, 1 - d.f.y);
      onChange({ ...d.f, w, h });
    }
  };
  const end = () => { drag.current = null; };

  // Taille des textes de l'aperçu proportionnelle au cadre
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fs = (k, min, max) => clamp(box.h * k, min, max);

  return (
    <div ref={ref} data-sig-frame
      onPointerDown={start('move')} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      style={{
        position: 'absolute', left: `${frame.x * 100}%`, top: `${frame.y * 100}%`, width: `${frame.w * 100}%`, height: `${frame.h * 100}%`,
        border: preview ? '1px dashed rgba(31,42,82,.35)' : '2px dashed var(--brand)', borderRadius: 4,
        background: preview ? 'transparent' : 'rgba(37,99,235,.10)', touchAction: 'none',
        cursor: editable ? 'move' : 'default', boxSizing: 'border-box', overflow: 'hidden',
      }}>
      {preview ? (
        <div style={{ position: 'absolute', inset: '4%', display: 'flex', flexDirection: 'column', color: '#1f2a52', fontFamily: 'Helvetica, Arial, sans-serif', lineHeight: 1.1 }}>
          <div style={{ fontStyle: 'italic', fontSize: fs(0.12, 5, 14) }}>Lu et approuvé</div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={preview.signature} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: fs(0.1, 5, 12), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview.name}</div>
          <div style={{ fontSize: fs(0.09, 4.5, 11), color: '#4b4f5c', whiteSpace: 'nowrap' }}>{preview.date}</div>
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--brand)', fontSize: clamp(box.h * 0.2, 10, 14), fontWeight: 700, pointerEvents: 'none', textAlign: 'center', padding: 4 }}>
          <PenLine size={clamp(box.h * 0.22, 12, 18)} /> {t('Signature ici')}
        </div>
      )}
      {editable && (
        <div onPointerDown={start('resize')} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
          title={t('Agrandir / réduire')}
          style={{ position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: '50% 0 4px 0', background: 'var(--brand)', cursor: 'nwse-resize', touchAction: 'none', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
      )}
    </div>
  );
}

// ── Briques partagées avec la tablette du guichet (RemoteSigner) ─────────────

// Charge le document (PDF via pdf.js, ou image) et la taille de ses pages
export function useDocumentPages(fileUrl, isPdf) {
  const [state, setState] = useState({ pdf: null, image: null, pages: [], loadError: false });
  useEffect(() => {
    let alive = true;
    let loaded = null;
    setState({ pdf: null, image: null, pages: [], loadError: false });
    if (!fileUrl) return undefined;
    if (isPdf) {
      loadPdfjs()
        .then((pdfjs) => pdfjs.getDocument({ url: fileUrl, isEvalSupported: false }).promise)
        .then(async (d) => {
          loaded = d;
          const infos = [];
          for (let n = 1; n <= d.numPages; n++) {
            const vp = (await d.getPage(n)).getViewport({ scale: 1 });
            infos.push({ number: n, width: vp.width, height: vp.height });
          }
          if (!alive) { d.destroy(); return; }
          setState({ pdf: d, image: null, pages: infos, loadError: false });
        })
        .catch((err) => { console.error('[signature] PDF', err); if (alive) setState((st) => ({ ...st, loadError: true })); });
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { if (alive) setState({ pdf: null, image: img, pages: [{ number: 1, width: img.naturalWidth, height: img.naturalHeight }], loadError: false }); };
      img.onerror = () => { if (alive) setState((st) => ({ ...st, loadError: true })); };
      img.src = fileUrl;
    }
    return () => { alive = false; loaded?.destroy(); };
  }, [fileUrl, isPdf]);
  return state;
}

// Largeur d'affichage des pages dans le conteneur qui défile
export function usePageWidth(scrollRef) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => setWidth(Math.min(MAX_PAGE_WIDTH, Math.max(200, el.clientWidth - 24)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollRef]);
  return width;
}

// Fait défiler jusqu'au cadre (sans scrollIntoView : il fait bouger toute la page)
export function scrollToFrameIn(el, f) {
  const pageEl = el?.querySelector(`[data-page="${f.page}"]`);
  if (!el || !pageEl) return;
  el.scrollTop = Math.max(0, pageEl.offsetTop + (f.y + f.h / 2) * pageEl.offsetHeight - el.clientHeight / 2);
}

export const signButtonStyle = (primary, disabled) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, padding: '0 18px',
  borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
  border: primary ? 'none' : '1px solid var(--border)', background: primary ? 'var(--brand)' : 'var(--surface)', color: primary ? '#fff' : 'var(--fg)',
});

// Zone de signature plein écran (c'est le patient qui l'a en main)
export function SignPadScreen({ signerName, onBack, onValidate, busy, title, subtitle }) {
  const { t } = useTranslation();
  const padRef = useRef(null);
  const [ink, setInk] = useState(0);
  const [padHeight, setPadHeight] = useState(260);
  useEffect(() => {
    const fit = () => setPadHeight(Math.round(clamp(Math.min(window.innerHeight - 250, window.innerWidth * 0.55), 160, 520)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  const validate = () => {
    const png = padRef.current?.toPng();
    if (png) onValidate({ png, pointerType: padRef.current.pointerType() });
  };
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f4f5f8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 14 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1f2a52' }}>{title || t('Signez dans le cadre ci-dessous')}</div>
        <div style={{ fontSize: 13, color: '#5b6275', marginTop: 4 }}>
          {subtitle || `${t('Lu et approuvé')} — ${signerName}`}
        </div>
      </div>
      <div style={{ width: '100%', maxWidth: 900 }}>
        <SignaturePad ref={padRef} height={padHeight} onChange={({ ink: v }) => setInk(v)} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button style={signButtonStyle(false, busy)} disabled={busy} onClick={onBack}><ArrowLeft size={16} /> {t('Retour')}</button>
        <button style={signButtonStyle(false, ink === 0 || busy)} disabled={ink === 0 || busy} onClick={() => padRef.current?.clear()}><Eraser size={16} /> {t('Effacer')}</button>
        <button style={signButtonStyle(true, ink < 40 || busy)} disabled={ink < 40 || busy} onClick={validate}>
          {busy ? <Loader size={16} className="animate-spin" /> : <Check size={16} />} {t('Valider la signature')}
        </button>
      </div>
    </div>
  );
}

// Tablette graphique sans écran branchée en USB (Huion, Wacom…) : son pilote
// fait correspondre toute sa surface à tout l'écran. La zone de signature
// occupe donc tout l'écran (plein écran du navigateur) pour que le patient
// dispose de toute la surface de la tablette.
export function GraphicTabletPadScreen({ signerName, onBack, onValidate, busy }) {
  const { t } = useTranslation();
  const padRef = useRef(null);
  const [ink, setInk] = useState(0);
  useEffect(() => {
    const root = document.documentElement;
    if (!document.fullscreenElement) root.requestFullscreen?.().catch(() => {});
    return () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); };
  }, []);
  const validate = () => {
    const png = padRef.current?.toPng();
    if (png) onValidate({ png, pointerType: padRef.current.pointerType() });
  };
  const small = (primary, disabled) => ({ ...signButtonStyle(primary, disabled), height: 36, padding: '0 14px', fontSize: 13 });
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9600, background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f4f5f8', borderBottom: '1px solid #d6dae3', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1f2a52' }}>{t('Signez sur la tablette graphique')}</div>
          <div style={{ fontSize: 12, color: '#5b6275' }}>{`${t('Lu et approuvé')} — ${signerName}`}</div>
        </div>
        <button style={small(false, busy)} disabled={busy} onClick={onBack}><ArrowLeft size={15} /> {t('Retour')}</button>
        <button style={small(false, ink === 0 || busy)} disabled={ink === 0 || busy} onClick={() => padRef.current?.clear()}><Eraser size={15} /> {t('Effacer')}</button>
        <button style={small(true, ink < 40 || busy)} disabled={ink < 40 || busy} onClick={validate}>
          {busy ? <Loader size={15} className="animate-spin" /> : <Check size={15} />} {t('Valider la signature')}
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <SignaturePad ref={padRef} height="100%" bare onChange={({ ink: v }) => setInk(v)} />
      </div>
    </div>
  );
}

// ── Signature sur une tablette du guichet (vue du PC de l'agent) ──────────────
function RemoteSignaturePanel({ doc, frame, signerName, onSigned, onBack }) {
  const { t } = useTranslation();
  const [request, setRequest] = useState(null); // { token, url, qr, expiresAt }
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('waiting');
  const [kiosks, setKiosks] = useState([]);
  const [sentTo, setSentTo] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [attempt, setAttempt] = useState(0);
  const doneRef = useRef(false);
  const onSignedRef = useRef(onSigned);
  onSignedRef.current = onSigned;

  // Création de la demande (lien + QR code)
  useEffect(() => {
    let alive = true;
    let token = null;
    setRequest(null); setError(null); setStatus('waiting'); setSentTo(null);
    documentsAPI.createSignatureRequest(doc.id, {
      signerName, origin: window.location.origin,
      placement: { page: frame.page, x: frame.x, y: frame.y, w: frame.w, h: frame.h },
    })
      .then((res) => {
        token = res.data.data.token;
        if (alive) setRequest(res.data.data);
        else documentsAPI.cancelSignatureRequest(token).catch(() => {});
      })
      .catch((err) => { if (alive) setError(err.response?.data?.message || t('Erreur serveur.')); });
    return () => {
      alive = false;
      // Fermé sans signature : la tablette doit lâcher le document
      if (token && !doneRef.current) documentsAPI.cancelSignatureRequest(token).catch(() => {});
    };
  }, [doc.id, frame, signerName, attempt, t]);

  const finish = useCallback((signature, pointerType) => {
    if (doneRef.current || !request) return;
    doneRef.current = true;
    onSignedRef.current({ png: signature, pointerType, requestToken: request.token });
  }, [request]);

  // Réception en direct (Socket.IO) + vérification régulière en secours
  useEffect(() => {
    if (!request) return undefined;
    const socket = getSocket() || initializeSocket();
    const onUpdate = (u) => {
      if (u.token !== request.token) return;
      setStatus(u.status);
      if (u.status === 'signed' && u.signature) finish(u.signature, u.pointerType);
    };
    socket?.on('signature-request:update', onUpdate);
    const poll = setInterval(() => {
      documentsAPI.getSignatureRequest(request.token)
        .then((res) => {
          const d = res.data.data;
          setStatus(d.status);
          if (d.status === 'signed' && d.signature) finish(d.signature, d.pointerType);
        })
        .catch(() => {});
    }, 3000);
    return () => { socket?.off('signature-request:update', onUpdate); clearInterval(poll); };
  }, [request, finish]);

  // Tablettes de guichet connectées
  useEffect(() => {
    let alive = true;
    const load = () => documentsAPI.getSignatureKiosks().then((res) => { if (alive) setKiosks(res.data.data || []); }).catch(() => {});
    load();
    const id = setInterval(load, 4000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const send = async (kiosk) => {
    try {
      await documentsAPI.sendSignatureRequest(request.token, kiosk.id);
      setSentTo(kiosk);
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur serveur.'));
    }
  };

  const remaining = request ? Math.max(0, new Date(request.expiresAt).getTime() - now) : 0;
  const expired = request && remaining === 0 && status !== 'signed';
  const mmss = `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;
  const kioskUrl = `${window.location.origin}/borne-signature`;

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 680, background: 'var(--surface)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-3)', maxHeight: '100%', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Tablet size={18} color="var(--brand)" />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>{t('Signature sur une tablette')}</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16 }}>
          {t('Le patient voit le document et signe sur la tablette ; la signature arrive ici pour vérification.')}
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        {/* Statut */}
        {request && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600,
            background: expired ? 'var(--danger-soft)' : status === 'opened' ? 'var(--brand-soft)' : 'var(--surface-2)',
            color: expired ? 'var(--danger)' : status === 'opened' ? 'var(--brand)' : 'var(--fg-muted)' }}>
            {!expired && <Loader size={14} className="animate-spin" />}
            <span style={{ flex: 1 }}>
              {expired ? t('Le lien a expiré.')
                : status === 'opened' ? t('Document ouvert sur la tablette : le patient signe…')
                : sentTo ? t('Envoyé à « {{name}} », en attente…', { name: sentTo.name })
                : t('En attente de la tablette…')}
            </span>
            {!expired && <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{mmss}</span>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* Bornes */}
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>{t('Tablettes du guichet')}</div>
            {kiosks.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                {t('Aucune tablette connectée. Sur la tablette, ouvrez cette adresse (connecté à la GED) pour qu\'elle apparaisse ici :')}
                <div style={{ marginTop: 6, fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--fg)', wordBreak: 'break-all' }}>{kioskUrl}</div>
              </div>
            ) : kiosks.map((k) => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6 }}>
                <MonitorSmartphone size={16} color="var(--fg-muted)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{k.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{k.busy && sentTo?.id !== k.id ? t('Occupée') : k.userName}</div>
                </div>
                <button style={{ ...signButtonStyle(true, !request || expired), height: 34, padding: '0 12px', fontSize: 12 }} disabled={!request || expired} onClick={() => send(k)}>
                  <Send size={14} /> {sentTo?.id === k.id ? t('Renvoyer') : t('Envoyer')}
                </button>
              </div>
            ))}
          </div>

          {/* QR code */}
          <div style={{ flex: '0 1 230px', textAlign: 'center', margin: '0 auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>{t('Ou scanner ce code')}</div>
            <div style={{ width: 200, height: 200, margin: '0 auto', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', opacity: expired ? 0.25 : 1 }}>
              {request ? <img src={request.qr} alt={t('QR code de signature')} style={{ width: 188, height: 188 }} /> : <Loader size={20} className="animate-spin" color="#888" />}
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6 }}>{t('Avec l\'appareil photo de la tablette ou du téléphone du patient')}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18, flexWrap: 'wrap' }}>
          <button style={signButtonStyle(false)} onClick={onBack}><ArrowLeft size={16} /> {t('Retour')}</button>
          {expired && <button style={signButtonStyle(true)} onClick={() => setAttempt((a) => a + 1)}><RefreshCw size={16} /> {t('Nouveau lien')}</button>}
        </div>
      </div>
    </div>
  );
}

// ── Session complète ─────────────────────────────────────────────────────────
export default function SignatureSession({ doc, fileUrl, onClose, onSigned }) {
  const { t } = useTranslation();
  const isPdf = doc.fileType === 'application/pdf' || /\.pdf$/i.test(doc.fileName || doc.filePath || '');

  const scrollRef = useRef(null);
  const { pdf, image, pages, loadError } = useDocumentPages(fileUrl, isPdf);
  const width = usePageWidth(scrollRef);
  const [step, setStep] = useState('place'); // place | name | pad | remote | review | saving
  const [frame, setFrame] = useState(null);
  const frameRef = useRef(null);
  frameRef.current = frame;
  const [autoPlaced, setAutoPlaced] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signature, setSignature] = useState(null); // { png, pointerType, requestToken? }

  // Fait défiler jusqu'au cadre (sans scrollIntoView : il fait bouger toute la page)
  const scrollToFrame = useCallback((f) => scrollToFrameIn(scrollRef.current, f), []);

  // Emplacement automatique : texte du PDF, sinon OCR de la dernière page
  useEffect(() => {
    if (!pages.length || (!pdf && !image)) return undefined;
    let alive = true;
    (async () => {
      setDetecting(true);
      try {
        let label = null;
        let text = doc.extractedText || '';
        if (pdf) {
          const found = await findLabelInPdf(pdf, pages.length);
          label = found.label;
          if (found.text.trim()) text = found.text;
          if (!found.anyText && pages.length <= 3) {
            for (let n = pages.length; n >= 1 && !label; n--) {
              const canvas = await renderPdfPage(pdf, n, 1600);
              const ocr = await findLabelByOcr(canvas, n);
              label = ocr.label;
              if (!text) text = ocr.text;
            }
          }
        } else if (image) {
          const canvas = document.createElement('canvas');
          const k = Math.min(1, 1800 / image.naturalWidth);
          canvas.width = Math.round(image.naturalWidth * k);
          canvas.height = Math.round(image.naturalHeight * k);
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          const ocr = await findLabelByOcr(canvas, 1);
          label = ocr.label;
          if (!text) text = ocr.text;
        }
        if (!alive) return;
        const name = guessSignerName(text);
        if (name) setSignerName((cur) => cur || name);
        if (label) {
          const info = pages[label.page - 1];
          const f = frameNearLabel(label, info.width, info.height);
          if (!frameRef.current) { // sinon l'agent a déjà choisi
            setFrame(f);
            setAutoPlaced(true);
            setTimeout(() => scrollToFrame(f), 80);
          }
        }
      } catch (err) {
        console.warn('[signature] emplacement auto', err);
      } finally {
        if (alive) setDetecting(false);
      }
    })();
    return () => { alive = false; };
  }, [pdf, image, pages, doc.extractedText, scrollToFrame]);

  // Pas de défilement de la page derrière
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const onTap = (pageNumber, x, y) => {
    if (step !== 'place') return;
    const info = pages[pageNumber - 1];
    setFrame(defaultFrame(pageNumber, x, y, info.width, info.height));
    setAutoPlaced(false);
  };

  // Signature sur ce PC : à l'écran ou à la tablette graphique USB. Le dernier
  // choix est retenu sur ce poste (Entrée le reprend).
  const [lastPad, setLastPad] = useState(() => {
    try { return localStorage.getItem(LAST_PAD_KEY) === 'graphic' ? 'graphic' : 'pad'; } catch { return 'pad'; }
  });
  const startPad = (mode) => {
    setLastPad(mode);
    try { localStorage.setItem(LAST_PAD_KEY, mode); } catch { /* stockage indisponible */ }
    setStep(mode);
  };

  // Signature reçue (de cet écran ou d'une tablette du guichet) → aperçu
  const gotSignature = (sig) => {
    setSignature(sig);
    setStep('review');
    setTimeout(() => frame && scrollToFrame(frame), 80);
  };

  const submit = async () => {
    setStep('saving');
    try {
      const res = await documentsAPI.signManually(doc.id, {
        signature: signature.png,
        signerName: signerName.trim(),
        placement: { page: frame.page, x: frame.x, y: frame.y, w: frame.w, h: frame.h },
        autoPlaced,
        pointerType: signature.pointerType,
        requestToken: signature.requestToken,
      });
      toast.success(t('Document signé'));
      onSigned?.(res.data?.data);
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur lors de la signature du document.'));
      setStep('review');
    }
  };

  const btn = signButtonStyle;

  const hint = step === 'place'
    ? (frame
      ? (autoPlaced ? t('Emplacement trouvé automatiquement. Déplacez ou agrandissez le cadre si besoin.') : t('Déplacez ou agrandissez le cadre si besoin.'))
      : t("Touchez l'endroit où le patient doit signer."))
    : t('Vérifiez la signature avant de l\'apposer. Le document sera ensuite verrouillé.');

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9500, display: 'flex', flexDirection: 'column', background: '#3d4146' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <PenLine size={18} color="var(--brand)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{t('Faire signer')}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
        </div>
        <button onClick={onClose} disabled={step === 'saving'} aria-label={t('Annuler')}
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      {/* Document */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: 12, position: 'relative', WebkitOverflowScrolling: 'touch' }}>
        {width > 0 && pages.map((info) => (
          <PageView key={info.number} pdf={pdf} image={image} info={info} width={width} root={scrollRef.current}
            onTap={step === 'place' ? onTap : null}>
            {frame?.page === info.number && (
              <SignatureFrame frame={frame} editable={step === 'place'} onChange={(f) => { setFrame(f); setAutoPlaced(false); }}
                preview={['review', 'saving'].includes(step) && signature ? { signature: signature.png, name: signerName.trim(), date: nowLabel() } : null} />
            )}
          </PageView>
        ))}
        {!pages.length && !loadError && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#ddd', fontSize: 13, paddingTop: 80 }}>
            <Loader size={24} className="animate-spin" />{t('Chargement du document…')}
          </div>
        )}
        {loadError && (
          <div style={{ color: '#eee', fontSize: 13, paddingTop: 80, textAlign: 'center' }}>{t('Impossible d\'ouvrir ce document pour le signer.')}</div>
        )}
      </div>

      {/* Barre d'actions */}
      {['place', 'review', 'saving'].includes(step) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 14px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))', background: 'var(--surface)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ flex: '1 1 220px', minWidth: 0, fontSize: 13, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {step === 'place' && detecting && !frame && <Loader size={14} className="animate-spin" style={{ flexShrink: 0 }} />}
            {step === 'place' && autoPlaced && frame && <Sparkles size={14} color="var(--brand)" style={{ flexShrink: 0 }} />}
            {step !== 'place' && <Lock size={14} style={{ flexShrink: 0 }} />}
            <span>{step === 'place' && detecting && !frame ? t("Recherche de l'emplacement de signature…") : hint}</span>
          </div>
          {step === 'place' ? (
            <button style={btn(true, !frame)} disabled={!frame} onClick={() => setStep('name')}>
              {t('Continuer')}
            </button>
          ) : (
            <>
              <button style={btn(false, step === 'saving')} disabled={step === 'saving'} onClick={() => { setSignature(null); setStep('name'); }}>
                <Undo2 size={16} /> {t('Refaire la signature')}
              </button>
              <button style={btn(true, step === 'saving')} disabled={step === 'saving'} onClick={submit}>
                {step === 'saving' ? <Loader size={16} className="animate-spin" /> : <Check size={16} />} {t('Apposer la signature')}
              </button>
            </>
          )}
        </div>
      )}

      {/* Nom du signataire (saisi par l'agent) */}
      {step === 'name' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={(e) => { e.preventDefault(); if (signerName.trim().length >= 2) startPad(lastPad); }}
            style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-3)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>{t('Qui signe ?')}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 14 }}>{t('Le nom sera écrit sous la signature, avec la date et l\'heure.')}</div>
            <input autoFocus value={signerName} onChange={(e) => setSignerName(e.target.value)} maxLength={120}
              placeholder={t('Nom et prénom du signataire')}
              style={{ width: '100%', boxSizing: 'border-box', height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 15 }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', margin: '16px 0 8px' }}>{t('Où le patient signe-t-il ?')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" style={{ ...btn(lastPad === 'pad', signerName.trim().length < 2), flex: '1 1 100%' }} disabled={signerName.trim().length < 2} onClick={() => startPad('pad')}>
                <PenLine size={16} /> {t('Sur cet écran')}
              </button>
              <button type="button" style={{ ...btn(lastPad === 'graphic', signerName.trim().length < 2), flex: '1 1 100%' }} disabled={signerName.trim().length < 2} onClick={() => startPad('graphic')}
                title={t('Tablette sans écran branchée en USB (Huion, Wacom…) : la zone de signature passe en plein écran pour utiliser toute la surface de la tablette.')}>
                <Monitor size={16} /> {t('Tablette graphique (USB)')}
              </button>
              <button type="button" style={{ ...btn(false, signerName.trim().length < 2), flex: '1 1 100%' }} disabled={signerName.trim().length < 2} onClick={() => setStep('remote')}>
                <Tablet size={16} /> {t('Sur une tablette')}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 12 }}>
              <button type="button" style={{ ...btn(false), height: 34, fontSize: 13 }} onClick={() => setStep('place')}><ArrowLeft size={15} /> {t('Retour')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Zone de signature plein écran (le patient signe sur cet écran) */}
      {step === 'pad' && (
        <SignPadScreen signerName={signerName.trim()} onBack={() => setStep('name')} onValidate={gotSignature} />
      )}

      {/* Tablette graphique USB : zone de signature en plein écran */}
      {step === 'graphic' && (
        <GraphicTabletPadScreen signerName={signerName.trim()} onBack={() => setStep('name')} onValidate={gotSignature} />
      )}

      {/* Le patient signe sur une tablette du guichet */}
      {step === 'remote' && frame && (
        <RemoteSignaturePanel doc={doc} frame={frame} signerName={signerName.trim()} onSigned={gotSignature} onBack={() => setStep('name')} />
      )}
    </div>,
    document.body
  );
}
