import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp } from 'lucide-react';

export default function ScrollToTop() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title={t('Retour en haut')}
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 50,
        padding: 12, borderRadius: '50%',
        background: 'var(--brand)', color: '#fff', border: 'none',
        cursor: 'pointer', boxShadow: 'var(--shadow-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform .15s, box-shadow .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-3)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
    >
      <ChevronUp size={20} />
    </button>
  );
}
