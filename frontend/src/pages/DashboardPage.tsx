import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  ShieldCheck,
  Home,
  PlusCircle,
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
  Clock,
  Link as LinkIcon,
  FileText,
  Video
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { submitContent } from '../api/client';
import { AnalysisModal } from '../components/AnalysisModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { ModalityType } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'link' | 'text' | 'media'>('link');
  const [submitPayload, setSubmitPayload] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);

  const submitCardRef = useRef<HTMLDivElement>(null);

  const userInitials = user?.full_name
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
    const isUrl = submitPayload.startsWith('http://') || submitPayload.startsWith('https://');
    const modality: ModalityType = activeTab === 'media' ? 'video' : isUrl ? 'url' : 'text';

    try {
      const res = await submitContent({ modality, payload: submitPayload.trim() });
      setIsSubmitting(false);
      setSubmitPayload('');
      setActiveAnalysisId(res.content_id);
    } catch (err: any) {
      setIsSubmitting(false);
      alert(err.message || 'Submission failed');
    }
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power2.out' } })
        .to('#submitCard', { opacity: 1, y: 0, duration: 0.5 })
        .to('#statRow .stat-card', { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, '-=0.3')
        .to('.arow', { opacity: 1, y: 0, duration: 0.4, stagger: 0.06 }, '-=0.3');
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="dash-app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="side-brand">
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid var(--brass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={16} color="var(--brass)" />
          </div>
          Credo
        </div>

        <nav className="side-nav">
          <a className="side-link is-active" href="#">
            <Home size={17} /> Overview
          </a>
          <a className="side-link" href="#">
            <PlusCircle size={17} /> Analyze
          </a>
          <a className="side-link" href="#">
            <HistoryIcon size={17} /> History
          </a>
          <a className="side-link" href="#">
            <Globe size={17} /> Sources
          </a>
          <a className="side-link" href="#">
            <Share2 size={17} /> Claim graph
          </a>
          <a className="side-link" href="#">
            <Key size={17} /> API keys
          </a>

          <div className="side-spacer"></div>

          <a className="side-link" href="#">
            <Settings size={17} /> Settings
          </a>

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

      {/* Main Content Area */}
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
          {/* Quick Submit Card */}
          <div className="submit-card" id="submitCard" ref={submitCardRef}>
            <div className="submit-tabs">
              <button
                className={`submit-tab ${activeTab === 'link' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('link')}
              >
                Link
              </button>
              <button
                className={`submit-tab ${activeTab === 'text' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('text')}
              >
                Text
              </button>
              <button
                className={`submit-tab ${activeTab === 'media' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('media')}
              >
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

          {/* Stats Row */}
          <div className="stat-row" id="statRow">
            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Analyzed this week</span>
                <TrendingUp className="stat-icon" size={16} />
              </div>
              <div className="stat-value">126</div>
              <div className="stat-delta">+18 vs last week</div>
              <svg className="sparkline" viewBox="0 0 100 28" preserveAspectRatio="none">
                <polyline points="0,20 15,18 30,14 45,16 60,9 75,11 100,4" fill="none" stroke="#3ECFB5" strokeWidth="2" />
              </svg>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Avg factual accuracy</span>
                <ShieldCheck className="stat-icon" size={16} />
              </div>
              <div className="stat-value">71%</div>
              <div className="stat-delta">across 5 dimensions</div>
              <svg className="sparkline" viewBox="0 0 100 28" preserveAspectRatio="none">
                <polyline points="0,10 15,13 30,9 45,15 60,12 75,8 100,10" fill="none" stroke="#D9A94E" strokeWidth="2" />
              </svg>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Sources flagged</span>
                <AlertTriangle className="stat-icon" size={16} />
              </div>
              <div className="stat-value down">9</div>
              <div className="stat-delta">low reputation this week</div>
              <svg className="sparkline" viewBox="0 0 100 28" preserveAspectRatio="none">
                <polyline points="0,6 15,10 30,8 45,14 60,16 75,20 100,22" fill="none" stroke="#D9695F" strokeWidth="2" />
              </svg>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Avg turnaround</span>
                <Clock className="stat-icon" size={16} />
              </div>
              <div className="stat-value">42s</div>
              <div className="stat-delta">per claim, end to end</div>
              <svg className="sparkline" viewBox="0 0 100 28" preserveAspectRatio="none">
                <polyline points="0,18 15,16 30,17 45,12 60,13 75,10 100,9" fill="none" stroke="#3ECFB5" strokeWidth="2" />
              </svg>
            </div>
          </div>

          {/* Split: Recent Analyses + Side Rail */}
          <div className="split">
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Recent analyses</span>
                <a className="panel-link" href="#">View all history →</a>
              </div>
              <div id="analysesList">
                <div className="arow">
                  <div className="arow-icon"><LinkIcon size={16} /></div>
                  <div className="arow-body">
                    <div className="arow-title">"The bridge collapsed within minutes of opening, engineers confirm."</div>
                    <div className="arow-meta">infrabuild-news.com · 3 claims checked</div>
                  </div>
                  <svg className="radar" viewBox="0 0 40 40">
                    <polygon points="20,4 34,15 29,33 11,33 6,15" fill="none" stroke="rgba(241,238,230,0.12)" strokeWidth="1" />
                    <polygon points="20,10 28,17 25,28 15,28 12,17" fill="rgba(217,105,95,0.25)" stroke="#D9695F" strokeWidth="1.4" />
                  </svg>
                  <span className="verdict v-disputed">Disputed</span>
                  <span className="arow-time">2m ago</span>
                </div>

                <div className="arow">
                  <div className="arow-icon"><FileText size={16} /></div>
                  <div className="arow-body">
                    <div className="arow-title">Viral post claiming a new vaccine mandate starts next month</div>
                    <div className="arow-meta">@newsflash_247 · 2 claims checked</div>
                  </div>
                  <svg className="radar" viewBox="0 0 40 40">
                    <polygon points="20,4 34,15 29,33 11,33 6,15" fill="none" stroke="rgba(241,238,230,0.12)" strokeWidth="1" />
                    <polygon points="20,7 31,16 27,30 13,30 9,16" fill="rgba(224,185,78,0.25)" stroke="#E0B94E" strokeWidth="1.4" />
                  </svg>
                  <span className="verdict v-mixed">Mixed</span>
                  <span className="arow-time">19m ago</span>
                </div>

                <div className="arow">
                  <div className="arow-icon"><Video size={16} /></div>
                  <div className="arow-body">
                    <div className="arow-title">Clip circulating as "live footage from today's protest"</div>
                    <div className="arow-meta">forwarded video · temporal check flagged</div>
                  </div>
                  <svg className="radar" viewBox="0 0 40 40">
                    <polygon points="20,4 34,15 29,33 11,33 6,15" fill="none" stroke="rgba(241,238,230,0.12)" strokeWidth="1" />
                    <polygon points="20,9 30,17 26,29 14,29 10,17" fill="rgba(224,185,78,0.25)" stroke="#E0B94E" strokeWidth="1.4" />
                  </svg>
                  <span className="verdict v-mixed">Mixed</span>
                  <span className="arow-time">41m ago</span>
                </div>

                <div className="arow">
                  <div className="arow-icon"><LinkIcon size={16} /></div>
                  <div className="arow-body">
                    <div className="arow-title">Reuters report on the central bank's rate decision</div>
                    <div className="arow-meta">reuters.com · 6 claims checked</div>
                  </div>
                  <svg className="radar" viewBox="0 0 40 40">
                    <polygon points="20,4 34,15 29,33 11,33 6,15" fill="none" stroke="rgba(241,238,230,0.12)" strokeWidth="1" />
                    <polygon points="20,5 33,15 28,32 12,32 7,15" fill="rgba(62,207,181,0.22)" stroke="#3ECFB5" strokeWidth="1.4" />
                  </svg>
                  <span className="verdict v-verified">Verified</span>
                  <span className="arow-time">1h ago</span>
                </div>

                <div className="arow">
                  <div className="arow-icon"><FileText size={16} /></div>
                  <div className="arow-body">
                    <div className="arow-title">Forwarded screenshot claiming school closures state-wide</div>
                    <div className="arow-meta">WhatsApp forward · OCR extracted</div>
                  </div>
                  <svg className="radar" viewBox="0 0 40 40">
                    <polygon points="20,4 34,15 29,33 11,33 6,15" fill="none" stroke="rgba(241,238,230,0.12)" strokeWidth="1" />
                    <polygon points="20,11 27,18 24,27 16,27 13,18" fill="rgba(217,105,95,0.25)" stroke="#D9695F" strokeWidth="1.4" />
                  </svg>
                  <span className="verdict v-disputed">Disputed</span>
                  <span className="arow-time">3h ago</span>
                </div>
              </div>
            </div>

            {/* Side Rail */}
            <div className="rail">
              <div className="panel">
                <div className="panel-head">
                  <span className="panel-title">Sources to watch</span>
                  <a className="panel-link" href="#">All →</a>
                </div>
                <div className="source-row">
                  <span className="source-dot" style={{ background: '#D9695F' }}></span>
                  <span className="source-name">infrabuild-news.com</span>
                  <span className="source-score">22</span>
                  <span className="source-trend trend-down">↓ 4</span>
                </div>
                <div className="source-row">
                  <span className="source-dot" style={{ background: '#E0B94E' }}></span>
                  <span className="source-name">dailywire-247.net</span>
                  <span className="source-score">54</span>
                  <span className="source-trend trend-down">↓ 2</span>
                </div>
                <div className="source-row">
                  <span className="source-dot" style={{ background: '#3ECFB5' }}></span>
                  <span className="source-name">reuters.com</span>
                  <span className="source-score">96</span>
                  <span className="source-trend trend-up">↑ 1</span>
                </div>
                <div className="source-row">
                  <span className="source-dot" style={{ background: '#E0B94E' }}></span>
                  <span className="source-name">local-blog.io</span>
                  <span className="source-score">48</span>
                  <span className="source-trend trend-down">↓ 6</span>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <span className="panel-title">Claim graph</span>
                </div>
                <div className="graph-teaser">
                  <div className="graph-mini-row">
                    <span className="graph-mini-node">claim_014</span>
                    <span className="graph-mini-arrow">→</span>
                    <span className="graph-mini-node">Reuters</span>
                  </div>
                  <div className="graph-mini-row">
                    <span className="graph-mini-node">claim_015</span>
                    <span className="graph-mini-arrow">→</span>
                    <span className="graph-mini-node">local-blog.io</span>
                  </div>
                  <a className="graph-cta" href="#">Explore the full graph →</a>
                </div>
              </div>

              <div className="panel">
                <div className="version-footer">
                  <span>SCORING MODEL</span>
                  <span>v1.2.0-phase1</span>
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
          transition: background .18s ease, color .18s ease;
        }

        .side-link:hover {
          background: var(--surface);
          color: var(--text);
        }

        .side-link.is-active {
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
        .trend-up { color: var(--verified); }
        .trend-down { color: var(--disputed); }

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
        .graph-cta { margin-top: 6px; font-size: 12.5px; font-weight: 600; color: var(--brass); display: flex; align-items: center; gap: 6px; }

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
