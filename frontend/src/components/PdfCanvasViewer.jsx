// frontend/src/components/PdfCanvasViewer.jsx
// Affiche un PDF page par page avec pdf.js, pour les navigateurs qui ne savent
// pas l'afficher dans une <iframe> (Chrome Android propose seulement de le
// télécharger). pdf.js n'est chargé que lorsque ce composant est utilisé.
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, ZoomIn, ZoomOut, Download } from 'lucide-react';

// Le navigateur sait-il afficher un PDF dans la page ? (false sur Chrome Android)
export function canShowPdfInline() {
  if (typeof navigator === 'undefined') return true;
  if (navigator.pdfViewerEnabled === false) return false;
  if (navigator.pdfViewerEnabled === undefined && /Android/i.test(navigator.userAgent)) return false;
  return true;
}

let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

const ZOOMS = [1, 1.5, 2, 3];

// Une page : rendue seulement quand elle approche de l'écran.
function PdfPage({ pdf, number, width, zoom, root }) {
  const holderRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState(null); // { w, h } en px CSS
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    pdf.getPage(number).then((page) => {
      if (!alive) return;
      const vp = page.getViewport({ scale: 1 });
      const w = width * zoom;
      setSize({ w, h: (vp.height / vp.width) * w });
    });
    return () => { alive = false; };
  }, [pdf, number, width, zoom]);

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { root, rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [root, size]);

  useEffect(() => {
    if (!visible || !size) return undefined;
    let task = null;
    let alive = true;
    pdf.getPage(number).then((page) => {
      if (!alive) return;
      const vp1 = page.getViewport({ scale: 1 });
      // Netteté : densité de l'écran, plafonnée pour ne pas saturer la mémoire du téléphone
      const dpr = Math.min(window.devicePixelRatio || 1, zoom > 1 ? 2 : 2.5);
      const vp = page.getViewport({ scale: (size.w / vp1.width) * dpr });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
      task.promise.catch(() => { /* rendu annulé */ });
    });
    return () => { alive = false; task?.cancel(); };
  }, [visible, size, pdf, number, zoom]);

  return (
    <div ref={holderRef} data-page={number}
      style={{ width: size?.w || width, height: size?.h || width * 1.414, margin: '0 auto 12px', background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,.25)', flexShrink: 0 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

export default function PdfCanvasViewer({ url, onDownload }) {
  const { t } = useTranslation();
  const scrollRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState(false);
  const [width, setWidth] = useState(0);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [current, setCurrent] = useState(1);
  const zoom = ZOOMS[zoomIdx];

  useEffect(() => {
    let alive = true;
    let doc = null;
    setPdf(null);
    setError(false);
    loadPdfjs()
      .then((pdfjs) => pdfjs.getDocument({ url, isEvalSupported: false }).promise)
      .then((d) => { doc = d; if (alive) setPdf(d); else d.destroy(); })
      .catch((err) => { console.error('[pdf.js]', err); if (alive) setError(true); });
    return () => { alive = false; doc?.destroy(); };
  }, [url]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => setWidth(Math.max(200, el.clientWidth - 24));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Après un zoom, revenir sur la page qu'on lisait (les tailles changent)
  const currentRef = useRef(1);
  currentRef.current = current;
  useEffect(() => {
    if (zoomIdx === 0 && currentRef.current === 1) return undefined;
    const id = setTimeout(() => {
      scrollRef.current?.querySelector(`[data-page="${currentRef.current}"]`)?.scrollIntoView({ block: 'start' });
    }, 150);
    return () => clearTimeout(id);
  }, [zoomIdx]);

  // Numéro de la page affichée au centre de l'écran
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const mid = el.scrollTop + el.clientHeight / 2;
    let n = 1;
    el.querySelectorAll('[data-page]').forEach((p) => { if (p.offsetTop <= mid) n = Number(p.dataset.page); });
    setCurrent(n);
  };

  const btn = {
    width: 36, height: 36, borderRadius: 18, border: 'none', background: 'rgba(0,0,0,.65)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  };

  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', background: '#525659' }}>
      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflow: 'auto', padding: 12, WebkitOverflowScrolling: 'touch' }}>
        {pdf && width > 0 && Array.from({ length: pdf.numPages }, (_, i) => (
          <PdfPage key={i} pdf={pdf} number={i + 1} width={width} zoom={zoom} root={scrollRef.current} />
        ))}
        {!pdf && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#ddd', fontSize: 13, paddingTop: 80 }}>
            <Loader size={24} className="animate-spin" />{t('Chargement du document…')}
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#eee', fontSize: 13, paddingTop: 80, textAlign: 'center' }}>
            {t("Impossible d'afficher ce PDF ici.")}
            {onDownload && (
              <button onClick={onDownload} style={{ ...btn, width: 'auto', padding: '0 16px', gap: 6 }}>
                <Download size={16} />{t('Télécharger')}
              </button>
            )}
          </div>
        )}
      </div>
      {pdf && (
        <div style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ background: 'rgba(0,0,0,.65)', color: '#fff', fontSize: 12, fontWeight: 600, borderRadius: 14, padding: '6px 10px' }}>
            {current} / {pdf.numPages}
          </span>
          <button style={{ ...btn, opacity: zoomIdx === 0 ? 0.4 : 1 }} disabled={zoomIdx === 0} onClick={() => setZoomIdx((z) => z - 1)} aria-label={t('Dézoomer')}><ZoomOut size={18} /></button>
          <button style={{ ...btn, opacity: zoomIdx === ZOOMS.length - 1 ? 0.4 : 1 }} disabled={zoomIdx === ZOOMS.length - 1} onClick={() => setZoomIdx((z) => z + 1)} aria-label={t('Zoomer')}><ZoomIn size={18} /></button>
        </div>
      )}
    </div>
  );
}
