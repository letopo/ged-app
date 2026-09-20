// frontend/src/components/FormBuilder/Designer/DesignerCanvas.jsx
// Canvas millimétrique — positionnement absolu, grille papier

import { useRef, useState, useEffect, useCallback } from 'react';
import { Trash2, Copy, GripVertical, ArrowsUpFromLine } from 'lucide-react';
import {
  useFormBuilderStore, FIELD_REGISTRY,
  GRID_SIZE, CANVAS_COLS, CANVAS_WIDTH, pxToUnits, snapToGrid,
} from '../../../store/formBuilderStore';
import FieldPreview from '../Fields/FieldPreview';

// Hauteur minimale du canvas en px
const CANVAS_MIN_H = 1000;

export default function DesignerCanvas({ draggingType, onDragEnd }) {
  const {
    form, selectedFieldId, snapEnabled,
    addField, removeField, duplicateField, updateField, setFieldLayout,
    selectField, deselectField,
  } = useFormBuilderStore();

  const canvasRef   = useRef(null);
  const dragState   = useRef(null); // état du déplacement d'un champ
  const resizeState = useRef(null); // état du redimensionnement
  const [isDragOver, setIsDragOver] = useState(false);
  // Positions temporaires pendant le drag (avant snap/commit)
  const [liveLayouts, setLiveLayouts] = useState({});

  const fields = form?.schema?.fields || [];

  // ── Hauteur dynamique du canvas ───────────────────────────────────────────
  const canvasHeight = Math.max(
    CANVAS_MIN_H,
    ...fields.map(f => ((f.layout?.y ?? 0) + (f.layout?.h ?? 4)) * GRID_SIZE + 80)
  );

  // ── Déplacement d'un champ (mousedown sur le handle) ─────────────────────
  const startMove = useCallback((e, field) => {
    e.preventDefault();
    e.stopPropagation();
    selectField(field.id);
    const rect = canvasRef.current.getBoundingClientRect();
    dragState.current = {
      fieldId:   field.id,
      startMX:   e.clientX,
      startMY:   e.clientY,
      startFX:   field.layout.x * GRID_SIZE,
      startFY:   field.layout.y * GRID_SIZE,
      canvasLeft: rect.left,
      canvasTop:  rect.top,
      w: field.layout.w,
      h: field.layout.h,
    };
  }, [selectField]);

  // ── Redimensionnement (mousedown sur le coin SE) ──────────────────────────
  const startResize = useCallback((e, field) => {
    e.preventDefault();
    e.stopPropagation();
    resizeState.current = {
      fieldId:  field.id,
      startMX:  e.clientX,
      startMY:  e.clientY,
      startW:   field.layout.w * GRID_SIZE,
      startH:   field.layout.h * GRID_SIZE,
      x:        field.layout.x,
      y:        field.layout.y,
    };
  }, []);

  // ── Listeners globaux mousemove / mouseup ─────────────────────────────────
  useEffect(() => {
    // Quand snap=OFF, positions en unités flottantes (précision pixel / GRID_SIZE)
    const toUnit = snapEnabled
      ? (px) => pxToUnits(snapToGrid(px))
      : (px) => px / GRID_SIZE;

    const onMove = (e) => {
      // Déplacement
      if (dragState.current) {
        const { fieldId, startMX, startMY, startFX, startFY, w, h } = dragState.current;
        const rawX = startFX + (e.clientX - startMX);
        const rawY = startFY + (e.clientY - startMY);
        const maxX = (CANVAS_COLS - w) * GRID_SIZE;
        const clX  = Math.max(0, Math.min(rawX, maxX));
        const clY  = Math.max(0, rawY);
        setLiveLayouts(prev => ({
          ...prev,
          [fieldId]: { x: toUnit(clX), y: toUnit(clY), w, h },
        }));
      }
      // Redimensionnement
      if (resizeState.current) {
        const { fieldId, startMX, startMY, startW, startH, x, y } = resizeState.current;
        const rawW = startW + (e.clientX - startMX);
        const rawH = startH + (e.clientY - startMY);
        const minW = GRID_SIZE * 4;
        const minH = GRID_SIZE * 2;
        const maxW = (CANVAS_COLS - x) * GRID_SIZE;
        const clW  = Math.max(minW, Math.min(rawW, maxW));
        const clH  = Math.max(minH, rawH);
        setLiveLayouts(prev => ({
          ...prev,
          [fieldId]: { x, y, w: toUnit(clW), h: toUnit(clH) },
        }));
      }
    };

    const onUp = () => {
      if (dragState.current) {
        const { fieldId } = dragState.current;
        const live = liveLayouts[fieldId];
        if (live) setFieldLayout(fieldId, live);
        dragState.current = null;
      }
      if (resizeState.current) {
        const { fieldId } = resizeState.current;
        const live = liveLayouts[fieldId];
        if (live) setFieldLayout(fieldId, live);
        resizeState.current = null;
      }
      setLiveLayouts({});
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [liveLayouts, setFieldLayout, snapEnabled]);

  // ── Drop depuis le panneau composants ─────────────────────────────────────
  const handleDragOver = (e) => {
    if (!draggingType) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!canvasRef.current?.contains(e.relatedTarget)) setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const type = e.dataTransfer.getData('fieldType');
    if (!type) { onDragEnd(); return; }

    const reg  = FIELD_REGISTRY[type] || {};
    const w    = reg.defaultW ?? 20;
    const h    = reg.defaultH ?? 4;

    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const toUnit = snapEnabled
      ? (px) => pxToUnits(snapToGrid(px))
      : (px) => px / GRID_SIZE;
    const snX  = toUnit(Math.max(0, rawX));
    const snY  = toUnit(Math.max(0, rawY));
    const clX  = Math.min(snX, CANVAS_COLS - w);

    addField(type, { x: clX, y: snY, w, h });
    onDragEnd();
  };

  // Résout la position effective (live ou stockée)
  const getLayout = (field) => liveLayouts[field.id] || field.layout || { x: 0, y: 0, w: 20, h: 4 };

  const isDraggingOrResizing = (fieldId) =>
    (dragState.current?.fieldId === fieldId) ||
    (resizeState.current?.fieldId === fieldId);

  return (
    <div
      style={{
        flex: 1, overflowY: 'auto', overflowX: 'auto',
        background: '#e8edf3', padding: '24px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) deselectField(); }}
    >
      {/* Feuille de papier millimétré */}
      <div
        ref={canvasRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(e) => { if (e.target === e.currentTarget) deselectField(); }}
        style={{
          position:  'relative',
          width:     CANVAS_WIDTH,
          minHeight: canvasHeight,
          margin:    '0 auto',
          background: '#fff',
          borderRadius: 4,
          boxShadow: isDragOver
            ? '0 0 0 3px #1B3A6B, 0 4px 20px rgba(0,0,0,.15)'
            : '0 4px 20px rgba(0,0,0,.12)',
          // ── Grille millimétrique (masquée si snap désactivé) ──
          backgroundImage: snapEnabled ? `
            linear-gradient(to right, #dde3ed 1px, transparent 1px),
            linear-gradient(to bottom, #dde3ed 1px, transparent 1px),
            linear-gradient(to right, #c5cfe0 1px, transparent 1px),
            linear-gradient(to bottom, #c5cfe0 1px, transparent 1px)
          ` : 'none',
          backgroundSize: snapEnabled ? `
            ${GRID_SIZE}px ${GRID_SIZE}px,
            ${GRID_SIZE}px ${GRID_SIZE}px,
            ${GRID_SIZE * 5}px ${GRID_SIZE * 5}px,
            ${GRID_SIZE * 5}px ${GRID_SIZE * 5}px
          ` : undefined,
          transition: 'box-shadow .2s',
          userSelect: 'none',
        }}
      >
        {/* Champs positionnés absolument */}
        {fields.map(field => {
          const l      = getLayout(field);
          const isLive = isDraggingOrResizing(field.id);
          const isSel  = selectedFieldId === field.id;

          return (
            <div
              key={field.id}
              onClick={(e) => { e.stopPropagation(); selectField(field.id); }}
              style={{
                position: 'absolute',
                left:   l.x * GRID_SIZE,
                top:    l.y * GRID_SIZE,
                width:  l.w * GRID_SIZE,
                height: l.h * GRID_SIZE,
                background: '#fff',
                border: isSel
                  ? '2px solid #1B3A6B'
                  : '1.5px solid #c8d5e8',
                borderRadius: 4,
                boxSizing:   'border-box',
                overflow:    'hidden',
                cursor:      'default',
                boxShadow: isSel
                  ? '0 0 0 3px rgba(27,58,107,.15)'
                  : isLive
                    ? '0 6px 20px rgba(0,0,0,.18)'
                    : '0 1px 4px rgba(0,0,0,.06)',
                opacity:   isLive ? 0.85 : 1,
                transition: isLive ? 'none' : 'box-shadow .15s, border-color .15s',
                zIndex:    isSel || isLive ? 10 : 1,
              }}
            >
              {/* ── Barre supérieure (handle + actions) ── */}
              {isSel && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 22,
                  background: '#1B3A6B', display: 'flex', alignItems: 'center',
                  zIndex: 20, padding: '0 4px', gap: 2,
                }}>
                  {/* Handle déplacement */}
                  <div
                    onMouseDown={(e) => startMove(e, field)}
                    style={{ cursor: 'grab', color: 'rgba(255,255,255,.7)', display: 'flex', padding: '0 4px', flexShrink: 0 }}
                    title="Déplacer"
                  >
                    <GripVertical size={12} />
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {field.label || FIELD_REGISTRY[field.type]?.label}
                  </span>
                  {/* Actions */}
                  <button
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); duplicateField(field.id); }}
                    title="Dupliquer"
                    style={{ padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.7)', display: 'flex' }}
                  >
                    <Copy size={11} />
                  </button>
                  <button
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); removeField(field.id); }}
                    title="Supprimer"
                    style={{ padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', display: 'flex' }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}

              {/* ── Contenu du champ ── */}
              <div style={{
                padding: isSel ? '26px 8px 8px' : '8px',
                height: '100%', boxSizing: 'border-box', overflow: 'hidden',
              }}>
                <FieldPreview field={field} isSelected={isSel} />
              </div>

              {/* ── Poignée resize (coin bas-droit) ── */}
              {isSel && (
                <div
                  onMouseDown={(e) => startResize(e, field)}
                  title="Redimensionner"
                  style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 14, height: 14, cursor: 'se-resize',
                    background: '#1B3A6B', borderRadius: '2px 0 4px 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 21,
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8">
                    <path d="M1 7L7 1M4 7L7 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Zone de dépôt (empty state) ── */}
        {fields.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              textAlign: 'center', padding: '24px 40px',
              border: `2px dashed ${isDragOver ? '#1B3A6B' : '#b0bec5'}`,
              borderRadius: 10,
              background: isDragOver ? 'rgba(27,58,107,.05)' : 'transparent',
              transition: 'all .2s',
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: isDragOver ? '#1B3A6B' : '#90a4ae', margin: '0 0 4px' }}>
                {isDragOver ? '↓ Relâchez ici' : 'Zone de conception'}
              </p>
              <p style={{ fontSize: 11, color: '#b0bec5', margin: 0 }}>
                Glissez un composant depuis le panneau gauche
              </p>
            </div>
          </div>
        )}

        {/* Indicateur dimensions en bas du canvas */}
        <div style={{
          position: 'absolute', bottom: -20, left: 0,
          fontSize: 10, color: '#90a4ae', userSelect: 'none',
        }}>
          {CANVAS_WIDTH}px × {canvasHeight}px
        </div>
      </div>
    </div>
  );
}
