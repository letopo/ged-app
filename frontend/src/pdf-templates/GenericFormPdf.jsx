// frontend/src/pdf-templates/GenericFormPdf.jsx
// PDF générique HSJM — reproduit fidèlement le canvas du Form Builder (positionnement absolu)
import React from 'react';
import { Document, Page, Text, View, Image, Font } from '@react-pdf/renderer';
import logo from '../assets/logo-ordre-malte.png';

Font.register({
  family: 'CustomRoboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf',     fontWeight: 'normal' },
    { src: '/fonts/Roboto-Bold.ttf',        fontWeight: 'bold' },
    { src: '/fonts/Roboto-Italic.ttf',      fontStyle: 'italic' },
    { src: '/fonts/Roboto-BoldItalic.ttf',  fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

// ── Constantes de mise en page A4 ───────────────────────────────────────────
const PAGE_W    = 595.28;    // largeur A4 en pt
const PAGE_H    = 841.89;    // hauteur A4 en pt
const L_MARGIN  = 20;         // marge gauche en pt
const R_MARGIN  = 20;         // marge droite en pt
const AVAIL_W   = PAGE_W - L_MARGIN - R_MARGIN;
const CANVAS_W  = 40;         // largeur du canvas en unités de grille
const UNIT      = AVAIL_W / CANVAS_W;   // ≈ 13.88 pt par unité

// Hauteur réservée pour l'en-tête
const HEADER_H  = 62;
// Le canvas démarre juste après l'en-tête (+ petit espace)
const CANVAS_TOP = HEADER_H + 4;

const SIG_TYPES = ['signature', 'cachet'];

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v) => (v === null || v === undefined) ? '' : String(v);

function countBusinessDaysPdf(start, end) {
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

function evalTemplatePdf(template, responseData, allFields) {
  if (!template) return '';
  const getField = (id) => (allFields || []).find(f => f.id === id.trim());
  const getVal   = (id) => responseData[id.trim()];
  return template
    .replace(/\{jours_ouvres\(([^,)]+),\s*([^)]+)\)\}/g, (_, id1, id2) => {
      const f1 = getField(id1); const f2 = getField(id2);
      const v1 = getVal(id1);   const v2 = getVal(id2);
      const start = f1?.type === 'daterange' ? (v1?.start || '') : (v1 || '');
      const end   = f2?.type === 'daterange' ? (v2?.end   || '') : (v2 || '');
      if (!start || !end) return '...';
      return String(countBusinessDaysPdf(start, end));
    })
    .replace(/\{([^}]+)\}/g, (match, id) => {
      const field = getField(id);
      const val   = getVal(id);
      if (val === undefined || val === null || val === '') return match;
      if (field?.type === 'selectcond' && typeof val === 'object') {
        return val.sub ? `${val.main} : ${val.sub}` : (val.main || match);
      }
      if (field?.type === 'date') {
        try { return new Date(val).toLocaleDateString('fr-FR'); } catch { return fmt(val); }
      }
      if (field?.type === 'daterange') {
        const dr = typeof val === 'object' ? val : {};
        const s  = dr.start ? new Date(dr.start).toLocaleDateString('fr-FR') : '...';
        const e  = dr.end   ? new Date(dr.end).toLocaleDateString('fr-FR')   : '...';
        return `${s} au ${e}`;
      }
      if (typeof val === 'object') return JSON.stringify(val);
      return fmt(val);
    });
}

