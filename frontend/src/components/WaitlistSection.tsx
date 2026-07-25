import React, { useState } from 'react';

export const WaitlistSection: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <section className="cta-section" id="waitlist">
      <div className="wrap cta-inner">
        <h2>Get early access to Credo.</h2>
        <p>We're onboarding a small group before the public API and browser extension launch.</p>
        <form className="cta-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email address"
            disabled={submitted}
          />
          <span className="magnetic" data-magnetic>
            <button type="submit" className="btn-primary" disabled={submitted}>
              {submitted ? "You're on the list" : 'Get early access'}
            </button>
          </span>
        </form>
        <p className="cta-note">NO SPAM. ONE EMAIL WHEN WE'RE READY FOR YOU.</p>
      </div>
    </section>
  );
};
