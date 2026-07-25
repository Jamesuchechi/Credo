import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const PrinciplesSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.reveal').forEach((el) => {
        gsap.to(el as HTMLElement, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el as HTMLElement,
            start: 'top 88%',
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="section section-tight wrap" id="principles" ref={sectionRef}>
      <div className="section-head">
        <div className="section-eyebrow">Why a score isn't enough</div>
        <h2 className="section-title">
          A single "real or fake" number <em>hides more than it tells you.</em>
        </h2>
        <p className="section-desc">
          Content is rarely one thing. Credo scores each dimension on its own axis and lets you see
          how they combine — instead of collapsing everything into a verdict you have to trust blindly.
        </p>
      </div>
      <div className="principles">
        <div className="principle reveal">
          <svg className="principle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 12h16M4 6h10M4 18h7" />
          </svg>
          <h3>Biased, but true</h3>
          <p>
            An article can frame a real story unfairly and still get every fact right. Credo scores
            bias and factual accuracy as separate axes, never one blended number.
          </p>
        </div>
        <div className="principle reveal">
          <svg className="principle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
          <h3>Real, but recontextualized</h3>
          <p>
            Genuine footage from the wrong date or event is one of the most common patterns online —
            and the one a simple true/false model misses completely.
          </p>
        </div>
        <div className="principle reveal">
          <svg className="principle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3>Satire, not misinformation</h3>
          <p>
            Credo recognizes known parody and satire sources before scoring, so a joke doesn't get
            flagged the same way a fabricated claim does.
          </p>
        </div>
        <div className="principle reveal">
          <svg className="principle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 6h16M4 12h10M4 18h16" />
          </svg>
          <h3>Every score shows its reasoning</h3>
          <p>
            Which claims, which sources, which ones contradicted — the full chain is visible, and
            every scoring model change is versioned and auditable.
          </p>
        </div>
      </div>
    </section>
  );
};
