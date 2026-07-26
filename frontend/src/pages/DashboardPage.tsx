import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  ShieldCheck,
  Home,
  PlusCircle,
  Clock,
  History as HistoryIcon,
  Globe,
  Share2,
  Key,
  Settings,
  LogOut,
  Search,
  Plus,
  ArrowRight,
  Info,
  TrendingUp,
  AlertTriangle,
  Link as LinkIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { submitContent } from '../api/client';
import { AnalysisModal } from '../components/AnalysisModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { fetchDashboardSummary } from '../api/client';
import { fetchContentList } from '../api/client';
import { fetchSources } from '../api/client';
import { DashboardSummaryResponse, ContentListResponse, SourcesListResponse, ModalityType } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'link' | 'text' | 'media'>('link');
  const [submitPayload, setSubmitPayload] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [analyses, setAnalyses] = useState<ContentListResponse | null>(null);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [analysesError, setAnalysesError] = useState<string | null>(null);

  const [sources, setSources] = useState<SourcesListResponse | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitCardRef = useRef<HTMLDivElement>(null);

  const userInitials =
    user?.full_name
      ? user.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
      : 'CR';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitPayload.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    const isUrl = submitPayload.startsWith('http://') || submitPayload.startsWith('https://');
    const modality: ModalityType = activeTab === 'media' ? 'video' : isUrl ? 'url' : 'text';

    try {
      const res = await submitContent({ modality, payload: submitPayload.trim() });
      setIsSubmitting(false);
      setSubmitPayload('');
      setActiveAnalysisId(res.content_id);
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err.message || 'Submission failed');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const [sumData, analysisData, srcData] = await Promise.all([
          fetchDashboardSummary(),
          fetchContentList(1, 5),
          fetchSources(1, 4),
        ]);
        if (!cancelled) {
          setSummary(sumData);
          setAnalyses(analysisData);
          setSources(srcData);
        }
      } catch (err: any) {
        if (!cancelled) {
          if (err.message.includes('Dashboard')) setSummaryError(err.message);
          if (err.message.includes('Content')) setAnalysesError(err.message);
          if (err.message.includes('Sources')) setSourcesError(err.message);
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
          setAnalysesLoading(false);
          setSourcesLoading(false);
        }
      }
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power2.out' } })
        .to('#submitCard', { opacity: 1, y: 0, duration: 0.5 })
        .to('#statRow .stat-card', { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, '-=0.3')
        .to('.arow', { opacity: 1, y: 0, duration: 0.4, stagger: 0.06 }, '-=0.3');
    });

    return () => ctx.revert();
  }, []);

  const isActive = (to: string) => ({
    className: ({ isActive }: { isActive: boolean }) =>
      `side-link ${isActive ? 'is-active' : ''}`,
  });

  return (
    <div className="dash-app">
      <aside className="sidebar">
        <div className="side-brand">
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid var(--brass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={16} color="var(--brass)" />
          </div>
          Credo
        </div>

        <nav className="side-nav">
          <NavLink to="/dashboard" end {...isActive('/dashboard')}>
            <Home size={17} /> Overview
          </NavLink>
          <NavLink to="/dashboard" {...isActive('/dashboard')}>
            <PlusCircle size={17} /> Analyze
          </NavLink>
          <NavLink to="/dashboard/history" {...isActive('/dashboard/history')}>
            <HistoryIcon size={17} /> History
          </NavLink>
          <NavLink to="/dashboard/sources" {...isActive('/dashboard/sources')}>
            <Globe size={17} /> Sources
          </NavLink>
          <NavLink to="/dashboard/claim-graph" {...isActive('/dashboard/claim-graph')}>
            <Share2 size={17} /> Claim graph
          </NavLink>
          <NavLink to="/dashboard/api-keys" {...isActive('/dashboard/api-keys')}>
            <Key size={17} /> API keys
          </NavLink>

          <div className="side-spacer"></div>

          <NavLink to="/dashboard/settings" {...isActive('/dashboard/settings')}>
            <Settings size={17} /> Settings
          </NavLink>

          <div className="side-user">
            <div className="side-avatar">{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="side-user-name">{user?.full_name || 'James'}</div>
              <div className="side-user-role">{user?.email || 'Workspace admin'}</div>
            </div>
            <button onClick={handleLogout} title="Log out" style={{ color: 'var(--text-faint)', padding: '4px' }}>
              <LogOut size={16} />
            </button>
          </div>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">Welcome back, {user?.full_name?.split(' ')[0] || 'James'}</div>
            <div className="topbar-sub">Here's what Credo has checked recently</div>
          </div>
          <div className="topbar-actions">
            <div className="search">
              <Search size={15} color="var(--text-faint)" />
              <input type="text" placeholder="Search analyses, sources, claims" />
            </div>
            <ThemeToggle />
            <button className="btn-primary" onClick={() => submitCardRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              <Plus size={15} /> New analysis
            </button>
          </div>
        </header>

        <div className="content">
          {submitError && (
            <div className="submit-error">
              <span>{submitError}</span>
              <button onClick={() => setSubmitError(null)}>Dismiss</button>
            </div>
          )}

          <div className="submit-card" id="submitCard" ref={submitCardRef}>
            <div className="submit-tabs">
              <button className={`submit-tab ${activeTab === 'link' ? 'is-active' : ''}`} onClick={() => setActiveTab('link')}>
                Link
              </button>
              <button className={`submit-tab ${activeTab === 'text' ? 'is-active' : ''}`} onClick={() => setActiveTab('text')}>
                Text
              </button>
              <button className={`submit-tab ${activeTab === 'media' ? 'is-active' : ''}`} onClick={() => setActiveTab('media')}>
                Media
              </button>
            </div>
            <form onSubmit={handleQuickSubmit}>
              <div className="submit-row">
                <input
                  className="submit-input"
                  type="text"
                  placeholder={
                    activeTab === 'link'
                      ? 'Paste a URL to analyze — an article, a post, anything with a claim in it'
                      : activeTab === 'text'
                        ? 'Paste claim text, press release, or excerpt to verify'
                        : 'Paste media URL or video clip link'
                  }
                  value={submitPayload}
                  onChange={(e) => setSubmitPayload(e.target.value)}
                  disabled={isSubmitting}
                />
                <button className="btn-primary" type="submit" disabled={isSubmitting || !submitPayload.trim()}>
                  <ArrowRight size={15} /> {isSubmitting ? 'Submitting...' : 'Analyze'}
                </button>
              </div>
            </form>
            <div className="submit-hint">
              <Info size={13} />
              Most links finish in under a minute — you'll see claims appear as each one is checked.
            </div>
          </div>

          <div className="stat-row" id="statRow">
            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Analyzed this week</span>
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
                <polyline points="0,20 15,18 30,14 45,16 60,9 75,11 100,4" fill="none" stroke="#3ECFB5" strokeWidth="2" />
              </svg>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Avg factual accuracy</span>
                <ShieldCheck className="stat-icon" size={16} />
              </div>
              {summaryLoading ? (
                <div className="stat-value skeleton">---</div>
              ) : summaryError ? (
                <div className="stat-value" style={{ color: 'var(--disputed)' }}>—</div>
              ) : (
                <>
                  <div className="stat-value">{summary?.avg_factual_accuracy != null ? `${summary.avg_factual_accuracy}%` : '—'}</div>
                  <div className="stat-delta">across analyses this week</div>
                </>
              )}
              <svg className="sparkline" viewBox="0 0 100 28" preserveAspectRatio="none">
                <polyline points="0,10 15,13 30,9 45,15 60,12 75,8 100,10" fill="none" stroke="#D9A94E" strokeWidth="2" />
              </svg>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Sources flagged</span>
                <AlertTriangle className="stat-icon" size={16} />
              </div>
              {summaryLoading ? (
                <div className="stat-value skeleton">---</div>
              ) : summaryError ? (
                <div className="stat-value" style={{ color: 'var(--disputed)' }}>—</div>
              ) : (
                <>
                  <div className="stat-value down">{summary?.sources_flagged_count ?? 0}</div>
                  <div className="stat-delta">low reputation this week</div>
                </>
              )}
              <svg className="sparkline" viewBox="0 0 100 28" preserveAspectRatio="none">
                <polyline points="0,6 15,10 30,8 45,14 60,16 75,20 100,22" fill="none" stroke="#D9695F" strokeWidth="2" />
              </svg>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Avg turnaround</span>
                <Clock className="stat-icon" size={16} />
              </div>
              {summaryLoading ? (
                <div className="stat-value skeleton">---</div>
              ) : summaryError ? (
                <div className="stat-value" style={{ color: 'var(--disputed)' }}>—</div>
              ) : (
                <>
                  <div className="stat-value">{summary?.avg_turnaround_seconds != null ? `${Math.round(summary.avg_turnaround_seconds)}s` : '—'}</div>
                  <div className="stat-delta">per claim, end to end</div>
                </>
              )}
              <svg className="sparkline" viewBox="0 0 100 28" preserveAspectRatio="none">
                <polyline points="0,18 15,16 30,17 45,12 60,13 75,10 100,9" fill="none" stroke="#3ECFB5" strokeWidth="2" />
              </svg>
            </div>
          </div>

          <div className="split">
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Recent analyses</span>
                <NavLink className="panel-link" to="/dashboard/history">
                  View all history →
                </NavLink>
              </div>
              <div id="analysesList">
                {analysesLoading ? (
                  <div className="arow" style={{ opacity: 1, transform: 'none' }}>
                    <div className="arow-body">
                      <div className="arow-title" style={{ color: 'var(--text-dim)' }}>Loading analyses…</div>
                    </div>
                  </div>
                ) : analysesError ? (
                  <div className="arow" style={{ opacity: 1, transform: 'none' }}>
                    <div className="arow-body">
                      <div className="arow-title" style={{ color: 'var(--disputed)' }}>Failed to load analyses</div>
                    </div>
                  </div>
                ) : analyses && analyses.items.length === 0 ? (
                  <div className="arow" style={{ opacity: 1, transform: 'none' }}>
                    <div className="arow-body">
                      <div className="arow-title">No analyses yet — submit your first link above</div>
                    </div>
                  </div>
                ) : (
                  analyses?.items.map((item: any) => {
                    return (
                      <div className="arow" key={item.id}>
                        <div className="arow-icon">
                          <LinkIcon size={16} />
                        </div>
                        <div className="arow-body">
                          <div className="arow-title">{item.title || 'Untitled analysis'}</div>
                          <div className="arow-meta">
                            {item.source_domain || 'unknown source'} · {item.claims_count} claim{item.claims_count !== 1 ? 's' : ''} checked
                          </div>
                        </div>
                        <span className={`verdict v-${item.verdict || 'unverified'}`}>
                          {(item.verdict || 'Unverified').charAt(0).toUpperCase() + (item.verdict || 'Unverified').slice(1)}
                        </span>
                        <span className="arow-time">{new Date(item.created_at).toLocaleTimeString()}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rail">
              <div className="panel">
                <div className="panel-head">
                  <span className="panel-title">Sources to watch</span>
                  <NavLink className="panel-link" to="/dashboard/sources">
                    All →
                  </NavLink>
                </div>
                {sourcesLoading ? (
                  <div className="source-row">
                    <span className="source-name" style={{ color: 'var(--text-dim)' }}>Loading…</span>
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
                      <span className="source-dot" style={{ background: source.score >= 80 ? '#3ECFB5' : source.score >= 60 ? '#E0B94E' : '#D9695F' }}></span>
                      <span className="source-name">{source.domain}</span>
                      <span className="source-score">{source.score.toFixed(0)}</span>
                      <span className="source-trend" style={{ color: 'var(--text-faint)' }}>{source.trend_label}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="panel">
                <div className="panel-head">
                  <span className="panel-title">Claim graph</span>
                </div>
                <div className="graph-teaser">
                  <div className="graph-mini-row">
                    <span className="graph-mini-node">claims</span>
                    <span className="graph-mini-arrow">→</span>
                    <span className="graph-mini-node">interactive view</span>
                  </div>
                  <NavLink className="graph-cta" to="/dashboard/claim-graph">
                    Explore the full graph →
                  </NavLink>
                </div>
              </div>

              <div className="panel">
                <div className="version-footer">
                  <span>SCORING MODEL</span>
                  <span>v3.0.0-phase3</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnalysisModal
        contentId={activeAnalysisId}
        onClose={() => setActiveAnalysisId(null)}
      />

      <style>{`
        .dash-app {
          display: grid;
          grid-template-columns: 240px 1fr;
          min-height: 100vh;
          background: var(--ink);
          color: var(--text);
        }

        .sidebar {
          background: var(--ink-2);
          border-right: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          padding: 22px 16px;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .side-brand {
          display: flex;
          align-items: center;
          gap: 9px;
          font-family: var(--serif);
          font-size: 18px;
          font-weight: 600;
          padding: 6px 10px 26px;
        }

        .side-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .side-link {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 9px 10px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--text-dim);
          text-decoration: none;
          transition: background .18s ease, color .18s ease;
        }

        .side-link:hover {
          background: var(--surface);
          color: var(--text);
        }

        .side-link.is-active,
        .side-link.active {
          background: var(--brass-dim);
          color: var(--brass);
        }

        .side-spacer {
          flex: 1;
        }

        .side-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid var(--line);
          margin-top: 8px;
        }

        .side-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--brass), #8a6a2e);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--mono);
          font-size: 12px;
          font-weight: 600;
          color: var(--ink);
        }

        .side-user-name {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .side-user-role {
          font-size: 11.5px;
          color: var(--text-faint);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .main {
          min-width: 0;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 32px;
          background: rgba(11, 14, 20, 0.85);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line);
        }

        .topbar-title {
          font-family: var(--serif);
          font-size: 20px;
          font-weight: 600;
        }

        .topbar-sub {
          font-size: 12.5px;
          color: var(--text-faint);
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

        .submit-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 18px;
          background: var(--disputed-dim);
          border: 1px solid var(--disputed);
          border-radius: var(--radius);
          font-size: 13px;
          color: var(--disputed);
        }

        .submit-error button {
          background: var(--disputed);
          color: var(--ink);
          border: none;
          padding: 4px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .submit-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 22px;
          opacity: 0;
          transform: translateY(10px);
        }

        .submit-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 16px;
        }

        .submit-tab {
          font-size: 12.5px;
          font-weight: 600;
          padding: 7px 14px;
          border-radius: 100px;
          color: var(--text-dim);
          transition: background .18s ease, color .18s ease;
          cursor: pointer;
          background: none;
          border: none;
        }

        .submit-tab.is-active {
          background: var(--brass-dim);
          color: var(--brass);
        }

        .submit-tab:hover:not(.is-active) {
          background: var(--surface-hover);
          color: var(--text);
        }

        .submit-row {
          display: flex;
          gap: 10px;
        }

        .submit-input {
          flex: 1;
          background: var(--ink-2);
          border: 1px solid var(--line-strong);
          border-radius: 9px;
          padding: 13px 16px;
          color: var(--text);
          font-size: 14px;
        }

        .submit-hint {
          margin-top: 10px;
          font-size: 12px;
          color: var(--text-faint);
          display: flex;
          align-items: center;
          gap: 6px;
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
          color: var(--text-faint);
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
          grid-template-columns: 1fr 320px;
          gap: 20px;
          align-items: start;
        }

        .panel {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          overflow: hidden;
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
          opacity: 0;
          transform: translateY(8px);
        }

        .arow:last-child { border-bottom: none; }
        .arow:hover { background: var(--surface-hover); }

        .arow-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: var(--surface-2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--text-dim);
        }

        .arow-body { flex: 1; min-width: 0; }
        .arow-title {
          font-size: 13.5px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .arow-meta {
          font-size: 11.5px;
          color: var(--text-faint);
          margin-top: 3px;
          font-family: var(--mono);
        }

        .radar { width: 30px; height: 30px; flex-shrink: 0; }

        .verdict {
          font-family: var(--mono);
          font-size: 10.5px;
          font-weight: 600;
          padding: 4px 9px;
          border-radius: 100px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .v-verified { background: var(--verified-dim); color: var(--verified); }
        .v-disputed { background: var(--disputed-dim); color: var(--disputed); }
        .v-mixed { background: var(--mislead-dim); color: var(--mislead); }
        .v-unverified { background: var(--surface-2); color: var(--text-dim); }

        .arow-time {
          font-size: 11.5px;
          color: var(--text-faint);
          font-family: var(--mono);
          width: 52px;
          text-align: right;
          flex-shrink: 0;
        }

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
        .source-trend { font-size: 11px; font-family: var(--mono); width: 34px; text-align: right; }

        .graph-teaser { padding: 18px; display: flex; flex-direction: column; gap: 10px; }
        .graph-mini-row { display: flex; align-items: center; gap: 10px; font-size: 12px; }
        .graph-mini-node {
          font-family: var(--mono);
          font-size: 10.5px;
          padding: 4px 8px;
          border-radius: 5px;
          background: var(--surface-2);
          color: var(--text-dim);
        }
        .graph-mini-arrow { color: var(--text-faint); }
        .graph-cta { margin-top: 6px; font-size: 12.5px; font-weight: 600; color: var(--brass); display: flex; align-items: center; gap: 6px; text-decoration: none; }
        .graph-cta:hover { text-decoration: underline; }

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

        @media (max-width: 800px) {
          .dash-app { grid-template-columns: 1fr; }
          .sidebar { display: none; }
          .stat-row { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
};