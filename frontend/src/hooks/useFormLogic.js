// frontend/src/hooks/useFormLogic.js
// Évalue les conditions et champs calculés d'un formulaire
//
// Usage:
//   const { visibleFields, computedValues } = useFormLogic(schema, values);

import { useMemo } from 'react';

const OPERATORS = {
  equals:       (a, b) => String(a).toLowerCase() === String(b).toLowerCase(),
  not_equals:   (a, b) => String(a).toLowerCase() !== String(b).toLowerCase(),
  contains:     (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
  not_contains: (a, b) => !String(a).toLowerCase().includes(String(b).toLowerCase()),
  starts_with:  (a, b) => String(a).toLowerCase().startsWith(String(b).toLowerCase()),
  greater:      (a, b) => Number(a) > Number(b),
  less:         (a, b) => Number(a) < Number(b),
  gte:          (a, b) => Number(a) >= Number(b),
  lte:          (a, b) => Number(a) <= Number(b),
  is_empty:     (a)    => !a || String(a).trim() === '',
  is_not_empty: (a)    => !!a && String(a).trim() !== '',
  is_checked:   (a)    => a === true || a === 'true',
  is_unchecked: (a)    => !a || a === 'false',
};

/**
 * Évalue une règle individuelle
 */
function evalRule(rule, values) {
  if (!rule?.fieldId) return true;
  const val = values[rule.fieldId];
  const fn  = OPERATORS[rule.operator];
  if (!fn) return true;
  return fn(val, rule.value);
}

/**
 * Évalue un groupe de conditions sur un champ
 * conditions shape: { action: 'show'|'hide', logic: 'AND'|'OR', rules: [...] }
 */
function evalConditions(conditions, values) {
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) return true;

  // Support ancien format (tableau de conditions) et nouveau format objet
  const cond = Array.isArray(conditions) ? conditions[0] : conditions;
  if (!cond?.rules?.length) return true;

  const { action = 'show', logic = 'AND', rules } = cond;
  const results = rules.map(r => evalRule(r, values));
  const condMet = logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
  return action === 'show' ? condMet : !condMet;
}

/**
 * Évalue les formules de champs calculés
 * Syntaxe: {field_id} + {autre_id} * 2
 */
function evalFormula(formula, values) {
  if (!formula) return '';
  try {
    const expr = formula.replace(/\{([^}]+)\}/g, (_, id) => {
      const v = values[id];
      return isNaN(v) ? 0 : (Number(v) || 0);
    });
    // Évaluation sécurisée (opérations arithmétiques uniquement)
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${expr})`)();
  } catch {
    return '';
  }
}

export default function useFormLogic(schema, values = {}) {
  const fields = schema?.fields || [];

  const visibleFields = useMemo(
    () => fields.filter(f => evalConditions(f.conditions, values)),
    [fields, values]
  );

  const computedValues = useMemo(() => {
    const comp = {};
    fields
      .filter(f => (f.type === 'calculated' || f.type === 'computed') && f.formula)
      .forEach(f => { comp[f.id] = evalFormula(f.formula, { ...values, ...comp }); });
    return comp;
  }, [fields, values]);

  return { visibleFields, computedValues };
}

// Export pour usage externe (designer)
export { evalConditions, evalFormula, OPERATORS };
