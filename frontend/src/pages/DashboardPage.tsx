import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  ShieldCheck,
  Clock,
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  FileText,
  Sparkles,
  ChevronRight,
  Globe,
  Award,
  Key,
  Network,
  History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchDashboardSummary, fetchContentList, fetchSources } from '../api/client';
import { ThemeToggle } from '../components/ThemeToggle';
import { DashboardSummaryResponse, ContentListResponse, SourcesListResponse } from '../types';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [analyses, setAnalyses] = useState<ContentListResponse | null>(null);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [analysesError, setAnalysesError] = useState<string | null>(null);

  const [sources, setSources] = useState<SourcesListResponse | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Load Summary
    fetchDashboardSummary()
      .then((d) => {
        if (!cancelled) setSummary(d);
      })
      .catch((err) => {
        if (!cancelled) setSummaryError(err.message || 'Failed to load summary');
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    // Load Recent 5 Analyses for Dashboard Stream
    fetchContentList(1, 5)
      .then((d) => {
        if (!cancelled) setAnalyses(d);
      })
      .catch((err) => {
        if (!cancelled) setAnalysesError(err.message || 'Failed to load recent analyses');
      })
      .finally(() => {
        if (!cancelled) setAnalysesLoading(false);
      });

    // Load Sources
    fetchSources(1, 4)
      .then((d) => {
        if (!cancelled) setSources(d);
      })
      .catch((err) => {
        if (!cancelled) setSourcesError(err.message || 'Failed to load sources');
      })
      .finally(() => {
        if (!cancelled) setSourcesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Entrance animations for banner and KPI stat cards
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power2.out' } })
        .to('#quickWorkbenchBanner', { opacity: 1, y: 0, duration: 0.5 })
        .to('#statRow .stat-card', { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, '-=0.3');
    });

    return () => ctx.revert();
  }, []);

  // Animate recent analyses rows when data finishes loading
  useEffect(() => {
    if (analyses?.items && analyses.items.length > 0) {
      gsap.to('.arow', { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out' });
    }
  }, [analyses]);

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Welcome back, {user?.full_name?.split(' ')[0] || 'Researcher'}</div>
          <div className="topbar-sub">Executive Credibility Dashboard & Ecosystem Overview</div>
        </div>
        <div className="topbar-actions">
          <div className="search">
            <Search size={15} color="var(--text-faint)" />
            <input type="text" placeholder="Quick search claims, titles, domains..." />
          </div>
          <ThemeToggle />
          <button className="btn-primary" onClick={() => navigate('/dashboard/analyze')}>
            <Plus size={15} /> New analysis
          </button>
        </div>
      </header>

      <div className="content">
        {/* Quick Launch Workbench Banner */}
        <div
          id="quickWorkbenchBanner"
          onClick={() => navigate('/dashboard/analyze')}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--brass)',
            borderRadius: '16px',
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(217,169,78,0.15)',
            opacity: 0,
            transform: 'translateY(10px)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(217,169,78,0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(217,169,78,0.15)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--brass)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}>
              <Sparkles size={24} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                Open Verification Workbench
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                Analyze multi-modal content: Web URLs, raw text statements, OCR screenshot images, Whisper audio/video, or social threads.
              </div>
            </div>
          </div>

          <button
            style={{
              background: 'var(--brass)',
              color: 'var(--ink)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            Launch Workbench <ArrowRight size={16} />
          </button>
        </div>

        {/* Real-time Analytical KPI Cards Banner */}
        <div className="stat-row" id="statRow">
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Evaluated This Week</span>
              <TrendingUp className="stat-icon" size={16} />
            </div>
            {summaryLoading ? (
              <div className="stat-value skeleton">---</div>
            ) : summaryError ? (
              <div className="stat-value" style={{ color: 'var(--disputed)' }}>—</div>
            ) : (
              <>
                <div className="stat-value">{summary?.analyses_count_this_week ?? 0}</div>
                <div className="stat-delta">
                  {summary?.avg_factual_accuracy != null
                    ? `Avg accuracy ${summary.avg_factual_accuracy}%`
                    : 'No data yet'}
                </div>
              </>
            )}
            <svg className="sparkline" viewBox="0 0 100 28" preserveAspectRatio="none">
              <polyline points="0,20 15,18 30,14 45,16 60,9 75,11 100,4" fill="none" stroke="#D9A94E" strokeWidth="2" />
            </svg>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Avg Factual Score</span>
              <ShieldCheck className="stat-icon" size={16} />
            </div>
            {summaryLoading ? (
              <div className="stat-value skeleton">---</div>
            ) : summaryError ? (
              <div className="stat-value" style={{ color: 'var(--disputed)' }}>—</div>
            ) : (
              <>
                <div className="stat-value" style={{ color: 'var(--verified)' }}>
                  {summary?.avg_factual_accuracy != null ? `${summary.avg_factual_accuracy}%` : '—'}
                </div>
                <div className="stat-delta">across multi-modal claims</div>
              </>
            )}
            <svg className="sparkline" viewBox="0 0 100 28" preserveAspectRatio="none">
              <polyline points="0,10 15,13 30,9 45,15 60,12 75,8 100,10" fill="none" stroke="#3ECFB5" strokeWidth="2" />
            </svg>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Sources Flagged</span>
              <AlertTriangle className="stat-icon" size={16} />
            </div>
            {summaryLoading ? (
              <div className="stat-value skeleton">---</div>
            ) : summaryError ? (
              <div className="stat-value" style={{ color: 'var(--disputed)' }}>—</div>
            ) : (
              <>
                <div className="stat-value down">{summary?.sources_flagged_count ?? 0}</div>
                <div className="stat-delta">low reputation outlets</div>
              </>
            )}
            <svg className="sparkline" viewBox="0 0 100 28" preserveAspectRatio="none">
              <polyline points="0,6 15,10 30,8 45,14 60,16 75,20 100,22" fill="none" stroke="#D9695F" strokeWidth="2" />
            </svg>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Avg Turnaround Time</span>
              <Clock className="stat-icon" size={16} />
            </div>
            {summaryLoading ? (
              <div className="stat-value skeleton">---</div>
            ) : summaryError ? (
              <div className="stat-value" style={{ color: 'var(--disputed)' }}>—</div>
            ) : (
              <>
                <div className="stat-value">
                  {summary?.avg_turnaround_seconds != null ? `${Math.round(summary.avg_turnaround_seconds)}s` : '—'}
                </div>
                <div className="stat-delta">end-to-end pipeline latency</div>
              </>
            )}
            <svg className="sparkline" viewBox="0 0 100 28" preserveAspectRatio="none">
              <polyline points="0,18 15,16 30,17 45,12 60,13 75,10 100,9" fill="none" stroke="#D9A94E" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Split Grid: Recent Audit Stream on Left, Quick Rail on Right */}
        <div className="split">
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Recent Evaluations & Audit Trail</span>
              <NavLink className="panel-link" to="/dashboard/history">
                Full Audit History →
              </NavLink>
            </div>

            <div id="analysesList">
              {analysesLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: '13px' }}>
                  <Sparkles size={18} color="var(--brass)" style={{ animation: 'spin 2s linear infinite', marginBottom: '8px' }} />
                  <div>Loading recent analyses...</div>
                </div>
              ) : analysesError ? (
                <div style={{ padding: '20px', color: 'var(--disputed)', fontSize: '13px' }}>
                  {analysesError}
                </div>
              ) : analyses && analyses.items.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
                  No recent evaluations yet — click <strong>Launch Workbench</strong> above to check your first claim.
                </div>
              ) : (
                <>
                  {analyses?.items.slice(0, 5).map((item: any) => {
                    const displayTitle = item.title || (item.raw_payload ? (item.raw_payload.length > 70 ? item.raw_payload.slice(0, 70) + '...' : item.raw_payload) : 'Analysis Item');
                    const isSupp = item.verdict === 'verified';
                    const isDis = item.verdict === 'disputed';
                    const verdictClass = isSupp ? 'v-verified' : isDis ? 'v-disputed' : 'v-mixed';

                    return (
                      <div
                        className="arow"
                        key={item.id}
                        onClick={() => navigate(`/dashboard/analysis/${item.id}`)}
                        style={{ cursor: 'pointer', opacity: 1, transform: 'none' }}
                      >
                        <div className="arow-icon">
                          {item.source_domain ? <Globe size={16} /> : <FileText size={16} />}
                        </div>
                        <div className="arow-body">
                          <div className="arow-title">"{displayTitle}"</div>
                          <div className="arow-meta">
                            {item.source_domain ? <span style={{ color: 'var(--brass)' }}>{item.source_domain}</span> : 'text submission'} · {item.claims_count} claim{item.claims_count !== 1 ? 's' : ''} extracted
                          </div>
                        </div>

                        {item.composite_score !== null && (
                          <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--mono)', color: isSupp ? 'var(--verified)' : isDis ? 'var(--disputed)' : 'var(--brass)', marginRight: '8px' }}>
                            {item.composite_score.toFixed(0)}%
                          </span>
                        )}

                        <span className={`verdict ${verdictClass}`}>
                          {item.verdict || 'Processing'}
                        </span>
                        <ChevronRight size={16} color="var(--text-faint)" />
                      </div>
                    );
                  })}

                  {/* View All History Footer Button */}
                  <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={() => navigate('/dashboard/history')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--brass)',
                        fontSize: '13px',
                        fontFamily: 'var(--mono)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <History size={15} /> View All Analysis History ({analyses?.total || 0}) →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rail">
            {/* Quick Actions Panel */}
            <div className="panel" style={{ padding: '18px' }}>
              <span className="panel-title" style={{ display: 'block', marginBottom: '12px' }}>Platform Quick Actions</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <NavLink to="/dashboard/expert-queue" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text)', textDecoration: 'none', fontSize: '13px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Award size={15} color="var(--brass)" /> Expert Queue</span>
                  <ChevronRight size={14} color="var(--text-dim)" />
                </NavLink>
                <NavLink to="/dashboard/api-keys" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text)', textDecoration: 'none', fontSize: '13px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Key size={15} color="var(--brass)" /> API Secret Keys</span>
                  <ChevronRight size={14} color="var(--text-dim)" />
                </NavLink>
                <NavLink to="/dashboard/claim-graph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text)', textDecoration: 'none', fontSize: '13px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Network size={15} color="var(--brass)" /> Claim Propagation Graph</span>
                  <ChevronRight size={14} color="var(--text-dim)" />
                </NavLink>
              </div>
            </div>

            {/* Sources to Watch Rail Panel */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Sources to Watch</span>
                <NavLink className="panel-link" to="/dashboard/sources">
                  All Outlets →
                </NavLink>
              </div>
              {sourcesLoading ? (
                <div className="source-row">
                  <span className="source-name" style={{ color: 'var(--text-dim)' }}>Loading sources…</span>
                </div>
              ) : sourcesError ? (
                <div className="source-row">
                  <span className="source-name" style={{ color: 'var(--disputed)' }}>Failed to load</span>
                </div>
              ) : sources && sources.items.length === 0 ? (
                <div className="source-row">
                  <span className="source-name" style={{ color: 'var(--text-dim)' }}>No sources tracked yet</span>
                </div>
              ) : (
                sources?.items.map((source) => (
                  <div className="source-row" key={source.id}>
                    <span className="source-dot" style={{ background: source.score >= 75 ? 'var(--verified)' : source.score >= 50 ? 'var(--brass)' : 'var(--disputed)' }}></span>
                    <span className="source-name">{source.domain}</span>
                    <span className="source-score">{source.score.toFixed(0)}</span>
                    <span className="source-trend" style={{ color: 'var(--text-faint)' }}>{source.trend_label}</span>
                  </div>
                ))
              )}
            </div>

            <div className="panel">
              <div className="version-footer">
                <span>SCORING ENGINE</span>
                <span>v3.0.0-phase3</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .topbar {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 32px;
          background: var(--ink-2);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line);
        }

        .topbar-title {
          font-family: var(--serif);
          font-size: 20px;
          font-weight: 600;
          color: var(--text);
        }

        .topbar-sub {
          font-size: 12.5px;
          color: var(--text-dim);
          margin-top: 2px;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 100px;
          padding: 8px 14px;
          width: 240px;
        }

        .search input {
          background: none;
          border: none;
          outline: none;
          color: var(--text);
          font-size: 13px;
          width: 100%;
        }

        .content {
          padding: 28px 32px 60px;
          display: flex;
          flex-direction: column;
          gap: 26px;
        }

        .stat-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .stat-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 18px;
          opacity: 0;
          transform: translateY(10px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        }

        .stat-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .stat-label {
          font-size: 12px;
          color: var(--text-dim);
          font-weight: 600;
        }

        .stat-icon {
          color: var(--brass);
        }

        .stat-value {
          font-family: var(--mono);
          font-size: 26px;
          font-weight: 600;
          margin-top: 12px;
        }

        .stat-value.up { color: var(--verified); }
        .stat-value.down { color: var(--disputed); }
        .stat-value.skeleton { color: var(--text-dim); opacity: 0.5; }

        .stat-delta {
          font-size: 11.5px;
          color: var(--text-faint);
          margin-top: 4px;
          font-family: var(--mono);
        }

        .sparkline {
          margin-top: 12px;
          height: 28px;
          width: 100%;
        }

        .split {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
          align-items: start;
        }

        .panel {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        }

        .panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 1px solid var(--line);
        }

        .panel-title {
          font-family: var(--serif);
          font-size: 16px;
          font-weight: 600;
        }

        .panel-link {
          font-size: 12px;
          color: var(--text-dim);
          font-weight: 600;
          text-decoration: none;
        }

        .panel-link:hover { color: var(--brass); }

        .arow {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          border-bottom: 1px solid var(--line);
          transition: background .18s ease;
        }

        .arow:last-child { border-bottom: none; }
        .arow:hover { background: var(--surface-hover); }

        .arow-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: var(--surface-2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--brass);
        }

        .arow-body { flex: 1; min-width: 0; }
        .arow-title {
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--text);
        }

        .arow-meta {
          font-size: 11.5px;
          color: var(--text-faint);
          margin-top: 3px;
          font-family: var(--mono);
        }

        .verdict {
          font-family: var(--mono);
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 100px;
          white-space: nowrap;
          flex-shrink: 0;
          text-transform: uppercase;
        }

        .v-verified { background: var(--verified-dim); color: var(--verified); }
        .v-disputed { background: var(--disputed-dim); color: var(--disputed); }
        .v-mixed { background: rgba(224,185,78,0.14); color: var(--brass); }

        .rail { display: flex; flex-direction: column; gap: 20px; }

        .source-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          border-bottom: 1px solid var(--line);
        }

        .source-row:last-child { border-bottom: none; }
        .source-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .source-name {
          flex: 1;
          font-size: 13px;
          font-weight: 600;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .source-score { font-family: var(--mono); font-size: 12px; color: var(--text-dim); }
        .source-trend { font-size: 11px; font-family: var(--mono); text-transform: capitalize; }

        .version-footer {
          padding: 14px 18px;
          font-family: var(--mono);
          font-size: 11px;
          color: var(--text-faint);
          display: flex;
          justify-content: space-between;
        }

        @media (max-width: 1100px) {
          .split { grid-template-columns: 1fr; }
          .stat-row { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </>
  );
};
