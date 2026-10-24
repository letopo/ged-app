// frontend/src/components/DocumentScanner.jsx
// Scanner de documents plein écran (façon CamScanner) :
//   caméra en direct → déclenchement automatique quand la feuille est stable →
//   recadrage + filtre automatiques → pages (modifiables) → OCR → PDF cherchable.
// Utilisation :
//   <DocumentScanner onClose={...} onDone={(pdfFile, pageCount, { text }) => ...} />
//   <DocumentScanner initialFile={photo} ... />   // convertir une photo existante
// Sans caméra en direct (refus d'autorisation, navigateur ancien, page non
// sécurisée), on retombe sur l'appareil photo du téléphone (une photo à la fois).
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  X, Camera, Image as ImageIcon, RotateCw, Check, ArrowLeft, Trash2,
  ChevronLeft, ChevronRight, Pencil, Loader, Maximize, Wand2, FileText,
  Zap, ZapOff, ScanText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  loadOpenCV, loadImageFile, detectCorners, defaultCorners, fullCorners,
  warpDocument, applyFilter, rotateCanvas, canvasToThumb, buildPdf, scanFileName,
  limitCanvas, FILTERS, DEFAULT_FILTER,
} from '../utils/docScanner';
import { preloadOcr, recognizeCanvas, terminateOcr } from '../utils/scanOcr';

const FILTER_KEY = 'ged.scanner.filter';
const readFilter = () => {
  try { return localStorage.getItem(FILTER_KEY) || DEFAULT_FILTER; } catch { return DEFAULT_FILTER; }
};
const saveFilter = (f) => { try { localStorage.setItem(FILTER_KEY, f); } catch { /* stockage indisponible */ } };
// Préférences mémorisées sur l'appareil (déclenchement auto, OCR)
const readPref = (key, def) => {
  try { const v = localStorage.getItem(key); return v === null ? def : v === '1'; } catch { return def; }
};
const savePref = (key, v) => { try { localStorage.setItem(key, v ? '1' : '0'); } catch { /* stockage indisponible */ } };
const AUTO_KEY = 'ged.scanner.auto';
const OCR_KEY = 'ged.scanner.ocr';

const liveCameraSupported = () => !!(navigator.mediaDevices?.getUserMedia) && window.isSecureContext !== false;

let nextId = 1;

