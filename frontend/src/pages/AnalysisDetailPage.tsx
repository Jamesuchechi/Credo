import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Loader2,
  History,
  Share2,
  MessageSquare,
  Send,
  CheckCircle2,
  FileText,
  BarChart3,
  Database,
  Copy,
  Check,
  Layers,
  Sparkles,
  Network,
  Code,
  Radio,
  Lock,
  GitBranch,
  Scale,
} from 'lucide-react';
import { getContentAnalysis, streamAnalysisProgress, fetchCredibilityCard, submitClaimCorrection, fetchRelatedClaims } from '../api/client';
import { ContentAnalysisResponse } from '../types';
import { ModelVersionChangelogModal } from '../components/ModelVersionChangelogModal';
import { ClaimNetworkGraph } from '../components/ClaimNetworkGraph';
import { EmbedWidgetModal } from '../components/EmbedWidgetModal';
import { DebunkCardModal } from '../components/DebunkCardModal';
import { CredibilityReceiptModal } from '../components/CredibilityReceiptModal';
import { ClaimMutationModal } from '../components/ClaimMutationModal';
import { DebateModeModal } from '../components/DebateModeModal';
import { SocialEchoRadar } from '../components/SocialEchoRadar';
import { AuthorCard } from '../components/AuthorCard';

