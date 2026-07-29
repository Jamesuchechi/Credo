import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ExternalLink,
  Award,
  Clock,
  TrendingUp,
  Search,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import { fetchReviewQueue, reviewCorrection, fetchLeaderboard } from '../api/client';
import { ReviewQueueListResponse, LeaderboardResponse, ReviewQueueItem } from '../types';

export const ReviewQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ReviewQueueListResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<'all' | 'disputed' | 'supported' | 'unverified'>('all');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const [queueRes, leadRes] = await Promise.all([
        fetchReviewQueue(page),
        fetchLeaderboard(),
      ]);
      setData(queueRes);
      setLeaderboard(leadRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [page]);

  const handleDecision = async (item: ReviewQueueItem, decision: 'approved' | 'rejected') => {
    setReviewingId(item.correction_id);
    setActionFeedback(null);
    try {
      const notes = reviewNotes[item.correction_id] || '';
      await reviewCorrection(item.correction_id, decision, notes);
      setActionFeedback(`Correction for "${item.claim_text.slice(0, 30)}..." ${decision} successfully!`);
      loadQueue();
    } catch (err: any) {
      setActionFeedback(err.message || 'Action failed');
    } finally {
      setReviewingId(null);
    }
  };

  // Filter queue items locally
  const filteredQueue = useMemo(() => {
    if (!data?.items) return [];
    let items = [...data.items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.claim_text.toLowerCase().includes(q) ||
          i.evidence_text.toLowerCase().includes(q) ||
          i.contributor_name.toLowerCase().includes(q)
      );
    }

    if (verdictFilter !== 'all') {
      items = items.filter((i) => i.proposed_verdict === verdictFilter);
    }

    return items;
  }, [data, searchQuery, verdictFilter]);

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 600, margin: 0 }}>
              Expert Review & Verification Queue
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              Inspect crowdsourced evidence, evaluate proposed verdict corrections, and maintain model accuracy.
            </p>
          </div>
        </div>
      </header>

      {/* KPI Metrics Summary Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(217,169,78,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} color="var(--brass)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Pending Reviews
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              {data?.total || 0} Items
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--verified-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileCheck size={20} color="var(--verified)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Active Experts
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--verified)', marginTop: '2px' }}>
              {leaderboard?.items.length || 0} Registered
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={20} color="var(--brass)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Weighting Boost
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              +15.0 pts
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(217,169,78,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={20} color="var(--brass)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Top Contributor
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--brass)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {leaderboard?.items[0]?.full_name || 'Community Leader'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionFeedback && (
        <div
          style={{
            padding: '14px 20px',
            background: actionFeedback.includes('successfully') ? 'var(--verified-dim)' : 'var(--disputed-dim)',
            border: `1px solid ${actionFeedback.includes('successfully') ? 'var(--verified)' : 'var(--disputed)'}`,
            borderRadius: '10px',
            fontSize: '13.5px',
            marginBottom: '24px',
            color: actionFeedback.includes('successfully') ? 'var(--verified)' : 'var(--disputed)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {error && (
        <div style={{ background: 'var(--disputed-dim)', border: '1px solid var(--disputed)', borderRadius: '10px', padding: '14px 20px', marginBottom: '24px', color: 'var(--disputed)', fontSize: '13.5px' }}>
          {error}
        </div>
      )}

      {/* Main Grid: Queue on Left, Leaderboard Rail on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px', alignItems: 'start' }}>
        {/* Left Side: Controls & Review Items */}
        <div>
          {/* Controls Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              background: 'var(--surface)',
              padding: '14px 18px',
              borderRadius: '12px',
              border: '1px solid var(--line)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, background: 'var(--surface-2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <Search size={14} color="var(--text-dim)" />
              <input
                type="text"
                placeholder="Search claim text or contributor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {(['all', 'disputed', 'supported', 'unverified'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVerdictFilter(v)}
                  style={{
                    background: verdictFilter === v ? 'var(--brass)' : 'transparent',
                    color: verdictFilter === v ? 'var(--ink)' : 'var(--text-dim)',
                    border: verdictFilter === v ? 'none' : '1px solid var(--line)',
                    borderRadius: '100px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    fontWeight: verdictFilter === v ? 700 : 500,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Queue Items List */}
          {loading && !data ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
              <Sparkles size={24} color="var(--brass)" style={{ animation: 'spin 2s linear infinite', marginBottom: '12px' }} />
              <div>Fetching pending evidence reviews...</div>
            </div>
          ) : filteredQueue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '70px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--line)' }}>
              <ShieldCheck size={44} color="var(--verified)" style={{ marginBottom: '14px' }} />
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: '22px', margin: '0 0 8px 0' }}>
                Review Queue Clear
              </h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: 0, maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                All submitted community evidence and verdict corrections have been verified by subject-matter experts.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredQueue.map((item) => {
                const origIsSupp = item.original_verdict === 'supported';
                const origIsDis = item.original_verdict === 'contradicted';
                const origColor = origIsSupp ? 'var(--verified)' : origIsDis ? 'var(--disputed)' : 'var(--mislead)';

                const propIsSupp = item.proposed_verdict === 'supported';
                const propIsDis = item.proposed_verdict === 'contradicted';
                const propColor = propIsSupp ? 'var(--verified)' : propIsDis ? 'var(--disputed)' : 'var(--brass)';

                return (
                  <div
                    key={item.correction_id}
                    style={{
                      padding: '24px',
                      background: 'var(--surface)',
                      borderRadius: '16px',
                      border: '1px solid var(--line)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    }}
                  >
                    {/* Contributor Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--brass)',
                            color: 'var(--ink)',
                            fontWeight: 700,
                            fontFamily: 'var(--mono)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                          }}
                        >
                          {item.contributor_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                            {item.contributor_name}
                          </div>
                          <div style={{ fontSize: '11.5px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'capitalize' }}>
                            Role: <strong style={{ color: 'var(--brass)' }}>{item.contributor_role}</strong> · Reputation: {item.contributor_reputation.toFixed(0)} pts
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '11.5px', fontFamily: 'var(--mono)', color: 'var(--text-faint)' }}>
                        Submitted {new Date(item.submitted_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Verdict Comparison Banner */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'var(--mono)',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '100px',
                          background: 'var(--surface-2)',
                          color: origColor,
                          border: '1px solid var(--line)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Original: {item.original_verdict}
                      </span>
                      <span style={{ color: 'var(--brass)', fontWeight: 700 }}>→</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'var(--mono)',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '100px',
                          background: 'rgba(217,169,78,0.14)',
                          color: propColor,
                          border: '1px solid var(--brass)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Proposed: {item.proposed_verdict}
                      </span>
                    </div>

                    {/* Disputed Claim Text */}
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '14px', lineHeight: 1.4 }}>
                      "{item.claim_text}"
                    </div>

                    {/* Submitted Evidence Text */}
                    <div style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--line)', marginBottom: '18px' }}>
                      <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--brass)', marginBottom: '6px', fontWeight: 600 }}>
                        Submitted Evidence & Reasoning
                      </div>
                      <p style={{ fontSize: '14px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.6 }}>
                        {item.evidence_text}
                      </p>

                      {item.evidence_urls && item.evidence_urls.length > 0 && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {item.evidence_urls.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '12px',
                                fontFamily: 'var(--mono)',
                                color: 'var(--brass)',
                                background: 'var(--surface)',
                                border: '1px solid var(--line)',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <ExternalLink size={12} /> {url}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Review Decision Controls */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Optional expert review reasoning notes..."
                        value={reviewNotes[item.correction_id] || ''}
                        onChange={(e) => setReviewNotes({ ...reviewNotes, [item.correction_id]: e.target.value })}
                        style={{
                          flex: 1,
                          background: 'var(--surface-2)',
                          border: '1px solid var(--line)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          color: 'var(--text)',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />

                      <button
                        onClick={() => handleDecision(item, 'approved')}
                        disabled={reviewingId === item.correction_id}
                        style={{
                          background: 'var(--verified)',
                          color: 'var(--ink)',
                          border: 'none',
                          padding: '10px 18px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          opacity: reviewingId === item.correction_id ? 0.6 : 1,
                        }}
                      >
                        <CheckCircle2 size={16} /> Approve
                      </button>

                      <button
                        onClick={() => handleDecision(item, 'rejected')}
                        disabled={reviewingId === item.correction_id}
                        style={{
                          background: 'var(--disputed)',
                          color: 'var(--ink)',
                          border: 'none',
                          padding: '10px 18px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          opacity: reviewingId === item.correction_id ? 0.6 : 1,
                        }}
                      >
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '32px', fontFamily: 'var(--mono)', fontSize: '13px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  color: 'var(--text)',
                  cursor: page <= 1 ? 'default' : 'pointer',
                  opacity: page <= 1 ? 0.4 : 1,
                }}
              >
                Previous
              </button>
              <span style={{ color: 'var(--text-dim)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  color: 'var(--text)',
                  cursor: page >= totalPages ? 'default' : 'pointer',
                  opacity: page >= totalPages ? 0.4 : 1,
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Leaderboard Panel */}
        <div>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--line)' }}>
              <Award size={20} color="var(--brass)" />
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: 0 }}>
                Top Contributors
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {leaderboard?.items.map((contributor, rank) => {
                const isTop1 = rank === 0;
                const crownColor = isTop1 ? '#D9A94E' : rank === 1 ? '#C0C0C0' : rank === 2 ? '#CD7F32' : 'var(--text-faint)';

                return (
                  <div
                    key={contributor.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: 'var(--surface-2)',
                      borderRadius: '10px',
                      border: isTop1 ? '1px solid var(--brass)' : '1px solid var(--line)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: crownColor,
                          width: '20px',
                        }}
                      >
                        #{rank + 1}
                      </span>

                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>
                          {contributor.full_name || 'Contributor'}
                        </div>
                        <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'capitalize' }}>
                          {contributor.role} · {contributor.verified_submissions_count} verified
                        </div>
                      </div>
                    </div>

                    <span style={{ fontFamily: 'var(--mono)', fontSize: '14px', fontWeight: 700, color: 'var(--brass)' }}>
                      {contributor.reputation_score.toFixed(0)} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
