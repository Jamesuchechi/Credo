import React, { useEffect, useState, useMemo } from 'react';
import {
  Globe,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';
import { fetchSources } from '../api/client';
import { SourcesListResponse, SourceListItem } from '../types';

export const SourcesPage: React.FC = () => {
  const [data, setData] = useState<SourcesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Filters, search & inspection
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'trusted' | 'flagged' | 'satire'>('all');
  const [sortBy, setSortBy] = useState<'score_desc' | 'score_asc' | 'name'>('score_desc');
  const [selectedSource, setSelectedSource] = useState<SourceListItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSources(page)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load sources');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  // Client-side filtering & sorting
  const filteredSources = useMemo(() => {
    if (!data?.items) return [];
    let items = [...data.items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (s) => s.name.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q)
      );
    }

    if (filterCategory === 'trusted') {
      items = items.filter((s) => s.score >= 70);
    } else if (filterCategory === 'flagged') {
      items = items.filter((s) => s.score < 50 || s.trend_label.toLowerCase().includes('misinfo'));
    } else if (filterCategory === 'satire') {
      items = items.filter((s) => s.trend_label.toLowerCase().includes('satire'));
    }

    items.sort((a, b) => {
      if (sortBy === 'score_desc') return b.score - a.score;
      if (sortBy === 'score_asc') return a.score - b.score;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return items;
  }, [data, searchQuery, filterCategory, sortBy]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    if (!data?.items || data.items.length === 0) {
      return { total: 0, highTrust: 0, flaggedCount: 0, avgScore: 0 };
    }
    const total = data.total || data.items.length;
    const highTrust = data.items.filter((s) => s.score >= 75).length;
    const flaggedCount = data.items.filter((s) => s.score < 50).length;
    const avgScore = Math.round(data.items.reduce((acc, s) => acc + s.score, 0) / data.items.length);

    return { total, highTrust, flaggedCount, avgScore };
  }, [data]);

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 600, margin: 0 }}>
          Source Intelligence & Publisher Index
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
          Historical track records, WHOIS domain age metadata, and bias rating metrics for news outlets and publishers.
        </p>
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
            <Globe size={20} color="var(--brass)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Monitored Outlets
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
              High Trust Rate
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--verified)', marginTop: '2px' }}>
              {metrics.highTrust} Outlets
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
              Flagged Outlets
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--disputed)', marginTop: '2px' }}>
              {metrics.flaggedCount}
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
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="var(--brass)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Avg Trust Index
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              {metrics.avgScore}%
            </div>
          </div>
        </div>
      </div>

      {/* Controls: Search, Category Filter, Sort */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px', background: 'var(--surface-2)', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--line)' }}>
          <Search size={16} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="Search domain (e.g. bbc.com) or publication name..."
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(['all', 'trusted', 'flagged', 'satire'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                background: filterCategory === cat ? 'var(--brass)' : 'transparent',
                color: filterCategory === cat ? 'var(--ink)' : 'var(--text-dim)',
                border: filterCategory === cat ? 'none' : '1px solid var(--line)',
                borderRadius: '100px',
                padding: '4px 12px',
                fontSize: '11.5px',
                fontFamily: 'var(--mono)',
                fontWeight: filterCategory === cat ? 700 : 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

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
            <option value="score_desc">Highest Accuracy</option>
            <option value="score_asc">Lowest Accuracy</option>
            <option value="name">Name (A-Z)</option>
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

      {/* Source Cards Grid */}
      {loading && !data ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
          <Sparkles size={24} color="var(--brass)" style={{ animation: 'spin 2s linear infinite', marginBottom: '12px' }} />
          <div>Querying publisher reputation index...</div>
        </div>
      ) : filteredSources.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--line)' }}>
          <Globe size={40} color="var(--text-faint)" style={{ marginBottom: '14px' }} />
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '20px', margin: '0 0 8px 0' }}>No Sources Found</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: 0 }}>
            No publisher entries match your current search or category filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {filteredSources.map((source) => {
            const isHigh = source.score >= 75;
            const isLow = source.score < 50;
            const scoreColor = isHigh ? 'var(--verified)' : isLow ? 'var(--disputed)' : 'var(--brass)';
            const scoreBg = isHigh ? 'var(--verified-dim)' : isLow ? 'var(--disputed-dim)' : 'rgba(217,169,78,0.14)';

            return (
              <div
                key={source.id}
                onClick={() => setSelectedSource(source)}
                style={{
                  padding: '20px',
                  background: 'var(--surface)',
                  borderRadius: '14px',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
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
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'var(--surface-2)',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--brass)',
                        }}
                      >
                        <Globe size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{source.name}</div>
                        <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{source.domain}</div>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '100px',
                        fontSize: '11px',
                        fontFamily: 'var(--mono)',
                        fontWeight: 700,
                        background: scoreBg,
                        color: scoreColor,
                      }}
                    >
                      {source.score.toFixed(0)} / 100
                    </span>
                  </div>

                  {/* Accuracy Bar */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', marginBottom: '4px' }}>
                      <span>Historical Reliability</span>
                      <span>{source.score.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '5px', width: '100%', background: 'var(--surface-2)', borderRadius: '100px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.max(0, source.score))}%`,
                          background: scoreColor,
                          borderRadius: '100px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                  <span style={{ fontSize: '11.5px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                    Rating: <strong style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{source.trend_label}</strong>
                  </span>
                  <span style={{ fontSize: '11.5px', fontFamily: 'var(--mono)', color: 'var(--brass)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Inspect <ChevronRight size={14} />
                  </span>
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

      {/* Source Detail Modal */}
      {selectedSource && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedSource(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Globe size={24} color="var(--brass)" />
                <div>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: '20px', margin: 0 }}>{selectedSource.name}</h3>
                  <div style={{ fontSize: '12.5px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{selectedSource.domain}</div>
                </div>
              </div>
              <button onClick={() => setSelectedSource(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Accuracy Rating:</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '18px', fontWeight: 700, color: selectedSource.score >= 75 ? 'var(--verified)' : 'var(--brass)' }}>
                  {selectedSource.score.toFixed(0)}% ({selectedSource.trend_label})
                </span>
              </div>

              <div style={{ padding: '14px', background: 'var(--surface-2)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text)' }}>Source Audit Summary:</strong> {selectedSource.name} ({selectedSource.domain}) is indexed in Credo's global domain intelligence repository. Its factual accuracy score is updated continuously based on corroborating cross-checks across international news wires.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedSource(null)}
                style={{
                  background: 'var(--brass)',
                  color: 'var(--ink)',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};