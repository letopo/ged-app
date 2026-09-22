// frontend/src/components/FormBuilder/Renderer/FormResponseViewer.jsx
// Affichage read-only d'une réponse de formulaire — même positionnement que FormFill

import { useMemo, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n/config';
import { GRID_SIZE, CANVAS_WIDTH } from '../../../store/formBuilderStore';
import { getFileBaseUrl } from '../../../services/api';
import logo from '../../../assets/logo-ordre-malte.png';

// ── Jours ouvrables ───────────────────────────────────────────────────────────
function countBusinessDays(start, end) {
  let count = 0;
  const d = new Date(start);
  const e = new Date(end);
  while (d <= e) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

// ── Évaluation du template dynamictext ───────────────────────────────────────
function evalDynamicTemplate(template, fields, responseData) {
  if (!template) return '';
  const getField = (id) => fields.find(f => f.id === id.trim());
  const getVal   = (id) => responseData[id.trim()];
  return template
    .replace(/\{jours_ouvres\(([^,)]+),\s*([^)]+)\)\}/g, (_, id1, id2) => {
      const f1 = getField(id1); const f2 = getField(id2);
      const v1 = getVal(id1);   const v2 = getVal(id2);
      const start = f1?.type === 'daterange' ? (v1?.start || '') : (v1 || '');
      const end   = f2?.type === 'daterange' ? (v2?.end   || '') : (v2 || '');
      if (!start || !end) return '...';
      return String(countBusinessDays(start, end));
    })
    .replace(/\{([^}]+)\}/g, (match, id) => {
      const v = getVal(id);
      if (v === undefined || v === null || v === '') return match;
      const f = getField(id);
      if (f?.type === 'selectcond' && typeof v === 'object') return v.sub ? `${v.main} : ${v.sub}` : (v.main || match);
      if (f?.type === 'date') { try { return new Date(v).toLocaleDateString('fr-FR'); } catch { return String(v); } }
      if (f?.type === 'daterange' && typeof v === 'object') {
        const s = v.start ? new Date(v.start).toLocaleDateString('fr-FR') : '...';
        const e = v.end   ? new Date(v.end).toLocaleDateString('fr-FR')   : '...';
        return i18n.t('{{start}} au {{end}}', { start: s, end: e });
      }
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    });
}