function formatValue(field, value) {
  if (value === null || value === undefined || value === '') return '';
  if (field.type === 'date') {
    try { return new Date(value).toLocaleDateString('fr-FR'); } catch { return fmt(value); }
  }
  if (field.type === 'checkbox') return value ? 'Oui' : 'Non';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (field.type === 'selectcond' && typeof value === 'object' && value?.main) {
    return value.sub ? `${value.main} : ${value.sub}` : value.main;
  }
  if (field.type === 'daterange') {
    const dr = typeof value === 'object' ? value : {};
    const s  = dr.start ? new Date(dr.start).toLocaleDateString('fr-FR') : '—';
    const e  = dr.end   ? new Date(dr.end).toLocaleDateString('fr-FR')   : '—';
    const bd = field.includeBusinessDays ? countBusinessDaysPdf(dr.start, dr.end) : null;
    return bd !== null ? `Du ${s} au ${e} (${bd}j ouvrés)` : `Du ${s} au ${e}`;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return fmt(value);
}

function evalTableFormulaPdf(formula, row) {
  if (!formula) return '';
  try {
    const expr = formula.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (_, key) => {
      const v = Number(row[key]);
      return isNaN(v) ? 0 : v;
    });
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr})`)();
    return isNaN(result) ? '' : Number(result.toFixed(2));
  } catch { return ''; }
}

// ── Rendu d'un champ dans sa boîte (positionnement absolu) ───────────────────
function renderFieldPdf(field, value, allFields, responseData) {
  const textColor  = field.textColor || '#374151';
  const textAlign  = field.textAlign || 'left';
  const baseText   = {
    fontWeight:     field.bold      ? 'bold'      : 'normal',
    fontStyle:      field.italic    ? 'italic'    : 'normal',
    textDecoration: field.underline ? 'underline' : 'none',
    color:          textColor,
    textAlign,
  };
  // Petit label au-dessus de la valeur
  const LABEL = { fontSize: 7, fontWeight: 'bold', color: '#6b7280', marginBottom: 2 };

  switch (field.type) {

    // ── Éléments de structure ─────────────────────────────────────────────
    case 'title':
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: textAlign === 'right' ? 'flex-end' : textAlign === 'center' ? 'center' : 'flex-start' }}>
          <Text style={{ ...baseText, fontSize: 13, fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase', color: field.textColor || '#111827' }}>
            {field.label || 'Titre'}
          </Text>
        </View>
      );

    case 'subtitle':
      return (
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Text style={{ ...baseText, fontSize: 9, fontWeight: 'bold', color: field.textColor || '#1B3A6B', borderBottom: '0.5pt solid #dbeafe', paddingBottom: 1 }}>
            {field.label || ''}
          </Text>
        </View>
      );

    case 'paragraph':
      return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ ...baseText, fontSize: 8.5, lineHeight: 1.5, color: field.textColor || '#374151' }}>
            {field.label || ''}
          </Text>
        </View>
      );

    case 'dynamictext': {
      const text = evalTemplatePdf(field.template || '', responseData, allFields);
      return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ ...baseText, fontSize: 8.5, lineHeight: 1.5, color: field.textColor || '#374151' }}>
            {text || ' '}
          </Text>
        </View>
      );
    }

    case 'separator':
      return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ borderBottom: '0.5pt solid #e5e7eb' }} />
        </View>
      );

    // ── Signature / Cachet ────────────────────────────────────────────────
    case 'cachet':
      return (
        <View style={{ flex: 1 }}>
          {!!field.label && (
            <Text style={{ fontSize: 8, fontWeight: 'bold', textAlign: 'center', color: '#374151', marginBottom: 2 }}>
              {field.label}
            </Text>
          )}
          <View style={{ flex: 1, border: '1pt dashed #9ca3af', borderRadius: 2, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 7, color: '#9ca3af' }}>Cachet officiel</Text>
          </View>
        </View>
      );

    case 'signature':
      return (
        <View style={{ flex: 1 }}>
          {!!field.label && (
            <Text style={{ fontSize: 8, fontWeight: 'bold', textAlign: 'center', color: '#374151', marginBottom: 2 }}>
              {field.label}
            </Text>
          )}
          <View style={{ flex: 1, border: '1pt dashed #9ca3af', borderRadius: 2, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 7, color: '#9ca3af' }}>Signature</Text>
          </View>
        </View>
      );

    // ── Case à cocher ─────────────────────────────────────────────────────
    case 'checkbox': {
      const checked = !!value;
      return (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, lineHeight: 1, marginRight: 4 }}>{checked ? '☒' : '☐'}</Text>
          <Text style={{ ...baseText, fontSize: 8.5, flex: 1 }}>{field.label || ''}</Text>
        </View>
      );
    }

    // ── Zone de texte ─────────────────────────────────────────────────────
    case 'textarea':
      return (
        <View style={{ flex: 1 }}>
          {!!field.label && (
            <Text style={{ ...LABEL, ...baseText, fontSize: 7 }}>{field.label}{field.required ? ' *' : ''}</Text>
          )}
          <View style={{ flex: 1, border: '0.5pt solid #d1d5db', borderRadius: 2, padding: '3pt 4pt' }}>
            <Text style={{ ...baseText, fontSize: 8.5, color: value ? '#111827' : '#d1d5db' }}>
              {fmt(value) || ' '}
            </Text>
          </View>
        </View>
      );

    // ── Plage de dates ────────────────────────────────────────────────────
    case 'daterange': {
      const dr = (typeof value === 'object' && value) ? value : {};
      const s  = dr.start ? new Date(dr.start).toLocaleDateString('fr-FR') : '';
      const e  = dr.end   ? new Date(dr.end).toLocaleDateString('fr-FR')   : '';
      const bd = field.includeBusinessDays && dr.start && dr.end ? countBusinessDaysPdf(dr.start, dr.end) : null;
      return (
        <View style={{ flex: 1 }}>
          {!!field.label && (
            <Text style={{ ...LABEL, ...baseText, fontSize: 7 }}>{field.label}{field.required ? ' *' : ''}</Text>
          )}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 6, color: '#9ca3af' }}>{field.labelStart || 'Début'}</Text>
              <View style={{ borderBottom: '0.5pt solid #374151' }}>
                <Text style={{ fontSize: 8.5, color: '#111827' }}>{s}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 8, color: '#9ca3af', paddingBottom: 1, marginHorizontal: 3 }}>→</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 6, color: '#9ca3af' }}>{field.labelEnd || 'Fin'}</Text>
              <View style={{ borderBottom: '0.5pt solid #374151' }}>
                <Text style={{ fontSize: 8.5, color: '#111827' }}>{e}</Text>
              </View>
            </View>
          </View>
          {bd !== null && (
            <Text style={{ fontSize: 6.5, color: '#3b82f6', marginTop: 1 }}>{bd} jour(s) ouvré(s)</Text>
          )}
        </View>
      );
    }

    // ── Boutons radio ─────────────────────────────────────────────────────
    case 'radio': {
      const opts = field.options || [];
      const cols = field.checkColumns || 1;
      return (
        <View style={{ flex: 1 }}>
          {!!field.label && (
            <Text style={{ ...LABEL, ...baseText, fontSize: 7 }}>{field.label}{field.required ? ' *' : ''}</Text>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {opts.map((opt, oi) => (
              <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8, marginBottom: 2, width: cols > 1 ? '48%' : '100%' }}>
                <Text style={{ fontSize: 9, marginRight: 3 }}>{value === opt ? '●' : '○'}</Text>
                <Text style={{ fontSize: 7, color: '#374151' }}>{opt}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    // ── Cases multiples ───────────────────────────────────────────────────
    case 'multicheck': {
      const selected = Array.isArray(value) ? value : [];
      const opts = field.options || [];
      const cols = field.checkColumns || 1;
      return (
        <View style={{ flex: 1 }}>
          {!!field.label && (
            <Text style={{ ...LABEL, ...baseText, fontSize: 7 }}>{field.label}{field.required ? ' *' : ''}</Text>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {opts.map((opt, oi) => (
              <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8, marginBottom: 2, width: cols > 1 ? '48%' : '100%' }}>
                <Text style={{ fontSize: 9, marginRight: 3 }}>{selected.includes(opt) ? '☒' : '☐'}</Text>
                <Text style={{ fontSize: 7, color: '#374151' }}>{opt}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    // ── Tableau dynamique ─────────────────────────────────────────────────
    case 'table': {
      const cols = field.columns || [];
      const rows = Array.isArray(value) ? value : [];
      const thS  = { fontSize: 6, fontWeight: 'bold', color: '#fff', padding: '2pt 3pt', flex: 1 };
      const tdS  = { fontSize: 6, color: '#111827', padding: '2pt 3pt', flex: 1 };
      return (
        <View style={{ flex: 1 }}>
          {!!field.label && (
            <Text style={{ ...LABEL, ...baseText, fontSize: 7, marginBottom: 2 }}>{field.label}</Text>
          )}
          <View style={{ flexDirection: 'row', backgroundColor: '#1B3A6B' }}>
            {field.autoNumber !== false && (
              <Text style={{ ...thS, flex: 0, width: 14, textAlign: 'center' }}>#</Text>
            )}
            {cols.map((col, ci) => <Text key={ci} style={thS}>{col.label}</Text>)}
          </View>
          {rows.length > 0
            ? rows.map((row, ri) => (
                <View key={ri} style={{ flexDirection: 'row', backgroundColor: ri % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '0.3pt solid #e5e7eb' }}>
                  {field.autoNumber !== false && (
                    <Text style={{ ...tdS, flex: 0, width: 14, textAlign: 'center', color: '#9ca3af' }}>{ri + 1}</Text>
                  )}
                  {cols.map((col, ci) => {
                    const v = col.type === 'computed' ? evalTableFormulaPdf(col.formula || '', row) : fmt(row[col.key]);
                    return (
                      <Text key={ci} style={{ ...tdS, fontWeight: col.type === 'computed' ? 'bold' : 'normal' }}>
                        {fmt(v)}
                      </Text>
                    );
                  })}
                </View>
              ))
            : (
              <View style={{ backgroundColor: '#f9fafb' }}>
                <Text style={{ fontSize: 6, color: '#9ca3af', fontStyle: 'italic', padding: '2pt 3pt' }}>Aucune ligne</Text>
              </View>
            )
          }
        </View>
      );
    }

    // ── Champs standard (texte, nombre, date, sélection…) ────────────────
    default: {
      const displayVal = formatValue(field, value);
      return (
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          {!!field.label && (
            <Text style={{ ...LABEL, ...baseText, fontSize: 7 }}>
              {field.label}{field.required ? ' *' : ''}
            </Text>
          )}
          <View style={{ borderBottom: '0.5pt solid #374151', paddingBottom: 1 }}>
            <Text style={{ ...baseText, fontSize: 8.5, color: displayVal ? '#111827' : '#d1d5db' }}>
              {displayVal || ' '}
            </Text>
          </View>
        </View>
      );
    }
  }
}

// ── Zones de signature pour le workflow (pdf-lib : y=0 en bas de page) ────────

export const computeGenericFormSignatureZones = (formSchema) => {
  const fields = (formSchema?.fields || []).filter(f => SIG_TYPES.includes(f.type));
  if (fields.length === 0) return [];

  return fields
    .sort((a, b) => {
      const ax = a.layout?.x ?? 0, bx = b.layout?.x ?? 0;
      const ay = a.layout?.y ?? 0, by = b.layout?.y ?? 0;
      return ax !== bx ? ax - bx : ay - by;
    })
    .map((field, i) => {
      const l      = field.layout || { x: 0, y: 0, w: 10, h: 5 };
      const x      = L_MARGIN + l.x * UNIT;
      const height = l.h * UNIT;
      const yTop   = CANVAS_TOP + l.y * UNIT;  // depuis le haut de la page
      const y      = PAGE_H - yTop - height;    // pdf-lib : y=0 en bas
      return { index: i + 1, x, y, width: l.w * UNIT, height };
    });
};

// ── Document PDF principal ────────────────────────────────────────────────────

export const GenericFormPdfDocument = ({ form, responseData = {}, wfSteps = [], submittedBy, refCode }) => {
  const now       = new Date().toLocaleDateString('fr-FR');
  const allFields = form?.schema?.fields || [];

  // Hauteur du canvas = bas du champ le plus bas (minimum 20 unités)
  const maxBottom = allFields.reduce((m, f) => {
    const b = (f.layout?.y ?? 0) + (f.layout?.h ?? 4);
    return b > m ? b : m;
  }, 20);
  const CANVAS_H = maxBottom * UNIT;

  return (
    <Document>
      <Page size="A4" style={{ fontFamily: 'CustomRoboto', fontSize: 9 }}>

        {/* ── En-tête HSJM ── */}
        <View style={{
          height:           HEADER_H,
          paddingHorizontal: L_MARGIN,
          paddingTop:        12,
          flexDirection:    'row',
          justifyContent:   'space-between',
          alignItems:       'flex-start',
          borderBottom:     '1pt solid #e5e7eb',
        }}>
          <Image src={logo} style={{ width: 80, height: 27 }} />

          <View style={{ textAlign: 'center', flex: 1, paddingHorizontal: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>ORDRE DE MALTE</Text>
            <Text style={{ fontSize: 9, color: '#DC2626' }}>HÔPITAL SAINT JEAN DE MALTE</Text>
            <Text style={{ fontSize: 7, color: '#6b7280', marginTop: 2 }}>Njombé — Cameroun</Text>
          </View>

          <View style={{ textAlign: 'right', minWidth: 110 }}>
            <Text style={{ fontSize: 8 }}>Njombé le {now}</Text>
            {submittedBy && (
              <Text style={{ fontSize: 7, color: '#6b7280', marginTop: 3 }}>Soumis par : {submittedBy}</Text>
            )}
            {refCode && (
              <Text style={{ fontSize: 7, color: '#9ca3af', marginTop: 2 }}>Réf. {refCode}</Text>
            )}
          </View>
        </View>

        {/* ── Canvas : chaque champ positionné absolument selon layout ── */}
        <View style={{
          position:    'relative',
          marginLeft:  L_MARGIN,
          marginRight: R_MARGIN,
          marginTop:   4,
          height:      CANVAS_H,
        }}>
          {allFields.map((field, i) => {
            if (!field.layout) return null;
            const l = field.layout;
            return (
              <View
                key={field.id || i}
                style={{
                  position: 'absolute',
                  left:     l.x * UNIT,
                  top:      l.y * UNIT,
                  width:    l.w * UNIT,
                  height:   l.h * UNIT,
                  overflow: 'hidden',
                }}
              >
                {renderFieldPdf(field, responseData[field.id], allFields, responseData)}
              </View>
            );
          })}
        </View>

      </Page>
    </Document>
  );
};
