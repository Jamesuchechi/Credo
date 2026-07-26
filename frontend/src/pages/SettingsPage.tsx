import React from 'react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
      </header>

      <div className="settings-card">
        <h2>Profile</h2>
        <div className="setting-row">
          <label>Full Name</label>
          <span>{user?.full_name || 'Not set'}</span>
        </div>
        <div className="setting-row">
          <label>Email</label>
          <span>{user?.email || 'Not set'}</span>
        </div>
      </div>

      <div className="settings-card">
        <h2>Appearance</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '13.5px' }}>
          Theme preferences are managed via the toggle in the topbar. Additional display settings coming soon.
        </p>
      </div>

      <div className="settings-card">
        <h2>Session</h2>
        <button className="btn-danger" onClick={logout}>
          Sign out
        </button>
      </div>

      <style>{`
        .settings-page {
          padding: 28px 32px 60px;
          max-width: 600px;
          margin: 0 auto;
        }
        .page-header {
          margin-bottom: 28px;
        }
        .page-title {
          font-family: var(--serif);
          font-size: 24px;
          font-weight: 600;
        }
        .settings-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 20px 24px;
          margin-bottom: 16px;
        }
        .settings-card h2 {
          font-family: var(--serif);
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 14px;
        }
        .setting-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--line);
        }
        .setting-row:last-child {
          border-bottom: none;
        }
        .setting-row label {
          font-size: 13px;
          color: var(--text-dim);
        }
        .setting-row span {
          font-size: 13px;
          font-weight: 500;
        }
        .btn-danger {
          background: var(--disputed);
          color: var(--ink);
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
        }
        .btn-danger:hover {
          opacity: 0.85;
        }
        .toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          z-index: 100;
        }
        .toast-success {
          background: var(--verified);
          color: var(--ink);
        }
      `}</style>
    </div>
  );
};