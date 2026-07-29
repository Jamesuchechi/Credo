import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Home,
  PlusCircle,
  History as HistoryIcon,
  Globe,
  Share2,
  Key,
  User,
  Settings,
  LogOut,
  Flame,
  Code,
  BarChart2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `side-link ${isActive ? 'is-active' : ''}`;

  return (
    <aside className="sidebar">
      <div className="side-brand">
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '2px solid var(--brass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShieldCheck size={16} color="var(--brass)" />
        </div>
        Credo
      </div>

      <nav className="side-nav">
        {/* SECTION 1: MAIN */}
        <div className="nav-group-label">MAIN</div>
        <NavLink to="/dashboard" end className={navLink}>
          <Home size={16} /> Overview
        </NavLink>
        <NavLink to="/dashboard/analyze" className={navLink}>
          <PlusCircle size={16} /> Analyze
        </NavLink>
        <NavLink to="/dashboard/history" className={navLink}>
          <HistoryIcon size={16} /> History
        </NavLink>
        <NavLink to="/dashboard/trending" className={navLink}>
          <Flame size={16} /> Trending Feed
        </NavLink>

        {/* SECTION 2: INTELLIGENCE & COMMUNITY */}
        <div className="nav-group-label" style={{ marginTop: '16px' }}>INTELLIGENCE</div>
        <NavLink to="/dashboard/sources" className={navLink}>
          <Globe size={16} /> Sources
        </NavLink>
        <NavLink to="/dashboard/review-queue" className={navLink}>
          <ShieldCheck size={16} /> Expert Queue
        </NavLink>
        <NavLink to="/dashboard/claim-graph" className={navLink}>
          <Share2 size={16} /> Claim Graph
        </NavLink>

        {/* SECTION 3: DEVELOPER & PLATFORM */}
        <div className="nav-group-label" style={{ marginTop: '16px' }}>DEVELOPER</div>
        <NavLink to="/dashboard/api-keys" className={navLink}>
          <Key size={16} /> API Keys
        </NavLink>
        <NavLink to="/dashboard/publisher-widgets" className={navLink}>
          <Code size={16} /> Publisher Badges
        </NavLink>
        <NavLink to="/dashboard/analytics" className={navLink}>
          <BarChart2 size={16} /> Usage Analytics
        </NavLink>

        <div className="side-spacer"></div>

        {/* SECTION 4: ACCOUNT */}
        <div className="nav-group-label">ACCOUNT</div>
        <NavLink to="/dashboard/profile" className={navLink}>
          <User size={16} /> Profile
        </NavLink>
        <NavLink to="/dashboard/settings" className={navLink}>
          <Settings size={16} /> Settings
        </NavLink>

        <div className="side-user" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/profile')}>
          <div className="side-avatar">{userInitials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="side-user-name">{user?.full_name || 'User'}</div>
            <div className="side-user-role">{user?.email || 'Workspace admin'}</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            title="Log out"
            style={{ color: 'var(--text-faint)', padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      <style>{`
        .nav-group-label {
          font-family: var(--mono);
          font-size: 10px;
          font-weight: 700;
          color: var(--text-faint);
          letter-spacing: 0.08em;
          padding: 6px 10px 4px;
        }
      `}</style>
    </aside>
  );
};
