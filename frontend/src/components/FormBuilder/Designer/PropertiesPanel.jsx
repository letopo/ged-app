// frontend/src/components/FormBuilder/Designer/PropertiesPanel.jsx
// Panneau droit — configuration complète du champ sélectionné
// Onglets : Affichage | Validation | Conditions

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings2, MousePointerClick, Plus, Trash2, Eye, ShieldCheck,
  GitBranch, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Underline,
} from 'lucide-react';
import { useFormBuilderStore, FIELD_REGISTRY } from '../../../store/formBuilderStore';

// ─── Styles locaux ────────────────────────────────────────────────────────────

const IS = {
  width: '100%', padding: '6px 10px',
  border: '1.5px solid var(--border)', borderRadius: 7,
  fontSize: 12, background: 'var(--bg)', color: 'var(--fg)',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-sans)',
};
const LS = { fontSize: 11, fontWeight: 700, color: 'var(--fg)', display: 'block', marginBottom: 4 };

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 10 }}>
      {label && <label style={LS}>{label}</label>}
      {children}
      {hint && <p style={{ fontSize: 10, color: 'var(--fg-muted)', margin: '3px 0 0' }}>{hint}</p>}
    </div>
  );
}

// Boutons d'alignement texte
function AlignButtons({ value = 'left', onChange }) {
  const opts = [
    { v: 'left',   Icon: AlignLeft },
    { v: 'center', Icon: AlignCenter },
    { v: 'right',  Icon: AlignRight },
  ];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {opts.map(({ v, Icon }) => (
        <button key={v} onClick={() => onChange(v)} style={{
          padding: '5px 8px', borderRadius: 6, border: '1.5px solid var(--border)',
          background: value === v ? 'var(--brand)' : 'var(--bg)',
          color: value === v ? '#fff' : 'var(--fg-muted)',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
        }}>
          <Icon size={12} />
        </button>
      ))}
    </div>
  );
}

// Boutons Gras / Italique / Souligné
function FormatButtons({ field, upd }) {
  const { t } = useTranslation();
  const btn = (key, Icon, label, extraStyle = {}) => (
    <button
      title={label}
      onClick={() => upd(key, !field[key])}
      style={{
        padding: '5px 9px', borderRadius: 6,
        border: `1.5px solid ${field[key] ? 'var(--brand)' : 'var(--border)'}`,
        background: field[key] ? 'var(--brand)' : 'var(--bg)',
        color: field[key] ? '#fff' : 'var(--fg-muted)',
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        ...extraStyle,
      }}
    >
      <Icon size={12} />
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {btn('bold',      Bold,      t('Gras'))}
      {btn('italic',    Italic,    t('Italique'))}
      {btn('underline', Underline, t('Souligné'))}
    </div>
  );
}

// ─── Éditeur pour le type `selectcond` ───────────────────────────────────────

const getPermissionPreset = (t) => [
  { label: t('Personnel'),           subOptions: [] },
  { label: t('Journée Directeur'),   subOptions: [] },
  { label: t('Journée Major'),       subOptions: [] },
  { label: t("Permission d'Urgence"),subOptions: [] },
  { label: t('Exceptionnel'),        subOptions: [
    t('mariage du travailleur (5 jours)'),
    t("accouchement de l'épouse du travailleur (3 jours)"),
    t("mariage d'un enfant du travailleur (2 jours)"),
    t('décès du conjoint du travailleur (5 jours)'),
    t('décès du père ou de la mère du travailleur (5 jours)'),
    t("décès d'un frère ou d'une sœur (2 jour)"),
    t("médaille d'honneur du travail (2 jours)"),
  ]},
];

