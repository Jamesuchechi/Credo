import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer>
      <div className="wrap foot-row">
        <div className="foot-brand">
          <svg viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="#D9A94E" strokeWidth="2" />
            <path
              d="M12 20.5L17 26L28.5 13"
              stroke="#D9A94E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Credo
        </div>
        <div className="foot-links">
          <a href="#principles">Product</a>
          <a href="#pipeline">How it works</a>
          <a href="#transparency">Transparency</a>
          <a href="#waitlist">Waitlist</a>
        </div>
      </div>
      <div className="wrap foot-copy">© 2026 CREDO. A CREDIBILITY ENGINE, NOT A VERDICT MACHINE.</div>
    </footer>
  );
};
