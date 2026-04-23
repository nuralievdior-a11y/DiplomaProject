import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const location = useLocation();
  const prevRef = useRef(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { pathname: location.pathname, search: location.search, hash: location.hash };

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isSoftNav = !!prev && prev.pathname === location.pathname;
    const behavior = prefersReducedMotion ? 'auto' : (isSoftNav ? 'smooth' : 'auto');

    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        el.scrollIntoView({ block: 'start', behavior });
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior });
  }, [location.pathname, location.search, location.hash]);

  return null;
}
