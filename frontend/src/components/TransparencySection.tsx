import React from 'react';

export const TransparencySection: React.FC = () => {
  return (
    <section className="section wrap" id="transparency">
      <div className="trans-grid">
        <div className="trans-copy">
          <div className="section-eyebrow">Built to be checked</div>
          <h2 className="section-title" style={{ marginBottom: '20px' }}>
            A score you can <em>argue with</em> is worth more than one you have to trust.
          </h2>
          <p>
            Every result comes with its full <strong>claim graph</strong> — the exact sources that
            supported or contradicted each assertion, visible and auditable, not hidden behind a
            single number.
          </p>
          <p>
            Scoring changes are <strong>versioned</strong>, so if a result shifts over time, you can
            see exactly why — and reprocessed content keeps its history rather than silently
            overwriting it.
          </p>
        </div>
        <div className="graph reveal">
          <div className="graph-row">
            <span className="graph-node">claim_014</span>
            <span className="graph-arrow">→</span>
            <span className="graph-node">Reuters</span>
            <span className="graph-verdict v-verified">Supports</span>
          </div>
          <div className="graph-row">
            <span className="graph-node">claim_014</span>
            <span className="graph-arrow">→</span>
            <span className="graph-node">AP News</span>
            <span className="graph-verdict v-verified">Supports</span>
          </div>
          <div className="graph-row">
            <span className="graph-node">claim_015</span>
            <span className="graph-arrow">→</span>
            <span className="graph-node">local-blog.io</span>
            <span className="graph-verdict v-disputed">Contradicts</span>
          </div>
          <div className="graph-row">
            <span className="graph-node">claim_016</span>
            <span className="graph-arrow">→</span>
            <span className="graph-node">FactCheck.org</span>
            <span className="graph-verdict v-unverified">Unverified</span>
          </div>
        </div>
      </div>
    </section>
  );
};
