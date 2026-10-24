// frontend/src/utils/docScanner.js
// Traitement d'image du scanner de documents (façon CamScanner) :
//   détection des bords de la feuille → redressement → filtre → PDF.
//
// OpenCV.js (≈10 Mo, copié dans public/vendor/ par scripts/copy-vendor.mjs) n'est
// chargé qu'à la première ouverture du scanner, puis gardé en cache par le
// Service Worker. S'il ne charge pas (navigateur trop ancien, réseau), tout
// fonctionne quand même en JavaScript pur, sans la détection automatique.
import jsPDF from 'jspdf';

const OPENCV_URL = '/vendor/opencv-4.10.0.js';

// Taille maximale (plus grand côté, en pixels) de la photo de travail et de la
// page finale. 1800 px sur 297 mm ≈ 150 dpi : lisible et léger (~200-400 Ko/page).
const SOURCE_MAX = 2400;
const OUTPUT_MAX = 1800;
const JPEG_QUALITY = 0.82;

export const FILTERS = [
  { id: 'original', label: 'Original' },
  { id: 'enhanced', label: 'Amélioré' },
  { id: 'gray',     label: 'Gris' },
  { id: 'bw',       label: 'Noir & blanc' },
];
export const DEFAULT_FILTER = 'enhanced';

// ── Chargement d'OpenCV ──────────────────────────────────────────────────────
let cvPromise = null;

// Attention : l'objet `cv` d'Emscripten possède une méthode `then`. Le passer
// tel quel à resolve() ou le renvoyer d'un .then() fait boucler la promesse à
// l'infini (page figée). On le transporte donc toujours dans un objet { cv } :
//   const { cv } = await loadOpenCV();   // cv === null si indisponible
export function loadOpenCV() {
  if (cvPromise) return cvPromise;
  cvPromise = new Promise((resolve) => {
    let done = false;
    const finish = (cv) => {
      if (done) return;
      done = true;
      resolve({ cv: cv && cv.Mat ? cv : null });
    };
    const whenReady = () => {
      const cv = window.cv;
      if (!cv) return finish(null);
      if (cv.Mat) return finish(cv);
      cv.onRuntimeInitialized = () => finish(window.cv);
    };
    if (window.cv) return whenReady();
    const s = document.createElement('script');
    s.src = OPENCV_URL;
    s.async = true;
    s.onload = whenReady;
    s.onerror = () => finish(null);
    document.head.appendChild(s);
    // Garde-fou : on ne bloque pas l'utilisateur indéfiniment
    setTimeout(() => finish(window.cv && window.cv.Mat ? window.cv : null), 45000);
  });
  return cvPromise;
}

// ── Utilitaires canvas ───────────────────────────────────────────────────────
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// Décode une photo (orientation EXIF appliquée par le navigateur) et la réduit.
export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, SOURCE_MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const c = makeCanvas(img.naturalWidth * s, img.naturalHeight * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}

export function defaultCorners(w, h) {
  const mx = w * 0.06, my = h * 0.06;
  return [{ x: mx, y: my }, { x: w - mx, y: my }, { x: w - mx, y: h - my }, { x: mx, y: h - my }];
}

export function fullCorners(w, h) {
  return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
}

// Remet 4 points dans l'ordre haut-gauche, haut-droit, bas-droit, bas-gauche.
export function orderCorners(pts) {
  const cx = pts.reduce((a, p) => a + p.x, 0) / 4;
  const cy = pts.reduce((a, p) => a + p.y, 0) / 4;
  const sorted = [...pts].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  let start = 0;
  sorted.forEach((p, i) => { if (p.x + p.y < sorted[start].x + sorted[start].y) start = i; });
  return [...sorted.slice(start), ...sorted.slice(0, start)];
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function polygonArea(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length;
    s += p[i].x * p[j].y - p[j].x * p[i].y;
  }
  return Math.abs(s) / 2;
}