// ── Formatage d'une valeur selon le type ─────────────────────────────────────
function formatVal(field, value) {
  if (value === null || value === undefined || value === '') return '';
  if (field.type === 'date') {
    try { return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return String(value); }
  }
  if (field.type === 'checkbox') return value ? '☒' : '☐';
  if (field.type === 'daterange') {
    const dr = typeof value === 'object' ? value : {};
    const s = dr.start ? new Date(dr.start).toLocaleDateString('fr-FR') : '—';
    const e = dr.end   ? new Date(dr.end).toLocaleDateString('fr-FR')   : '—';
    return i18n.t('Du {{start}} au {{end}}', { start: s, end: e });
  }
  if (field.type === 'selectcond' && typeof value === 'object' && value?.main) {
    return value.sub ? `${value.main} — ${value.sub}` : value.main;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// ── Rendu d'un champ avec sa valeur (read-only) — tailles identiques à FormFill
function FieldValue({ field, value, wfStep }) {
  const { t } = useTranslation();
  const ff = field.fontFamily || 'inherit';
  const baseStyle = {
    fontWeight:     field.bold      ? 700         : 'normal',
    fontStyle:      field.italic    ? 'italic'    : 'normal',
    textDecoration: field.underline ? 'underline' : 'none',
    color:          field.textColor || '#374151',
    textAlign:      field.textAlign || 'left',
    fontFamily:     ff,
  };

  switch (field.type) {

    case 'title':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
          justifyContent: field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
          <h2 style={{ ...baseStyle, fontSize: 20, fontWeight: 800, margin: 0,
            textDecoration: 'underline', textTransform: 'uppercase', color: field.textColor || '#111827', fontFamily: ff }}>
            {field.label}
          </h2>
        </div>
      );

    case 'subtitle':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
          <h3 style={{ ...baseStyle, fontSize: 15, fontWeight: field.bold ? 800 : 600, margin: 0, width: '100%',
            borderBottom: '1.5px solid #dbeafe', paddingBottom: 2, color: field.textColor || '#1B3A6B', fontFamily: ff }}>
            {field.label}
          </h3>
        </div>
      );

    case 'paragraph':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
          <p style={{ ...baseStyle, fontSize: 13, margin: 0, lineHeight: 1.7, color: field.textColor || '#6b7280', fontFamily: ff }}>
            {field.label}
          </p>
        </div>
      );

    case 'dynamictext':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
          <p style={{ ...baseStyle, fontSize: 13, margin: 0, lineHeight: 1.7, color: field.textColor || '#374151', fontFamily: ff }}>
            {value}
          </p>
        </div>
      );

    case 'separator':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
          <hr style={{ width: '100%', border: 'none', borderTop: '1.5px solid #e5e7eb', margin: 0 }} />
        </div>
      );

    case 'signature': {
      const approved = wfStep?.status === 'approved';
      const validatorName = wfStep?.validator
        ? `${wfStep.validator.firstName || ''} ${wfStep.validator.lastName || ''}`.trim()
        : '';
      const sigPath = wfStep?.validator?.signaturePath;
      const sigUrl = sigPath ? `${getFileBaseUrl()}/${sigPath}` : null;
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {field.label && (
            <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', color: '#374151', marginBottom: 3 }}>
              {field.label}
            </div>
          )}
          <div style={{
            flex: 1, borderRadius: 6,
            border: approved ? '2px solid #16a34a' : '2px dashed #d1d5db',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: approved ? '#f0fdf4' : '#f9fafb',
            color: approved ? '#15803d' : '#9ca3af',
            fontSize: 12, gap: 2, padding: '4px 6px', overflow: 'hidden',
          }}>
            {approved ? (
              <>
                {sigUrl ? (
                  <img src={sigUrl} alt="signature" style={{ maxWidth: '90%', maxHeight: 60, objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 18 }}>✅</span>
                )}
                {validatorName && (
                  <span style={{ fontWeight: 700, fontSize: 11, textAlign: 'center', color: '#15803d' }}>
                    {validatorName}
                  </span>
                )}
                {wfStep.validatedAt && (
                  <span style={{ fontSize: 10, color: '#6b7280' }}>
                    {new Date(wfStep.validatedAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </>
            ) : (
              `✍ ${t('Zone de signature')}`
            )}
          </div>
        </div>
      );
    }

    case 'cachet': {
      const approved = wfStep?.status === 'approved';
      const validatorName = wfStep?.validator
        ? `${wfStep.validator.firstName || ''} ${wfStep.validator.lastName || ''}`.trim()
        : '';
      const stampPath = wfStep?.validator?.stampPath;
      const stampUrl = stampPath ? `${getFileBaseUrl()}/${stampPath}` : null;
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {field.label && (
            <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', color: '#374151', marginBottom: 3 }}>
              {field.label}
            </div>
          )}
          <div style={{
            flex: 1, borderRadius: 6,
            border: approved ? '2px solid #1B3A6B' : '2px dashed #6366f1',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: approved ? '#eff6ff' : '#f5f3ff',
            color: approved ? '#1B3A6B' : '#6366f1',
            fontSize: 12, gap: 3, padding: '4px 6px', overflow: 'hidden',
          }}>
            {approved ? (
              <>
                {stampUrl ? (
                  <img src={stampUrl} alt="cachet" style={{ maxWidth: '90%', maxHeight: 60, objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 16 }}>🔏</span>
                )}
                {validatorName && (
                  <span style={{ fontWeight: 700, fontSize: 11, textAlign: 'center', color: '#1B3A6B' }}>
                    {validatorName}
                  </span>
                )}
                {wfStep.validatedAt && (
                  <span style={{ fontSize: 10, color: '#6b7280' }}>
                    {new Date(wfStep.validatedAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </>
            ) : (
              <>
                <span style={{ fontSize: 20 }}>🔖</span>
                <span>{t('Zone de cachet')}</span>
              </>
            )}
          </div>
        </div>
      );
    }

    case 'checkbox':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 17 }}>{value ? '☒' : '☐'}</span>
          <span style={{ ...baseStyle, fontSize: 13, fontFamily: ff }}>{field.label}</span>
        </div>
      );

    case 'multicheck': {
      const selected = Array.isArray(value) ? value : [];
      const opts = field.options || [];
      const cols = field.checkColumns || 1;
      return (
        <div style={{ width: '100%', height: '100%' }}>
          {field.label && (
            <div style={{ ...baseStyle, fontSize: 11, fontWeight: 600, marginBottom: 3, fontFamily: ff }}>{field.label}</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '2px 8px' }}>
            {opts.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <span>{selected.includes(opt) ? '☒' : '☐'}</span>
                <span style={{ color: '#374151', fontFamily: ff }}>{opt}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'radio': {
      const opts = field.options || [];
      return (
        <div style={{ width: '100%', height: '100%' }}>
          {field.label && (
            <div style={{ ...baseStyle, fontSize: 12, fontWeight: 600, marginBottom: 3, fontFamily: ff }}>{field.label}</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {opts.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                <span>{value === opt ? '●' : '○'}</span>
                <span style={{ color: '#374151', fontWeight: value === opt ? 600 : 400, fontFamily: ff }}>{opt}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'textarea':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {field.label && (
            <div style={{ ...baseStyle, fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 3, fontFamily: ff }}>
              {field.label}{field.required ? ' *' : ''}
            </div>
          )}
          <div style={{ flex: 1, border: '1.5px solid #d1d5db', borderRadius: 6, padding: '5px 8px',
            fontSize: 13, color: '#111827', background: '#f9fafb', overflowY: 'auto',
            lineHeight: 1.5, whiteSpace: 'pre-wrap', fontFamily: ff }}>
            {String(value || '')}
          </div>
        </div>
      );

    case 'table': {
      const cols = field.columns || [];
      const rows = Array.isArray(value) ? value : [];
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
          {field.label && (
            <div style={{ ...baseStyle, fontSize: 12, fontWeight: 600, marginBottom: 3, fontFamily: ff }}>{field.label}</div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#1B3A6B' }}>
                {cols.map((col, i) => (
                  <th key={i} style={{ padding: '3px 6px', color: '#fff', textAlign: 'left', fontWeight: 600 }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {cols.map((col, ci) => (
                    <td key={ci} style={{ padding: '2px 6px', color: '#111827', fontFamily: ff }}>
                      {String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={cols.length} style={{ padding: '4px 6px', color: '#9ca3af', fontStyle: 'italic' }}>
                    {t('Aucune ligne')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    // ── Champs standard : label + valeur soulignée (mêmes proportions que FormFill) ──
    default: {
      const displayVal = formatVal(field, value);
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {field.label && (
            <div style={{ ...baseStyle, fontSize: 12, fontWeight: 600, color: '#374151', lineHeight: 1.2, fontFamily: ff }}>
              {field.label}{field.required ? ' *' : ''}
            </div>
          )}
          <div style={{ borderBottom: '1.5px solid #374151', paddingBottom: 2 }}>
            <span style={{ ...baseStyle, fontSize: 13, color: displayVal ? '#111827' : '#d1d5db', fontFamily: ff }}>
              {displayVal || ''}
            </span>
          </div>
        </div>
      );
    }
  }
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function FormResponseViewer({ form, responseData = {}, submittedBy, refCode, wfSteps = [] }) {
  const { t } = useTranslation();
  const fields = form?.schema?.fields || [];

  const canvasHeight = useMemo(() => Math.max(
    400,
    ...fields.map(f => ((f.layout?.y ?? 0) + (f.layout?.h ?? 4)) * GRID_SIZE + 60)
  ), [fields]);

  // Map each signature/cachet field to its workflow step by x-position order
  const fieldStepMap = useMemo(() => {
    const sortedSteps = [...wfSteps].sort((a, b) => a.step - b.step);
    const map = {};
    const sigFields = fields.filter(f => f.type === 'signature' && f.layout)
      .sort((a, b) => a.layout.x - b.layout.x);
    const cacFields = fields.filter(f => f.type === 'cachet' && f.layout)
      .sort((a, b) => a.layout.x - b.layout.x);
    sigFields.forEach((f, i) => { if (sortedSteps[i]) map[f.id] = sortedSteps[i]; });
    cacFields.forEach((f, i) => { if (sortedSteps[i]) map[f.id] = sortedSteps[i]; });
    return map;
  }, [fields, wfSteps]);

  // Scale-to-fit : mesure la largeur du conteneur et calcule le ratio
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!wrapRef.current) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setScale(w > 0 ? Math.min(1, w / CANVAS_WIDTH) : 1);
      }
    });
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, []);

  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div id="form-response-print-area" className="form-response-viewer"
      style={{ background: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── CSS impression ── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .form-response-viewer,
          .form-response-viewer * { visibility: visible !important; }
          .form-response-viewer {
            position: absolute !important;
            top: 0; left: 0;
            width: 100%;
            background: white !important;
            z-index: 99999;
          }
          .form-response-canvas {
            transform: none !important;
            width: ${CANVAS_WIDTH}px !important;
            margin: 0 auto !important;
          }
          .form-response-canvas-wrap {
            height: auto !important;
            overflow: visible !important;
          }
          /* Masquer widgets tiers (chat, etc.) */
          body > *:not(#root) { display: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── En-tête HSJM ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: '14px 28px 12px',
        borderBottom: '1.5px solid #e5e7eb',
      }}>
        <img src={logo} alt="HSJM" style={{ height: 40, objectFit: 'contain' }} />
        <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>{t('ORDRE DE MALTE')}</div>
          <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{t('HÔPITAL SAINT JEAN DE MALTE')}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{t('Njombé — Cameroun')}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#6b7280', minWidth: 150 }}>
          <div>{t('Njombé le {{date}}', { date: now })}</div>
          {submittedBy && <div style={{ marginTop: 3 }}>{t('Soumis par')} : <strong>{submittedBy}</strong></div>}
          {refCode && <div style={{ marginTop: 2, fontSize: 11, color: '#9ca3af' }}>{t('Réf. {{ref}}', { ref: refCode })}</div>}
        </div>
      </div>

      {/* ── Canvas 800 px scale-to-fit ── */}
      {/* wrapper mesure la largeur disponible */}
      <div ref={wrapRef} style={{ width: '100%', overflow: 'hidden' }}>
        {/* zone hauteur après mise à l'échelle */}
        <div className="form-response-canvas-wrap"
          style={{ height: canvasHeight * scale, position: 'relative' }}>
          {/* canvas fixe 800 px, mis à l'échelle depuis le coin supérieur gauche */}
          <div className="form-response-canvas"
            style={{
              position:        'relative',
              width:           CANVAS_WIDTH,
              height:          canvasHeight,
              transform:       `scale(${scale})`,
              transformOrigin: 'top left',
            }}>
            {fields.map((field, i) => {
              if (!field.layout) return null;
              const l = field.layout;

              let fieldValue = responseData[field.id];
              if (field.type === 'dynamictext' && field.template) {
                fieldValue = evalDynamicTemplate(field.template, fields, responseData);
              }

              return (
                <div
                  key={field.id || i}
                  style={{
                    position:   'absolute',
                    left:       l.x * GRID_SIZE,
                    top:        l.y * GRID_SIZE,
                    width:      l.w * GRID_SIZE,
                    height:     l.h * GRID_SIZE,
                    boxSizing:  'border-box',
                    padding:    '6px 8px',
                    overflow:   'hidden',
                  }}
                >
                  <FieldValue field={field} value={fieldValue} wfStep={fieldStepMap[field.id]} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
