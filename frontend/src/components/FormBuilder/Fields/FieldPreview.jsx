// frontend/src/components/FormBuilder/Fields/FieldPreview.jsx
// Rendu visuel d'un champ dans le canvas du designer

import { useTranslation } from 'react-i18next';

export default function FieldPreview({ field, isSelected }) {
  const { t } = useTranslation();
  const { type, label, placeholder, options = [], required } = field;

  const ff = field.fontFamily || 'inherit';
  const inputStyle = {
    width: '100%', padding: '6px 10px',
    border: '1.5px solid #d1d5db', borderRadius: 6,
    fontSize: 13, background: '#fff', color: '#374151',
    outline: 'none', boxSizing: 'border-box',
    pointerEvents: 'none', fontFamily: ff,
  };
  const labelStyle = {
    fontSize: 12,
    fontWeight: field.bold ? 800 : 600,
    fontStyle: field.italic ? 'italic' : 'normal',
    textDecoration: field.underline ? 'underline' : 'none',
    color: field.textColor || '#374151',
    display: 'block', marginBottom: 4,
    textAlign: field.textAlign || 'left', fontFamily: ff,
  };

  const renderField = () => {
    switch (type) {
      // ── Structure ──────────────────────────────────────────────────────────
      case 'title':
        return <h2 style={{ fontSize: 20, fontWeight: 800, color: field.textColor || '#111827', margin: 0, lineHeight: 1.3, textAlign: field.textAlign || 'left', fontStyle: field.italic ? 'italic' : 'normal', textDecoration: field.underline ? 'underline' : 'none', fontFamily: ff }}>{label || t('Titre')}</h2>;

      case 'subtitle':
        return <h3 style={{ fontSize: 15, fontWeight: field.bold ? 800 : 600, color: field.textColor || '#374151', margin: 0, textAlign: field.textAlign || 'left', fontStyle: field.italic ? 'italic' : 'normal', textDecoration: field.underline ? 'underline' : 'none', fontFamily: ff }}>{label || t('Sous-titre')}</h3>;

      case 'paragraph':
        return <p style={{ fontSize: 13, color: field.textColor || '#6b7280', margin: 0, lineHeight: 1.6, textAlign: field.textAlign || 'left', fontWeight: field.bold ? 700 : 400, fontStyle: field.italic ? 'italic' : 'normal', textDecoration: field.underline ? 'underline' : 'none', fontFamily: ff }}>{label || t('Texte descriptif...')}</p>;

      case 'dynamictext': {
        const tmpl = field.template || t('Texte avec {variable} dynamique...');
        const parts = tmpl.split(/(\{[^}]+\})/);
        return (
          <p style={{ fontSize: 12, color: field.textColor || '#374151', margin: 0, lineHeight: 1.7, textAlign: field.textAlign || 'left', fontStyle: field.italic ? 'italic' : 'normal', textDecoration: field.underline ? 'underline' : 'none', fontFamily: ff }}>
            {parts.map((part, i) =>
              /^\{[^}]+\}$/.test(part)
                ? <span key={i} style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0 3px', borderRadius: 3, fontFamily: 'monospace', fontSize: 10 }}>{part}</span>
                : part
            )}
          </p>
        );
      }

      case 'separator':
        return <hr style={{ border: 'none', borderTop: '2px solid #e5e7eb', margin: '4px 0' }} />;

      // ── Saisie simple ──────────────────────────────────────────────────────
      case 'textarea':
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <textarea rows={3} placeholder={placeholder || t('Votre réponse...')} style={{ ...inputStyle, resize: 'none', height: 64 }} readOnly />
          </>
        );

      case 'checkbox':
        return (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default', userSelect: 'none' }}>
            <input type="checkbox" disabled style={{ width: 15, height: 15, accentColor: '#1B3A6B' }} />
            <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</span>
          </label>
        );

      case 'radio':
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(options.length ? options : [t('Option 1'), t('Option 2')]).slice(0, 3).map((opt, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280', cursor: 'default' }}>
                  <input type="radio" disabled style={{ accentColor: '#1B3A6B' }} />
                  {opt}
                </label>
              ))}
            </div>
          </>
        );

      case 'select':
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <select disabled style={{ ...inputStyle, appearance: 'auto' }}>
              <option>{placeholder || t('Sélectionner...')}</option>
            </select>
          </>
        );

      case 'selectcond': {
        const condOpts = field.condOptions || [];
        const hasSubOpts = condOpts.some(o => o.subOptions?.length > 0);
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <select disabled style={{ ...inputStyle, appearance: 'auto' }}>
              <option>{condOpts.length > 0 ? condOpts[0].label : t('Sélectionner...')}</option>
            </select>
            {hasSubOpts && (
              <div style={{ marginTop: 4, fontSize: 10, color: '#dc2626', padding: '3px 6px', background: '#fef2f2', borderRadius: 4, border: '1px solid #fca5a5' }}>
                → {t('Sous-sélection disponible selon le choix')}
              </div>
            )}
          </>
        );
      }

      case 'date':
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <input type="date" style={inputStyle} readOnly />
          </>
        );

      case 'time':
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <input type="time" style={inputStyle} readOnly />
          </>
        );

      case 'number': case 'currency':
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <input type="number" placeholder={type === 'currency' ? t('0.00 FCFA') : '0'} style={inputStyle} readOnly />
          </>
        );

      case 'email':
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <input type="email" placeholder={placeholder || t('exemple@email.com')} style={inputStyle} readOnly />
          </>
        );

      case 'phone':
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <input type="tel" placeholder={placeholder || t('+237 6XX XXX XXX')} style={inputStyle} readOnly />
          </>
        );

      // ── Nouveaux types : Saisie ────────────────────────────────────────────
      case 'daterange':
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2 }}>{field.labelStart || t('Date début')}</span>
                <input type="date" style={{ ...inputStyle, fontSize: 11 }} readOnly />
              </div>
              <span style={{ fontSize: 11, color: '#9ca3af', paddingTop: 16 }}>→</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2 }}>{field.labelEnd || t('Date fin')}</span>
                <input type="date" style={{ ...inputStyle, fontSize: 11 }} readOnly />
              </div>
            </div>
            {field.includeBusinessDays && (
              <div style={{ marginTop: 4, padding: '3px 8px', background: '#eff6ff', borderRadius: 5, fontSize: 10, color: '#3b82f6' }}>
                {t('Jours ouvrés : —')}
              </div>
            )}
          </>
        );

      case 'serviceselect':
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <select disabled style={{ ...inputStyle, appearance: 'auto' }}>
              <option>{t('Sélectionner un service...')}</option>
            </select>
          </>
        );

      case 'userselect':
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <input type="text" placeholder={t('Sélectionner un employé...')} style={{ ...inputStyle }} readOnly />
          </>
        );

      // ── Nouveaux types : Choix ─────────────────────────────────────────────
      case 'multicheck': {
        const cols = field.checkColumns || 1;
        const previewOpts = (options.length ? options : [t('Option 1'), t('Option 2'), t('Option 3')]).slice(0, 6);
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '3px 10px' }}>
              {previewOpts.map((opt, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151', cursor: 'default' }}>
                  <input type="checkbox" disabled style={{ accentColor: '#1B3A6B', flexShrink: 0 }} />
                  {opt}
                </label>
              ))}
            </div>
          </>
        );
      }

      // ── Nouveaux types : Avancé ────────────────────────────────────────────
      case 'table': {
        const cols = field.columns || [
          { key: 'col1', label: t('Colonne 1'), type: 'text',   width: 50 },
          { key: 'col2', label: t('Colonne 2'), type: 'number', width: 25 },
          { key: 'col3', label: t('Colonne 3'), type: 'number', width: 25 },
        ];
        return (
          <>
            <label style={{ ...labelStyle, marginBottom: 4 }}>{label}</label>
            <div style={{ width: '100%', overflowX: 'hidden', fontSize: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: '#1B3A6B' }}>
                    {field.autoNumber && <th style={{ width: 20, padding: '3px 4px', color: '#fff', fontWeight: 600, textAlign: 'center', borderRight: '1px solid #2d5498' }}>#</th>}
                    {cols.map((col, i) => (
                      <th key={i} style={{ padding: '3px 6px', color: '#fff', fontWeight: 600, textAlign: 'left', borderRight: i < cols.length - 1 ? '1px solid #2d5498' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2].map(ri => (
                    <tr key={ri} style={{ background: ri % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e5e7eb' }}>
                      {field.autoNumber && <td style={{ width: 20, padding: '3px 4px', textAlign: 'center', color: '#9ca3af', borderRight: '1px solid #e5e7eb' }}>{ri}</td>}
                      {cols.map((col, i) => (
                        <td key={i} style={{ padding: '3px 6px', color: '#d1d5db', fontStyle: 'italic', borderRight: i < cols.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                          {col.type === 'computed' ? '= auto' : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, color: '#3b82f6', fontSize: 10, cursor: 'default' }}>
                <span>+</span> <span>{t('Ajouter une ligne')}</span>
              </div>
            </div>
          </>
        );
      }

      case 'computed':
        return (
          <>
            <label style={labelStyle}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="text"
                value={field.formula ? `= ${field.formula}` : t('= formule...')}
                readOnly
                style={{ ...inputStyle, color: '#6366f1', fontStyle: 'italic', fontSize: 11, background: '#f5f3ff', borderColor: '#c4b5fd' }}
              />
              {field.suffix && <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{field.suffix}</span>}
            </div>
          </>
        );

      case 'autonum':
        return (
          <>
            <label style={labelStyle}>{label}</label>
            <input
              type="text"
              value={`${field.prefix || 'REF'}-XXXX`}
              readOnly
              style={{ ...inputStyle, color: '#f59e0b', fontWeight: 700, background: '#fefce8', borderColor: '#fcd34d', fontSize: 12 }}
            />
          </>
        );

      // ── Signature / Cachet ─────────────────────────────────────────────────
      case 'signature':
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <div style={{
              border: '2px dashed #d1d5db', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 60, fontSize: 12, color: '#9ca3af', background: '#f9fafb',
            }}>
              ✍ {t('Signer ici')}
            </div>
          </>
        );

      case 'cachet':
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <div style={{
              border: '2px dashed #6366f1', borderRadius: 8,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 60, fontSize: 12, color: '#6366f1', background: '#f5f3ff', gap: 4,
            }}>
              <span style={{ fontSize: 22 }}>🔖</span>
              <span>{t('Zone de cachet')}</span>
            </div>
          </>
        );

      case 'file':
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <div style={{
              border: '2px dashed #d1d5db', borderRadius: 8, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, color: '#9ca3af', background: '#f9fafb',
            }}>
              📎 {t('Cliquer ou glisser un fichier ici')}
            </div>
          </>
        );

      default: // text et tout le reste
        return (
          <>
            <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
            <input type="text" placeholder={placeholder || t('Votre réponse...')} style={inputStyle} readOnly />
          </>
        );
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {renderField()}
    </div>
  );
}