// ── Détection des bords de la feuille ────────────────────────────────────────
// Renvoie 4 coins (coordonnées du canvas) ou null si rien de convaincant.
export function detectCorners(cv, canvas) {
  if (!cv) return null;
  const scale = Math.min(1, 640 / Math.max(canvas.width, canvas.height));
  const small = makeCanvas(canvas.width * scale, canvas.height * scale);
  small.getContext('2d').drawImage(canvas, 0, 0, small.width, small.height);
  const imgArea = small.width * small.height;

  const mats = [];
  const keep = (m) => { mats.push(m); return m; };
  let best = null;

  const consider = (contours) => {
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      const area = cv.contourArea(c);
      if (area < imgArea * 0.15) { c.delete(); continue; }
      const hull = new cv.Mat();
      cv.convexHull(c, hull);
      const peri = cv.arcLength(hull, true);
      for (const eps of [0.02, 0.03, 0.05, 0.08]) {
        const approx = new cv.Mat();
        cv.approxPolyDP(hull, approx, eps * peri, true);
        if (approx.rows === 4) {
          const pts = [];
          for (let k = 0; k < 4; k++) pts.push({ x: approx.data32S[k * 2], y: approx.data32S[k * 2 + 1] });
          const a = polygonArea(pts);
          if (!best || a > best.area) best = { area: a, pts };
          approx.delete();
          break;
        }
        approx.delete();
      }
      hull.delete();
      c.delete();
    }
  };

  try {
    const src = keep(cv.imread(small));
    const gray = keep(new cv.Mat());
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);

    // 1) Contours francs (Canny) — feuille sur fond quelconque
    const edges = keep(new cv.Mat());
    cv.Canny(gray, edges, 50, 150);
    const kernel = keep(cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3)));
    cv.dilate(edges, edges, kernel, new cv.Point(-1, -1), 2);
    let contours = keep(new cv.MatVector());
    let hierarchy = keep(new cv.Mat());
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    consider(contours);

    // 2) Feuille claire sur fond sombre (seuil d'Otsu). Toujours tentée : elle
    //    retrouve aussi une feuille qui dépasse de la photo, dont le contour
    //    Canny n'est pas fermé (sinon on ne garderait que le bloc de texte).
    {
      const bin = keep(new cv.Mat());
      cv.threshold(gray, bin, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
      cv.morphologyEx(bin, bin, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 3);
      contours = keep(new cv.MatVector());
      hierarchy = keep(new cv.Mat());
      cv.findContours(bin, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      consider(contours);
    }
  } catch (e) {
    console.warn('[scanner] détection impossible :', e);
    best = null;
  } finally {
    mats.forEach((m) => { try { m.delete(); } catch { /* déjà libéré */ } });
  }

  if (!best) return null;
  // Resserre très légèrement (1 %) vers le centre : évite de garder un liseré de table
  const cx = best.pts.reduce((a, p) => a + p.x, 0) / 4;
  const cy = best.pts.reduce((a, p) => a + p.y, 0) / 4;
  return orderCorners(best.pts.map((p) => ({
    x: (p.x + (cx - p.x) * 0.01) / scale,
    y: (p.y + (cy - p.y) * 0.01) / scale,
  })));
}

// ── Redressement (perspective) ───────────────────────────────────────────────
function outputSize(corners) {
  const [tl, tr, br, bl] = corners;
  let w = Math.max(dist(tl, tr), dist(bl, br));
  let h = Math.max(dist(tl, bl), dist(tr, br));
  const s = Math.min(1, OUTPUT_MAX / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

export function warpDocument(cv, canvas, corners) {
  const { w, h } = outputSize(corners);
  const out = makeCanvas(w, h);
  if (!cv) return warpFallback(canvas, corners, out);
  const src = cv.imread(canvas);
  const dst = new cv.Mat();
  const flat = corners.flatMap((p) => [p.x, p.y]);
  const from = cv.matFromArray(4, 1, cv.CV_32FC2, flat);
  const to = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, w, 0, w, h, 0, h]);
  const M = cv.getPerspectiveTransform(from, to);
  try {
    cv.warpPerspective(src, dst, M, new cv.Size(w, h), cv.INTER_LINEAR, cv.BORDER_REPLICATE);
    cv.imshow(out, dst);
  } finally {
    [src, dst, from, to, M].forEach((m) => m.delete());
  }
  return out;
}

