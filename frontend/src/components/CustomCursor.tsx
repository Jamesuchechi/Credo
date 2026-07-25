import React, { useEffect } from 'react';
import gsap from 'gsap';

export const CustomCursor: React.FC = () => {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;

    if (!fine || reduced) {
      const cursorEl = document.getElementById('cursor');
      if (cursorEl) cursorEl.style.display = 'none';
      return;
    }

    document.body.classList.add('has-custom-cursor');
    const cursor = document.getElementById('cursor');
    if (!cursor) return;

    const cx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
    const cy = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });

    const handleMouseMove = (e: MouseEvent) => {
      cx(e.clientX);
      cy(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);

    const magneticElements = document.querySelectorAll('[data-magnetic]');
    const cleanupFns: Array<() => void> = [];

    magneticElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const child = (htmlEl.querySelector('a,button') || htmlEl) as HTMLElement;
      const mx = gsap.quickTo(child, 'x', { duration: 0.4, ease: 'power3.out' });
      const my = gsap.quickTo(child, 'y', { duration: 0.4, ease: 'power3.out' });

      const onMove = (e: MouseEvent) => {
        const r = htmlEl.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.35);
        my((e.clientY - r.top - r.height / 2) * 0.35);
        cursor.classList.add('is-active');
      };

      const onLeave = () => {
        mx(0);
        my(0);
        cursor.classList.remove('is-active');
      };

      htmlEl.addEventListener('mousemove', onMove);
      htmlEl.addEventListener('mouseleave', onLeave);

      cleanupFns.push(() => {
        htmlEl.removeEventListener('mousemove', onMove);
        htmlEl.removeEventListener('mouseleave', onLeave);
      });
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.classList.remove('has-custom-cursor');
      cleanupFns.forEach((fn) => fn());
    };
  }, []);

  return (
    <>
      <div className="cursor" id="cursor"></div>
      <svg className="grain" width="100%" height="100%">
        <filter id="n">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#n)" />
      </svg>
      <div className="noise-field"></div>
    </>
  );
};