export const AnalysisDetailPage: React.FC = () => {
  const { id: contentId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState<ContentAnalysisResponse | null>(null);
  const [relatedClaims, setRelatedClaims] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<string>('queued');
  const [showChangelog, setShowChangelog] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showDebunkModal, setShowDebunkModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showMutationModal, setShowMutationModal] = useState(false);
  const [selectedClaimForMutation, setSelectedClaimForMutation] = useState<string | null>(null);
  const [showDebateModal, setShowDebateModal] = useState(false);
  const [selectedClaimForDebate, setSelectedClaimForDebate] = useState<{ id: string; text: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'claims' | 'network' | 'social' | 'audit' | 'json'>('overview');
  const [copiedJson, setCopiedJson] = useState(false);

  // Evidence submission state
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
      setEvidenceFeedback('Community evidence submitted successfully! Sent for expert review.');
      setEvidenceText('');
      setEvidenceUrl('');
      setTimeout(() => {
        setActiveClaimForEvidence(null);
        setEvidenceFeedback(null);
      }, 3000);
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

    getContentAnalysis(contentId)
      .then((data) => {
        if (isSubscribed && data) {
          setAnalysis(data);
          if (data.status === 'complete') {
            setPhase('complete');
            setError(null);
          } else if (data.status === 'failed') {
            setError('Analysis failed');
            setPhase('failed');
          }
        }
      })
      .catch(() => {});

    fetchRelatedClaims(contentId)
      .then((data) => {
        if (isSubscribed && data?.related_claims) {
          setRelatedClaims(data.related_claims);
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
          setError(null);
        }
      },
      (message: string) => {
        if (isSubscribed) {
          setAnalysis((current) => {
            if (!current || current.status !== 'complete') {
              setError(message);
              setPhase('failed');
            }
            return current;
          });
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

  if (!contentId) {
    return (
      <div style={{ padding: '40px', color: 'var(--text-dim)', textAlign: 'center' }}>
        No analysis ID specified.
      </div>
    );
  }

  const score = analysis?.composite_score ?? 0;
  const isComplete = analysis?.status === 'complete';
  const isProcessing = phase !== 'complete' && phase !== 'failed' && !error;

  const copyJsonToClipboard = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(JSON.stringify(analysis, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleExport = async () => {
    if (!contentId) return;
    setIsExporting(true);
    try {
      const card = await fetchCredibilityCard(contentId);
      const text = [
        `Credo Credibility Report`,
        `=======================`,
        ``,
        `Title: ${analysis?.title || 'Analysis Report'}`,
        `Score: ${card.composite_score?.toFixed(1) ?? 'N/A'} / 100`,
        card.confidence_interval ? `95% CI Range: ${card.confidence_interval.lower} — ${card.confidence_interval.upper}` : '',
        `Verdict: ${card.verdict ?? 'N/A'}`,
        `Claims Checked: ${card.claims_count}`,
        `Model: ${card.model_version ?? 'N/A'}`,
        card.source_domain ? `Source Domain: ${card.source_domain}` : '',
        `Date: ${new Date(card.created_at).toLocaleString()}`,
        ``,
        `Generated by Credo Verification Engine`,
      ].filter(Boolean).join('\n');

      if (navigator.share) {
        await navigator.share({
          title: `Credo Report - ${analysis?.title || contentId}`,
          text,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert('Credibility report copied to clipboard');
      }
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            color: 'var(--text)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: 'var(--mono)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.2s ease',
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {analysis?.model_version && (
            <button
              onClick={() => setShowChangelog(true)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'var(--mono)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <History size={14} />
              Model {analysis.model_version}
            </button>
          )}

          {isComplete && analysis && (
            <>
              <button
                onClick={() => setShowReceiptModal(true)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  color: 'var(--verified)',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'var(--mono)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Lock size={14} />
                Signed Receipt
              </button>

              <button
                onClick={() => setShowEmbedModal(true)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  color: 'var(--brass)',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'var(--mono)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Code size={14} />
                Embed Widget
              </button>

              <button
                onClick={() => setShowDebunkModal(true)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'var(--mono)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} color="var(--brass)" />
                Social Debunk Card
              </button>
            </>
          )}

          <button
            onClick={handleExport}
            disabled={isExporting || !isComplete}
            style={{
              background: 'var(--brass)',
              border: 'none',
              color: 'var(--ink)',
              cursor: isComplete ? 'pointer' : 'not-allowed',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'var(--mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isComplete ? 1 : 0.5,
            }}
          >
            <Share2 size={14} />
            {isExporting ? 'Exporting...' : 'Share / Export Report'}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isProcessing && (
        <div
          className="panel"
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--surface-2)',
            border: '1px solid var(--line-strong)',
            borderRadius: '16px',
            marginBottom: '32px',
          }}
        >
          <Loader2
            size={48}
            color="var(--brass)"
            style={{ animation: 'spin 1.5s linear infinite', marginBottom: '20px' }}
          />
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '26px', fontWeight: 500, marginBottom: '10px' }}>
            Credo Engine Processing Analysis...
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '15px', maxWidth: '500px', margin: '0 auto 16px' }}>
            Extracting factual assertions, evaluating claim consistency, querying WHOIS domain registries, and cross-referencing global corroboration sources.
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              padding: '6px 16px',
              borderRadius: '100px',
              color: 'var(--brass)',
              fontSize: '12px',
              fontFamily: 'var(--mono)',
            }}
          >
            <Sparkles size={14} />
            Active Pipeline Phase: <strong style={{ color: 'var(--text)' }}>{phase}</strong>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="panel"
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            background: 'rgba(239,68,68,0.05)',
            border: '1px solid var(--disputed)',
            borderRadius: '16px',
            color: 'var(--disputed)',
            marginBottom: '32px',
          }}
        >
          <AlertTriangle size={52} style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '22px', fontFamily: 'var(--serif)', marginBottom: '8px' }}>Analysis Execution Failed</h3>
          <p style={{ color: 'var(--text-dim)', maxWidth: '450px', margin: '0 auto' }}>{error}</p>
        </div>
      )}

      {/* Completed Analysis Main View */}
      {isComplete && analysis && (
        <div>
          {/* Retraction Watchdog Alert Banner */}
          {analysis.has_flagged_source_update && (
            <div
              style={{
                padding: '18px 22px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid var(--disputed)',
                borderRadius: '16px',
                color: 'var(--disputed)',
                marginBottom: '28px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.12)',
              }}
            >
              <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'var(--mono)', marginBottom: '4px', letterSpacing: '0.04em' }}>
                  ⚠️ RETRACTION WATCHDOG ALERT: SOURCE MODIFIED OR RETRACTED
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
                  {analysis.source_update_notice || 'A source used in this credibility analysis has been updated, retracted, or removed since the original audit report was generated.'}
                </p>
              </div>
            </div>
          )}

          {/* Hero Summary Header Card */}
          <div
            className="panel"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line-strong)',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '28px',
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <ShieldCheck size={22} color="var(--brass)" />
              <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--brass)', letterSpacing: '0.08em', fontWeight: 600 }}>
                VERIFIED AUDIT REPORT / ID: {contentId}
              </span>
            </div>

            <h1 style={{ fontFamily: 'var(--serif)', fontSize: '32px', lineHeight: 1.25, marginBottom: '20px' }}>
              {analysis.title || 'Analysis Overview Report'}
            </h1>

            {/* Scorecard Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '20px',
                padding: '24px',
                background: 'var(--surface)',
                borderRadius: '12px',
                border: '1px solid var(--line)',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Composite Score
                </div>
                <div
                  style={{
                    fontSize: '44px',
                    fontFamily: 'var(--mono)',
                    fontWeight: 700,
                    lineHeight: 1.1,
                    color: score >= 80 ? 'var(--verified)' : score >= 50 ? 'var(--mislead)' : 'var(--disputed)',
                    marginTop: '4px',
                  }}
                >
                  {score.toFixed(1)} <span style={{ fontSize: '20px', color: 'var(--text-dim)' }}>/ 100</span>
                </div>
                {analysis.confidence_interval && (
                  <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginTop: '6px' }}>
                    95% Confidence Interval: {analysis.confidence_interval.lower} — {analysis.confidence_interval.upper} (±{analysis.confidence_interval.margin})
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Classification Status
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '100px',
                    fontFamily: 'var(--mono)',
                    fontSize: '13px',
                    fontWeight: 700,
                    width: 'fit-content',
                    background: score >= 80 ? 'var(--verified-dim)' : score >= 50 ? 'rgba(224,185,78,0.14)' : 'var(--disputed-dim)',
                    color: score >= 80 ? 'var(--verified)' : score >= 50 ? 'var(--mislead)' : 'var(--disputed)',
                  }}
                >
                  <CheckCircle2 size={16} />
                  {score >= 80 ? 'VERIFIED ACCURACY' : score >= 50 ? 'MODERATE / CAUTION REQUIRED' : 'DISPUTED / LOW REPUTATION'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  Audit Details
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                  Claims Extracted: <strong>{analysis.claims?.length || 0}</strong>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--mono)', marginTop: '4px' }}>
                  Corroborating Sources: <strong>{analysis.corroborating_sources?.length || 0}</strong>
                </div>
              </div>
            </div>

            {/* Satire / Parody Notice */}
            {analysis.dimension_scores?.is_satire && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '16px 20px',
                  background: 'rgba(217, 169, 78, 0.12)',
                  border: '1px solid var(--brass)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <ShieldCheck size={26} color="var(--brass)" />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--brass)', fontSize: '15px' }}>
                    Satire & Parody Classification Confirmed
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    This content originates from a recognized satirical outlet or contains explicit parody disclaimers. Misinformation penalties have been adjusted accordingly.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              borderBottom: '1px solid var(--line)',
              marginBottom: '28px',
              paddingBottom: '2px',
            }}
          >
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'overview' ? '2px solid var(--brass)' : '2px solid transparent',
                color: activeTab === 'overview' ? 'var(--brass)' : 'var(--text-dim)',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FileText size={16} />
              Detailed Breakdown
            </button>

            <button
              onClick={() => setActiveTab('claims')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'claims' ? '2px solid var(--brass)' : '2px solid transparent',
                color: activeTab === 'claims' ? 'var(--brass)' : 'var(--text-dim)',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Layers size={16} />
              Extracted Claims ({analysis.claims?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('network')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'network' ? '2px solid var(--brass)' : '2px solid transparent',
                color: activeTab === 'network' ? 'var(--brass)' : 'var(--text-dim)',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Network size={16} />
              Interactive Network Graph
            </button>

            <button
              onClick={() => setActiveTab('social')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'social' ? '2px solid var(--brass)' : '2px solid transparent',
                color: activeTab === 'social' ? 'var(--brass)' : 'var(--text-dim)',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Radio size={16} />
              Social Echo Radar
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'audit' ? '2px solid var(--brass)' : '2px solid transparent',
                color: activeTab === 'audit' ? 'var(--brass)' : 'var(--text-dim)',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <BarChart3 size={16} />
              Dimensions & Source Audit
            </button>

            <button
              onClick={() => setActiveTab('json')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'json' ? '2px solid var(--brass)' : '2px solid transparent',
                color: activeTab === 'json' ? 'var(--brass)' : 'var(--text-dim)',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Database size={16} />
              Raw API JSON
            </button>
          </div>

          {/* TAB 1: OVERVIEW & CLAIMS */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Social Author Card */}
                {(analysis as any).social_author && (
                  <AuthorCard
                    platform={(analysis as any).social_author.platform}
                    handle={(analysis as any).social_author.handle}
                    displayName={(analysis as any).social_author.display_name}
                    verified={(analysis as any).social_author.verified}
                    followerCount={(analysis as any).social_author.follower_count}
                    accountCreatedAt={(analysis as any).social_author.account_created_at}
                    reputationScore={(analysis as any).social_author.reputation_score || 70.0}
                    reputationLabel={(analysis as any).social_author.reputation_label}
                    claimsCount={(analysis as any).social_author.claims_count || 1}
                  />
                )}

                {/* Audio / Voice Note Transcript Panel */}
                {(analysis.modality === 'audio' || (analysis as any).raw_text) && (
                  <div className="panel" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>🎙️</span>
                        <h3 style={{ fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 500, margin: 0, color: 'var(--text)' }}>
                          Voice Note & Speech Transcript
                        </h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', padding: '3px 10px', borderRadius: '100px', background: 'rgba(129,140,248,0.15)', color: '#818cf8', fontWeight: 600 }}>
                          Lang: {((analysis as any).language || 'EN').toUpperCase()}
                        </span>

                        <button
                          onClick={() => {
                            const summaryText = `🎙️ Credo Voice Note Fact-Check\n\nVERDICT: ${score >= 80 ? 'HIGHLY CREDIBLE' : score >= 50 ? 'CAUTION' : 'DISPUTED'} (${score.toFixed(1)}/100)\nTitle: "${analysis.title || 'Audio Statement'}"\nClaims Extracted: ${analysis.claims?.length || 0}`;
                            navigator.clipboard.writeText(summaryText);
                            alert('WhatsApp Low-Bandwidth Compact Summary copied to clipboard!');
                          }}
                          style={{
                            background: 'var(--surface-2)',
                            border: '1px solid var(--line)',
                            color: 'var(--brass)',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontFamily: 'var(--mono)',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Copy WhatsApp Compact Summary
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--surface-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)', fontFamily: 'var(--mono)' }}>
                      {(analysis as any).raw_text || analysis.title}
                    </div>
                  </div>
                )}

                {/* Reasoning Chain summary */}
                {analysis.reasoning_chain && (
                  <div className="panel" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                    <h3 style={{ fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 500, marginBottom: '12px', color: 'var(--text)' }}>
                      Verification Executive Reasoning
                    </h3>
                    <p style={{ fontSize: '15px', color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: '12px' }}>
                      {analysis.reasoning_chain.summary}
                    </p>
                    {analysis.reasoning_chain.source_reputation_notes && (
                      <div style={{ fontSize: '13px', fontFamily: 'var(--mono)', color: 'var(--brass)', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                        Source Note: {analysis.reasoning_chain.source_reputation_notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Rhetorical Manipulation Tactics */}
                {analysis.reasoning_chain?.detected_manipulation_tactics && analysis.reasoning_chain.detected_manipulation_tactics.length > 0 && (
                  <div className="panel" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                    <h3 style={{ fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 500, marginBottom: '14px', color: 'var(--disputed)' }}>
                      ⚠️ Rhetorical Manipulation Tactics Detected ({analysis.reasoning_chain.detected_manipulation_tactics.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {analysis.reasoning_chain.detected_manipulation_tactics.map((tactic, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                          <span
                            style={{
                              padding: '4px 10px',
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
                          <span style={{ fontSize: '14px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                            {tactic.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Granular Per-Claim Breakdown Cards */}
                {analysis.claims && analysis.claims.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: 'var(--serif)', fontSize: '22px', fontWeight: 500, marginBottom: '16px' }}>
                      Key Claims & Fact Verification
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {analysis.claims.map((claim, idx) => {
                        const isSupp = claim.verdict === 'supported';
                        const isContra = claim.verdict === 'contradicted';
                        const verdictColor = isSupp ? 'var(--verified)' : isContra ? 'var(--disputed)' : 'var(--mislead)';
                        const verdictBg = isSupp ? 'var(--verified-dim)' : isContra ? 'var(--disputed-dim)' : 'rgba(224,185,78,0.14)';

                        return (
                          <div
                            key={claim.id || idx}
                            className="panel"
                            style={{
                              padding: '20px',
                              background: 'var(--surface)',
                              borderRadius: '12px',
                              border: '1px solid var(--line)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span
                                  style={{
                                    padding: '4px 12px',
                                    borderRadius: '100px',
                                    fontSize: '11px',
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
                                  <span style={{ fontSize: '12.5px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                                    Speaker: <strong style={{ color: 'var(--text)' }}>{claim.extracted_speaker}</strong>
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--brass)', fontWeight: 600 }}>
                                {claim.confidence_score.toFixed(0)}% Confidence
                              </span>
                            </div>

                            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px', lineHeight: 1.4 }}>
                              "{claim.claim_text}"
                            </div>

                            <p style={{ fontSize: '14px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                              <strong style={{ color: 'var(--text)' }}>Evidence Summary:</strong> {claim.evidence_summary}
                            </p>

                            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => {
                                  setSelectedClaimForMutation(claim.id);
                                  setShowMutationModal(true);
                                }}
                                style={{
                                  background: 'var(--surface)',
                                  border: '1px solid var(--line)',
                                  color: 'var(--brass)',
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontFamily: 'var(--mono)',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <GitBranch size={13} />
                                Mutation Lineage
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedClaimForDebate({ id: claim.id, text: claim.claim_text });
                                  setShowDebateModal(true);
                                }}
                                style={{
                                  background: 'var(--surface)',
                                  border: '1px solid var(--line)',
                                  color: '#818cf8',
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontFamily: 'var(--mono)',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <Scale size={13} />
                                Debate Mode (3-Pass Audit)
                              </button>

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
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontFamily: 'var(--mono)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <MessageSquare size={13} />
                                Suggest Correction / Submit Community Evidence
                              </button>
                            </div>

                            {activeClaimForEvidence?.id === claim.id && (
                              <form
                                onSubmit={handleEvidenceSubmit}
                                style={{
                                  marginTop: '14px',
                                  padding: '16px',
                                  background: 'var(--surface-2)',
                                  borderRadius: '10px',
                                  border: '1px solid var(--line-strong)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px',
                                }}
                              >
                                <div style={{ fontSize: '13px', fontFamily: 'var(--mono)', color: 'var(--brass)', fontWeight: 600 }}>
                                  Submit Community Counter-Evidence
                                </div>

                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Proposed Verdict:</span>
                                  <select
                                    value={proposedVerdict}
                                    onChange={(e) => setProposedVerdict(e.target.value as any)}
                                    style={{
                                      background: 'var(--surface)',
                                      color: 'var(--text)',
                                      border: '1px solid var(--line)',
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      fontSize: '12.5px',
                                      fontFamily: 'var(--mono)',
                                    }}
                                  >
                                    <option value="supported">Supported / Accurate</option>
                                    <option value="contradicted">Contradicted / False</option>
                                    <option value="unverified">Unverified / Context Needed</option>
                                  </select>
                                </div>

                                <textarea
                                  placeholder="Detail specific primary evidence, academic papers, or context..."
                                  value={evidenceText}
                                  onChange={(e) => setEvidenceText(e.target.value)}
                                  rows={3}
                                  style={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--line)',
                                    borderRadius: '6px',
                                    padding: '10px 12px',
                                    color: 'var(--text)',
                                    fontSize: '13.5px',
                                    outline: 'none',
                                  }}
                                  required
                                />

                                <input
                                  type="url"
                                  placeholder="Reference Source URL (e.g. https://...)"
                                  value={evidenceUrl}
                                  onChange={(e) => setEvidenceUrl(e.target.value)}
                                  style={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--line)',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    color: 'var(--text)',
                                    fontSize: '13px',
                                    outline: 'none',
                                  }}
                                />

                                {evidenceFeedback && (
                                  <div
                                    style={{
                                      fontSize: '12.5px',
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
                                      padding: '6px 14px',
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
                                      padding: '6px 16px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: 700,
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
              </div>

              {/* Sidebar Column: References & Cross-lingual info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Cross-Lingual NLP Card */}
                <div className="panel" style={{ padding: '20px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                  <h4 style={{ fontFamily: 'var(--serif)', fontSize: '16px', fontWeight: 500, marginBottom: '8px', color: 'var(--brass)' }}>
                    🌐 Multi-Language Verification Pipeline
                  </h4>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', marginBottom: '14px', lineHeight: 1.4 }}>
                    Credo automatically detects local dialects and non-English claims, translating semantics before cross-checking global databases.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface-2)', borderRadius: '6px' }}>
                      <span>Input Dialect</span>
                      <strong style={{ color: 'var(--text)' }}>Auto-Detected</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface-2)', borderRadius: '6px' }}>
                      <span>Translation Layer</span>
                      <strong style={{ color: 'var(--verified)' }}>Active</strong>
                    </div>
                  </div>
                </div>

                {/* Related Claims Panel (Vector Cosine Similarity Clustering) */}
                {relatedClaims.length > 0 && (
                  <div className="panel" style={{ padding: '20px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                    <h4 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 500, marginBottom: '6px', color: 'var(--brass)' }}>
                      🔗 Related Claims Across Network ({relatedClaims.length})
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '14px', lineHeight: 1.4 }}>
                      Similar assertions made across other analyzed content items detected via pgvector semantic clustering.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {relatedClaims.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '12px',
                            background: 'var(--surface-2)',
                            borderRadius: '8px',
                            border: '1px solid var(--line)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                fontFamily: 'var(--mono)',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                background: item.verdict === 'supported' ? 'var(--verified-dim)' : item.verdict === 'contradicted' ? 'var(--disputed-dim)' : 'rgba(224,185,78,0.14)',
                                color: item.verdict === 'supported' ? 'var(--verified)' : item.verdict === 'contradicted' ? 'var(--disputed)' : 'var(--mislead)',
                              }}
                            >
                              {item.verdict}
                            </span>
                            <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--brass)' }}>
                              {(item.similarity_score * 100).toFixed(0)}% Similar
                            </span>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0, lineHeight: 1.4 }}>
                            "{item.claim_text}"
                          </p>
                          {item.extracted_speaker && (
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                              Speaker: {item.extracted_speaker}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Corroborating References */}
                {analysis.corroborating_sources && analysis.corroborating_sources.length > 0 && (
                  <div className="panel" style={{ padding: '20px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)' }}>
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
                            padding: '12px',
                            background: 'var(--surface-2)',
                            borderRadius: '8px',
                            border: '1px solid var(--line)',
                            textDecoration: 'none',
                            transition: 'border-color 0.2s ease',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px', lineHeight: 1.3 }}>{item.title}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', marginTop: '4px' }}>
                              {item.source} · {item.provider}
                            </div>
                          </div>
                          <ExternalLink size={14} color="var(--text-dim)" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CLAIMS ONLY */}
          {activeTab === 'claims' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: '22px', fontWeight: 500 }}>
                Extracted Assertions & Verification Details
              </h3>
              {analysis.claims?.map((claim, idx) => (
                <div
                  key={claim.id || idx}
                  className="panel"
                  style={{
                    padding: '24px',
                    background: 'var(--surface)',
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '100px',
                        fontSize: '11px',
                        fontFamily: 'var(--mono)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: claim.verdict === 'supported' ? 'var(--verified-dim)' : claim.verdict === 'contradicted' ? 'var(--disputed-dim)' : 'rgba(224,185,78,0.14)',
                        color: claim.verdict === 'supported' ? 'var(--verified)' : claim.verdict === 'contradicted' ? 'var(--disputed)' : 'var(--mislead)',
                      }}
                    >
                      {claim.verdict}
                    </span>
                    <span style={{ fontSize: '12.5px', fontFamily: 'var(--mono)', color: 'var(--brass)' }}>
                      Confidence Score: {claim.confidence_score.toFixed(0)}%
                    </span>
                  </div>
                  <h4 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                    "{claim.claim_text}"
                  </h4>
                  <p style={{ fontSize: '14px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                    <strong>Evidence:</strong> {claim.evidence_summary}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: INTERACTIVE NETWORK GRAPH */}
          {activeTab === 'network' && analysis && (
            <ClaimNetworkGraph analysis={analysis} />
          )}

          {/* TAB 4: SOCIAL MEDIA ECHO RADAR */}
          {activeTab === 'social' && analysis && (
            <SocialEchoRadar analysis={analysis} />
          )}

          {/* TAB 5: DIMENSIONS & SOURCE AUDIT */}
          {activeTab === 'audit' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
              {/* Scoring Dimensions */}
              {analysis.dimension_scores && (
                <div className="panel" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 500, marginBottom: '20px' }}>
                    Independent Scoring Dimension Meters
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                      <span className="demo-row-label">Temporal Consistency</span>
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
                      <span className="demo-row-label">Bias Spectrum</span>
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

              {/* Source & Model Provenance */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="panel" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
                    Model & Engine Audit Provenance
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'var(--mono)', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Engine Model Version</span>
                      <span style={{ color: 'var(--brass)', fontWeight: 600 }}>{analysis.model_version}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Analysis Timestamp</span>
                      <span>{new Date(analysis.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Status</span>
                      <span style={{ color: 'var(--verified)' }}>Complete</span>
                    </div>
                  </div>
                </div>

                {/* Retraction Watchdog Monitor Card */}
                <div className="panel" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 500, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={20} color="var(--brass)" />
                    Retraction Watchdog Monitor
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '14px', lineHeight: 1.4 }}>
                    Credo background workers continuously recheck cited source URLs for post-publication retractions, 404 removals, or editor's notes.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--mono)', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Watchdog Status</span>
                      <strong style={{ color: analysis.has_flagged_source_update ? 'var(--disputed)' : 'var(--verified)' }}>
                        {analysis.has_flagged_source_update ? 'FLAGGED SOURCE UPDATE' : 'ACTIVE / NO RETRACTIONS'}
                      </strong>
                    </div>
                    {analysis.flagged_sources && analysis.flagged_sources.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        {analysis.flagged_sources.map((src: any, i: number) => (
                          <div key={i} style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--disputed)', borderRadius: '6px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--disputed)', marginBottom: '4px' }}>
                              Status: {src.status.toUpperCase()}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text)', wordBreak: 'break-all' }}>{src.source_url}</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '4px' }}>{src.update_notes}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RAW JSON */}
          {activeTab === 'json' && (
            <div className="panel" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 500 }}>
                  Developer API JSON Response
                </h3>
                <button
                  onClick={copyJsonToClipboard}
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'var(--mono)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {copiedJson ? <Check size={14} color="var(--verified)" /> : <Copy size={14} />}
                  {copiedJson ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>

              <pre
                style={{
                  background: 'var(--ink)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '20px',
                  color: '#4ade80',
                  fontFamily: 'var(--mono)',
                  fontSize: '12.5px',
                  overflowX: 'auto',
                  maxHeight: '600px',
                }}
              >
                {JSON.stringify(analysis, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Model Changelog Modal */}
      <ModelVersionChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />

      {/* Embed Badge & Publisher Widget Modal */}
      {analysis && (
        <EmbedWidgetModal
          isOpen={showEmbedModal}
          onClose={() => setShowEmbedModal(false)}
          analysis={analysis}
        />
      )}

      {/* Signed Credibility Receipt Modal */}
      {analysis && (
        <CredibilityReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          analysis={analysis}
        />
      )}

      {/* Social Infographic & Debunk Card Modal */}
      {analysis && (
        <DebunkCardModal
          isOpen={showDebunkModal}
          onClose={() => setShowDebunkModal(false)}
          analysis={analysis}
        />
      )}

      {/* Claim Mutation Lineage Modal */}
      {selectedClaimForMutation && (
        <ClaimMutationModal
          isOpen={showMutationModal}
          onClose={() => {
            setShowMutationModal(false);
            setSelectedClaimForMutation(null);
          }}
          claimId={selectedClaimForMutation}
        />
      )}

      {/* Advocate / Skeptic Debate Mode Modal */}
      {selectedClaimForDebate && (
        <DebateModeModal
          isOpen={showDebateModal}
          onClose={() => {
            setShowDebateModal(false);
            setSelectedClaimForDebate(null);
          }}
          claimId={selectedClaimForDebate.id}
          claimText={selectedClaimForDebate.text}
        />
      )}
    </div>
  );
};