function ConditionalSelectEditor({ options = [], onChange }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(null);

  const addOpt    = () => onChange([...options, { label: t('Option {{num}}', { num: options.length + 1 }), subOptions: [] }]);
  const removeOpt = (i) => { onChange(options.filter((_, idx) => idx !== i)); if (expanded === i) setExpanded(null); };
  const updLabel  = (i, val) => onChange(options.map((o, idx) => idx === i ? { ...o, label: val } : o));
  const addSub    = (i) => onChange(options.map((o, idx) => idx === i ? { ...o, subOptions: [...(o.subOptions || []), ''] } : o));
  const removeSub = (i, j) => onChange(options.map((o, idx) => idx === i ? { ...o, subOptions: o.subOptions.filter((_, si) => si !== j) } : o));
  const updSub    = (i, j, v) => onChange(options.map((o, idx) => idx === i ? { ...o, subOptions: o.subOptions.map((s, si) => si === j ? v : s) } : o));

  return (
    <div>
      <button
        onClick={() => onChange(getPermissionPreset(t))}
        style={{ width: '100%', marginBottom: 8, padding: '5px 8px', borderRadius: 6, border: '1px solid #93c5fd', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
      >
        🏥 {t('Charger le modèle Permissions HSJM')}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {options.map((opt, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
            {/* En-tête de l'option */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', background: 'var(--surface-2)' }}>
              <input
                value={opt.label}
                onChange={e => updLabel(i, e.target.value)}
                style={{ ...IS, flex: 1, padding: '3px 6px', fontSize: 11 }}
                placeholder={t('Libellé...')}
              />
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                style={{ padding: '3px 7px', borderRadius: 5, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: 9, color: '#3b82f6', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {expanded === i ? '▲' : t('▼ {{count}} ss.', { count: opt.subOptions?.length || 0 })}
              </button>
              <button onClick={() => removeOpt(i)} style={{ padding: '3px 5px', background: 'none', border: '1px solid var(--danger)', borderRadius: 5, cursor: 'pointer', color: 'var(--danger)', flexShrink: 0 }}>
                <Trash2 size={10} />
              </button>
            </div>

            {/* Sous-options */}
            {expanded === i && (
              <div style={{ padding: '6px 8px', borderTop: '1px solid var(--border)', background: '#fef9f9' }}>
                <p style={{ fontSize: 10, color: '#dc2626', fontWeight: 700, margin: '0 0 5px' }}>
                  {t('Sous-options visibles quand « {{label}} » est choisi :', { label: opt.label })}
                </p>
                {(opt.subOptions || []).map((s, j) => (
                  <div key={j} style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                    <input
                      value={s}
                      onChange={e => updSub(i, j, e.target.value)}
                      style={{ ...IS, flex: 1, padding: '3px 6px', fontSize: 10 }}
                      placeholder={t('Sous-option...')}
                    />
                    <button onClick={() => removeSub(i, j)} style={{ padding: '2px 5px', background: 'none', border: '1px solid var(--danger)', borderRadius: 4, cursor: 'pointer', color: 'var(--danger)', flexShrink: 0 }}>
                      <Trash2 size={9} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addSub(i)} style={{ fontSize: 10, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 2 }}>
                  <Plus size={10} /> {t('Ajouter un sous-motif')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={addOpt} style={{ marginTop: 6, width: '100%', padding: '6px 0', background: 'none', border: '1.5px dashed var(--border)', borderRadius: 7, cursor: 'pointer', fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Plus size={11} /> {t('Ajouter une option principale')}
      </button>
    </div>
  );
}

// ─── Éditeur de colonnes pour le type `table` ─────────────────────────────────
function TableColumnsEditor({ columns = [], onChange }) {
  const { t } = useTranslation();
  const COL_TYPES = ['text', 'number', 'computed'];

  const addCol = () => {
    const key = `col_${Date.now()}`;
    onChange([...columns, { key, label: t('Nouvelle colonne'), type: 'text', width: 20 }]);
  };
  const removeCol = (i) => onChange(columns.filter((_, idx) => idx !== i));
  const updateCol = (i, patch) => onChange(columns.map((c, idx) => idx === i ? { ...c, ...patch } : c));

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {columns.map((col, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 7, padding: '8px', background: 'var(--surface-2)' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 5, alignItems: 'center' }}>
              <input
                value={col.label}
                onChange={e => updateCol(i, { label: e.target.value })}
                placeholder={t('En-tête')}
                style={{ ...IS, flex: 1, padding: '4px 8px', fontSize: 11 }}
              />
              <button onClick={() => removeCol(i)} style={{ padding: '4px 6px', background: 'none', border: '1px solid var(--danger)', borderRadius: 5, cursor: 'pointer', color: 'var(--danger)', flexShrink: 0 }}>
                <Trash2 size={10} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 4 }}>
              <div>
                <label style={{ fontSize: 10, color: 'var(--fg-muted)', display: 'block', marginBottom: 2 }}>{t('Type')}</label>
                <select value={col.type} onChange={e => updateCol(i, { type: e.target.value })} style={{ ...IS, padding: '3px 6px', fontSize: 11 }}>
                  {COL_TYPES.map(colType => (
                    <option key={colType} value={colType}>{colType === 'computed' ? t('Calculé') : colType === 'number' ? t('Nombre') : t('Texte')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--fg-muted)', display: 'block', marginBottom: 2 }}>{t('Largeur%')}</label>
                <input type="number" min={5} max={100} value={col.width || 20} onChange={e => updateCol(i, { width: Number(e.target.value) })} style={{ ...IS, padding: '3px 6px', fontSize: 11 }} />
              </div>
            </div>
            {col.type === 'computed' && (
              <div style={{ marginTop: 5 }}>
                <label style={{ fontSize: 10, color: 'var(--fg-muted)', display: 'block', marginBottom: 2 }}>{t('Formule (ex: quantite * prix_unitaire)')}</label>
                <input
                  value={col.formula || ''}
                  onChange={e => updateCol(i, { formula: e.target.value })}
                  placeholder="col_a * col_b"
                  style={{ ...IS, padding: '4px 8px', fontSize: 11, fontFamily: 'monospace' }}
                />
              </div>
            )}
            <div style={{ marginTop: 5 }}>
              <label style={{ fontSize: 10, color: 'var(--fg-muted)', display: 'block', marginBottom: 2 }}>{t('Clé interne')}</label>
              <input
                value={col.key}
                onChange={e => updateCol(i, { key: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
                style={{ ...IS, padding: '3px 6px', fontSize: 10, fontFamily: 'monospace', color: 'var(--fg-muted)' }}
              />
            </div>
          </div>
        ))}
      </div>
      <button onClick={addCol} style={{
        marginTop: 6, width: '100%', padding: '6px 0',
        background: 'none', border: '1.5px dashed var(--border)',
        borderRadius: 7, cursor: 'pointer', fontSize: 11, color: 'var(--fg-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      }}>
        <Plus size={11} /> {t('Ajouter une colonne')}
      </button>
    </div>
  );
}

// ─── Éditeur de texte dynamique ───────────────────────────────────────────────

function DynamicTextSection({ field, upd, allFields }) {
  const { t } = useTranslation();
  const taRef = useRef(null);
  const [jFrom, setJFrom] = useState('');
  const [jTo,   setJTo]   = useState('');

  const insertAtCursor = (text) => {
    const ta = taRef.current;
    const tmpl = field.template || '';
    if (!ta) { upd('template', tmpl + text); return; }
    const s = ta.selectionStart ?? tmpl.length;
    const e = ta.selectionEnd ?? s;
    const next = tmpl.slice(0, s) + text + tmpl.slice(e);
    upd('template', next);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + text.length; ta.focus(); }, 0);
  };

  const inputFields = allFields.filter(f =>
    f.id !== field.id &&
    !['title', 'subtitle', 'paragraph', 'separator', 'dynamictext', 'signature', 'cachet', 'file'].includes(f.type)
  );
  const dateFields = inputFields.filter(f => ['date', 'daterange'].includes(f.type));

  return (
    <>
      <Field label={t('Modèle de texte')} hint={t('Utilisez {id} pour insérer un champ, ou cliquez ci-dessous')}>
        <textarea
          ref={taRef}
          value={field.template || ''}
          onChange={e => upd('template', e.target.value)}
          rows={5}
          style={{ ...IS, resize: 'vertical', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 }}
          placeholder={t('Ex : Je soussigné(e) {nom}, demande {jours_ouvres(debut, fin)} jours de permission...')}
        />
      </Field>

      {/* ── Calculateur jours ouvrés ─────────────────────────────────── */}
      {dateFields.length > 0 && (
        <div style={{ marginBottom: 10, background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, padding: '8px 10px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
            📅 {t('Calculateur jours ouvrés (hors week-ends)')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div>
              <label style={{ fontSize: 10, color: '#374151', display: 'block', marginBottom: 2, fontWeight: 600 }}>{t('Champ date début')}</label>
              <select value={jFrom} onChange={e => setJFrom(e.target.value)} style={{ ...IS, fontSize: 11, padding: '4px 6px' }}>
                <option value="">{t('Choisir...')}</option>
                {dateFields.map(f => (
                  <option key={f.id} value={f.id}>{f.label || FIELD_REGISTRY[f.type]?.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#374151', display: 'block', marginBottom: 2, fontWeight: 600 }}>{t('Champ date fin')}</label>
              <select value={jTo} onChange={e => setJTo(e.target.value)} style={{ ...IS, fontSize: 11, padding: '4px 6px' }}>
                <option value="">{t('Choisir...')}</option>
                {dateFields.map(f => (
                  <option key={f.id} value={f.id}>{f.label || FIELD_REGISTRY[f.type]?.label}</option>
                ))}
              </select>
            </div>
            <button
              disabled={!jFrom || !jTo}
              onClick={() => { if (jFrom && jTo) insertAtCursor(`{jours_ouvres(${jFrom}, ${jTo})}`); }}
              style={{
                padding: '5px 10px', borderRadius: 6,
                background: jFrom && jTo ? '#1d4ed8' : 'var(--border)',
                color: jFrom && jTo ? '#fff' : 'var(--fg-muted)',
                border: 'none', cursor: jFrom && jTo ? 'pointer' : 'default',
                fontSize: 11, fontWeight: 600, transition: 'all .15s',
              }}
            >
              ↖ {t('Insérer le calcul dans le texte')}
            </button>
          </div>
        </div>
      )}

      {/* ── Insertion de champs ─────────────────────────────────────── */}
      {inputFields.length > 0 && (
        <Field label={t('↖ Cliquer pour insérer un champ')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 150, overflowY: 'auto' }}>
            {inputFields.map(f => (
              <button key={f.id} onClick={() => insertAtCursor(`{${f.id}}`)} style={{
                padding: '4px 8px', borderRadius: 5,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                cursor: 'pointer', fontSize: 10, textAlign: 'left', color: 'var(--fg)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.label || FIELD_REGISTRY[f.type]?.label}
                </span>
                <code style={{ color: '#3b82f6', fontSize: 9, flexShrink: 0, background: '#eff6ff', padding: '1px 4px', borderRadius: 3 }}>
                  {`{…${f.id.slice(-6)}}`}
                </code>
              </button>
            ))}
          </div>
        </Field>
      )}
    </>
  );
}

// ─── Onglet Affichage ─────────────────────────────────────────────────────────

function TabDisplay({ field, upd, allFields = [] }) {
  const { t } = useTranslation();
  const isSep       = field.type === 'separator';
  const isText      = ['title', 'subtitle', 'paragraph', 'dynamictext'].includes(field.type);
  const hasPlaceholder = !['title','subtitle','paragraph','separator','dynamictext','checkbox','radio','multicheck','selectcond','signature','cachet','table','daterange','computed','autonum','serviceselect'].includes(field.type);
  const hasOptions  = ['radio', 'select', 'multicheck'].includes(field.type);
  const hasDefault  = !['title','subtitle','paragraph','separator','dynamictext','selectcond','signature','cachet','file','radio','checkbox','multicheck','table','daterange','computed','autonum','serviceselect','userselect'].includes(field.type);

  return (
    <div>
      {/* Libellé */}
      {!isSep && field.type !== 'dynamictext' && (
        <Field label={isText ? t('Contenu') : t('Libellé')}>
          {field.type === 'paragraph'
            ? <textarea value={field.label || ''} onChange={e => upd('label', e.target.value)} rows={3} style={{ ...IS, resize: 'vertical' }} placeholder={t('Texte à afficher...')} />
            : <input value={field.label || ''} onChange={e => upd('label', e.target.value)} style={IS} placeholder={t('Libellé du champ')} />
          }
        </Field>
      )}

      {/* Texte dynamique avec variables */}
      {field.type === 'dynamictext' && (
        <DynamicTextSection field={field} upd={upd} allFields={allFields} />
      )}

      {/* Alignement texte + Formatage + Couleur */}
      {!isSep && (
        <Field label={t('Mise en forme')}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <AlignButtons value={field.textAlign || 'left'} onChange={v => upd('textAlign', v)} />
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <FormatButtons field={field} upd={upd} />
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            {/* Color picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{t('Couleur')}</span>
              <input
                type="color"
                value={field.textColor || '#374151'}
                onChange={e => upd('textColor', e.target.value)}
                title={t('Couleur du texte')}
                style={{ width: 28, height: 28, border: '1.5px solid var(--border)', cursor: 'pointer', borderRadius: 5, padding: 2, background: 'none' }}
              />
              {field.textColor && (
                <button
                  onClick={() => upd('textColor', null)}
                  title={t('Réinitialiser la couleur')}
                  style={{ fontSize: 10, padding: '3px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}
                >↺</button>
              )}
            </div>
          </div>
          {/* Sélecteur de police */}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{t('Police')}</span>
            <select
              value={field.fontFamily || ''}
              onChange={e => upd('fontFamily', e.target.value || null)}
              style={{ ...IS, padding: '4px 8px', fontSize: 11, flex: 1, fontFamily: field.fontFamily || 'inherit' }}
            >
              <option value="">{t('Par défaut (Inter)')}</option>
              <option value="Arial, sans-serif" style={{ fontFamily: 'Arial' }}>Arial</option>
              <option value="'Times New Roman', serif" style={{ fontFamily: 'Times New Roman' }}>Times New Roman</option>
              <option value="Georgia, serif" style={{ fontFamily: 'Georgia' }}>Georgia</option>
              <option value="'Courier New', monospace" style={{ fontFamily: 'Courier New' }}>Courier New</option>
              <option value="Calibri, sans-serif" style={{ fontFamily: 'Calibri' }}>Calibri</option>
            </select>
          </div>
        </Field>
      )}

      {/* Placeholder */}
      {hasPlaceholder && (
        <Field label={t('Placeholder')}>
          <input value={field.placeholder || ''} onChange={e => upd('placeholder', e.target.value)} style={IS} placeholder={t('Texte indicatif...')} />
        </Field>
      )}

      {/* Description */}
      {!isSep && !['table'].includes(field.type) && (
        <Field label={t('Description')}>
          <textarea value={field.description || ''} onChange={e => upd('description', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} placeholder={t("Aide pour l'utilisateur...")} />
        </Field>
      )}

      {/* ── Options (radio / select / multicheck) ─────────────────────── */}
      {hasOptions && (
        <Field label={t('Options')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(field.options || []).map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 4 }}>
                <input
                  value={opt}
                  onChange={e => {
                    const opts = [...(field.options || [])];
                    opts[idx] = e.target.value;
                    upd('options', opts);
                  }}
                  style={{ ...IS, flex: 1 }}
                  placeholder={t('Option {{num}}', { num: idx + 1 })}
                />
                <button onClick={() => upd('options', field.options.filter((_, i) => i !== idx))}
                  style={{ padding: '0 7px', background: 'none', border: '1.5px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--danger)' }}>
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <button onClick={() => upd('options', [...(field.options || []), t('Option {{num}}', { num: (field.options?.length || 0) + 1 })])}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px', background: 'none', border: '1.5px dashed var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: 'var(--fg-muted)' }}>
              <Plus size={11} /> {t('Ajouter une option')}
            </button>
          </div>
        </Field>
      )}

      {/* Colonnes de cases (multicheck) */}
      {field.type === 'multicheck' && (
        <Field label={t("Colonnes d'affichage")}>
          <select value={field.checkColumns || 1} onChange={e => upd('checkColumns', Number(e.target.value))} style={IS}>
            <option value={1}>{t('1 colonne')}</option>
            <option value={2}>{t('2 colonnes')}</option>
            <option value={3}>{t('3 colonnes')}</option>
          </select>
        </Field>
      )}

      {/* ── Tableau (table) ─────────────────────────────────────────────── */}
      {field.type === 'table' && (
        <>
          <Field label={t('Colonnes du tableau')}>
            <TableColumnsEditor
              columns={field.columns || []}
              onChange={cols => upd('columns', cols)}
            />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
              <input type="checkbox" checked={field.autoNumber !== false} onChange={e => upd('autoNumber', e.target.checked)}
                style={{ accentColor: 'var(--brand)', width: 13, height: 13 }} />
              {t('Numéroter les lignes')}
            </label>
          </div>
          <Field label={t('Lignes minimum')}>
            <input type="number" min={0} max={20} value={field.minRows ?? 1} onChange={e => upd('minRows', Number(e.target.value))} style={IS} />
          </Field>
        </>
      )}

      {/* ── Période de dates (daterange) ─────────────────────────────────── */}
      {field.type === 'daterange' && (
        <>
          <Field label={t('Libellé date début')}>
            <input value={field.labelStart || t('Date début')} onChange={e => upd('labelStart', e.target.value)} style={IS} />
          </Field>
          <Field label={t('Libellé date fin')}>
            <input value={field.labelEnd || t('Date fin')} onChange={e => upd('labelEnd', e.target.value)} style={IS} />
          </Field>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
              <input type="checkbox" checked={!!field.includeBusinessDays} onChange={e => upd('includeBusinessDays', e.target.checked)}
                style={{ accentColor: 'var(--brand)', width: 13, height: 13 }} />
              {t('Afficher le nombre de jours ouvrés')}
            </label>
          </div>
        </>
      )}

      {/* ── Champ calculé (computed) ─────────────────────────────────────── */}
      {field.type === 'computed' && (
        <>
          <Field label={t('Formule')} hint={t('Ex: {total} * 1.1925 ou {qte} * {prix}')}>
            <input value={field.formula || ''} onChange={e => upd('formula', e.target.value)}
              style={{ ...IS, fontFamily: 'monospace' }} placeholder="{champ1} * {champ2}" />
          </Field>
          <Field label={t('Format du résultat')}>
            <select value={field.format || 'number'} onChange={e => upd('format', e.target.value)} style={IS}>
              <option value="number">{t('Nombre')}</option>
              <option value="currency">{t('Montant (FCFA)')}</option>
              <option value="text">{t('Texte')}</option>
            </select>
          </Field>
          <Field label={t('Suffixe (optionnel)')}>
            <input value={field.suffix || ''} onChange={e => upd('suffix', e.target.value)} style={IS} placeholder={t('FCFA, kg, %, ...')} />
          </Field>
        </>
      )}

      {/* ── Sélection conditionnelle (selectcond) ──────────────────────── */}
      {field.type === 'selectcond' && (
        <>
          <Field label={t('Libellé de la sous-sélection')} hint={t("Visible quand l'option choisie a des sous-options")}>
            <input value={field.subLabel || t('Préciser :')} onChange={e => upd('subLabel', e.target.value)} style={IS} />
          </Field>
          <Field label={t('Options & sous-options')}>
            <ConditionalSelectEditor
              options={field.condOptions || []}
              onChange={opts => upd('condOptions', opts)}
            />
          </Field>
        </>
      )}

      {/* ── N° automatique (autonum) ─────────────────────────────────────── */}
      {field.type === 'autonum' && (
        <>
          <Field label={t('Préfixe')} hint={t("Sera suivi d'un tiret et du numéro")}>
            <input value={field.prefix || 'REF'} onChange={e => upd('prefix', e.target.value)} style={IS} placeholder={t('Ex: BC, PC, OM...')} />
          </Field>
          <Field label={t('Catégorie de document')} hint={t('Pour la numérotation séquentielle')}>
            <input value={field.category || ''} onChange={e => upd('category', e.target.value)} style={IS} placeholder={t('Ex: Bon de commande')} />
          </Field>
        </>
      )}

      {/* ── Valeur par défaut ────────────────────────────────────────────── */}
      {hasDefault && (
        <Field label={t('Valeur par défaut')}>
          <input value={field.defaultValue || ''} onChange={e => upd('defaultValue', e.target.value)} style={IS} placeholder={t('Valeur pré-remplie...')} />
        </Field>
      )}

      {/* ── Dimensions ───────────────────────────────────────────────────── */}
      <div style={{ paddingTop: 6, borderTop: '1px solid var(--border)' }}>
        <p style={{ ...LS, marginBottom: 6, color: 'var(--fg-muted)' }}>{t('Position & taille (unités grille)')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
          {['x','y','w','h'].map(k => {
            const raw = field.layout?.[k] ?? 0;
            const disp = typeof raw === 'number' && !Number.isInteger(raw) ? raw.toFixed(2) : raw;
            return (
              <div key={k}>
                <label style={{ fontSize: 10, color: 'var(--fg-muted)', display: 'block', marginBottom: 2 }}>{k.toUpperCase()}</label>
                <input
                  type="number"
                  value={disp}
                  min={k === 'w' || k === 'h' ? 0.5 : 0}
                  step={0.5}
                  onChange={e => upd('layout', { ...field.layout, [k]: Number(e.target.value) })}
                  style={{ ...IS, padding: '4px 6px' }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Onglet Validation ────────────────────────────────────────────────────────

function TabValidation({ field, upd, updV }) {
  const { t } = useTranslation();
  const isSep     = field.type === 'separator';
  const isTitle   = ['title','subtitle','paragraph'].includes(field.type);
  const isNoValid = ['table','computed','autonum','signature','cachet'].includes(field.type);
  const isNum     = ['number','currency'].includes(field.type);
  const isText    = ['text','textarea','email','phone'].includes(field.type);

  if (isSep || isTitle || isNoValid) return (
    <p style={{ fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center', marginTop: 20 }}>
      {t('Pas de validation pour ce type de champ.')}
    </p>
  );

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={field.required || false} onChange={e => upd('required', e.target.checked)}
            style={{ width: 14, height: 14, accentColor: 'var(--brand)', cursor: 'pointer' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{t('Champ obligatoire')}</span>
        </label>
        {field.required && (
          <div style={{ marginTop: 6 }}>
            <label style={LS}>{t("Message d'erreur")}</label>
            <input value={field.validation?.requiredMsg || ''} onChange={e => updV('requiredMsg', e.target.value)}
              style={IS} placeholder={t('Ce champ est obligatoire')} />
          </div>
        )}
      </div>

      {isText && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <Field label={t('Min. caractères')}>
            <input type="number" min={0} value={field.validation?.minLength ?? ''} onChange={e => updV('minLength', e.target.value === '' ? null : Number(e.target.value))} style={IS} placeholder="—" />
          </Field>
          <Field label={t('Max. caractères')}>
            <input type="number" min={0} value={field.validation?.maxLength ?? ''} onChange={e => updV('maxLength', e.target.value === '' ? null : Number(e.target.value))} style={IS} placeholder="—" />
          </Field>
        </div>
      )}

      {isNum && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <Field label={t('Valeur min.')}>
            <input type="number" value={field.validation?.min ?? ''} onChange={e => updV('min', e.target.value === '' ? null : Number(e.target.value))} style={IS} placeholder="—" />
          </Field>
          <Field label={t('Valeur max.')}>
            <input type="number" value={field.validation?.max ?? ''} onChange={e => updV('max', e.target.value === '' ? null : Number(e.target.value))} style={IS} placeholder="—" />
          </Field>
        </div>
      )}

      {isText && (
        <Field label={t('Expression régulière')} hint={t('Ex: ^[A-Za-z]+$ pour lettres seulement')}>
          <input value={field.validation?.regex || ''} onChange={e => updV('regex', e.target.value || null)}
            style={{ ...IS, fontFamily: 'monospace' }} placeholder="^[A-Za-z0-9]+$" />
        </Field>
      )}
      {field.validation?.regex && (
        <Field label={t('Message si invalide')}>
          <input value={field.validation?.regexMsg || ''} onChange={e => updV('regexMsg', e.target.value)}
            style={IS} placeholder={t('Format invalide')} />
        </Field>
      )}
    </div>
  );
}

// ─── Onglet Conditions ────────────────────────────────────────────────────────

const OPERATORS_OPTIONS = [
  { value: 'equals',       label: 'est égal à' },
  { value: 'not_equals',   label: 'est différent de' },
  { value: 'contains',     label: 'contient' },
  { value: 'not_contains', label: 'ne contient pas' },
  { value: 'starts_with',  label: 'commence par' },
  { value: 'greater',      label: 'est supérieur à' },
  { value: 'less',         label: 'est inférieur à' },
  { value: 'is_empty',     label: 'est vide' },
  { value: 'is_not_empty', label: "n'est pas vide" },
  { value: 'is_checked',   label: 'est coché' },
  { value: 'is_unchecked', label: 'est décoché' },
];

const NO_VALUE_OPS = ['is_empty', 'is_not_empty', 'is_checked', 'is_unchecked'];

function TabConditions({ field, upd, allFields }) {
  const { t } = useTranslation();
  const raw  = field.conditions;
  const cond = (Array.isArray(raw) && raw.length > 0) ? raw[0]
             : (raw && !Array.isArray(raw)) ? raw
             : null;

  const setCond = (c) => upd('conditions', c ? [c] : []);
  const enabled = !!cond;
  const otherFields = allFields.filter(f => f.id !== field.id && !['title','subtitle','paragraph','separator'].includes(f.type));

  if (!enabled) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 20 }}>
        <GitBranch size={28} style={{ color: 'var(--fg-muted)', opacity: .4, marginBottom: 8 }} />
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 12 }}>
          {t('Ce champ est toujours visible.')}<br/>
          {t("Activez une condition pour le masquer ou l'afficher selon les réponses.")}
        </p>
        <button
          onClick={() => setCond({ action: 'show', logic: 'AND', rules: [{ fieldId: '', operator: 'equals', value: '' }] })}
          style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          <Plus size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {t('Ajouter une condition')}
        </button>
      </div>
    );
  }

  const updateCond = (key, val) => setCond({ ...cond, [key]: val });
  const updateRule = (idx, key, val) => {
    const rules = [...(cond.rules || [])];
    rules[idx] = { ...rules[idx], [key]: val };
    updateCond('rules', rules);
  };
  const addRule    = () => updateCond('rules', [...(cond.rules || []), { fieldId: '', operator: 'equals', value: '' }]);
  const removeRule = (idx) => {
    const rules = (cond.rules || []).filter((_, i) => i !== idx);
    if (!rules.length) { setCond(null); return; }
    updateCond('rules', rules);
  };

  return (
    <div>
      <Field label={t('Action')}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['show', 'hide'].map(a => (
            <button key={a} onClick={() => updateCond('action', a)} style={{
              flex: 1, padding: '6px 0', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: cond.action === a ? 'var(--brand)' : 'var(--bg)',
              color: cond.action === a ? '#fff' : 'var(--fg-muted)',
              border: `1.5px solid ${cond.action === a ? 'var(--brand)' : 'var(--border)'}`,
            }}>
              {a === 'show' ? `👁 ${t('Afficher')}` : `🙈 ${t('Masquer')}`}
            </button>
          ))}
        </div>
      </Field>

      {(cond.rules?.length || 0) > 1 && (
        <Field label={t('Combiner les règles')}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['AND', 'OR'].map(l => (
              <button key={l} onClick={() => updateCond('logic', l)} style={{
                flex: 1, padding: '5px 0', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: cond.logic === l ? '#6366f1' : 'var(--bg)',
                color: cond.logic === l ? '#fff' : 'var(--fg-muted)',
                border: `1.5px solid ${cond.logic === l ? '#6366f1' : 'var(--border)'}`,
              }}>
                {l === 'AND' ? t('ET (toutes)') : t('OU (une)')}
              </button>
            ))}
          </div>
        </Field>
      )}

      <p style={{ ...LS, marginBottom: 6 }}>{t('Si...')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        {(cond.rules || []).map((rule, idx) => (
          <div key={idx} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px', border: '1px solid var(--border)' }}>
            <div style={{ marginBottom: 5 }}>
              <label style={{ ...LS, fontSize: 10 }}>{t('Champ')}</label>
              <select value={rule.fieldId || ''} onChange={e => updateRule(idx, 'fieldId', e.target.value)} style={IS}>
                <option value="">{t('Choisir un champ...')}</option>
                {otherFields.map(f => (
                  <option key={f.id} value={f.id}>{f.label || FIELD_REGISTRY[f.type]?.label}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: NO_VALUE_OPS.includes(rule.operator) ? 0 : 5 }}>
              <label style={{ ...LS, fontSize: 10 }}>{t('Condition')}</label>
              <select value={rule.operator || 'equals'} onChange={e => updateRule(idx, 'operator', e.target.value)} style={IS}>
                {OPERATORS_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
              </select>
            </div>
            {!NO_VALUE_OPS.includes(rule.operator) && (
              <div>
                <label style={{ ...LS, fontSize: 10 }}>{t('Valeur')}</label>
                <input value={rule.value || ''} onChange={e => updateRule(idx, 'value', e.target.value)} style={IS} placeholder={t('Valeur à comparer...')} />
              </div>
            )}
            <button onClick={() => removeRule(idx)} style={{ marginTop: 6, padding: '3px 8px', background: 'none', border: '1px solid var(--danger)', borderRadius: 5, cursor: 'pointer', fontSize: 10, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Trash2 size={10} /> {t('Supprimer')}
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={addRule} style={{ flex: 1, padding: '6px 0', background: 'none', border: '1.5px dashed var(--border)', borderRadius: 7, cursor: 'pointer', fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Plus size={11} /> {t('Ajouter une règle')}
        </button>
        <button onClick={() => setCond(null)} style={{ padding: '6px 10px', background: 'none', border: '1.5px solid var(--danger)', borderRadius: 7, cursor: 'pointer', fontSize: 11, color: 'var(--danger)' }}>
          {t('Supprimer tout')}
        </button>
      </div>
    </div>
  );
}

// ─── PropertiesPanel principal ────────────────────────────────────────────────

const TABS = [
  { id: 'display',    label: 'Affichage',  icon: Eye },
  { id: 'validation', label: 'Validation', icon: ShieldCheck },
  { id: 'conditions', label: 'Conditions', icon: GitBranch },
];

export default function PropertiesPanel() {
  const { t } = useTranslation();
  const { form, selectedFieldId, updateField } = useFormBuilderStore();
  const [activeTab, setActiveTab] = useState('display');

  const allFields = form?.schema?.fields || [];
  const field     = allFields.find(f => f.id === selectedFieldId);

  const upd  = (key, value) => updateField(selectedFieldId, { [key]: value });
  const updV = (key, value) => updateField(selectedFieldId, {
    validation: { ...(field?.validation || {}), [key]: value },
  });

  const condCount = (() => {
    const c = field?.conditions;
    if (!c) return 0;
    if (Array.isArray(c)) return c.length > 0 ? (c[0]?.rules?.length || 0) : 0;
    return c.rules?.length || 0;
  })();

  if (!field) {
    return (
      <div style={{
        width: 270, flexShrink: 0,
        borderLeft: '1.5px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 20, gap: 10,
      }}>
        <MousePointerClick size={28} style={{ color: 'var(--fg-muted)', opacity: .3 }} />
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
          {t('Cliquez sur un champ')}<br/>{t('pour le configurer')}
        </p>
      </div>
    );
  }

  const reg = FIELD_REGISTRY[field.type];

  return (
    <div style={{
      width: 270, flexShrink: 0,
      borderLeft: '1.5px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '10px 12px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Settings2 size={13} style={{ color: 'var(--brand)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg)', textTransform: 'uppercase', letterSpacing: '.5px', flex: 1 }}>
            {t('Propriétés')}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: 'var(--brand)', color: '#fff' }}>
            {reg?.label || field.type}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const badge = tab.id === 'conditions' && condCount > 0 ? condCount : 0;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, padding: '6px 4px',
                background: 'none', border: 'none',
                borderBottom: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                cursor: 'pointer', fontSize: 10, fontWeight: 600,
                color: isActive ? 'var(--brand)' : 'var(--fg-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                position: 'relative', transition: 'color .15s',
              }}>
                <Icon size={11} />
                {t(tab.label)}
                {badge > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 4, background: '#10b981', color: '#fff', fontSize: 8, fontWeight: 700, borderRadius: 8, padding: '1px 4px' }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {activeTab === 'display'    && <TabDisplay    field={field} upd={upd} allFields={allFields} />}
        {activeTab === 'validation' && <TabValidation field={field} upd={upd} updV={updV} />}
        {activeTab === 'conditions' && <TabConditions field={field} upd={upd} allFields={allFields} />}
      </div>
    </div>
  );
}
