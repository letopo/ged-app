// frontend/src/components/Pagination.jsx
// Pagination commune à toutes les listes : « 26–50 sur 132 », choix du nombre
// d'éléments par page (mémorisé par liste sur cet appareil) et numéros de page
// cliquables (1 … 4 5 6 … 12).
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
// Grilles de cartes (3 ou 4 colonnes) : multiples de 12, pas de carte seule en bas
export const GRID_PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

// Taille de page mémorisée pour une liste donnée (ex. 'employees')
export function usePageSize(listKey, defaultSize = 25, options = PAGE_SIZE_OPTIONS) {
  const storageKey = `ged.pageSize.${listKey}`;
  const [size, setSize] = useState(() => {
    try {
      const v = Number(localStorage.getItem(storageKey));
      return options.includes(v) ? v : defaultSize;
    } catch { return defaultSize; }
  });
  const update = (v) => {
    setSize(v);
    try { localStorage.setItem(storageKey, String(v)); } catch { /* stockage indisponible */ }
  };
  return [size, update];
}

// Numéros à afficher : toujours la 1re et la dernière, la page courante ± 1
function pageWindow(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

export default function Pagination({
  page, totalPages, total, pageSize, onPageChange, onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS, style,
}) {
  const { t } = useTranslation();
  const pages = Math.max(1, totalPages || 1);
  if (!total && pages <= 1) return null;
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total || 0, page * pageSize);
  const go = (p) => { if (p >= 1 && p <= pages && p !== page) onPageChange(p); };

  const btn = (active, disabled) => ({
    minWidth: 32, height: 32, padding: '0 8px', borderRadius: 'var(--radius-2)', fontSize: 13,
    fontWeight: active ? 700 : 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1,
    border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
    background: active ? 'var(--brand)' : 'var(--surface)', color: active ? '#fff' : 'var(--fg)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 0', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--fg-muted)' }}>
        {total > 0 && <span>{t('{{from}}–{{to}} sur {{total}}', { from, to, total })}</span>}
        {onPageSizeChange && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {t('Afficher')}
            <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{ height: 32, padding: '0 8px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13 }}>
              {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {t('par page')}
          </label>
        )}
      </div>
      {pages > 1 && (
        <nav aria-label={t('Pagination')} style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <button type="button" style={btn(false, page <= 1)} disabled={page <= 1} onClick={() => go(page - 1)} aria-label={t('Page précédente')}>
            <ChevronLeft size={15} />
          </button>
          {pageWindow(page, pages).map((p) => (typeof p === 'string'
            ? <span key={p} style={{ padding: '0 4px', color: 'var(--fg-subtle)' }}>…</span>
            : (
              <button key={p} type="button" style={btn(p === page, false)} onClick={() => go(p)} aria-current={p === page ? 'page' : undefined}>
                {p}
              </button>
            )))}
          <button type="button" style={btn(false, page >= pages)} disabled={page >= pages} onClick={() => go(page + 1)} aria-label={t('Page suivante')}>
            <ChevronRight size={15} />
          </button>
        </nav>
      )}
    </div>
  );
}
