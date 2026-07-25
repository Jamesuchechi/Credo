import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export const ModalityMarquee: React.FC = () => {
  const marqueeRef = useRef<HTMLDivElement>(null);
  const modRowRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (modRowRef.current && cloneRef.current) {
      cloneRef.current.innerHTML = modRowRef.current.innerHTML;

      if (!reduced) {
        const ctx = gsap.context(() => {
          gsap.to('.modality-row', {
            xPercent: -100,
            duration: 24,
            ease: 'none',
            repeat: -1,
          });
        }, marqueeRef);

        return () => ctx.revert();
      }
    }
  }, []);

  return (
    <div ref={marqueeRef}>
      <section className="section-tight wrap">
        <div className="section-head" style={{ marginBottom: '36px' }}>
          <div className="section-eyebrow">One engine, every format</div>
          <h2 className="section-title">
            If it can carry a claim, <em>Credo can check it.</em>
          </h2>
        </div>
      </section>
      <div className="modality-track" id="modTrack">
        <div className="modality-row" id="modRow" ref={modRowRef}>
          <div className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M10 13a5 5 0 007.07 0l1.93-1.93a5 5 0 00-7.07-7.07L10.5 5.43M14 11a5 5 0 00-7.07 0l-1.93 1.93a5 5 0 007.07 7.07L13.5 18.57" />
            </svg>
            Article links
          </div>
          <div className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 5h16M4 12h16M4 19h10" />
            </svg>
            Pasted text
          </div>
          <div className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.5" />
              <path d="M21 16l-5-5-5 5" />
            </svg>
            Images
          </div>
          <div className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="6" width="14" height="12" rx="2" />
              <path d="M17 10l4-2v8l-4-2" />
            </svg>
            Video clips
          </div>
          <div className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3v10M8 8v6M4 10v2M16 8v6M20 10v2" />
            </svg>
            Voice notes
          </div>
          <div className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="5" y="3" width="14" height="18" rx="2" />
              <path d="M9 7h6M9 11h6" />
            </svg>
            Screenshots
          </div>
          <div className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 12a4 4 0 118 0 4 4 0 01-8 0zM4 20c0-3 3.5-5 8-5s8 2 8 5" />
            </svg>
            Social posts
          </div>
        </div>
        <div className="modality-row" aria-hidden="true" id="modRowClone" ref={cloneRef}></div>
      </div>
    </div>
  );
};