// ── Styles communs (interface sombre, comme une appli photo) ─────────────────
const S = {
  root: {
    position: 'fixed', inset: 0, zIndex: 9999, background: '#0b0b0d', color: '#fff',
    display: 'flex', flexDirection: 'column', userSelect: 'none', WebkitUserSelect: 'none',
  },
  header: {
    height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px',
    paddingTop: 'env(safe-area-inset-top, 0px)', borderBottom: '1px solid #222',
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, border: 'none', background: 'transparent', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  },
  footer: {
    flexShrink: 0, padding: '10px 12px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
    borderTop: '1px solid #222', display: 'flex', gap: 8, alignItems: 'center',
  },
  btn: {
    flex: 1, minHeight: 46, borderRadius: 12, border: '1px solid #333', background: '#1c1c20', color: '#fff',
    fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    cursor: 'pointer', padding: '0 10px',
  },
  primary: { background: 'var(--brand, #2563eb)', borderColor: 'var(--brand, #2563eb)' },
  stage: { flex: 1, minHeight: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
};

// ── Recadrage : photo + 4 poignées déplaçables + loupe ───────────────────────
function CropEditor({ page, onChange }) {
  const boxRef = useRef(null);
  const svgRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [drag, setDrag] = useState(null); // index du coin déplacé

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = page.src.width, H = page.src.height;
  const pad = 24; // marge pour pouvoir attraper les coins au bord de la photo
  const scale = box.w && box.h ? Math.min((box.w - pad * 2) / W, (box.h - pad * 2) / H) : 0;
  const dw = W * scale, dh = H * scale;

  const toImage = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return {
      x: Math.min(W, Math.max(0, ((e.clientX - r.left) / r.width) * W)),
      y: Math.min(H, Math.max(0, ((e.clientY - r.top) / r.height) * H)),
    };
  };

  const onPointerDown = (i) => (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag(i);
  };
  const onPointerMove = (e) => {
    if (drag === null) return;
    const p = toImage(e);
    onChange(page.corners.map((c, i) => (i === drag ? p : c)));
  };
  const onPointerUp = () => setDrag(null);

  const pts = page.corners;
  const poly = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const u = scale ? 1 / scale : 1; // 1 px écran en unités image

  // Loupe : zoom ×2.5 autour du coin déplacé, placée du côté opposé au doigt
  const LOUPE = 116, Z = 2.5;
  const dragged = drag !== null ? pts[drag] : null;
  const loupeLeft = dragged && dragged.x < W / 2;

  return (
    <div ref={boxRef} style={S.stage}>
      {scale > 0 && (
        <div style={{ position: 'relative', width: dw, height: dh }}>
          <img src={page.url} alt="" draggable={false} style={{ width: dw, height: dh, display: 'block', pointerEvents: 'none' }} />
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width={dw} height={dh}
            style={{ position: 'absolute', inset: 0, overflow: 'visible', touchAction: 'none' }}
            onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          >
            <path
              d={`M0,0 H${W} V${H} H0 Z M${pts.map((p) => `${p.x},${p.y}`).join(' L')} Z`}
              fill="rgba(0,0,0,0.5)" fillRule="evenodd"
            />
            <polygon points={poly} fill="rgba(37,99,235,0.12)" stroke="#3b82f6" strokeWidth={2.5 * u} strokeLinejoin="round" />
            {pts.map((p, i) => (
              <g key={i} onPointerDown={onPointerDown(i)} style={{ cursor: 'grab' }}>
                <circle cx={p.x} cy={p.y} r={26 * u} fill="transparent" />
                <circle cx={p.x} cy={p.y} r={11 * u} fill={drag === i ? '#3b82f6' : 'rgba(255,255,255,0.9)'} stroke="#3b82f6" strokeWidth={3 * u} />
              </g>
            ))}
          </svg>
        </div>
      )}
      {dragged && (
        <div style={{
          position: 'absolute', top: 12, [loupeLeft ? 'right' : 'left']: 12,
          width: LOUPE, height: LOUPE, borderRadius: '50%', overflow: 'hidden',
          border: '3px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,.6)', pointerEvents: 'none',
          backgroundImage: `url(${page.url})`, backgroundRepeat: 'no-repeat', backgroundColor: '#000',
          backgroundSize: `${dw * Z}px ${dh * Z}px`,
          backgroundPosition: `${-(dragged.x * scale * Z - LOUPE / 2)}px ${-(dragged.y * scale * Z - LOUPE / 2)}px`,
        }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#3b82f6' }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: '#3b82f6' }} />
        </div>
      )}
    </div>
  );
}

// ── Caméra en direct : contour de la feuille + déclenchement automatique ─────
const TICK_MS = 280;          // une analyse d'image toutes les ~0,3 s
const STABLE_TICKS = 4;       // ≈ 1,2 s sans bouger avant la photo automatique
const MOVE_TOLERANCE = 0.025; // déplacement max d'un coin (fraction de la diagonale)
const REARM_MOVE = 0.12;      // la feuille doit changer avant la photo suivante
const REARM_DELAY = 1500;

const maxMove = (a, b, diag) => Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y))) / diag;

