// frontend/src/components/DocumentScanner.jsx
// Scanner de documents plein écran (façon CamScanner) :
//   photo → recadrage auto (coins ajustables) → filtre → pages → PDF.
// Utilisation :
//   <DocumentScanner initialFile={photo} onClose={...} onDone={(pdfFile) => ...} />
// Le composant ne déclenche pas l'appareil photo à l'ouverture : la photo
// initiale est prise par le parent (le clic doit venir directement de l'utilisateur,
// sinon iOS refuse d'ouvrir la caméra).
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Camera, Image as ImageIcon, RotateCw, Check, ArrowLeft, Trash2,
  ChevronLeft, ChevronRight, Pencil, Loader, Maximize, Wand2, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  loadOpenCV, loadImageFile, detectCorners, defaultCorners, fullCorners,
  warpDocument, applyFilter, rotateCanvas, canvasToThumb, buildPdf, scanFileName,
  FILTERS, DEFAULT_FILTER,
} from '../utils/docScanner';

const FILTER_KEY = 'ged.scanner.filter';
const readFilter = () => {
  try { return localStorage.getItem(FILTER_KEY) || DEFAULT_FILTER; } catch { return DEFAULT_FILTER; }
};
const saveFilter = (f) => { try { localStorage.setItem(FILTER_KEY, f); } catch { /* stockage indisponible */ } };

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

// ── Composant principal ──────────────────────────────────────────────────────
export default function DocumentScanner({ initialFile, onClose, onDone, maxUploadMb }) {
  const { t } = useTranslation();
  const [cvState, setCvState] = useState('loading'); // loading | ready | failed
  const cvRef = useRef(null);

  const [pages, setPages] = useState([]);       // pages validées
  const [edit, setEdit] = useState(null);       // page en cours : { id, src, url, corners, filter, rotation, warped, editingId }
  const [mode, setMode] = useState('loading');  // loading | crop | filter | pages
  const [preview, setPreview] = useState(null); // dataURL de l'aperçu filtré
  const [busy, setBusy] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const pendingFile = useRef(initialFile || null);
  const filterCache = useRef({});
  const cameraInput = useRef(null);
  const galleryInput = useRef(null);

  // OpenCV en arrière-plan dès l'ouverture
  useEffect(() => {
    let alive = true;
    loadOpenCV().then(({ cv }) => {
      if (!alive) return;
      cvRef.current = cv;
      setCvState(cv ? 'ready' : 'failed');
    });
    return () => { alive = false; };
  }, []);

  // Empêche la page derrière de défiler
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // « Reprendre » pendant la modification d'une page existante : la nouvelle
  // photo remplace cette page au lieu d'en ajouter une.
  const retakeFor = useRef(null);

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
      if (pages.length) setMode('pages');
      else onClose();
    }
  }, [pages.length, onClose, t]);

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
    setMode('pages');
  };

  const editPage = (p) => {
    setEdit({ ...p, id: nextId++, warped: null, editingId: p.id });
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
    retakeFor.current = null;
    setEdit(null);
    setPreview(null);
    if (pages.length) setMode('pages');
    else onClose();
  };

  const finish = () => {
    if (!pages.length) return;
    setBusy(true);
    setTimeout(() => {
      try {
        const blob = buildPdf(pages.map((p) => p.out));
        if (maxUploadMb && blob.size > maxUploadMb * 1024 * 1024) {
          toast.error(t('Le PDF dépasse la taille maximale autorisée ({{max}} Mo). Retirez des pages.', { max: maxUploadMb }));
          return;
        }
        const file = new File([blob], scanFileName(), { type: 'application/pdf' });
        onDone(file, pages.length);
      } catch (err) {
        console.error('[scanner]', err);
        toast.error(t('La création du PDF a échoué.'));
      } finally {
        setBusy(false);
      }
    }, 30);
  };

  const requestClose = () => {
    if (pages.length && !confirmQuit) { setConfirmQuit(true); return; }
    onClose();
  };

  const title = {
    loading: t('Scanner un document'),
    crop: t('Ajustez les coins'),
    filter: t('Choisissez un filtre'),
    pages: t('{{count}} page(s)', { count: pages.length }),
  }[mode];

  const pageLabel = edit && !edit.editingId ? t('Page {{n}}', { n: pages.length + 1 }) : null;

  return (
    <div style={S.root} role="dialog" aria-modal="true" aria-label={t('Scanner un document')}>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onPickFile} />
      <input ref={galleryInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPickFile} />

      {/* En-tête */}
      <div style={S.header}>
        <button style={S.iconBtn} onClick={mode === 'filter' ? () => setMode('crop') : mode === 'crop' ? cancelEdit : requestClose} aria-label={t('Retour')}>
          {mode === 'filter' || mode === 'crop' ? <ArrowLeft size={22} /> : <X size={22} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          {pageLabel && <div style={{ fontSize: 11, color: '#999' }}>{pageLabel}</div>}
        </div>
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

      {cvState === 'failed' && mode === 'crop' && (
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
            {pages.map((p, i) => (
              <div key={p.id} style={{ background: '#1c1c20', borderRadius: 12, overflow: 'hidden', border: '1px solid #2a2a30' }}>
                <div onClick={() => editPage(p)} style={{ aspectRatio: '3 / 4', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', cursor: 'pointer', position: 'relative' }}>
                  <img src={p.thumb} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  <span style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,.7)', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 2 }}>
                  <button style={{ ...S.iconBtn, opacity: i === 0 ? 0.3 : 1 }} disabled={i === 0} onClick={() => movePage(i, -1)} aria-label={t('Déplacer avant')}><ChevronLeft size={18} /></button>
                  <button style={S.iconBtn} onClick={() => editPage(p)} aria-label={t('Modifier')}><Pencil size={16} /></button>
                  <button style={{ ...S.iconBtn, color: '#f87171' }} onClick={() => setPages((ps) => ps.filter((x) => x.id !== p.id))} aria-label={t('Supprimer')}><Trash2 size={16} /></button>
                  <button style={{ ...S.iconBtn, opacity: i === pages.length - 1 ? 0.3 : 1 }} disabled={i === pages.length - 1} onClick={() => movePage(i, 1)} aria-label={t('Déplacer après')}><ChevronRight size={18} /></button>
                </div>
              </div>
            ))}
          </div>
          {!pages.length && (
            <div style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 40 }}>{t('Aucune page. Prenez une photo du document.')}</div>
          )}
        </div>
      )}

      {/* Pied */}
      <div style={S.footer}>
        {mode === 'crop' && (
          <>
            <button style={S.btn} onClick={() => { retakeFor.current = edit?.editingId || null; cameraInput.current?.click(); }}><Camera size={18} />{t('Reprendre')}</button>
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
              <button style={S.btn} onClick={() => cameraInput.current?.click()}><Camera size={18} />{t('Ajouter une page')}</button>
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
    </div>
  );
}
