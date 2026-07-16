// frontend/src/store/formBuilderStore.js

import { create } from 'zustand';

// ─── Constantes de la grille ──────────────────────────────────────────────────
// 1 unité = 20px  |  grille principale toutes les 5u = 100px
// Canvas = 40 unités de large = 800px (≈ A4 portrait)

export const GRID_SIZE   = 20;   // px par unité de grille
export const CANVAS_COLS = 40;   // largeur canvas en unités (800px)
export const CANVAS_WIDTH = GRID_SIZE * CANVAS_COLS; // 800px

// ─── Registry des types de champs (w, h en unités de grille) ─────────────────
export const FIELD_REGISTRY = {
  // Texte / Structure
  title:         { label: 'Titre',           category: 'text',    defaultW: 40, defaultH: 3,  defaultLabel: 'Titre du formulaire' },
  subtitle:      { label: 'Sous-titre',      category: 'text',    defaultW: 40, defaultH: 2,  defaultLabel: 'Sous-titre' },
  paragraph:     { label: 'Texte libre',     category: 'text',    defaultW: 40, defaultH: 4,  defaultLabel: 'Texte descriptif...' },
  dynamictext:   { label: 'Texte dynamique', category: 'text',    defaultW: 40, defaultH: 4,  defaultLabel: '' },
  separator:     { label: 'Séparateur',      category: 'text',    defaultW: 40, defaultH: 1,  defaultLabel: '' },

  // Saisie simple
  text:          { label: 'Texte court',     category: 'input',   defaultW: 20, defaultH: 4,  defaultLabel: 'Champ texte' },
  textarea:      { label: 'Texte long',      category: 'input',   defaultW: 40, defaultH: 6,  defaultLabel: 'Zone de texte' },
  number:        { label: 'Nombre',          category: 'input',   defaultW: 12, defaultH: 4,  defaultLabel: 'Champ numérique' },
  currency:      { label: 'Montant',         category: 'input',   defaultW: 12, defaultH: 4,  defaultLabel: 'Montant' },
  email:         { label: 'Email',           category: 'input',   defaultW: 20, defaultH: 4,  defaultLabel: 'Adresse email' },
  phone:         { label: 'Téléphone',       category: 'input',   defaultW: 20, defaultH: 4,  defaultLabel: 'Numéro de téléphone' },
  date:          { label: 'Date',            category: 'input',   defaultW: 14, defaultH: 4,  defaultLabel: 'Date' },
  time:          { label: 'Heure',           category: 'input',   defaultW: 12, defaultH: 4,  defaultLabel: 'Heure' },
  daterange:     { label: 'Période (dates)', category: 'input',   defaultW: 30, defaultH: 5,  defaultLabel: 'Période' },
  serviceselect: { label: 'Service',         category: 'input',   defaultW: 20, defaultH: 4,  defaultLabel: 'Service' },
  userselect:    { label: 'Employé',         category: 'input',   defaultW: 20, defaultH: 4,  defaultLabel: 'Employé' },

  // Choix
  checkbox:      { label: 'Case à cocher',   category: 'choice',  defaultW: 20, defaultH: 3,  defaultLabel: 'Case à cocher' },
  radio:         { label: 'Bouton radio',    category: 'choice',  defaultW: 20, defaultH: 7,  defaultLabel: 'Choix unique', defaultOptions: ['Option 1', 'Option 2', 'Option 3'] },
  select:        { label: 'Liste déroul.',   category: 'choice',  defaultW: 20, defaultH: 4,  defaultLabel: 'Sélectionner...', defaultOptions: ['Option 1', 'Option 2', 'Option 3'] },
  multicheck:    { label: 'Cases multiples', category: 'choice',  defaultW: 30, defaultH: 8,  defaultLabel: 'Options', defaultOptions: ['Option 1', 'Option 2', 'Option 3'] },
  selectcond:    { label: 'Sél. conditionnelle', category: 'choice', defaultW: 24, defaultH: 5, defaultLabel: 'Type' },

  // Avancé
  table:         { label: 'Tableau',         category: 'advanced', defaultW: 40, defaultH: 14, defaultLabel: 'Tableau' },
  computed:      { label: 'Champ calculé',   category: 'advanced', defaultW: 14, defaultH: 4,  defaultLabel: 'Résultat' },
  autonum:       { label: 'N° auto',         category: 'advanced', defaultW: 20, defaultH: 4,  defaultLabel: 'Numéro' },
  signature:     { label: 'Signature',       category: 'advanced', defaultW: 20, defaultH: 8,  defaultLabel: 'Signature' },
  cachet:        { label: 'Cachet',          category: 'advanced', defaultW: 16, defaultH: 8,  defaultLabel: 'Cachet officiel' },
  file:          { label: 'Fichier',         category: 'advanced', defaultW: 20, defaultH: 4,  defaultLabel: 'Téléverser un fichier' },
};

export const FIELD_CATEGORIES = {
  text:     { label: 'Structure', color: '#6366f1' },
  input:    { label: 'Saisie',    color: '#3b82f6' },
  choice:   { label: 'Choix',     color: '#10b981' },
  advanced: { label: 'Avancé',    color: '#f59e0b' },
};

// ─── Valeurs par défaut spécifiques à chaque type ─────────────────────────────