function LiveCamera({ cvRef, auto, onCapture, onUnavailable, lastThumb, pageCount, onOpenPages, onToggleAuto, onImport }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const boxRef = useRef(null);
  const streamRef = useRef(null);
  const [vid, setVid] = useState(null);        // { w, h } dimensions de la vidéo
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [quad, setQuad] = useState(null);      // coins détectés (coordonnées vidéo)
  const [progress, setProgress] = useState(0); // 0 → 1 : stabilité
  const [flash, setFlash] = useState(false);
  const [torch, setTorch] = useState(null);    // null = non disponible, sinon booléen
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;
  const loop = useRef({ last: null, stable: 0, armed: true, capturedAt: 0, capturedQuad: null, lost: 0 });

  // Ouverture de la caméra arrière, en haute définition (meilleure lecture du texte)
  useEffect(() => {
    let alive = true;
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } },
    }).then((stream) => {
      if (!alive) { stream.getTracks().forEach((tr) => tr.stop()); return; }
      streamRef.current = stream;
      const v = videoRef.current;
      v.srcObject = stream;
      v.onloadedmetadata = () => { setVid({ w: v.videoWidth, h: v.videoHeight }); v.play().catch(() => {}); };
      const track = stream.getVideoTracks()[0];
      try { if (track.getCapabilities?.().torch) setTorch(false); } catch { /* pas de lampe */ }
    }).catch((err) => {
      console.warn('[scanner] caméra en direct indisponible :', err?.name || err);
      if (alive) onUnavailable(err);
    });
    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, [onUnavailable]);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Image complète de la vidéo (pleine résolution, réduite à la taille de travail)
  const grabFrame = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    return limitCanvas(c);
  }, []);

  const capture = useCallback((corners) => {
    const frame = grabFrame();
    if (!frame) return;
    const v = videoRef.current;
    const k = frame.width / v.videoWidth;
    setFlash(true);
    setTimeout(() => setFlash(false), 160);
    try { navigator.vibrate?.(40); } catch { /* pas de vibreur */ }
    const L = loop.current;
    L.armed = false;
    L.capturedAt = Date.now();
    L.capturedQuad = corners || L.last;
    L.stable = 0;
    setProgress(0);
    onCaptureRef.current(frame, corners ? corners.map((p) => ({ x: p.x * k, y: p.y * k })) : null);
  }, [grabFrame]);

  // Boucle d'analyse : détecte la feuille, mesure sa stabilité, déclenche
  useEffect(() => {
    if (!vid) return undefined;
    let timer = null;
    let stopped = false;
    const small = document.createElement('canvas');
    const scale = Math.min(1, 640 / Math.max(vid.w, vid.h));
    small.width = Math.round(vid.w * scale);
    small.height = Math.round(vid.h * scale);
    const diag = Math.hypot(vid.w, vid.h);

    const tick = () => {
      if (stopped) return;
      const cv = cvRef.current;
      const v = videoRef.current;
      if (cv && v && v.readyState >= 2) {
        small.getContext('2d').drawImage(v, 0, 0, small.width, small.height);
        const found = detectCorners(cv, small);
        const L = loop.current;
        if (found) {
          const q = found.map((p) => ({ x: p.x / scale, y: p.y / scale }));
          L.stable = L.last && maxMove(q, L.last, diag) < MOVE_TOLERANCE ? L.stable + 1 : 0;
          L.last = q;
          L.lost = 0;
          setQuad(q);
          if (!L.armed && Date.now() - L.capturedAt > REARM_DELAY
              && (!L.capturedQuad || maxMove(q, L.capturedQuad, diag) > REARM_MOVE)) L.armed = true;
          const p = L.armed ? Math.min(1, L.stable / STABLE_TICKS) : 0;
          setProgress(p);
          if (p >= 1 && autoRef.current) capture(q);
        } else {
          L.lost += 1;
          L.stable = 0;
          if (L.lost >= 2) { L.last = null; setQuad(null); setProgress(0); }
          // Feuille retirée du champ : prêt pour la suivante
          if (!L.armed && L.lost >= 2 && Date.now() - L.capturedAt > REARM_DELAY) L.armed = true;
        }
      }
      timer = setTimeout(tick, TICK_MS);
    };
    timer = setTimeout(tick, TICK_MS);
    return () => { stopped = true; clearTimeout(timer); };
  }, [vid, cvRef, capture]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || torch === null) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch }] });
      setTorch(!torch);
    } catch { setTorch(null); }
  };

  const scale = vid && box.w ? Math.min(box.w / vid.w, box.h / vid.h) : 0;
  const dw = vid ? vid.w * scale : 0, dh = vid ? vid.h * scale : 0;
  const armed = loop.current.armed;
  const color = progress >= 1 || (progress > 0.5 && auto) ? '#22c55e' : '#3b82f6';
  const hint = !vid ? t('Ouverture de la caméra…')
    : !cvRef.current ? t('Préparation du scanner…')
    : !quad ? t('Cadrez la feuille sur un fond contrasté')
    : !armed ? t('Page prise. Placez la page suivante.')
    : auto ? t('Ne bougez plus…') : t('Appuyez sur le déclencheur');
  const R = 34, CIRC = 2 * Math.PI * R;

  return (
    <>
      <div ref={boxRef} style={{ ...S.stage, background: '#000' }}>
        <div style={{ position: 'relative', width: dw || '100%', height: dh || '100%' }}>
          <video ref={videoRef} playsInline muted autoPlay style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }} />
          {vid && quad && (
            <svg viewBox={`0 0 ${vid.w} ${vid.h}`} width={dw} height={dh} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <polygon points={quad.map((p) => `${p.x},${p.y}`).join(' ')}
                fill={color === '#22c55e' ? 'rgba(34,197,94,0.18)' : 'rgba(59,130,246,0.15)'}
                stroke={color} strokeWidth={3 / (scale || 1)} strokeLinejoin="round" />
            </svg>
          )}
          {flash && <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0.85 }} />}
        </div>
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, textAlign: 'center', pointerEvents: 'none' }}>
          <span style={{ background: 'rgba(0,0,0,.6)', borderRadius: 16, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>{hint}</span>
        </div>
      </div>

      <div style={{ ...S.footer, justifyContent: 'space-between', paddingTop: 14, paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Pages déjà prises */}
        <button onClick={onOpenPages} disabled={!pageCount} aria-label={t('Voir les pages')}
          style={{ width: 56, height: 72, borderRadius: 8, border: '2px solid #fff', background: '#222', padding: 0, position: 'relative', cursor: pageCount ? 'pointer' : 'default', opacity: pageCount ? 1 : 0.35, overflow: 'visible' }}>
          {lastThumb && <img src={lastThumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />}
          {pageCount > 0 && (
            <span style={{ position: 'absolute', top: -8, right: -8, minWidth: 22, height: 22, borderRadius: 11, background: 'var(--brand, #2563eb)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{pageCount}</span>
          )}
        </button>

        {/* Déclencheur (anneau = stabilité de la feuille) */}
        <button onClick={() => capture(quad)} disabled={!vid} aria-label={t('Prendre la photo')}
          style={{ width: 80, height: 80, borderRadius: 40, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', position: 'relative' }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: 'absolute', inset: 0 }}>
            <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="5" />
            {auto && progress > 0 && (
              <circle cx="40" cy="40" r={R} fill="none" stroke="#22c55e" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${CIRC * progress} ${CIRC}`} transform="rotate(-90 40 40)" />
            )}
            <circle cx="40" cy="40" r="27" fill="#fff" />
          </svg>
        </button>

        {/* Déclenchement automatique */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', width: 56 }}>
          <button onClick={onToggleAuto} aria-pressed={auto} title={t('Photo automatique quand la feuille est stable')}
            style={{ width: 56, height: 32, borderRadius: 16, border: `1.5px solid ${auto ? '#22c55e' : '#555'}`, background: auto ? 'rgba(34,197,94,.18)' : '#1c1c20', color: auto ? '#86efac' : '#aaa', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {auto ? t('Auto') : t('Manuel')}
          </button>
        </div>
      </div>

      {/* Boutons du haut, superposés à l'en-tête via le parent */}
      <TopActions>
        {torch !== null && (
          <button style={S.iconBtn} onClick={toggleTorch} aria-label={t('Lampe')} title={t('Lampe')}>
            {torch ? <Zap size={20} color="#facc15" /> : <ZapOff size={20} />}
          </button>
        )}
        <button style={S.iconBtn} onClick={onImport} aria-label={t('Importer une photo')} title={t('Importer une photo')}>
          <ImageIcon size={20} />
        </button>
      </TopActions>
    </>
  );
}

// Les boutons propres à la caméra sont rendus dans l'en-tête du scanner
const TopActionsContext = React.createContext(null);
function TopActions({ children }) {
  const slot = React.useContext(TopActionsContext);
  return slot ? ReactDOM.createPortal(children, slot) : null;
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function DocumentScanner({ initialFile, onClose, onDone, maxUploadMb }) {
  const { t } = useTranslation();
  const [cvState, setCvState] = useState('loading'); // loading | ready | failed
  const cvRef = useRef(null);
  const [live, setLive] = useState(() => !initialFile && liveCameraSupported());
  const [auto, setAuto] = useState(() => readPref(AUTO_KEY, true));
  const [ocrOn, setOcrOn] = useState(() => readPref(OCR_KEY, true));

  const [pages, setPages] = useState([]);       // pages validées
  const [edit, setEdit] = useState(null);       // page en cours de recadrage/filtre
  const [mode, setMode] = useState(() => (initialFile ? 'loading' : (live ? 'camera' : 'pages')));
  const [preview, setPreview] = useState(null); // dataURL de l'aperçu filtré
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(null); // { done, total } pendant l'OCR final
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [ocrState, setOcrState] = useState({}); // id de page → 'pending' | 'done' | 'error'
  const [headerSlot, setHeaderSlot] = useState(null);
  const pendingFile = useRef(initialFile || null);
  const filterCache = useRef({});
  const ocrJobs = useRef(new Map());            // id de page → { out, promise }
  const cameraInput = useRef(null);
  const galleryInput = useRef(null);

  // OpenCV en arrière-plan dès l'ouverture ; l'OCR aussi s'il est activé
  useEffect(() => {
    let alive = true;
    loadOpenCV().then(({ cv }) => {
      if (!alive) return;
      cvRef.current = cv;
      setCvState(cv ? 'ready' : 'failed');
    });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (ocrOn) preloadOcr(); }, [ocrOn]);
  useEffect(() => () => { terminateOcr(); }, []);

  // Empêche la page derrière de défiler
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── OCR des pages, en arrière-plan ─────────────────────────────────────────
  const ensureOcr = useCallback((page) => {
    const job = ocrJobs.current.get(page.id);
    if (job && job.out === page.out) return job.promise;
    const out = page.out;
    const isCurrent = () => ocrJobs.current.get(page.id)?.out === out;
    setOcrState((s) => ({ ...s, [page.id]: 'pending' }));
    const promise = recognizeCanvas(out).then((res) => {
      if (isCurrent()) setOcrState((s) => ({ ...s, [page.id]: 'done' }));
      return res;
    }, (err) => {
      console.warn('[scanner] OCR :', err);
      if (isCurrent()) setOcrState((s) => ({ ...s, [page.id]: 'error' }));
      return null;
    });
    ocrJobs.current.set(page.id, { out, promise });
    return promise;
  }, []);

  useEffect(() => {
    if (ocrOn) pages.forEach(ensureOcr);
  }, [pages, ocrOn, ensureOcr]);

  // ── Ajout de pages ─────────────────────────────────────────────────────────
  // « Reprendre » pendant la modification d'une page existante : la nouvelle
  // photo remplace cette page au lieu d'en ajouter une.
  const retakeFor = useRef(null);

  const makePage = (id, src, corners, filter, rotation) => {
    const warped = warpDocument(cvRef.current, src, corners);
    const out = rotateCanvas(applyFilter(cvRef.current, warped, filter), rotation);
    return { id, src, url: null, corners, filter, rotation, out, thumb: canvasToThumb(out) };
  };

  // Photo de la caméra en direct : recadrée et filtrée automatiquement
  const onLiveCapture = useCallback((frame, corners) => {
    try {
      const c = corners || detectCorners(cvRef.current, frame);
      if (!c) toast(t('Bords non détectés : page gardée entière, modifiable ensuite.'));
      const page = makePage(nextId++, frame, c || fullCorners(frame.width, frame.height), readFilter(), 0);
      setPages((ps) => [...ps, page]);
    } catch (err) {
      console.error('[scanner]', err);
      toast.error(t('Le recadrage a échoué. Réessayez.'));
    }
  }, [t]);

  const onLiveUnavailable = useCallback((err) => {
    setLive(false);
    setMode('pages');
    if (err?.name === 'NotAllowedError') toast(t("Accès à la caméra refusé : utilisez « Prendre une photo ».")); 
  }, [t]);

  const startPage = useCallback(async (file) => {
    const editingId = retakeFor.current;
    retakeFor.current = null;
    setMode('loading');
    try {
      const src = await loadImageFile(file);
      const corners = detectCorners(cvRef.current, src) || defaultCorners(src.width, src.height);
      setEdit({
        id: nextId++, src, url: src.toDataURL('image/jpeg', 0.85), corners,
        filter: readFilter(), rotation: 0, warped: null, editingId,
      });
      setMode('crop');
    } catch {
      toast.error(t('Impossible de lire cette photo.'));
      setEdit(null);
      if (pages.length || live) setMode(live ? 'camera' : 'pages');
      else onClose();
    }
  }, [pages.length, live, onClose, t]);

  // Photo initiale : on attend qu'OpenCV soit prêt (ou en échec) pour détecter les bords
  useEffect(() => {
    if (cvState === 'loading' || !pendingFile.current) return;
    const f = pendingFile.current;
    pendingFile.current = null;
    startPage(f);
  }, [cvState, startPage]);

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error(t('Choisissez une photo (JPG, PNG…).')); return; }
    if (cvState === 'loading') { pendingFile.current = f; setMode('loading'); return; }
    startPage(f);
  };

  const addPage = () => {
    if (live) setMode('camera');
    else cameraInput.current?.click();
  };

  // ── Recadrage → filtre ─────────────────────────────────────────────────────
  const renderFilter = useCallback((warped, filter, rotation) => {
    const key = filter;
    if (!filterCache.current[key]) filterCache.current[key] = applyFilter(cvRef.current, warped, filter);
    return rotateCanvas(filterCache.current[key], rotation);
  }, []);

  const goFilter = () => {
    setBusy(true);
    // laisse le spinner s'afficher avant le calcul (synchrone)
    setTimeout(() => {
      try {
        const warped = warpDocument(cvRef.current, edit.src, edit.corners);
        filterCache.current = {};
        const out = renderFilter(warped, edit.filter, edit.rotation);
        setEdit((p) => ({ ...p, warped }));
        setPreview(out.toDataURL('image/jpeg', 0.85));
        setMode('filter');
      } catch (err) {
        console.error('[scanner]', err);
        toast.error(t('Le recadrage a échoué. Réessayez.'));
      } finally {
        setBusy(false);
      }
    }, 30);
  };

  const changeFilter = (filter, rotation = edit.rotation) => {
    setBusy(true);
    setTimeout(() => {
      try {
        const out = renderFilter(edit.warped, filter, rotation);
        setPreview(out.toDataURL('image/jpeg', 0.85));
        setEdit((p) => ({ ...p, filter, rotation }));
      } catch (err) {
        console.error('[scanner]', err);
        toast.error(t("Ce filtre n'a pas pu être appliqué."));
      } finally {
        setBusy(false);
      }
    }, 30);
  };

  const validatePage = () => {
    const out = renderFilter(edit.warped, edit.filter, edit.rotation);
    saveFilter(edit.filter);
    const page = {
      id: edit.editingId || edit.id, src: edit.src, url: edit.url, corners: edit.corners,
      filter: edit.filter, rotation: edit.rotation, out, thumb: canvasToThumb(out),
    };
    retakeFor.current = null;
    setPages((ps) => (edit.editingId ? ps.map((p) => (p.id === edit.editingId ? page : p)) : [...ps, page]));
    setEdit(null);
    setPreview(null);
    filterCache.current = {};
    // Nouvelle page prise avec la caméra en direct → on y retourne ; sinon la liste
    setMode(live && !edit.editingId ? 'camera' : 'pages');
  };

  const editPage = (p) => {
    setEdit({ ...p, url: p.url || p.src.toDataURL('image/jpeg', 0.85), id: nextId++, warped: null, editingId: p.id });
    setMode('crop');
  };

  const movePage = (i, d) => setPages((ps) => {
    const j = i + d;
    if (j < 0 || j >= ps.length) return ps;
    const n = [...ps];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  const cancelEdit = () => {
    const wasEditing = !!edit?.editingId;
    retakeFor.current = null;
    setEdit(null);
    setPreview(null);
    if (pages.length && (wasEditing || !live)) setMode('pages');
    else if (live) setMode('camera');
    else onClose();
  };

  // ── PDF ────────────────────────────────────────────────────────────────────
  const finish = async () => {
    if (!pages.length || busy) return;
    setBusy(true);
    try {
      let results = pages.map(() => null);
      if (ocrOn) {
        let done = 0;
        setFinishing({ done, total: pages.length });
        results = await Promise.all(pages.map((p) => ensureOcr(p).then((r) => {
          done += 1;
          setFinishing({ done, total: pages.length });
          return r;
        })));
        if (results.every((r) => !r)) toast(t('Reconnaissance du texte indisponible : PDF créé sans texte.'));
      }
      await new Promise((r) => setTimeout(r, 30));
      const blob = buildPdf(pages.map((p, i) => ({ canvas: p.out, ocr: results[i] })));
      if (maxUploadMb && blob.size > maxUploadMb * 1024 * 1024) {
        toast.error(t('Le PDF dépasse la taille maximale autorisée ({{max}} Mo). Retirez des pages.', { max: maxUploadMb }));
        return;
      }
      const text = results.filter(Boolean).map((r) => r.text).filter(Boolean).join('\n\n');
      const file = new File([blob], scanFileName(), { type: 'application/pdf' });
      onDone(file, pages.length, { text });
    } catch (err) {
      console.error('[scanner]', err);
      toast.error(t('La création du PDF a échoué.'));
    } finally {
      setBusy(false);
      setFinishing(null);
    }
  };

  const requestClose = () => {
    if (pages.length && !confirmQuit) { setConfirmQuit(true); return; }
    onClose();
  };

  const title = {
    loading: t('Scanner un document'),
    camera: t('Scanner un document'),
    crop: t('Ajustez les coins'),
    filter: t('Choisissez un filtre'),
    pages: t('{{count}} page(s)', { count: pages.length }),
  }[mode];

  const pageLabel = edit && !edit.editingId ? t('Page {{n}}', { n: pages.length + 1 })
    : mode === 'camera' && pages.length ? t('{{count}} page(s)', { count: pages.length }) : null;

  const back = mode === 'filter' ? () => setMode('crop')
    : mode === 'crop' ? cancelEdit
    : mode === 'camera' && pages.length ? () => setMode('pages')
    : requestClose;

  return (
    <div style={S.root} role="dialog" aria-modal="true" aria-label={t('Scanner un document')}>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onPickFile} />
      <input ref={galleryInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPickFile} />

      {/* En-tête */}
      <div style={S.header}>
        <button style={S.iconBtn} onClick={back} aria-label={t('Retour')}>
          {mode === 'filter' || mode === 'crop' || (mode === 'camera' && pages.length) ? <ArrowLeft size={22} /> : <X size={22} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          {pageLabel && <div style={{ fontSize: 11, color: '#999' }}>{pageLabel}</div>}
        </div>
        <div ref={setHeaderSlot} style={{ display: 'flex' }} />
        {mode === 'crop' && edit && (
          <>
            <button style={S.iconBtn} title={t('Détection automatique')} aria-label={t('Détection automatique')}
              onClick={() => {
                const c = detectCorners(cvRef.current, edit.src);
                if (c) setEdit((p) => ({ ...p, corners: c }));
                else toast(t('Bords non détectés : ajustez les coins à la main.'));
              }}>
              <Wand2 size={20} />
            </button>
            <button style={S.iconBtn} title={t('Photo entière')} aria-label={t('Photo entière')}
              onClick={() => setEdit((p) => ({ ...p, corners: fullCorners(p.src.width, p.src.height) }))}>
              <Maximize size={20} />
            </button>
          </>
        )}
        {mode === 'filter' && (
          <button style={{ ...S.iconBtn, opacity: busy ? 0.4 : 1 }} disabled={busy} title={t('Pivoter')} aria-label={t('Pivoter')} onClick={() => changeFilter(edit.filter, (edit.rotation + 1) % 4)}>
            <RotateCw size={20} />
          </button>
        )}
      </div>

      {confirmQuit && (
        <div style={{ padding: '10px 14px', background: '#3a1d1d', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <span style={{ flex: 1 }}>{t('Abandonner ce scan ? Les pages seront perdues.')}</span>
          <button style={{ ...S.btn, flex: 'none', minHeight: 34 }} onClick={() => setConfirmQuit(false)}>{t('Non')}</button>
          <button style={{ ...S.btn, flex: 'none', minHeight: 34, background: '#b91c1c', borderColor: '#b91c1c' }} onClick={onClose}>{t('Oui')}</button>
        </div>
      )}

      {cvState === 'failed' && (mode === 'crop' || mode === 'camera') && (
        <div style={{ padding: '8px 14px', background: '#2a2410', color: '#fcd34d', fontSize: 12 }}>
          {t('Détection automatique indisponible sur cet appareil : placez les coins à la main.')}
        </div>
      )}

      {/* Contenu */}
      {mode === 'loading' && (
        <div style={{ ...S.stage, flexDirection: 'column', gap: 12, color: '#bbb', fontSize: 14 }}>
          <Loader size={28} className="animate-spin" />
          {cvState === 'loading' ? t('Préparation du scanner…') : t('Analyse de la photo…')}
        </div>
      )}

      {mode === 'camera' && (
        <TopActionsContext.Provider value={headerSlot}>
          <LiveCamera
            cvRef={cvRef}
            auto={auto && cvState === 'ready'}
            onCapture={onLiveCapture}
            onUnavailable={onLiveUnavailable}
            lastThumb={pages[pages.length - 1]?.thumb}
            pageCount={pages.length}
            onOpenPages={() => setMode('pages')}
            onToggleAuto={() => { setAuto((a) => { savePref(AUTO_KEY, !a); return !a; }); }}
            onImport={() => galleryInput.current?.click()}
          />
        </TopActionsContext.Provider>
      )}

      {mode === 'crop' && edit && (
        <CropEditor page={edit} onChange={(corners) => setEdit((p) => ({ ...p, corners }))} />
      )}

      {mode === 'filter' && edit && (
        <>
          <div style={{ ...S.stage, padding: 16 }}>
            {preview && <img src={preview} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 4px 24px rgba(0,0,0,.6)', background: '#fff' }} />}
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '10px 12px 0', overflowX: 'auto', flexShrink: 0 }}>
            {FILTERS.map((f) => {
              const active = edit.filter === f.id;
              return (
                <button key={f.id} onClick={() => !active && changeFilter(f.id)} disabled={busy}
                  style={{
                    flex: '1 0 auto', minHeight: 38, padding: '0 14px', borderRadius: 19, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    border: `1.5px solid ${active ? '#3b82f6' : '#333'}`,
                    background: active ? 'rgba(59,130,246,.18)' : '#1c1c20', color: active ? '#93c5fd' : '#ddd',
                  }}>
                  {t(f.label)}
                </button>
              );
            })}
          </div>
        </>
      )}

      {mode === 'pages' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {pages.map((p, i) => {
              const ocr = ocrOn ? ocrState[p.id] : null;
              return (
                <div key={p.id} style={{ background: '#1c1c20', borderRadius: 12, overflow: 'hidden', border: '1px solid #2a2a30' }}>
                  <div onClick={() => editPage(p)} style={{ aspectRatio: '3 / 4', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', cursor: 'pointer', position: 'relative' }}>
                    <img src={p.thumb} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    <span style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,.7)', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                    {ocr && (
                      <span title={ocr === 'done' ? t('Texte reconnu') : ocr === 'error' ? t('Texte non reconnu') : t('Reconnaissance du texte…')}
                        style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,.75)', borderRadius: 10, padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: ocr === 'done' ? '#86efac' : ocr === 'error' ? '#fca5a5' : '#ddd' }}>
                        {ocr === 'pending' ? <Loader size={11} className="animate-spin" /> : <ScanText size={11} />}
                        {ocr === 'done' ? t('Texte') : ocr === 'error' ? '—' : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: 2 }}>
                    <button style={{ ...S.iconBtn, opacity: i === 0 ? 0.3 : 1 }} disabled={i === 0} onClick={() => movePage(i, -1)} aria-label={t('Déplacer avant')}><ChevronLeft size={18} /></button>
                    <button style={S.iconBtn} onClick={() => editPage(p)} aria-label={t('Modifier')}><Pencil size={16} /></button>
                    <button style={{ ...S.iconBtn, color: '#f87171' }} onClick={() => setPages((ps) => ps.filter((x) => x.id !== p.id))} aria-label={t('Supprimer')}><Trash2 size={16} /></button>
                    <button style={{ ...S.iconBtn, opacity: i === pages.length - 1 ? 0.3 : 1 }} disabled={i === pages.length - 1} onClick={() => movePage(i, 1)} aria-label={t('Déplacer après')}><ChevronRight size={18} /></button>
                  </div>
                </div>
              );
            })}
          </div>
          {!pages.length && (
            <div style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 40 }}>{t('Aucune page. Prenez une photo du document.')}</div>
          )}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 18, padding: '12px 14px', background: '#16161a', border: '1px solid #2a2a30', borderRadius: 12, cursor: 'pointer', fontSize: 13, color: '#ddd' }}>
            <input type="checkbox" checked={ocrOn} onChange={(e) => { setOcrOn(e.target.checked); savePref(OCR_KEY, e.target.checked); }} style={{ marginTop: 2, width: 18, height: 18 }} />
            <span>
              <strong style={{ display: 'block', color: '#fff' }}>{t('Reconnaître le texte (OCR)')}</strong>
              {t('Le texte du PDF devient sélectionnable et la recherche de la GED le retrouve.')}
            </span>
          </label>
        </div>
      )}

      {finishing && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, fontSize: 14, zIndex: 2 }}>
          <Loader size={30} className="animate-spin" />
          <div>{t('Reconnaissance du texte… {{done}}/{{total}}', finishing)}</div>
        </div>
      )}

      {/* Pied */}
      {mode !== 'camera' && (
        <div style={S.footer}>
          {mode === 'crop' && (
            <>
              <button style={S.btn} onClick={() => {
                retakeFor.current = edit?.editingId || null;
                if (live && !edit?.editingId) { setEdit(null); setMode('camera'); } else cameraInput.current?.click();
              }}><Camera size={18} />{t('Reprendre')}</button>
              <button style={{ ...S.btn, ...S.primary }} onClick={goFilter} disabled={busy}>
                {busy ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}{t('Recadrer')}
              </button>
            </>
          )}
          {mode === 'filter' && (
            <button style={{ ...S.btn, ...S.primary }} onClick={validatePage} disabled={busy}>
              {busy ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}{t('Valider la page')}
            </button>
          )}
          {mode === 'pages' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={S.btn} onClick={addPage}><Camera size={18} />{pages.length ? t('Ajouter une page') : t('Prendre une photo')}</button>
                <button style={{ ...S.btn, flex: 'none', width: 52 }} onClick={() => galleryInput.current?.click()} aria-label={t('Importer une photo')} title={t('Importer une photo')}><ImageIcon size={18} /></button>
              </div>
              <button style={{ ...S.btn, ...S.primary }} onClick={finish} disabled={busy || !pages.length}>
                {busy ? <Loader size={18} className="animate-spin" /> : <FileText size={18} />}
                {t('Créer le PDF ({{count}} page(s))', { count: pages.length })}
              </button>
            </div>
          )}
          {mode === 'loading' && (
            <button style={S.btn} onClick={onClose}>{t('Annuler')}</button>
          )}
        </div>
      )}
    </div>
  );
}
