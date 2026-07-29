import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Globe,
  Video,
  Search,
  ShieldCheck,
  AlertTriangle,
  Activity,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { fetchContentList } from '../api/client';
import { ContentListResponse } from '../types';
import { AnalysisModal } from '../components/AnalysisModal';

const iconMap: Record<string, React.ElementType> = {
  url: Globe,
  text: FileText,
  video: Video,
};

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ContentListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'disputed' | 'mixed'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'score' | 'claims'>('newest');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchContentList(page)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load history');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  // Client-side filtering & sorting for maximum responsiveness
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    let items = [...data.items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.raw_payload && i.raw_payload.toLowerCase().includes(q)) ||
          (i.source_domain && i.source_domain.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      items = items.filter((i) => i.verdict === statusFilter);
    }

    items.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'score') return (b.composite_score || 0) - (a.composite_score || 0);
      if (sortBy === 'claims') return (b.claims_count || 0) - (a.claims_count || 0);
      return 0;
    });

    return items;
  }, [data, searchQuery, statusFilter, sortBy]);

  // Aggregate Metrics Summary
  const metrics = useMemo(() => {
    if (!data?.items || data.items.length === 0) {
      return { total: 0, avgScore: 0, verifiedCount: 0, disputedCount: 0 };
    }
    const total = data.total || data.items.length;
    const scoredItems = data.items.filter((i) => i.composite_score !== null);
    const avgScore = scoredItems.length
      ? Math.round(scoredItems.reduce((acc, i) => acc + (i.composite_score || 0), 0) / scoredItems.length)
      : 0;
    const verifiedCount = data.items.filter((i) => i.verdict === 'verified').length;
    const disputedCount = data.items.filter((i) => i.verdict === 'disputed').length;

    return { total, avgScore, verifiedCount, disputedCount };
  }, [data]);

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header & Breadcrumb Navigation */}
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
              transition: 'background 0.2s ease',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 600, margin: 0 }}>
              Analysis History & Audit Trail
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              Comprehensive log of past fact-checks, multi-modal claims, and automated credibility evaluations.
            </p>
          </div>
        </div>
      </header>

      {/* Analytics KPI Metric Cards Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(217,169,78,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={20} color="var(--brass)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Evaluated
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              {metrics.total}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--verified-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} color="var(--verified)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Avg Factual Score
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--verified)', marginTop: '2px' }}>
              {metrics.avgScore}%
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--verified-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={20} color="var(--verified)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Verified Claims
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              {metrics.verifiedCount}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--disputed-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={20} color="var(--disputed)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Disputed Content
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--disputed)', marginTop: '2px' }}>
              {metrics.disputedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filtering Options */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          background: 'var(--surface)',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid var(--line)',
          marginBottom: '24px',
        }}
      >
        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px', background: 'var(--surface-2)', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--line)' }}>
          <Search size={16} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="Search claims, titles, or domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontSize: '13.5px',
              outline: 'none',
              width: '100%',
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginRight: '4px' }}>
            Verdict:
          </span>
          {(['all', 'verified', 'disputed', 'mixed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                background: statusFilter === st ? 'var(--brass)' : 'transparent',
                color: statusFilter === st ? 'var(--ink)' : 'var(--text-dim)',
                border: statusFilter === st ? 'none' : '1px solid var(--line)',
                borderRadius: '100px',
                padding: '4px 12px',
                fontSize: '11.5px',
                fontFamily: 'var(--mono)',
                fontWeight: statusFilter === st ? 700 : 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease',
              }}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlidersHorizontal size={14} color="var(--text-dim)" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12.5px',
              fontFamily: 'var(--mono)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="newest">Sort: Most Recent</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="score">Sort: Highest Score</option>
            <option value="claims">Sort: Most Claims</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ background: 'var(--disputed-dim)', border: '1px solid var(--disputed)', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, color: 'var(--disputed)', fontSize: '14px' }}>{error}</p>
          <button onClick={() => setPage((p) => p)} style={{ background: 'var(--disputed)', color: 'var(--ink)', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
            Retry
          </button>
        </div>
      )}

      {/* Main Content Item List */}
      {loading && !data ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
          <Sparkles size={24} color="var(--brass)" style={{ animation: 'spin 2s linear infinite', marginBottom: '12px' }} />
          <div>Retrieving audit trail records...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--line)' }}>
          <Globe size={40} color="var(--text-faint)" style={{ marginBottom: '14px' }} />
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '20px', margin: '0 0 8px 0' }}>No Analyses Found</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: 0 }}>
            {searchQuery || statusFilter !== 'all'
              ? 'No historical evaluations match your search filter criteria.'
              : 'Submit your first URL or text snippet to begin generating credibility assessments.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredItems.map((item) => {
            const isSupp = item.verdict === 'verified';
            const isDis = item.verdict === 'disputed';
            const vColor = isSupp ? 'var(--verified)' : isDis ? 'var(--disputed)' : 'var(--mislead)';
            const vBg = isSupp ? 'var(--verified-dim)' : isDis ? 'var(--disputed-dim)' : 'rgba(224,185,78,0.14)';
            const Icon = iconMap[item.source_domain ? 'url' : 'text'] || FileText;
            const displayTitle = item.title || (item.raw_payload ? (item.raw_payload.length > 70 ? item.raw_payload.slice(0, 70) + '...' : item.raw_payload) : 'Analysis Item');

            return (
              <div
                key={item.id}
                onClick={() => setActiveAnalysisId(item.id)}
                style={{
                  padding: '20px 24px',
                  background: 'var(--surface)',
                  borderRadius: '14px',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--brass)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brass)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      "{displayTitle}"
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-faint)' }}>
                      {item.source_domain && (
                        <span style={{ color: 'var(--brass)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Globe size={12} /> {item.source_domain}
                        </span>
                      )}
                      <span>· {item.claims_count} claim{item.claims_count !== 1 ? 's' : ''} extracted</span>
                      <span>· {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                  {item.composite_score !== null && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--mono)', color: vColor }}>
                        {item.composite_score.toFixed(0)}%
                      </div>
                      <div style={{ fontSize: '10.5px', fontFamily: 'var(--mono)', color: 'var(--text-faint)' }}>
                        Credibility Score
                      </div>
                    </div>
                  )}

                  {item.verdict && (
                    <span
                      style={{
                        padding: '5px 12px',
                        borderRadius: '100px',
                        fontSize: '11px',
                        fontFamily: 'var(--mono)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: vBg,
                        color: vColor,
                      }}
                    >
                      {item.verdict}
                    </span>
                  )}

                  <ChevronRight size={18} color="var(--text-faint)" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
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
            Previous Page
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
            Next Page
          </button>
        </div>
      )}

      {/* Deep-Dive Analysis Modal */}
      <AnalysisModal contentId={activeAnalysisId} onClose={() => setActiveAnalysisId(null)} />
    </div>
  );
};