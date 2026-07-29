import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, ExternalLink, ShieldCheck, Loader2, History, Share2, MessageSquare, Send } from 'lucide-react';
import { getContentAnalysis, streamAnalysisProgress, fetchCredibilityCard, submitClaimCorrection } from '../api/client';
import { ContentAnalysisResponse } from '../types';
import { ModelVersionChangelogModal } from './ModelVersionChangelogModal';

interface AnalysisModalProps {
  contentId: string | null;
  onClose: () => void;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ contentId, onClose }) => {
  const [analysis, setAnalysis] = useState<ContentAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<string>('queued');
  const [showChangelog, setShowChangelog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [activeClaimForEvidence, setActiveClaimForEvidence] = useState<{ id: string; claim_text: string } | null>(null);
  const [proposedVerdict, setProposedVerdict] = useState<'supported' | 'contradicted' | 'unverified'>('contradicted');
  const [evidenceText, setEvidenceText] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceFeedback, setEvidenceFeedback] = useState<string | null>(null);

  const handleEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClaimForEvidence || !evidenceText.trim()) return;

    setIsSubmittingEvidence(true);
    setEvidenceFeedback(null);

    try {
      await submitClaimCorrection(activeClaimForEvidence.id, {
        proposed_verdict: proposedVerdict,
        evidence_text: evidenceText.trim(),
        evidence_urls: evidenceUrl.trim() ? [evidenceUrl.trim()] : [],
      });
      setIsSubmittingEvidence(false);
      setEvidenceFeedback('Community evidence submitted successfully! Submitted for expert review.');
      setEvidenceText('');
      setEvidenceUrl('');
      setTimeout(() => {
        setActiveClaimForEvidence(null);
        setEvidenceFeedback(null);
      }, 2500);
    } catch (err: any) {
      setIsSubmittingEvidence(false);
      setEvidenceFeedback(err.message || 'Failed to submit community evidence');
    }
  };

  useEffect(() => {
    if (!contentId) return;

    setAnalysis(null);
    setError(null);
    setPhase('queued');

    let isSubscribed = true;
    let pollingTimer: ReturnType<typeof setTimeout>;

    // Immediately fetch existing analysis result for past history items
    getContentAnalysis(contentId)
      .then((data) => {
        if (isSubscribed && data) {
          setAnalysis(data);
          if (data.status === 'complete') {
            setPhase('complete');
          } else if (data.status === 'failed') {
            setError('Analysis failed');
            setPhase('failed');
          }
        }
      })
      .catch(() => {});

    const cleanup = streamAnalysisProgress(
      contentId,
      (newPhase: string) => {
        if (isSubscribed) {
          setPhase(newPhase);
        }
      },
      (data: ContentAnalysisResponse) => {
        if (isSubscribed) {
          setAnalysis(data);
          setPhase('complete');
        }
      },
      (message: string) => {
        if (isSubscribed) {
          // If analysis was already loaded via REST API, ignore transient SSE close
          if (!analysis) {
            setError(message);
            setPhase('failed');
          }
        }
      }
    );

    const fallbackPoll = () => {
      if (!isSubscribed) return;
      if (phase === 'complete' || phase === 'failed') return;

      getContentAnalysis(contentId)
        .then((data) => {
          if (isSubscribed && (data.status === 'complete' || data.status === 'failed')) {
            if (data.status === 'complete') {
              setAnalysis(data);
              setPhase('complete');
            } else {
              setError('Analysis failed');
              setPhase('failed');
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isSubscribed && phase !== 'complete' && phase !== 'failed') {
            pollingTimer = setTimeout(fallbackPoll, 3000);
          }
        });
    };

    pollingTimer = setTimeout(fallbackPoll, 3000);

    return () => {
      isSubscribed = false;
      cleanup();
      if (pollingTimer) clearTimeout(pollingTimer);
    };
  }, [contentId]);

  if (!contentId) return null;

  const score = analysis?.composite_score ?? 0;
  const isComplete = analysis?.status === 'complete';
  const isProcessing = phase !== 'complete' && phase !== 'failed' && !error;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
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
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          padding: '32px',
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
          aria-label="Close Modal"
        >
          <X size={24} />
        </button>

        {isProcessing && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Loader2
              size={48}
              color="var(--brass)"
              style={{ animation: 'spin 1.5s linear infinite', marginBottom: '20px' }}
            />
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '24px', fontWeight: 500, marginBottom: '10px' }}>
              Credo Engine Analyzing...
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '15px', maxWidth: '400px', margin: '0 auto' }}>
              Extracting factual assertions, performing WHOIS domain lookup, and corroborating against
              independent news databases.
            </p>
            {phase !== 'queued' && (
              <p style={{ color: 'var(--text-faint)', fontSize: '12px', marginTop: '12px', fontFamily: 'var(--mono)' }}>
                Phase: {phase}
              </p>
            )}
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--disputed)' }}>
            <AlertTriangle size={48} style={{ marginBottom: '16px' }} />
            <h3>Analysis Failed</h3>
            <p style={{ color: 'var(--text-dim)', marginTop: '8px' }}>{error}</p>
          </div>
        )}

        {isComplete && analysis && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <ShieldCheck size={28} color="var(--brass)" />
              <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--brass)', letterSpacing: '0.06em' }}>
                CREDO / ANALYSIS RESULT ({analysis.model_version})
              </span>
              <button
                onClick={() => setShowChangelog(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'var(--mono)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <History size={12} />
                Changelog
              </button>
              <button
                onClick={async () => {
                  if (!contentId) return;
                  setIsExporting(true);
                  try {
                    const card = await fetchCredibilityCard(contentId);
                    const text = [
                      `Credo Credibility Card`,
                      `=======================`,
                      ``,
                      `Score: ${card.composite_score?.toFixed(1) ?? 'N/A'} / 100`,
                      card.confidence_interval ? `Range: ${card.confidence_interval.lower} — ${card.confidence_interval.upper}` : '',
                      `Verdict: ${card.verdict ?? 'N/A'}`,
                      `Claims Checked: ${card.claims_count}`,
                      `Model: ${card.model_version ?? 'N/A'}`,
                      card.source_domain ? `Source: ${card.source_domain}` : '',
                      `Date: ${new Date(card.created_at).toLocaleString()}`,
                    ].filter(Boolean).join('\n');

                    if (navigator.share) {
                      await navigator.share({
                        title: 'Credo Credibility Card',
                        text,
                      });
                    } else if (navigator.clipboard) {
                      await navigator.clipboard.writeText(text);
                      alert('Credibility card copied to clipboard');
                    }
                  } catch (e) {
                    console.error('Export failed', e);
                  } finally {
                    setIsExporting(false);
                  }
                }}
                disabled={isExporting}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'var(--mono)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: 'auto',
                }}
              >
                <Share2 size={12} />
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            </div>

            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '26px', lineHeight: 1.3, marginBottom: '16px' }}>
              {analysis.title || 'Submitted Content Breakdown'}
            </h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px',
                background: 'var(--surface)',
                borderRadius: '12px',
                border: '1px solid var(--line)',
                marginBottom: '28px',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Composite Score
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    fontFamily: 'var(--mono)',
                    fontWeight: 700,
                    color: score >= 80 ? 'var(--verified)' : score >= 50 ? 'var(--mislead)' : 'var(--disputed)',
                  }}
                >
                  {score.toFixed(1)} / 100
                </div>
                {analysis.confidence_interval && (
                  <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginTop: '4px' }}>
                    95% CI: {analysis.confidence_interval.lower} — {analysis.confidence_interval.upper} (±{analysis.confidence_interval.margin})
                  </div>
                )}
              </div>
              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: '100px',
                  fontFamily: 'var(--mono)',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: score >= 80 ? 'var(--verified-dim)' : score >= 50 ? 'rgba(224,185,78,0.14)' : 'var(--disputed-dim)',
                  color: score >= 80 ? 'var(--verified)' : score >= 50 ? 'var(--mislead)' : 'var(--disputed)',
                }}
              >
                {score >= 80 ? 'VERIFIED ACCURACY' : score >= 50 ? 'MODERATE / CAUTION' : 'DISPUTED / LOW REPUTATION'}
              </div>
            </div>

            {/* Phase 3: Satire / Parody Banner */}
            {analysis.dimension_scores?.is_satire && (
              <div
                style={{
                  padding: '16px 20px',
                  background: 'rgba(217, 169, 78, 0.12)',
                  border: '1px solid var(--brass)',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <ShieldCheck size={24} color="var(--brass)" />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--brass)', fontSize: '15px' }}>
                    Satire & Parody Classification
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    This content originates from a recognized satirical outlet or contains parody disclaimers. Misinformation alerts have been suppressed.
                  </div>
                </div>
              </div>
            )}

            {/* Dimension Breakdown Bars */}
            {analysis.dimension_scores && (
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '16px' }}>
                  Independent Scoring Dimensions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="demo-row">
                    <span className="demo-row-label">Factual Accuracy</span>
                    <div className="demo-bar">
                      <div
                        className="demo-bar-fill"
                        style={{
                          width: `${analysis.dimension_scores.factual_accuracy}%`,
                          background: 'var(--verified)',
                        }}
                      ></div>
                    </div>
                    <span className="demo-row-val">{analysis.dimension_scores.factual_accuracy}%</span>
                  </div>

                  <div className="demo-row">
                    <span className="demo-row-label">Source Reputation</span>
                    <div className="demo-bar">
                      <div
                        className="demo-bar-fill"
                        style={{
                          width: `${analysis.dimension_scores.source_reputation}%`,
                          background: 'var(--brass)',
                        }}
                      ></div>
                    </div>
                    <span className="demo-row-val">{analysis.dimension_scores.source_reputation}%</span>
                  </div>

                  {analysis.dimension_scores.clickbait_risk !== undefined && (
                    <div className="demo-row">
                      <span className="demo-row-label">Clickbait Risk</span>
                      <div className="demo-bar">
                        <div
                          className="demo-bar-fill"
                          style={{
                            width: `${analysis.dimension_scores.clickbait_risk}%`,
                            background: analysis.dimension_scores.clickbait_risk > 50 ? 'var(--disputed)' : 'var(--verified)',
                          }}
                        ></div>
                      </div>
                      <span className="demo-row-val">{analysis.dimension_scores.clickbait_risk}%</span>
                    </div>
                  )}

                  {analysis.dimension_scores.virality_risk !== undefined && (
                    <div className="demo-row">
                      <span className="demo-row-label">Virality Risk</span>
                      <div className="demo-bar">
                        <div
                          className="demo-bar-fill"
                          style={{
                            width: `${analysis.dimension_scores.virality_risk}%`,
                            background: analysis.dimension_scores.virality_risk > 60 ? 'var(--disputed)' : 'var(--mislead)',
                          }}
                        ></div>
                      </div>
                      <span className="demo-row-val">{analysis.dimension_scores.virality_risk}%</span>
                    </div>
                  )}

                  <div className="demo-row">
                    <span className="demo-row-label">Temporal Match</span>
                    <div className="demo-bar">
                      <div
                        className="demo-bar-fill"
                        style={{
                          width: `${analysis.dimension_scores.temporal_consistency}%`,
                          background: 'var(--verified)',
                        }}
                      ></div>
                    </div>
                    <span className="demo-row-val">{analysis.dimension_scores.temporal_consistency}%</span>
                  </div>

                  <div className="demo-row">
                    <span className="demo-row-label">Bias Axis</span>
                    <div className="demo-bar">
                      <div
                        className="demo-bar-fill"
                        style={{
                          width: '50%',
                          background: 'var(--mislead)',
                        }}
                      ></div>
                    </div>
                    <span className="demo-row-val" style={{ width: 'auto', textTransform: 'capitalize' }}>
                      {analysis.dimension_scores.bias}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Phase 3: Detected Manipulation Tactics */}
            {analysis.reasoning_chain?.detected_manipulation_tactics && analysis.reasoning_chain.detected_manipulation_tactics.length > 0 && (
              <div style={{ marginBottom: '28px', background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <h4 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 500, marginBottom: '12px' }}>
                  Rhetorical Manipulation Tactics Detected ({analysis.reasoning_chain.detected_manipulation_tactics.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {analysis.reasoning_chain.detected_manipulation_tactics.map((tactic, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'var(--disputed-dim)',
                          color: 'var(--disputed)',
                          fontFamily: 'var(--mono)',
                          fontSize: '11px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {tactic.label}
                      </span>
                      <span style={{ fontSize: '13.5px', color: 'var(--text-dim)' }}>
                        {tactic.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phase 2: Granular Per-Claim Breakdown Cards */}
            {analysis.claims && analysis.claims.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 500, marginBottom: '14px' }}>
                  Extracted Claim Breakdown ({analysis.claims.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {analysis.claims.map((claim, idx) => {
                    const isSupp = claim.verdict === 'supported';
                    const isContra = claim.verdict === 'contradicted';
                    const verdictColor = isSupp ? 'var(--verified)' : isContra ? 'var(--disputed)' : 'var(--mislead)';
                    const verdictBg = isSupp ? 'var(--verified-dim)' : isContra ? 'var(--disputed-dim)' : 'rgba(224,185,78,0.14)';

                    return (
                      <div
                        key={claim.id || idx}
                        style={{
                          padding: '18px',
                          background: 'var(--surface)',
                          borderRadius: '12px',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '100px',
                                fontSize: '10.5px',
                                fontFamily: 'var(--mono)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: verdictBg,
                                color: verdictColor,
                              }}
                            >
                              {claim.verdict}
                            </span>
                            {claim.extracted_speaker && (
                              <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                                Speaker: {claim.extracted_speaker}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--brass)', fontWeight: 600 }}>
                            {claim.confidence_score.toFixed(0)}% Confidence
                            {claim.confidence_interval && (
                              <span style={{ color: 'var(--text-dim)', marginLeft: '6px' }}>
                                ({claim.confidence_interval.lower} — {claim.confidence_interval.upper})
                              </span>
                            )}
                          </span>
                        </div>

                        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)', marginBottom: '8px', lineHeight: 1.4 }}>
                          "{claim.claim_text}"
                        </div>

                        <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                          <strong style={{ color: 'var(--text)' }}>Evidence:</strong> {claim.evidence_summary}
                        </p>

                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <button
                            onClick={() => {
                              setActiveClaimForEvidence(
                                activeClaimForEvidence?.id === claim.id ? null : { id: claim.id, claim_text: claim.claim_text }
                              );
                              setEvidenceFeedback(null);
                            }}
                            style={{
                              background: 'transparent',
                              border: '1px dashed var(--brass)',
                              color: 'var(--brass)',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontFamily: 'var(--mono)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <MessageSquare size={12} />
                            Suggest Correction / Submit Evidence
                          </button>
                        </div>

                        {activeClaimForEvidence?.id === claim.id && (
                          <form
                            onSubmit={handleEvidenceSubmit}
                            style={{
                              marginTop: '12px',
                              padding: '14px',
                              background: 'var(--surface-2)',
                              borderRadius: '8px',
                              border: '1px solid var(--line-strong)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                            }}
                          >
                            <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--brass)' }}>
                              Submit Community Evidence
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Proposed Verdict:</span>
                              <select
                                value={proposedVerdict}
                                onChange={(e) => setProposedVerdict(e.target.value as any)}
                                style={{
                                  background: 'var(--surface)',
                                  color: 'var(--text)',
                                  border: '1px solid var(--line)',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontFamily: 'var(--mono)',
                                }}
                              >
                                <option value="supported">Supported / True</option>
                                <option value="contradicted">Contradicted / False</option>
                                <option value="unverified">Unverified / Mixed</option>
                              </select>
                            </div>

                            <textarea
                              placeholder="Detail your evidence, source context, or reasoning..."
                              value={evidenceText}
                              onChange={(e) => setEvidenceText(e.target.value)}
                              rows={2}
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--line)',
                                borderRadius: '6px',
                                padding: '8px 12px',
                                color: 'var(--text)',
                                fontSize: '13px',
                                outline: 'none',
                              }}
                              required
                            />

                            <input
                              type="url"
                              placeholder="Supporting Reference URL (e.g. https://...)"
                              value={evidenceUrl}
                              onChange={(e) => setEvidenceUrl(e.target.value)}
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--line)',
                                borderRadius: '6px',
                                padding: '8px 12px',
                                color: 'var(--text)',
                                fontSize: '12.5px',
                                outline: 'none',
                              }}
                            />

                            {evidenceFeedback && (
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: evidenceFeedback.includes('successfully') ? 'var(--verified)' : 'var(--disputed)',
                                  fontFamily: 'var(--mono)',
                                }}
                              >
                                {evidenceFeedback}
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => setActiveClaimForEvidence(null)}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid var(--line)',
                                  color: 'var(--text-dim)',
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSubmittingEvidence || !evidenceText.trim()}
                                style={{
                                  background: 'var(--brass)',
                                  border: 'none',
                                  color: 'var(--ink)',
                                  padding: '5px 14px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <Send size={12} />
                                {isSubmittingEvidence ? 'Submitting...' : 'Submit Evidence'}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reasoning Chain */}
            {analysis.reasoning_chain && (
              <div style={{ marginBottom: '28px', background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <h4 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 500, marginBottom: '10px' }}>
                  Reasoning Chain
                </h4>
                <p style={{ fontSize: '14.5px', color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: '10px' }}>
                  {analysis.reasoning_chain.summary}
                </p>
                {analysis.reasoning_chain.source_reputation_notes && (
                  <p style={{ fontSize: '13px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                    • {analysis.reasoning_chain.source_reputation_notes}
                  </p>
                )}
              </div>
            )}

            {/* Corroborating Sources */}
            {analysis.corroborating_sources && analysis.corroborating_sources.length > 0 && (
              <div>
                <h4 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 500, marginBottom: '14px' }}>
                  Corroborating References ({analysis.corroborating_sources.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {analysis.corroborating_sources.map((item, i) => (
                    <a
                      key={i}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: 'var(--surface)',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        fontSize: '14px',
                        transition: 'border-color 0.2s ease',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{item.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', marginTop: '2px' }}>
                          {item.source} · {item.provider}
                        </div>
                      </div>
                      <ExternalLink size={16} color="var(--text-dim)" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <ModelVersionChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
    </div>
  );
};
