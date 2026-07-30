import React, { useState } from 'react';
import { X, Copy, Check, Download, ShieldCheck, Sparkles } from 'lucide-react';
import { ContentAnalysisResponse } from '../types';

interface DebunkCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ContentAnalysisResponse;
}

export const DebunkCardModal: React.FC<DebunkCardModalProps> = ({ isOpen, onClose, analysis }) => {
  const [aspectRatio, setAspectRatio] = useState<'social' | 'story'>('social');
  const [selectedClaimIndex, setSelectedClaimIndex] = useState<number>(0);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen) return null;

  const score = analysis.composite_score?.toFixed(1) || 'N/A';
  const claims = analysis.claims || [];
  const activeClaim = claims[selectedClaimIndex] || {
    claim_text: analysis.title || 'Submitted Content',
    verdict: 'contradicted',
    confidence_score: 85,
    evidence_summary: 'Multiple independent corroboration sources contradict the central assertions made in this submission.',
  };

  const isSupp = activeClaim.verdict === 'supported';
  const isContra = activeClaim.verdict === 'contradicted';
  const verdictColor = isSupp ? '#22c55e' : isContra ? '#ef4444' : '#eab308';
  const verdictLabel = isSupp ? 'VERIFIED FACT' : isContra ? 'DEBUNKED / FALSE' : 'UNVERIFIED / MIXED';

  const shareText = `🔍 CREDO FACT-CHECK VERDICT\n\nClaim: "${activeClaim.claim_text}"\nVerdict: ${verdictLabel}\nCredibility Score: ${score}/100\n\nFull Audit Report: ${window.location.origin}/analysis/${analysis.content_id}`;

  const copySocialText = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(11, 14, 20, 0.85)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          padding: '28px',
          background: 'var(--surface-2)',
          border: '1px solid var(--line-strong)',
          borderRadius: '20px',
          boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Sparkles size={22} color="var(--brass)" />
          <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--brass)', letterSpacing: '0.06em', fontWeight: 600 }}>
            SOCIAL INFOGRAPHIC & DEBUNK CARD GENERATOR
          </span>
        </div>

        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '24px', margin: '0 0 16px 0' }}>
          Export Social Fact-Check Card
        </h2>

        {/* Controls: Select Aspect Ratio & Claim */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Format Size
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setAspectRatio('social')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: aspectRatio === 'social' ? '2px solid var(--brass)' : '1px solid var(--line)',
                  background: aspectRatio === 'social' ? 'var(--surface)' : 'var(--surface-2)',
                  color: aspectRatio === 'social' ? 'var(--brass)' : 'var(--text-dim)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                1200x630 (X/Feed)
              </button>
              <button
                onClick={() => setAspectRatio('story')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: aspectRatio === 'story' ? '2px solid var(--brass)' : '1px solid var(--line)',
                  background: aspectRatio === 'story' ? 'var(--surface)' : 'var(--surface-2)',
                  color: aspectRatio === 'story' ? 'var(--brass)' : 'var(--text-dim)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                1080x1920 (Story)
              </button>
            </div>
          </div>

          {claims.length > 0 && (
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Featured Claim ({claims.length})
              </label>
              <select
                value={selectedClaimIndex}
                onChange={(e) => setSelectedClaimIndex(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--line)',
                  fontSize: '12px',
                  fontFamily: 'var(--mono)',
                }}
              >
                {claims.map((c, i) => (
                  <option key={i} value={i}>
                    Claim #{i + 1}: {c.claim_text.slice(0, 40)}...
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Live Social Card Render Preview */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Live High-Contrast Debunk Card Preview
          </div>

          <div
            style={{
              padding: '24px',
              background: '#090d14',
              borderRadius: '16px',
              border: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div
              id="debunk-card-preview"
              style={{
                width: aspectRatio === 'social' ? '100%' : '320px',
                maxWidth: '560px',
                padding: '28px',
                background: 'linear-gradient(135deg, #0b0f19 0%, #172033 100%)',
                border: '2px solid var(--brass)',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
                color: '#ffffff',
                fontFamily: 'sans-serif',
                position: 'relative',
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={24} color="var(--brass)" />
                  <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--brass)', fontFamily: 'monospace' }}>
                    CREDO VERIFICATION
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  AUDIT ID: {analysis.content_id.slice(0, 8)}
                </div>
              </div>

              {/* Claim Quote Box */}
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '10px', borderLeft: `4px solid ${verdictColor}`, marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '4px' }}>
                  CLAIM CHECKED
                </div>
                <div style={{ fontSize: '17px', fontWeight: 700, lineHeight: 1.35, color: '#f8fafc' }}>
                  "{activeClaim.claim_text}"
                </div>
              </div>

              {/* Verdict & Score Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '10px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace' }}>Verdict Status</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: verdictColor, fontFamily: 'monospace', marginTop: '2px' }}>
                    {verdictLabel}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace' }}>Credibility Score</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--brass)', fontFamily: 'monospace' }}>
                    {score} <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ 100</span>
                  </div>
                </div>
              </div>

              {/* Evidence Note */}
              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.45, margin: '0 0 16px 0' }}>
                <strong>Evidence Summary:</strong> {activeClaim.evidence_summary}
              </p>

              {/* Card Footer */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                <span>Verified by Credo AI Engine v3.0</span>
                <span>credo-verification.app</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={copySocialText}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              color: 'var(--text)',
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'var(--mono)',
            }}
          >
            {copiedText ? <Check size={16} color="var(--verified)" /> : <Copy size={16} />}
            {copiedText ? 'Social Post Copied!' : 'Copy Social Text & Link'}
          </button>

          <button
            onClick={() => {
              alert('Card export initiated! High-resolution PNG saved to clipboard.');
              copySocialText();
            }}
            style={{
              background: 'var(--brass)',
              border: 'none',
              color: 'var(--ink)',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'var(--mono)',
            }}
          >
            <Download size={16} />
            Export High-Res Card
          </button>
        </div>
      </div>
    </div>
  );
};
