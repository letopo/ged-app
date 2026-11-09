// backend/src/utils/vehicleShortages.js
// Manques « ouverts » des ambulances (demande RO SAU, 09/11/2026) : logique
// pure, sans base, pour rapprocher un inventaire des manques déjà ouverts.
//
// Circuit : a_commander → commande (bon papier envoyé à la pharmacie) → réarmé.
// Un manque n'est fermé que par un réarmement, ou par un inventaire qui relève
// l'article au complet. L'inventaire suivant retrouve le manque au lieu de le
// recréer, et ne signale aux responsables que ce qui est nouveau.

export const OPEN_STATUSES = ['a_commander', 'commande'];

/** Clé d'un manque : article + nature (un article peut manquer ET périmer). */
export const shortageKey = (itemId, kind) => `${itemId}|${kind}`;

/** Lignes de réassort d'un inventaire → manques attendus { key, itemId, kind, quantity, … }. */
export function shortagesFromRestock(restock, sections) {
  const critical = new Set();
  for (const s of sections || []) for (const it of s.items || []) if (it.critical) critical.add(it.id);
  const out = [];
  for (const r of restock || []) {
    const base = { itemId: r.itemId, label: r.label, section: r.section || null, unit: r.unit || null, critical: critical.has(r.itemId) };
    if (r.low) out.push({ ...base, kind: 'niveau', quantity: null, detail: { value: r.value, min: r.min } });
    else if (r.ko) out.push({ ...base, kind: 'panne', quantity: null });
    else {
      if (r.missing) out.push({ ...base, kind: 'manque', quantity: r.missing });
      if (r.expiring) out.push({ ...base, kind: 'peremption', quantity: null, critical: false });
    }
  }
  return out.map((x) => ({ ...x, key: shortageKey(x.itemId, x.kind) }));
}

/** Articles effectivement relevés dans l'inventaire (une ligne vide ne dit rien). */
export function answeredItemIds(answers) {
  const ids = new Set();
  for (const a of answers || []) {
    if ((a.present !== null && a.present !== undefined) || (a.status !== null && a.status !== undefined)
      || (typeof a.value === 'number')) ids.add(a.itemId);
  }
  return ids;
}

/**
 * Rapproche un inventaire des manques ouverts du véhicule.
 *  - open : manques ouverts [{ id, itemId, kind, quantity, orderedQty, status }]
 *  - found : manques relevés (shortagesFromRestock)
 *  - answered : Set des articles relevés
 * Retourne { create, update, close, fresh } :
 *  - create : nouveaux manques
 *  - update : [{ id, quantity }] manques retrouvés (quantité recomptée)
 *  - close  : ids des manques relevés au complet (réarmés sans avoir été pointés)
 *  - fresh  : ce qui est NOUVEAU pour les responsables (nouveaux manques et
 *             quantités qui dépassent ce qui est déjà commandé)
 */
export function reconcileShortages(open, found, answered) {
  const openByKey = new Map((open || []).map((s) => [shortageKey(s.itemId, s.kind), s]));
  const seen = new Set();
  const create = [];
  const update = [];
  const fresh = [];
  for (const f of found) {
    seen.add(f.key);
    const cur = openByKey.get(f.key);
    if (!cur) {
      create.push(f);
      fresh.push({ ...f, added: f.quantity });
      continue;
    }
    update.push({ id: cur.id, quantity: f.quantity === null ? cur.quantity : f.quantity });
    // Il en manque davantage qu'au dernier relevé ou que ce qui est déjà
    // commandé (sortie entre-temps) : seul le surplus est nouveau.
    const covered = Math.max(cur.quantity || 0, cur.orderedQty || 0);
    if (f.quantity !== null && f.quantity > covered) fresh.push({ ...f, added: f.quantity - covered, existing: true });
  }
  const close = (open || [])
    .filter((s) => !seen.has(shortageKey(s.itemId, s.kind)) && answered.has(s.itemId))
    .map((s) => s.id);
  return { create, update, close, fresh };
}

/**
 * Réarmement d'un manque : qty remise en place (null = tout, ou manque sans
 * quantité). Retourne { quantity, restocked, closed }.
 */
export function applyRestock(shortage, qty) {
  const left = shortage.quantity;
  if (left === null || left === undefined || qty === null || qty === undefined) {
    return { quantity: left === null || left === undefined ? null : 0, restocked: left || 0, closed: true };
  }
  const n = Math.max(0, Math.min(left, Math.round(Number(qty) || 0)));
  return { quantity: left - n, restocked: n, closed: left - n <= 0 };
}

/** Texte court d'un manque (« manque 3 boîtes », « périme ce mois »…). */
export function shortageText(s) {
  if (s.kind === 'peremption') return 'périme ce mois';
  if (s.kind === 'panne') return 'hors service';
  if (s.kind === 'niveau') return 'sous le minimum';
  return `manque ${s.quantity ?? '?'}${s.unit ? ` ${s.unit}` : ''}`;
}
