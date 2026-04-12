import { useState, useCallback } from 'react';

const STORAGE_KEY = 'ged-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  });

  const toggle = useCallback((id) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isFav = useCallback((id) => favorites.includes(id), [favorites]);

  return { favorites, toggle, isFav };
}