// Homographie calculée à la main (sans OpenCV) : pour chaque pixel de la page
// redressée, on va chercher le pixel correspondant dans la photo.
function solveHomography(fromPts, toPts) {
  // Résout H tel que H·from = to (8 inconnues, h33 = 1)
  const A = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = fromPts[i], { x: u, y: v } = toPts[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  return [...A.map((row, i) => row[8] / row[i]), 1];
}

function warpFallback(canvas, corners, out) {
  const { width: w, height: h } = out;
  const H = solveHomography(
    [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }],
    corners,
  );
  const sw = canvas.width, sh = canvas.height;
  const sData = canvas.getContext('2d').getImageData(0, 0, sw, sh).data;
  const ctx = out.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const z = H[6] * x + H[7] * y + H[8];
      const sx = Math.min(sw - 1, Math.max(0, Math.round((H[0] * x + H[1] * y + H[2]) / z)));
      const sy = Math.min(sh - 1, Math.max(0, Math.round((H[3] * x + H[4] * y + H[5]) / z)));
      const si = (sy * sw + sx) * 4, di = (y * w + x) * 4;
      d[di] = sData[si]; d[di + 1] = sData[si + 1]; d[di + 2] = sData[si + 2]; d[di + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

// ── Filtres ──────────────────────────────────────────────────────────────────
// Estime le fond du papier (ombres, éclairage inégal) et le retire : le papier
// devient blanc, l'encre garde son contraste.
function flattenBackground(cv, plane) {
  const small = new cv.Mat();
  const bg = new cv.Mat();
  const k = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
  cv.resize(plane, small, new cv.Size(0, 0), 0.25, 0.25, cv.INTER_AREA);
  cv.dilate(small, small, k);
  cv.medianBlur(small, small, 15);
  cv.resize(small, bg, new cv.Size(plane.cols, plane.rows), 0, 0, cv.INTER_LINEAR);
  const out = new cv.Mat();
  cv.absdiff(plane, bg, out);
  cv.bitwise_not(out, out);
  cv.normalize(out, out, 0, 255, cv.NORM_MINMAX);
  [small, bg, k].forEach((m) => m.delete());
  return out;
}

export function applyFilter(cv, canvas, filter) {
  const out = makeCanvas(canvas.width, canvas.height);
  if (filter === 'original') {
    out.getContext('2d').drawImage(canvas, 0, 0);
    return out;
  }
  if (!cv) return filterFallback(canvas, filter, out);

  const src = cv.imread(canvas);
  const toFree = [src];
  try {
    if (filter === 'enhanced') {
      const rgb = new cv.Mat(); toFree.push(rgb);
      cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
      const planes = new cv.MatVector(); toFree.push(planes);
      cv.split(rgb, planes);
      const merged = new cv.MatVector(); toFree.push(merged);
      for (let i = 0; i < 3; i++) {
        const p = planes.get(i);
        const f = flattenBackground(cv, p);
        merged.push_back(f);
        p.delete(); f.delete();
      }
      const res = new cv.Mat(); toFree.push(res);
      cv.merge(merged, res);
      cv.imshow(out, res);
    } else {
      const gray = new cv.Mat(); toFree.push(gray);
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      if (filter === 'gray') {
        cv.imshow(out, gray);
      } else {
        const flat = flattenBackground(cv, gray); toFree.push(flat);
        const bw = new cv.Mat(); toFree.push(bw);
        let block = Math.round(Math.max(canvas.width, canvas.height) / 60) | 1;
        block = Math.max(15, block);
        cv.adaptiveThreshold(flat, bw, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, block, 12);
        cv.imshow(out, bw);
      }
    }
  } finally {
    toFree.forEach((m) => { try { m.delete(); } catch { /* déjà libéré */ } });
  }
  return out;
}

function filterFallback(canvas, filter, out) {
  const ctx = out.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (filter === 'enhanced') {
      // simple étirement du contraste en gardant les couleurs
      for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, Math.max(0, (d[i + k] - 30) * 1.25));
      continue;
    }
    if (filter === 'bw') g = g > 150 ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

// ── Rotation (quarts de tour, sens horaire) ──────────────────────────────────
export function rotateCanvas(canvas, quarterTurns) {
  const q = ((quarterTurns % 4) + 4) % 4;
  if (q === 0) return canvas;
  const swap = q % 2 === 1;
  const out = makeCanvas(swap ? canvas.height : canvas.width, swap ? canvas.width : canvas.height);
  const ctx = out.getContext('2d');
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((q * Math.PI) / 2);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return out;
}

export function canvasToThumb(canvas, max = 360) {
  const s = Math.min(1, max / Math.max(canvas.width, canvas.height));
  const t = makeCanvas(canvas.width * s, canvas.height * s);
  t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height);
  return t.toDataURL('image/jpeg', 0.8);
}

// ── PDF ──────────────────────────────────────────────────────────────────────
// Une page par image. Proche du format A4 → page A4 ; sinon (ticket, carte…)
// page à la taille de l'image, plus grand côté = 297 mm.
export function buildPdf(canvases) {
  let doc = null;
  canvases.forEach((c) => {
    const ratio = Math.max(c.width, c.height) / Math.min(c.width, c.height);
    const landscape = c.width > c.height;
    let pw, ph;
    if (Math.abs(ratio - Math.SQRT2) / Math.SQRT2 < 0.12) {
      [pw, ph] = landscape ? [297, 210] : [210, 297];
    } else {
      const s = 297 / Math.max(c.width, c.height);
      [pw, ph] = [c.width * s, c.height * s];
    }
    const orientation = pw > ph ? 'landscape' : 'portrait';
    if (!doc) doc = new jsPDF({ unit: 'mm', format: [pw, ph], orientation, compress: true });
    else doc.addPage([pw, ph], orientation);
    const k = Math.min(pw / c.width, ph / c.height);
    const w = c.width * k, h = c.height * k;
    doc.addImage(c.toDataURL('image/jpeg', JPEG_QUALITY), 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h, undefined, 'FAST');
  });
  return doc.output('blob');
}

export function scanFileName(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `Scan_${p(date.getDate())}-${p(date.getMonth() + 1)}-${date.getFullYear()}_${p(date.getHours())}h${p(date.getMinutes())}.pdf`;
}
