import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const SealMoment: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bigCircle = document.getElementById('bigSealCircle') as SVGPathElement | null;
    const bigCheck = document.getElementById('bigSealCheck') as SVGPathElement | null;

    if (bigCircle && bigCheck) {
      const cl = bigCircle.getTotalLength();
      const kl = bigCheck.getTotalLength();
      gsap.set(bigCircle, { strokeDasharray: cl, strokeDashoffset: cl });
      gsap.set(bigCheck, { strokeDasharray: kl, strokeDashoffset: kl });

      gsap.set('#sealText .word-inner', { y: '40%', opacity: 0 });

      const ctx = gsap.context(() => {
        const sealTl = gsap.timeline({
          scrollTrigger: {
            trigger: '.seal-moment',
            start: 'top 65%',
            end: 'bottom 60%',
            scrub: 0.8,
          },
        });

        sealTl
          .to(bigCircle, { strokeDashoffset: 0, ease: 'none' })
          .to(bigCheck, { strokeDashoffset: 0, ease: 'none' }, 0.5)
          .to('#sealText .word-inner', { y: '0%', opacity: 1, stagger: 0.08, ease: 'none' }, 0.3);
      }, sectionRef);

      return () => ctx.revert();
    }
  }, []);

  return (
    <section className="seal-moment" ref={sectionRef}>
      <svg className="seal-svg" viewBox="0 0 200 200" fill="none">
        <circle id="bigSealCircle" cx="100" cy="100" r="86" stroke="#D9A94E" strokeWidth="3" />
        <path
          id="bigSealCheck"
          d="M62 103L86 127L142 68"
          stroke="#D9A94E"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h2 id="sealText">
        <span className="word">
          <span className="word-inner">Every</span>
        </span>{' '}
        <span className="word">
          <span className="word-inner">claim</span>
        </span>{' '}
        <span className="word">
          <span className="word-inner">gets</span>
        </span>{' '}
        <span className="word">
          <span className="word-inner">a</span>
        </span>{' '}
        <span className="word">
          <span className="word-inner">
            <em>verdict</em>,
          </span>
        </span>{' '}
        <span className="word">
          <span className="word-inner">not</span>
        </span>{' '}
        <span className="word">
          <span className="word-inner">a</span>
        </span>{' '}
        <span className="word">
          <span className="word-inner">vibe.</span>
        </span>
      </h2>
    </section>
  );
};
