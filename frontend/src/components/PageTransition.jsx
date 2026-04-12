import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function PageTransition({ children }) {
  const location = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(false);
    // Micro-delay pour permettre au DOM de se rafraîchir avant l'animation
    const raf = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(raf);
  }, [location.pathname]);

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {children}
    </div>
  );
}
