import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

/**
 * DashboardLayout wraps all protected dashboard routes.
 * It renders the persistent Sidebar on the left and the
 * page content (via <Outlet />) on the right.
 */
export const DashboardLayout: React.FC = () => {
  return (
    <div className="dash-app">
      <Sidebar />
      <div className="main">
        <Outlet />
      </div>

      <style>{`
        .dash-app {
          display: grid;
          grid-template-columns: 240px 1fr;
          min-height: 100vh;
          background: var(--ink);
          color: var(--text);
        }

        /* ── Sidebar ─────────────────────────────── */
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

        /* ── Main area ───────────────────────────── */
        .main {
          min-width: 0;
        }

        /* ── Responsive ──────────────────────────── */
        @media (max-width: 800px) {
          .dash-app { grid-template-columns: 1fr; }
          .sidebar  { display: none; }
        }
      `}</style>
    </div>
  );
};
