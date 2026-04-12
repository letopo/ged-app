import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Raccourcis clavier globaux :
 *  N  → /upload (nouveau document)
 *  G D → /dashboard
 *  G W → /workflow-dashboard
 *  Échap → ferme les modals (via événement custom "closeModal")
 */
export default function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    let seq = '';
    let seqTimer = null;

    const onKey = (e) => {
      // Ignorer quand on est dans un champ de saisie
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Raccourci simple : N → nouveau document
      if (key === 'n') {
        e.preventDefault();
        navigate('/upload');
        return;
      }

      // Séquences à 2 touches (type Vim : g+d, g+w)
      seq += key;
      clearTimeout(seqTimer);
      seqTimer = setTimeout(() => { seq = ''; }, 800);

      if (seq === 'gd') { navigate('/dashboard'); seq = ''; }
      if (seq === 'gw') { navigate('/workflow-dashboard'); seq = ''; }
      if (seq === 'gm') { navigate('/documents'); seq = ''; }

      // Échap → événement custom pour fermer les modals
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('closeModal'));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(seqTimer);
    };
  }, [navigate]);
}
