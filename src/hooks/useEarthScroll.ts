import { useEffect, useRef } from 'react';

export function useEarthScroll() {
  const earthRef = useRef<HTMLImageElement>(null);
  const earthWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    // Degrees of rotation per pixel scrolled. Lower = slower spin.
    const DEG_PER_PX = 0.1;
    const INITIAL_ROTATION_DEG = -35;

    // ---- blur-out settings ----
    const BLUR_START = 400;
    const BLUR_RANGE = 500;
    const MAX_BLUR = 30;
    const FADE_OUT = false;

    function clamp01(n: number) {
      return Math.max(0, Math.min(1, n));
    }

    function updateRotation() {
      const y = window.scrollY;

      // spin
      const deg = INITIAL_ROTATION_DEG + y * DEG_PER_PX;
      if (earthRef.current) {
        earthRef.current.style.transform = `rotate(${deg}deg)`;
      }

      // blur out
      const progress = clamp01((y - BLUR_START) / BLUR_RANGE);
      if (earthWrapRef.current) {
        earthWrapRef.current.style.filter = `blur(${progress * MAX_BLUR}px)`;
        if (FADE_OUT) {
          earthWrapRef.current.style.opacity = `${1 - progress}`;
        }
      }

      ticking = false;
    }

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateRotation);
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateRotation();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { earthRef, earthWrapRef };
}
