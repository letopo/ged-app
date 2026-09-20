// frontend/src/components/FormBuilder/Renderer/FormRenderer.jsx
// Rendu du formulaire respectant exactement les positions du designer

import { useState, useMemo } from 'react';
import { GRID_SIZE, CANVAS_WIDTH } from '../../../store/formBuilderStore';
import useFormLogic from '../../../hooks/useFormLogic';

// ─── Rendu d'un champ interactif ─────────────────────────────────────────────

function FieldInput({ field, value, onChange, error }) {
  const inputStyle = {
    width: '100%', padding: '7px 12px',
    border: `1.5px solid ${error ? '#ef4444' : '#d1d5db'}`,
    borderRadius: 6, fontSize: 13,
    background: '#fff', color: '#111827',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };
  const labelEl = field.type !== 'checkbox' && (
    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
      {field.label}
      {field.required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
  );
  const descEl = field.description && (
    <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 4px' }}>{field.description}</p>
  );

  switch (field.type) {
    case 'title':
      return <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>{field.label}</h2>;
    case 'subtitle':
      return <h3 style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: 0 }}>{field.label}</h3>;
    case 'paragraph':
      return <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.7 }}>{field.label}</p>;
    case 'separator':
      return <hr style={{ border: 'none', borderTop: '2px solid #e5e7eb', margin: '4px 0' }} />;

    case 'textarea':
      return <>{labelEl}{descEl}<textarea rows={4} style={{ ...inputStyle, resize: 'none', height: '100%', minHeight: 60 }} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} /></>;

    case 'select':
      return <>{labelEl}{descEl}
        <select style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Sélectionner...</option>
          {field.options?.map((o, i) => <option key={i} value={o}>{o}</option>)}
        </select></>;

    case 'radio':
      return <>{labelEl}{descEl}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {field.options?.map((o, i) => (
            <label key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" name={field.id} value={o} checked={value === o} onChange={() => onChange(o)} style={{ accentColor: '#1B3A6B' }} />
              {o}
            </label>
          ))}
        </div></>;

    case 'checkbox':
      return (
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#1B3A6B', marginTop: 2 }} />
          <span style={{ fontSize: 13, color: '#374151' }}>{field.label}{field.required && <span style={{ color: '#ef4444' }}> *</span>}</span>
        </label>
      );

    case 'date':
      return <>{labelEl}{descEl}<input type="date" style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)} /></>;

    case 'time':
      return <>{labelEl}{descEl}<input type="time" style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)} /></>;

    case 'number': case 'currency':
      return <>{labelEl}{descEl}<input type="number" style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || (field.type === 'currency' ? '0.00' : '0')} /></>;

    case 'email':
      return <>{labelEl}{descEl}<input type="email" style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || 'exemple@email.com'} /></>;

    case 'phone':
      return <>{labelEl}{descEl}<input type="tel" style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || '+237 6XX XXX XXX'} /></>;

    case 'signature':
      return <>{labelEl}{descEl}
        <div style={{ border: '2px dashed #d1d5db', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60, fontSize: 12, color: '#9ca3af', background: '#f9fafb' }}>
          ✍ Signer ici
        </div></>;

    case 'cachet':
      return <>{labelEl}{descEl}
        <div style={{ border: '2px dashed #6366f1', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 60, fontSize: 12, color: '#6366f1', background: '#f5f3ff', gap: 4 }}>
          <span style={{ fontSize: 20 }}>🔖</span>
          <span>Zone de cachet</span>
        </div></>;

    case 'file':
      return <>{labelEl}{descEl}
        <input type="file" style={{ fontSize: 13, color: '#374151' }} onChange={e => onChange(e.target.files?.[0])} /></>;

    default:
      return <>{labelEl}{descEl}<input type="text" style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} /></>;
  }
}

// ─── FormRenderer principal ───────────────────────────────────────────────────

export default function FormRenderer({ form, onSubmit, readOnly = true }) {
  const [values,    setValues]    = useState({});
  const [errors,    setErrors]    = useState({});
  const [submitted, setSubmitted] = useState(false);

  const fields = form?.schema?.fields || [];

  // Logique conditionnelle — filtre les champs visibles
  const { visibleFields, computedValues } = useFormLogic(form?.schema, values);
  const visibleIds = new Set(visibleFields.map(f => f.id));

  // Calcul de la hauteur totale du canvas de rendu
  const canvasHeight = useMemo(() => Math.max(
    400,
    ...fields.map(f => ((f.layout?.y ?? 0) + (f.layout?.h ?? 4)) * GRID_SIZE + 40)
  ), [fields]);

  const handleChange = (fieldId, value) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    setErrors(prev => ({ ...prev, [fieldId]: null }));
  };

  const validate = () => {
    const errs = {};
    fields.forEach(f => {
      if (f.required && !values[f.id]) errs[f.id] = 'Ce champ est obligatoire';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitted(true);
    onSubmit?.(values);
  };

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
          {form.settings?.successMessage || 'Formulaire soumis avec succès !'}
        </h2>
      </div>
    );
  }

  if (!fields.length) {
    return <p style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Aucun champ dans ce formulaire.</p>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {/* Zone de rendu — même dimensions que le designer, sans grille */}
      <div style={{
        position:  'relative',
        width:     CANVAS_WIDTH,
        minHeight: canvasHeight,
        margin:    '0 auto',
        background: '#fff',
      }}>
        {fields.map(field => {
          if (!visibleIds.has(field.id)) return null; // Condition masque ce champ
          const l = field.layout || { x: 0, y: 0, w: 20, h: 4 };
          // Valeur calculée si applicable
          const displayValue = computedValues[field.id] ?? values[field.id];
          return (
            <div
              key={field.id}
              style={{
                position: 'absolute',
                left:   l.x * GRID_SIZE,
                top:    l.y * GRID_SIZE,
                width:  l.w * GRID_SIZE,
                height: l.h * GRID_SIZE,
                boxSizing: 'border-box',
                padding: '6px 8px',
                overflow: 'hidden',
              }}
            >
              {readOnly
                ? <FieldPreviewStatic field={field} />
                : <FieldInput
                    field={field}
                    value={values[field.id]}
                    onChange={(v) => handleChange(field.id, v)}
                    error={errors[field.id]}
                  />
              }
              {errors[field.id] && (
                <p style={{ fontSize: 11, color: '#ef4444', margin: '2px 0 0', position: 'absolute' }}>
                  {errors[field.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Bouton soumettre (hors canvas) */}
      {!readOnly && (
        <div style={{ width: CANVAS_WIDTH, margin: '20px auto 0', paddingLeft: 8 }}>
          <button type="submit" style={{
            padding: '10px 28px', borderRadius: 8,
            background: '#1B3A6B', color: '#fff',
            border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 700,
          }}>
            {form.settings?.submitLabel || 'Soumettre'}
          </button>
        </div>
      )}
    </form>
  );
}

// Rendu statique (aperçu — pas interactif)
import FieldPreview from '../Fields/FieldPreview';
function FieldPreviewStatic({ field }) {
  return <FieldPreview field={field} isSelected={false} />;
}
