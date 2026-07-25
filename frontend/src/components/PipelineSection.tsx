import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const PipelineSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.matchMedia('(min-width: 900px)').matches;

    if (isDesktop && !reduced) {
      const track = document.getElementById('pipeTrack');
      const panels = gsap.utils.toArray('.pipe-panel');
      const dots = gsap.utils.toArray('.pipe-dot');
      const lineFg = document.getElementById('pipeLineFg');

      if (track && panels.length && lineFg) {
        const ctx = gsap.context(() => {
          ScrollTrigger.matchMedia({
            '(min-width: 900px)': function () {
              const getEnd = () => (panels.length - 1) * window.innerWidth;
              const pipeTl = gsap.timeline({
                scrollTrigger: {
                  trigger: '.pipeline-pin',
                  pin: true,
                  scrub: 0.8,
                  start: 'top top',
                  end: () => '+=' + getEnd(),
                  onUpdate: (self) => {
                    const idx = Math.min(
                      panels.length - 1,
                      Math.round(self.progress * (panels.length - 1))
                    );
                    dots.forEach((d, i) =>
                      (d as HTMLElement).classList.toggle('is-active', i === idx)
                    );
                  },
                },
              });

              pipeTl.to(track, { xPercent: -100 * (panels.length - 1), ease: 'none' }, 0);
              pipeTl.fromTo(lineFg, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none' }, 0);
            },
          });
        }, sectionRef);

        return () => ctx.revert();
      }
    }
  }, []);

  return (
    <section id="pipeline" ref={sectionRef}>
      <div className="pipeline-pin">
        <svg className="pipe-line-svg" preserveAspectRatio="none">
          <line id="pipeLineBg" x1="0" y1="1" x2="100%" y2="1" stroke="var(--line)" strokeWidth="2" />
          <line
            id="pipeLineFg"
            x1="0"
            y1="1"
            x2="100%"
            y2="1"
            stroke="#D9A94E"
            strokeWidth="2"
            strokeDasharray="1"
            strokeDashoffset="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="pipe-track" id="pipeTrack">
          <div className="pipe-panel">
            <div className="pipe-num">01</div>
            <h3>Ingest</h3>
            <p>
              A link, pasted text, an image, a video, a voice note, or a screenshot — every format
              enters the same pipeline through its own pre-processor.
            </p>
          </div>
          <div className="pipe-panel">
            <div className="pipe-num">02</div>
            <h3>Extract claims</h3>
            <p>
              Credo pulls out every atomic, independently checkable factual assertion — not the
              article's overall "vibe."
            </p>
          </div>
          <div className="pipe-panel">
            <div className="pipe-num">03</div>
            <h3>Corroborate</h3>
            <p>
              Each claim is checked against multiple independent news sources and fact-check
              databases, never just one.
            </p>
          </div>
          <div className="pipe-panel">
            <div className="pipe-num">04</div>
            <h3>Score, independently</h3>
            <p>
              Factual accuracy, source reputation, manipulation tactics, bias, and temporal consistency
              are scored on separate axes.
            </p>
          </div>
          <div className="pipe-panel">
            <div className="pipe-num">05</div>
            <h3>Show its work</h3>
            <p>
              The full reasoning chain is returned alongside the score — the part most tools never give
              you.
            </p>
          </div>
        </div>
        <div className="pipe-progress" id="pipeDots">
          <div className="pipe-dot is-active"></div>
          <div className="pipe-dot"></div>
          <div className="pipe-dot"></div>
          <div className="pipe-dot"></div>
          <div className="pipe-dot"></div>
        </div>
      </div>

      <div className="pipeline-vertical wrap section">
        <div className="section-head">
          <div className="section-eyebrow">How Credo thinks</div>
          <h2 className="section-title">
            One pipeline, <em>five deliberate stages.</em>
          </h2>
        </div>
        <div className="pv-steps">
          <div className="pv-line"></div>
          <div className="pv-step">
            <div className="pipe-num">01</div>
            <h3>Ingest</h3>
            <p>Every format enters the same pipeline through its own pre-processor.</p>
          </div>
          <div className="pv-step">
            <div className="pipe-num">02</div>
            <h3>Extract claims</h3>
            <p>Pull out every atomic, independently checkable factual assertion.</p>
          </div>
          <div className="pv-step">
            <div className="pipe-num">03</div>
            <h3>Corroborate</h3>
            <p>Check each claim against multiple independent sources.</p>
          </div>
          <div className="pv-step">
            <div className="pipe-num">04</div>
            <h3>Score, independently</h3>
            <p>Five dimensions, scored separately, never blended into one number.</p>
          </div>
          <div className="pv-step">
            <div className="pipe-num">05</div>
            <h3>Show its work</h3>
            <p>Return the full reasoning chain alongside the score.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
