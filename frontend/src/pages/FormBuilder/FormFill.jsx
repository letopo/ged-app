// frontend/src/pages/FormBuilder/FormFill.jsx
// Page de remplissage d'un formulaire publié

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, Send, FileText, Plus, Trash2 } from 'lucide-react';
import { formsAPI, documentsAPI, workflowAPI, servicesAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { CANVAS_WIDTH, GRID_SIZE } from '../../store/formBuilderStore';
import useFormLogic from '../../hooks/useFormLogic';

// ─── Validation ───────────────────────────────────────────────────────────────

function validateField(field, value) {
  const v = field.validation || {};

  if (field.required && (value === null || value === undefined || value === '' || value === false)) {
    return v.requiredMsg || 'Ce champ est obligatoire';
  }
  if (!value && !field.required) return null;

  const str = String(value || '');

  if (v.minLength && str.length < v.minLength)
    return `Minimum ${v.minLength} caractères`;

  if (v.maxLength && str.length > v.maxLength)
    return `Maximum ${v.maxLength} caractères`;

  if (field.type === 'number' || field.type === 'currency') {
    const num = Number(value);
    if (isNaN(num)) return 'Valeur numérique requise';
    if (v.min !== null && v.min !== undefined && num < v.min) return `Minimum ${v.min}`;
    if (v.max !== null && v.max !== undefined && num > v.max) return `Maximum ${v.max}`;
  }

  if (field.type === 'email' && value) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Adresse email invalide';
  }

  if (v.regex && value) {
    try {
      if (!new RegExp(v.regex).test(value)) return v.regexMsg || 'Format invalide';
    } catch {}
  }

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countBusinessDays(start, end) {
  if (!start || !end) return 0;
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

function evalTemplate(template, values, allFields) {
  if (!template) return '';
  const getField = (id) => (allFields || []).find(f => f.id === id.trim());
  const getVal   = (id) => values[id.trim()];
  return template
    .replace(/\{jours_ouvres\(([^,)]+),\s*([^)]+)\)\}/g, (_, id1, id2) => {
      const f1 = getField(id1); const f2 = getField(id2);
      const v1 = getVal(id1);  const v2 = getVal(id2);
      const start = f1?.type === 'daterange' ? (v1?.start || '') : (v1 || '');
      const end   = f2?.type === 'daterange' ? (v2?.end   || '') : (v2 || '');
      if (!start || !end) return '...';
      return String(countBusinessDays(start, end));
    })
    .replace(/\{([^}]+)\}/g, (match, id) => {
      const field = getField(id);
      const val   = getVal(id);
      if (val === undefined || val === null || val === '') return match;
      // selectcond → objet { main, sub }
      if (field?.type === 'selectcond' && typeof val === 'object') {
        return val.sub ? `${val.main} : ${val.sub}` : (val.main || match);
      }
      if (field?.type === 'date') {
        try { return new Date(val).toLocaleDateString('fr-FR'); } catch { return String(val); }
      }
      if (field?.type === 'daterange') {
        const dr = typeof val === 'object' ? val : {};
        const s = dr.start ? new Date(dr.start).toLocaleDateString('fr-FR') : '...';
        const e = dr.end   ? new Date(dr.end).toLocaleDateString('fr-FR')   : '...';
        return `${s} au ${e}`;
      }
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    });
}