const TYPE_DEFAULTS = {
  table: {
    columns: [
      { key: 'designation', label: 'Désignation', type: 'text',   width: 50 },
      { key: 'quantite',    label: 'Qté',          type: 'number', width: 15 },
      { key: 'montant',     label: 'Montant',      type: 'number', width: 25 },
    ],
    autoNumber: true,
    minRows: 1,
  },
  daterange: {
    labelStart:          'Date début',
    labelEnd:            'Date fin',
    includeBusinessDays: false,
  },
  multicheck: {
    checkColumns: 1,
  },
  computed: {
    formula: '',
    format:  'number',
    suffix:  '',
  },
  autonum: {
    prefix:   'REF',
    category: '',
  },
  dynamictext: {
    template: '',
  },
  selectcond: {
    condOptions: [],   // [{ label: string, subOptions: string[] }]
    subLabel: 'Préciser :',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _counter = 0;
const newId = () => `field_${Date.now()}_${++_counter}`;

export const snapToGrid = (px) => Math.round(px / GRID_SIZE) * GRID_SIZE;
export const pxToUnits  = (px) => Math.round(px / GRID_SIZE);
export const unitsToPx  = (u)  => u * GRID_SIZE;

const createField = (type, layout = {}) => {
  const reg        = FIELD_REGISTRY[type] || {};
  const typeDefs   = TYPE_DEFAULTS[type]  || {};
  return {
    id:          newId(),
    type,
    label:       reg.defaultLabel ?? reg.label ?? 'Champ',
    placeholder: '',
    description: '',
    required:    false,
    options:     reg.defaultOptions ? [...reg.defaultOptions] : [],
    validation:  { minLength: null, maxLength: null, min: null, max: null, regex: null },
    conditions:  [],
    textAlign:   'left',   // 'left' | 'center' | 'right'
    layout: {
      x: layout.x ?? 0,
      y: layout.y ?? 0,
      w: layout.w ?? reg.defaultW ?? 20,
      h: layout.h ?? reg.defaultH ?? 4,
    },
    ...typeDefs,
  };
};

// ─── Store ────────────────────────────────────────────────────────────────────

const MAX_HISTORY = 50;

export const useFormBuilderStore = create((set, get) => ({
  form:            null,
  selectedFieldId: null,
  isDirty:         false,
  isSaving:        false,
  snapEnabled:     true,
  _history:        [],
  _future:         [],

  setForm: (form) => set({ form, isDirty: false, _history: [], _future: [] }),

  _snapshot: () => {
    const { form, _history } = get();
    if (!form) return;
    const snap = JSON.parse(JSON.stringify(form.schema?.fields || []));
    set({ _history: [..._history.slice(-MAX_HISTORY + 1), snap], _future: [] });
  },

  undo: () => {
    const { form, _history, _future } = get();
    if (!_history.length) return;
    const prev    = _history[_history.length - 1];
    const current = JSON.parse(JSON.stringify(form?.schema?.fields || []));
    set({
      form: { ...form, schema: { ...form.schema, fields: prev } },
      _history: _history.slice(0, -1),
      _future:  [current, ..._future],
      isDirty:  true,
    });
  },

  redo: () => {
    const { form, _history, _future } = get();
    if (!_future.length) return;
    const next    = _future[0];
    const current = JSON.parse(JSON.stringify(form?.schema?.fields || []));
    set({
      form: { ...form, schema: { ...form.schema, fields: next } },
      _history: [..._history, current],
      _future:  _future.slice(1),
      isDirty:  true,
    });
  },

  addField: (type, layout) => {
    get()._snapshot();
    const field = createField(type, layout);
    set(state => ({
      form: {
        ...state.form,
        schema: {
          ...state.form.schema,
          fields: [...(state.form.schema?.fields || []), field],
        },
      },
      selectedFieldId: field.id,
      isDirty: true,
    }));
    return field;
  },

  updateField: (fieldId, updates) => set(state => ({
    form: {
      ...state.form,
      schema: {
        ...state.form.schema,
        fields: state.form.schema.fields.map(f =>
          f.id === fieldId ? { ...f, ...updates } : f
        ),
      },
    },
    isDirty: true,
  })),

  removeField: (fieldId) => { get()._snapshot(); return set(state => ({
    form: {
      ...state.form,
      schema: {
        ...state.form.schema,
        fields: state.form.schema.fields.filter(f => f.id !== fieldId),
      },
    },
    selectedFieldId: state.selectedFieldId === fieldId ? null : state.selectedFieldId,
    isDirty: true,
  })); },

  duplicateField: (fieldId) => {
    get()._snapshot();
    const state    = get();
    const original = state.form?.schema?.fields?.find(f => f.id === fieldId);
    if (!original) return;
    const copy = {
      ...JSON.parse(JSON.stringify(original)),
      id:     newId(),
      layout: { ...original.layout, y: original.layout.y + original.layout.h + 1 },
    };
    set(s => ({
      form: {
        ...s.form,
        schema: { ...s.form.schema, fields: [...s.form.schema.fields, copy] },
      },
      selectedFieldId: copy.id,
      isDirty: true,
    }));
  },

  setFieldLayout: (fieldId, layout) => set(state => ({
    form: {
      ...state.form,
      schema: {
        ...state.form.schema,
        fields: state.form.schema.fields.map(f =>
          f.id === fieldId ? { ...f, layout: { ...f.layout, ...layout } } : f
        ),
      },
    },
    isDirty: true,
  })),

  selectField:   (id) => set({ selectedFieldId: id }),
  deselectField: ()   => set({ selectedFieldId: null }),
  setIsSaving:   (v)  => set({ isSaving: v }),
  setIsDirty:    (v)  => set({ isDirty: v }),
  toggleSnap:    ()   => set(s => ({ snapEnabled: !s.snapEnabled })),
}));
