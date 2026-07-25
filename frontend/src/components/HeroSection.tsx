import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { submitContent } from '../api/client';
import { ModalityType } from '../types';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  onAnalysisStart: (contentId: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onAnalysisStart }) => {
  const heroRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [inputPayload, setInputPayload] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPayload.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const isUrl = inputPayload.startsWith('http://') || inputPayload.startsWith('https://');
    const modality: ModalityType = isUrl ? 'url' : 'text';

    try {
      const res = await submitContent({ modality, payload: inputPayload.trim() });
      setIsSubmitting(false);
      onAnalysisStart(res.content_id);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Error submitting content for analysis.');
    }
  };

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;

    // Ambient Spotlight
    if (fine && !reduced && heroRef.current && spotlightRef.current) {
      const spot = spotlightRef.current;
      const heroSec = heroRef.current;
      const sx = gsap.quickTo(spot, 'x', { duration: 0.6, ease: 'power2.out' });
      const sy = gsap.quickTo(spot, 'y', { duration: 0.6, ease: 'power2.out' });

      const onMouseMove = (e: MouseEvent) => {
        const r = heroSec.getBoundingClientRect();
        sx(e.clientX - r.left);
        sy(e.clientY - r.top);
      };
      heroSec.addEventListener('mousemove', onMouseMove);
    }

    // 3D Card Tilt
    if (fine && !reduced && cardRef.current) {
      const card = cardRef.current;
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power2.out' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power2.out' });

      const onCardMove = (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rx(py * -10);
        ry(px * 12);
      };

      const onCardLeave = () => {
        rx(0);
        ry(0);
      };

      card.addEventListener('mousemove', onCardMove);
      card.addEventListener('mouseleave', onCardLeave);
    } else if (cardRef.current) {
      gsap.set(cardRef.current, { rotationY: -6, rotationX: 2 });
    }

    // SVG Stamp Helpers
    const circle = document.getElementById('stampCircle') as SVGPathElement | null;
    const check = document.getElementById('stampCheck') as SVGPathElement | null;
    if (circle && check) {
      const cl = circle.getTotalLength();
      const kl = check.getTotalLength();
      gsap.set(circle, { strokeDasharray: cl, strokeDashoffset: cl });
      gsap.set(check, { strokeDasharray: kl, strokeDashoffset: kl });

      // Create Hero Timeline
      const ctx = gsap.context(() => {
        const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        heroTl
          .from('.eyebrow', { opacity: 0, y: 14, duration: 0.6 })
          .to('.word-inner', { y: '0%', rotateX: 0, duration: 0.7, stagger: 0.018 }, '-=0.3')
          .from('.hero-sub', { opacity: 0, y: 16, duration: 0.6 }, '-=0.5')
          .from('.hero-input-wrap', { opacity: 0, y: 16, duration: 0.6 }, '-=0.4')
          .from('.stat-bar', { opacity: 0, y: 16, duration: 0.6 }, '-=0.4')
          .from('.demo-wrap', { opacity: 0, y: 24, duration: 0.8 }, '-=1.1');

        // Add badges to tags if not present
        const tags = document.querySelectorAll('#heroHeadline .hl-tag');
        tags.forEach((tag) => {
          if (!tag.querySelector('.hl-badge')) {
            const badge = document.createElement('span');
            badge.className = 'hl-badge';
            badge.textContent = tag.getAttribute('data-badge') || '';
            tag.appendChild(badge);
          }
        });

        gsap.set('#heroHeadline .hl-underline', { scaleX: 0 });

        heroTl
          .to(
            '#heroHeadline .hl-underline',
            { scaleX: 1, duration: 0.4, stagger: 0.2, transformOrigin: 'left center' },
            1.0
          )
          .to(
            '#heroHeadline .hl-badge',
            { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(2)', stagger: 0.2 },
            1.05
          );

        // Animated progress bars fill
        heroTl
          .to(
            '.demo-bar-fill',
            {
              width: (_i, el) => (el.getAttribute('data-fill') || '0') + '%',
              duration: 1,
              stagger: 0.12,
              ease: 'power2.out',
            },
            1.9
          )
          .to(circle, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' }, 2.3)
          .to(check, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out' }, 2.75)
          .from('#demoStamp', { opacity: 0, scale: 0.7, duration: 0.3 }, 2.3);

        // Stat Counter Animations
        document.querySelectorAll('.stat-num').forEach((el) => {
          const target = parseInt(el.getAttribute('data-count') || '0', 10);
          ScrollTrigger.create({
            trigger: el,
            start: 'top 90%',
            once: true,
            onEnter: () => {
              gsap.to(
                { v: 0 },
                {
                  v: target,
                  duration: 1.1,
                  ease: 'power2.out',
                  onUpdate: function () {
                    el.textContent = Math.round(this.targets()[0].v).toString();
                  },
                }
              );
            },
          });
        });
      }, heroRef);

      return () => ctx.revert();
    }
  }, []);

  return (
    <section className="hero wrap" id="heroSection" ref={heroRef}>
      <div className="spotlight" id="spotlight" ref={spotlightRef}></div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <span className="eyebrow">
          <span className="dot"></span>Now verifying claims, not just headlines
        </span>
        <h1 className="hero-headline" id="heroHeadline">
          <span className="word">
            <span className="word-inner">Half</span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">of</span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">what</span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">you</span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">scroll</span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">past</span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">today</span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">is</span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">
              <span className="hl-tag tag-mislead" data-badge="MISLEADING">
                exaggerated<span className="hl-underline"></span>
              </span>
              ,
            </span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">
              <span className="hl-tag tag-disputed" data-badge="TEMPORAL MISMATCH">
                out of context<span className="hl-underline"></span>
              </span>
              ,
            </span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">or</span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">
              <span className="hl-tag tag-disputed" data-badge="CONTRADICTED">
                simply false<span className="hl-underline"></span>
              </span>
              .
            </span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">Credo</span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">
              <span className="hl-tag tag-verified" data-badge="VERIFIED">
                shows its work<span className="hl-underline"></span>
              </span>
            </span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">on</span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">every</span>
          </span>{' '}
          <span className="word">
            <span className="word-inner">claim.</span>
          </span>
        </h1>
        <p className="hero-sub">
          Paste a link, a screenshot, a clip, or a claim. Credo extracts every factual assertion
          inside it, checks each one against independent sources, and explains exactly how it got
          there — never a single opaque score.
        </p>

        {/* Live Analysis Submission Form */}
        <div className="hero-input-wrap" style={{ marginTop: '28px', maxWidth: '520px' }}>
          <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Paste article URL or claim text..."
              value={inputPayload}
              onChange={(e) => setInputPayload(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--surface-2)',
                border: '1px solid var(--line-strong)',
                borderRadius: '100px',
                padding: '14px 20px',
                color: 'var(--text)',
                fontSize: '14.5px',
                outline: 'none',
              }}
              disabled={isSubmitting}
            />
            <span className="magnetic" data-magnetic>
              <button type="submit" className="btn-primary" disabled={isSubmitting || !inputPayload.trim()}>
                {isSubmitting ? 'Analyzing...' : 'Check Credibility'}
              </button>
            </span>
          </form>
          {errorMessage && (
            <p style={{ color: 'var(--disputed)', fontSize: '12.5px', marginTop: '8px', fontFamily: 'var(--mono)' }}>
              {errorMessage}
            </p>
          )}
        </div>

        <div className="stat-bar">
          <div className="stat">
            <div className="stat-num" data-count="5">
              0
            </div>
            <div className="stat-label">Scoring dimensions</div>
          </div>
          <div className="stat">
            <div className="stat-num" data-count="7">
              0
            </div>
            <div className="stat-label">Content formats</div>
          </div>
          <div className="stat">
            <div className="stat-num" data-count="1">
              0
            </div>
            <div className="stat-label">Reasoning chain per claim</div>
          </div>
        </div>
      </div>

      <div className="demo-wrap">
        <div className="demo-card" id="demoCard" ref={cardRef}>
          <svg className="demo-stamp" id="demoStamp" viewBox="0 0 100 100" fill="none">
            <circle id="stampCircle" cx="50" cy="50" r="42" stroke="#D9A94E" strokeWidth="3" />
            <path
              id="stampCheck"
              d="M32 51L44 63L70 33"
              stroke="#D9A94E"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="demo-head">
            <span className="demo-head-label">CREDO / LIVE ANALYSIS</span>
            <div className="demo-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div className="demo-claim">
            "The bridge collapsed within minutes of opening, engineers confirm."
          </div>
          <div className="demo-rows">
            <div className="demo-row">
              <span className="demo-row-label">Factual accuracy</span>
              <div className="demo-bar">
                <div className="demo-bar-fill" data-fill="38" style={{ background: 'var(--disputed)' }}></div>
              </div>
              <span className="demo-row-val">38%</span>
            </div>
            <div className="demo-row">
              <span className="demo-row-label">Source reputation</span>
              <div className="demo-bar">
                <div className="demo-bar-fill" data-fill="81" style={{ background: 'var(--verified)' }}></div>
              </div>
              <span className="demo-row-val">81%</span>
            </div>
            <div className="demo-row">
              <span className="demo-row-label">Temporal match</span>
              <div className="demo-bar">
                <div className="demo-bar-fill" data-fill="22" style={{ background: 'var(--mislead)' }}></div>
              </div>
              <span className="demo-row-val">22%</span>
            </div>
            <div className="demo-row">
              <span className="demo-row-label">Manipulation risk</span>
              <div className="demo-bar">
                <div className="demo-bar-fill" data-fill="64" style={{ background: 'var(--mislead)' }}></div>
              </div>
              <span className="demo-row-val">64%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
