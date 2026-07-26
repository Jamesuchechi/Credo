import React from 'react';

export const ApiKeysPage: React.FC = () => {
  return (
    <div className="coming-soon-page">
      <div className="coming-soon-card">
        <h1>API Keys</h1>
        <p>
          API key management is coming soon. It will let you generate, revoke, and
          monitor API tokens for programmatic access to Credo's credibility analysis
          endpoints.
        </p>
        <span className="coming-soon-badge">Coming Soon</span>
      </div>
      <style>{`
        .coming-soon-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          padding: 32px;
        }
        .coming-soon-card {
          text-align: center;
          max-width: 480px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 48px 36px;
        }
        .coming-soon-card h1 {
          font-family: var(--serif);
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .coming-soon-card p {
          color: var(--text-dim);
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .coming-soon-badge {
          display: inline-block;
          font-family: var(--mono);
          font-size: 11px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 100px;
          background: var(--brass-dim);
          color: var(--brass);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
};