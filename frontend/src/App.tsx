import React, { useEffect, useState } from 'react';
import { ShieldCheck, Activity, Database, Server } from 'lucide-react';
import { fetchHealth } from './api/client';
import { HealthResponse } from './types';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth()
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to connect to Credo API');
        setLoading(false);
      });
  }, []);

  return (
    <main style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', width: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <ShieldCheck size={40} color="#06b6d4" />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, background: 'linear-gradient(to right, #06b6d4, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Credo Engine
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Multi-Modal Credibility Infrastructure Engine
        </p>
      </header>

      <section className="glass-card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color="#3b82f6" /> System Status & Health
        </h2>

        {loading && <p style={{ color: 'var(--text-secondary)' }}>Connecting to backend...</p>}

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '8px' }}>
            <strong>Connection Error:</strong> {error}
          </div>
        )}

        {health && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '4px' }}>
                <Server size={16} /> Backend API
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: health.status === 'ok' ? '#10b981' : '#f59e0b' }}>
                {health.status.toUpperCase()} (v{health.version})
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '4px' }}>
                <Database size={16} /> Redis Cache
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: health.redis === 'connected' ? '#10b981' : '#ef4444' }}>
                {health.redis.toUpperCase()}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