function evalTableFormula(formula, row) {
  if (!formula) return '';
  try {
    const expr = formula.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (_, key) => {
      const v = Number(row[key]);
      return isNaN(v) ? 0 : v;
    });
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr})`)();
    return isNaN(result) ? '' : Number(result.toFixed(2));
  } catch {
    return '';
  }
}

// ─── Rendu d'un champ interactif ─────────────────────────────────────────────

function FillField({ field, value, onChange, error, services = [], users = [], allValues = {}, allFields = [] }) {
  const ff = field.fontFamily || 'inherit';
  const iStyle = {
    width: '100%', padding: '7px 10px',
    border: `1.5px solid ${error ? '#ef4444' : '#d1d5db'}`, borderRadius: 6,
    fontSize: 13, background: '#fff', color: '#111827',
    outline: 'none', boxSizing: 'border-box', fontFamily: ff,
    transition: 'border-color .15s',
  };
  const lStyle = {
    fontSize: 12,
    fontWeight: field.bold ? 800 : 600,
    fontStyle: field.italic ? 'italic' : 'normal',
    textDecoration: field.underline ? 'underline' : 'none',
    color: field.textColor || '#374151', display: 'block', marginBottom: 4,
    textAlign: field.textAlign || 'left', fontFamily: ff,
  };
  const req = field.required && <span style={{ color: '#ef4444' }}> *</span>;

  switch (field.type) {
    case 'title':
      return <h2 style={{ fontSize: 20, fontWeight: 800, color: field.textColor || '#111827', margin: 0, textAlign: field.textAlign || 'left', fontStyle: field.italic ? 'italic' : 'normal', textDecoration: field.underline ? 'underline' : 'none', fontFamily: ff }}>{field.label}</h2>;
    case 'subtitle':
      return <h3 style={{ fontSize: 15, fontWeight: field.bold ? 800 : 600, color: field.textColor || '#374151', margin: 0, textAlign: field.textAlign || 'left', fontStyle: field.italic ? 'italic' : 'normal', textDecoration: field.underline ? 'underline' : 'none', fontFamily: ff }}>{field.label}</h3>;
    case 'paragraph':
      return <p style={{ fontSize: 13, color: field.textColor || '#6b7280', margin: 0, lineHeight: 1.7, textAlign: field.textAlign || 'left', fontWeight: field.bold ? 700 : 400, fontStyle: field.italic ? 'italic' : 'normal', textDecoration: field.underline ? 'underline' : 'none', fontFamily: ff }}>{field.label}</p>;
    case 'dynamictext': {
      const evaluated = evalTemplate(field.template || '', allValues, allFields);
      return (
        <p style={{ fontSize: 13, color: field.textColor || '#374151', margin: 0, lineHeight: 1.7, textAlign: field.textAlign || 'left', fontStyle: field.italic ? 'italic' : 'normal', textDecoration: field.underline ? 'underline' : 'none', fontFamily: ff }}>
          {evaluated || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Texte dynamique…</span>}
        </p>
      );
    }
    case 'separator':
      return <hr style={{ border: 'none', borderTop: '2px solid #e5e7eb', margin: '2px 0' }} />;

    case 'checkbox':
      return (
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: '#1B3A6B', marginTop: 2, cursor: 'pointer', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
            {field.label}{req}
          </span>
        </label>
      );

    case 'radio':
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          {field.description && <p style={{ fontSize: 11, color: '#9ca3af', margin: '-2px 0 4px' }}>{field.description}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {(field.options || []).map((opt, i) => (
              <label key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                <input type="radio" name={field.id} value={opt} checked={value === opt} onChange={() => onChange(opt)}
                  style={{ accentColor: '#1B3A6B', cursor: 'pointer' }} />
                {opt}
              </label>
            ))}
          </div>
        </>
      );

    case 'select':
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          {field.description && <p style={{ fontSize: 11, color: '#9ca3af', margin: '-2px 0 4px' }}>{field.description}</p>}
          <select value={value || ''} onChange={e => onChange(e.target.value)} style={{ ...iStyle, appearance: 'auto' }}>
            <option value="">Sélectionner...</option>
            {(field.options || []).map((o, i) => <option key={i} value={o}>{o}</option>)}
          </select>
        </>
      );

    case 'selectcond': {
      const condOpts = field.condOptions || [];
      const mainVal  = typeof value === 'object' ? (value?.main || '') : (value || '');
      const subVal   = typeof value === 'object' ? (value?.sub  || '') : '';
      const selOpt   = condOpts.find(o => o.label === mainVal);
      const hasSubs  = (selOpt?.subOptions?.length || 0) > 0;

      const setMain = (m) => onChange({ main: m, sub: '' });
      const setSub  = (s) => onChange({ main: mainVal, sub: s });

      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          {field.description && <p style={{ fontSize: 11, color: '#9ca3af', margin: '-2px 0 4px' }}>{field.description}</p>}
          <select value={mainVal} onChange={e => setMain(e.target.value)} style={{ ...iStyle, appearance: 'auto' }}>
            <option value="">Sélectionner...</option>
            {condOpts.map((o, i) => <option key={i} value={o.label}>{o.label}</option>)}
          </select>
          {hasSubs && (
            <div style={{ marginTop: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: 3 }}>
                {field.subLabel || 'Préciser :'}
              </label>
              <select value={subVal} onChange={e => setSub(e.target.value)} style={{ ...iStyle, appearance: 'auto', borderColor: '#ef4444' }}>
                <option value="">-- Choisir le motif --</option>
                {selOpt.subOptions.map((s, i) => <option key={i} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </>
      );
    }

    case 'textarea':
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          {field.description && <p style={{ fontSize: 11, color: '#9ca3af', margin: '-2px 0 4px' }}>{field.description}</p>}
          <textarea value={value || ''} onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder} rows={4}
            style={{ ...iStyle, resize: 'vertical', minHeight: 60 }} />
        </>
      );

    case 'date':
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          {field.description && <p style={{ fontSize: 11, color: '#9ca3af', margin: '-2px 0 4px' }}>{field.description}</p>}
          <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} style={iStyle} />
        </>
      );

    case 'time':
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          <input type="time" value={value || ''} onChange={e => onChange(e.target.value)} style={iStyle} />
        </>
      );

    case 'number': case 'currency':
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          {field.description && <p style={{ fontSize: 11, color: '#9ca3af', margin: '-2px 0 4px' }}>{field.description}</p>}
          <input type="number" value={value || ''} onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder || (field.type === 'currency' ? '0.00' : '0')} style={iStyle} />
        </>
      );

    case 'email':
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          <input type="email" value={value || ''} onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder || 'exemple@email.com'} style={iStyle} />
        </>
      );

    case 'phone':
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          <input type="tel" value={value || ''} onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder || '+237 6XX XXX XXX'} style={iStyle} />
        </>
      );

    case 'signature':
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          <div style={{ border: `2px dashed ${error ? '#ef4444' : '#d1d5db'}`, borderRadius: 6, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', minHeight: 60, fontSize: 12, color: '#9ca3af' }}>
            ✍ Zone de signature
          </div>
        </>
      );

    case 'cachet':
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          <div style={{ border: `2px dashed ${error ? '#ef4444' : '#6366f1'}`, borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f3ff', minHeight: 60, fontSize: 12, color: '#6366f1', gap: 4 }}>
            <span style={{ fontSize: 22 }}>🔖</span>
            <span>Zone de cachet officiel</span>
          </div>
        </>
      );

    case 'file':
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          <input type="file" style={{ fontSize: 13 }} onChange={e => onChange(e.target.files?.[0]?.name || '')} />
        </>
      );

    // ── Nouveaux types ───────────────────────────────────────────────────────

    case 'daterange': {
      const dr   = value || {};
      const bDays = field.includeBusinessDays ? countBusinessDays(dr.start, dr.end) : null;
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 3 }}>{field.labelStart || 'Date début'}</span>
              <input type="date" value={dr.start || ''} onChange={e => onChange({ ...dr, start: e.target.value })}
                style={{ ...iStyle, fontSize: 12 }} max={dr.end || undefined} />
            </div>
            <span style={{ fontSize: 14, color: '#9ca3af', paddingBottom: 8 }}>→</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 3 }}>{field.labelEnd || 'Date fin'}</span>
              <input type="date" value={dr.end || ''} onChange={e => onChange({ ...dr, end: e.target.value })}
                style={{ ...iStyle, fontSize: 12 }} min={dr.start || undefined} />
            </div>
          </div>
          {field.includeBusinessDays && dr.start && dr.end && (
            <div style={{ marginTop: 5, padding: '4px 10px', background: '#eff6ff', borderRadius: 6, fontSize: 12, color: '#1d4ed8', fontWeight: 600, display: 'inline-block' }}>
              {bDays} jour{bDays > 1 ? 's' : ''} ouvré{bDays > 1 ? 's' : ''}
            </div>
          )}
        </>
      );
    }

    case 'multicheck': {
      const selected = Array.isArray(value) ? value : [];
      const cols = field.checkColumns || 1;
      const toggle = (opt) => {
        const next = selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt];
        onChange(next);
      };
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '5px 12px' }}>
            {(field.options || []).map((opt, i) => (
              <label key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13, color: '#374151', lineHeight: 1.4 }}>
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)}
                  style={{ width: 14, height: 14, accentColor: '#1B3A6B', marginTop: 2, cursor: 'pointer', flexShrink: 0 }} />
                {opt}
              </label>
            ))}
          </div>
        </>
      );
    }

    case 'serviceselect':
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          <select value={value || ''} onChange={e => onChange(e.target.value)}
            style={{ ...iStyle, appearance: 'auto', border: `1.5px solid ${error ? '#ef4444' : '#d1d5db'}` }}>
            <option value="">Sélectionner un service...</option>
            {services.map((s, i) => (
              <option key={i} value={s.name || s}>{s.name || s}</option>
            ))}
          </select>
        </>
      );

    case 'userselect': {
      const [userSearch, setUserSearch] = useState('');
      const filtered = users.filter(u => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        return !userSearch || fullName.includes(userSearch.toLowerCase());
      });
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          {value ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ flex: 1, padding: '7px 10px', background: '#eff6ff', borderRadius: 6, fontSize: 13, color: '#1d4ed8', fontWeight: 600, border: '1.5px solid #bfdbfe' }}>{value}</span>
              <button onClick={() => onChange('')} style={{ padding: '6px 10px', background: 'none', border: '1.5px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#6b7280' }}>✕</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Rechercher un employé..."
                style={{ ...iStyle, border: `1.5px solid ${error ? '#ef4444' : '#d1d5db'}` }}
              />
              {userSearch && filtered.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #d1d5db', borderRadius: 6, zIndex: 50, maxHeight: 160, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }}>
                  {filtered.slice(0, 8).map((u, i) => (
                    <div key={i} onClick={() => { onChange(`${u.firstName} ${u.lastName}`); setUserSearch(''); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#111827', borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      {u.firstName} {u.lastName}
                      {u.service && <span style={{ marginLeft: 6, fontSize: 11, color: '#6b7280' }}>— {u.service}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      );
    }

    case 'computed': {
      // La valeur est calculée automatiquement par useFormLogic
      const displayVal = value !== undefined && value !== '' ? value : '—';
      const formatted = field.format === 'currency'
        ? `${Number(displayVal).toLocaleString('fr-FR')} ${field.suffix || 'FCFA'}`
        : field.suffix ? `${displayVal} ${field.suffix}` : String(displayVal);
      return (
        <>
          <label style={lStyle}>{field.label}</label>
          <div style={{ padding: '7px 10px', background: '#f5f3ff', border: '1.5px solid #c4b5fd', borderRadius: 6, fontSize: 13, color: '#6d28d9', fontWeight: 600, cursor: 'not-allowed' }}>
            {formatted}
          </div>
          {field.formula && (
            <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0', fontStyle: 'italic' }}>= {field.formula}</p>
          )}
        </>
      );
    }

    case 'autonum':
      return (
        <>
          <label style={lStyle}>{field.label}</label>
          <input type="text" value={value || `${field.prefix || 'REF'}-...`} readOnly
            style={{ ...iStyle, color: '#d97706', fontWeight: 700, background: '#fefce8', borderColor: '#fcd34d', cursor: 'not-allowed' }} />
        </>
      );

    case 'table': {
      const cols    = field.columns || [];
      const rows    = Array.isArray(value) ? value : Array.from({ length: field.minRows || 1 }, () => ({}));
      const thStyle = { padding: '6px 8px', background: '#1B3A6B', color: '#fff', fontSize: 11, fontWeight: 600, textAlign: 'left', borderRight: '1px solid #2d5498', whiteSpace: 'nowrap' };
      const tdStyle = { padding: '4px 6px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', fontSize: 12 };

      const addRow = () => {
        const newRow = {};
        cols.forEach(c => { newRow[c.key] = ''; });
        onChange([...rows, newRow]);
      };
      const removeRow = (ri) => onChange(rows.filter((_, i) => i !== ri));
      const updateCell = (ri, key, v) => {
        const updated = rows.map((row, i) => i === ri ? { ...row, [key]: v } : row);
        onChange(updated);
      };

      return (
        <>
          <label style={lStyle}>{field.label}</label>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto', fontSize: 12 }}>
              <thead>
                <tr>
                  {field.autoNumber !== false && <th style={{ ...thStyle, width: 32, textAlign: 'center' }}>#</th>}
                  {cols.map((col, i) => (
                    <th key={i} style={{ ...thStyle, borderRight: i < cols.length - 1 ? '1px solid #2d5498' : 'none' }}>
                      {col.label}
                    </th>
                  ))}
                  <th style={{ ...thStyle, width: 32, borderRight: 'none' }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    {field.autoNumber !== false && (
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', fontWeight: 600 }}>{ri + 1}</td>
                    )}
                    {cols.map((col, ci) => {
                      if (col.type === 'computed') {
                        const computed = evalTableFormula(col.formula || '', row);
                        return (
                          <td key={ci} style={{ ...tdStyle, background: '#f5f3ff', color: '#6d28d9', fontWeight: 600, borderRight: ci < cols.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                            {computed}
                          </td>
                        );
                      }
                      return (
                        <td key={ci} style={{ ...tdStyle, borderRight: ci < cols.length - 1 ? '1px solid #e5e7eb' : 'none', minWidth: 80 }}>
                          <input
                            type={col.type === 'number' ? 'number' : 'text'}
                            value={row[col.key] || ''}
                            onChange={e => updateCell(ri, col.key, e.target.value)}
                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: 12, background: 'transparent', padding: '2px 4px', fontFamily: 'inherit', color: '#111827' }}
                          />
                        </td>
                      );
                    })}
                    <td style={{ ...tdStyle, textAlign: 'center', borderRight: 'none' }}>
                      {rows.length > (field.minRows || 1) && (
                        <button onClick={() => removeRow(ri)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px 4px', fontSize: 14 }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addRow} style={{
              marginTop: 6, display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', background: 'none', border: '1.5px dashed #d1d5db',
              borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#6b7280',
              transition: 'all .15s',
            }}>
              <Plus size={13} /> Ajouter une ligne
            </button>
          </div>
        </>
      );
    }

    default:
      return (
        <>
          <label style={lStyle}>{field.label}{req}</label>
          {field.description && <p style={{ fontSize: 11, color: '#9ca3af', margin: '-2px 0 4px' }}>{field.description}</p>}
          <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder} style={iStyle} />
        </>
      );
  }
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function FormFill() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [form,      setForm]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [values,    setValues]    = useState({});
  const [errors,    setErrors]    = useState({});
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [submittedRes, setSubmittedRes] = useState(null);
  const [docId,        setDocId]        = useState(null);
  const [services,  setServices]  = useState([]);
  const [users,     setUsers]     = useState([]);

  useEffect(() => {
    formsAPI.getById(id)
      .then(res => {
        const f = res.data.data;
        setForm(f);
        const flds = f?.schema?.fields || [];
        if (flds.some(x => x.type === 'serviceselect')) {
          servicesAPI.getAll().then(r => setServices(r.data?.data || [])).catch(() => {});
        }
        if (flds.some(x => x.type === 'userselect')) {
          usersAPI.getAll().then(r => setUsers(r.data?.data || [])).catch(() => {});
        }
      })
      .catch(e => setError(e?.response?.data?.message || 'Formulaire introuvable'))
      .finally(() => setLoading(false));
  }, [id]);

  const { visibleFields, computedValues } = useFormLogic(form?.schema, values);
  const visibleIds = new Set((visibleFields || []).map(f => f.id));

  const handleChange = useCallback((fieldId, value) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    setErrors(prev => ({ ...prev, [fieldId]: null }));
  }, []);

  const validate = () => {
    const allFields = form?.schema?.fields || [];
    const errs = {};
    allFields.forEach(f => {
      if (!visibleIds.has(f.id)) return;
      if (['title','subtitle','paragraph','separator'].includes(f.type)) return;
      const val = computedValues[f.id] ?? values[f.id];
      const err = validateField(f, val);
      if (err) errs[f.id] = err;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      const firstErr = document.querySelector('.field-error');
      firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const data = { ...values, ...computedValues };
      const res = await formsAPI.submitResponse(id, data);
      setSubmittedRes(res.data);

      try {
        const submittedBy = user ? `${user.firstName} ${user.lastName}` : '';
        const refCode = `FORM-${Date.now()}`;
        const safeTitle = (form.title || 'formulaire').replace(/\s+/g, '_');

        // Sauvegarde comme form_response (rendu HTML dans le viewer)
        const marker = new Blob(
          [JSON.stringify({ formId: id, responseId: res.data?.data?.id })],
          { type: 'application/x-form-response' }
        );
        const fd = new FormData();
        fd.append('file', marker, `${safeTitle}.form`);
        fd.append('title', `${form.title}${submittedBy ? ' — ' + submittedBy : ''}`);
        fd.append('category', form.title);
        fd.append('metadata', JSON.stringify({
          sourceType:   'form_response',
          formId:       id,
          responseId:   res.data?.data?.id,
          refCode,
          submittedBy,
          schema:       form.schema,           // pour FormResponseViewer
          responseData: data,                  // pour FormResponseViewer
        }));

        const docRes   = await documentsAPI.upload(fd);
        const newDocId = docRes.data?.data?.id || null;
        setDocId(newDocId);

        if (newDocId && form.workflowTemplateId) {
          await workflowAPI.create({ documentId: newDocId, workflowTemplateId: form.workflowTemplateId });
        }
      } catch (docErr) {
        console.error('Erreur création document:', docErr);
      }

      setSubmitted(true);
    } catch (e) {
      setError(e?.response?.data?.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  // ── États ──
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
      <Loader2 size={24} style={{ animation: 'spin .7s linear infinite', color: '#1B3A6B' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: 12 }} />
      <p style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>{error}</p>
      <button onClick={() => navigate(-1)} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, background: '#1B3A6B', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
        Retour
      </button>
    </div>
  );

  if (form?.status !== 'published') return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <AlertCircle size={40} style={{ color: '#f59e0b', marginBottom: 12 }} />
      <p style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>Ce formulaire n'est pas disponible.</p>
    </div>
  );

  if (submitted) {
    const wfData   = submittedRes?.data?.workflowData;
    const hasWf    = submittedRes?.hasWorkflow;
    const steps    = wfData?.steps || [];
    const currentStep = submittedRes?.data?.workflowCurrentStep || 1;

    const WF_STATUS_COLOR = {
      pending:  { color: '#f59e0b', bg: '#fef9c3' },
      approved: { color: '#10b981', bg: '#d1fae5' },
      rejected: { color: '#ef4444', bg: '#fee2e2' },
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', minHeight: '60vh' }}>
        <CheckCircle size={56} style={{ color: '#10b981', marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
          {form.settings?.successMessage || 'Formulaire soumis avec succès !'}
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: hasWf ? 32 : 24 }}>Merci pour votre réponse.</p>

        {hasWf && steps.length > 0 && (
          <div style={{ width: '100%', maxWidth: 480, marginBottom: 32 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12, textAlign: 'center' }}>
              Circuit de validation — {wfData.templateName}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {steps.map((step, i) => {
                const idx = i + 1;
                const isCurrent = idx === currentStep && step.status === 'pending';
                const sc = WF_STATUS_COLOR[step.status] || WF_STATUS_COLOR.pending;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10,
                    background: isCurrent ? '#eff6ff' : '#f9fafb',
                    border: `1.5px solid ${isCurrent ? '#93c5fd' : '#e5e7eb'}`,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: sc.bg, color: sc.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800,
                    }}>
                      {step.status === 'approved' ? '✓' : step.status === 'rejected' ? '✕' : idx}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{step.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>
                        {step.userLabel || step.role}
                        {step.deadlineDays ? ` · délai ${step.deadlineDays}j` : ''}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg, padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>
                      {step.status === 'approved' ? 'Approuvé' : step.status === 'rejected' ? 'Rejeté' : isCurrent ? 'En attente' : 'À venir'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {docId ? (
            <Link to={`/documents/${docId}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 8, background: '#10b981', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              <FileText size={16} /> Voir le document dans GED
            </Link>
          ) : null}
          <button onClick={() => navigate('/documents')} style={{ padding: '10px 24px', borderRadius: 8, background: '#1B3A6B', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Aller dans Documents
          </button>
          <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 24px', borderRadius: 8, background: 'none', color: '#6b7280', border: '1.5px solid #d1d5db', cursor: 'pointer', fontSize: 14 }}>
            Tableau de bord
          </button>
        </div>
      </div>
    );
  }

  // Hauteur du canvas
  const fields = form?.schema?.fields || [];
  const canvasH = Math.max(400, ...fields.map(f => ((f.layout?.y ?? 0) + (f.layout?.h ?? 4)) * GRID_SIZE + 60));

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '24px 16px' }}>
      <div style={{ maxWidth: CANVAS_WIDTH + 80, margin: '0 auto' }}>

        {/* Entête */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', borderRadius: 8 }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>{form.title}</h1>
            {form.description && <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>{form.description}</p>}
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{
            background: '#fff',
            borderRadius: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,.08)',
            position: 'relative',
            width: CANVAS_WIDTH,
            height: canvasH,
            margin: '0 auto',
          }}>
            {/* Champs positionnés absolument */}
            {fields.map(field => {
              if (!visibleIds.has(field.id)) return null;
              const l   = field.layout || { x: 0, y: 0, w: 20, h: 4 };
              const val = computedValues[field.id] ?? values[field.id];
              const err = errors[field.id];

              return (
                <div
                  key={field.id}
                  className={err ? 'field-error' : ''}
                  style={{
                    position: 'absolute',
                    left:   l.x * GRID_SIZE,
                    top:    l.y * GRID_SIZE,
                    width:  l.w * GRID_SIZE,
                    height: l.h * GRID_SIZE,
                    boxSizing: 'border-box',
                    padding: '6px 8px',
                    overflow: 'visible',
                  }}
                >
                  <FillField
                    field={field}
                    value={val}
                    onChange={(v) => handleChange(field.id, v)}
                    error={err}
                    services={services}
                    users={users}
                    allValues={{ ...values, ...computedValues }}
                    allFields={fields}
                  />
                  {err && (
                    <p style={{ fontSize: 11, color: '#ef4444', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <AlertCircle size={10} /> {err}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bouton soumettre */}
          <div style={{ width: CANVAS_WIDTH, margin: '20px auto 0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {Object.keys(errors).length > 0 && (
              <span style={{ fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={13} />
                {Object.keys(errors).length} erreur(s) à corriger
              </span>
            )}
            <button type="submit" disabled={submitting} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 28px', borderRadius: 10,
              background: '#1B3A6B', color: '#fff', border: 'none',
              cursor: submitting ? 'default' : 'pointer',
              fontSize: 14, fontWeight: 700,
              opacity: submitting ? .7 : 1,
              boxShadow: '0 2px 8px rgba(27,58,107,.3)',
            }}>
              {submitting
                ? <><Loader2 size={16} style={{ animation: 'spin .7s linear infinite' }} /> Envoi...</>
                : <><Send size={16} /> {form.settings?.submitLabel || 'Soumettre'}</>
              }
            </button>
          </div>
        </form>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
