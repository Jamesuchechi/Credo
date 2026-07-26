import React, { useEffect, useState } from 'react';
import { X, History } from 'lucide-react';
import { fetchModelVersionChangelog } from '../api/client';
import { ModelVersionChangelogResponse, ModelVersionEntry } from '../types';

interface ModelVersionChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelVersionChangelogModal: React.FC<ModelVersionChangelogModalProps> = ({ isOpen, onClose }) => {
  const [changelog, setChangelog] = useState<ModelVersionChangelogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setError(null);
    fetchModelVersionChangelog()
      .then(setChangelog)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(11, 14, 20, 0.85)',
        backdropFilter: 'blur(16px)',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          position: 'relative',
          padding: '32px',
          background: 'var(--surface-2)',
          border: '1px solid var(--line-strong)',
          borderRadius: '20px',
          boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '4px',
          }}
          aria-label="Close Modal"
        >
          <X size={24} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <History size={22} color="var(--brass)" />
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '22px', fontWeight: 500, margin: 0 }}>
            Model Changelog
          </h3>
        </div>

        {isLoading && (
          <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Loading changelog...</p>
        )}

        {error && (
          <p style={{ color: 'var(--disputed)', fontSize: '14px' }}>{error}</p>
        )}

        {changelog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--surface)',
                borderRadius: '10px',
                border: '1px solid var(--line)',
                fontSize: '13px',
                fontFamily: 'var(--mono)',
                color: 'var(--brass)',
              }}
            >
              Current version: <strong>{changelog.current_version}</strong>
            </div>

            {changelog.entries.map((entry: ModelVersionEntry) => (
              <div
                key={entry.version}
                style={{
                  padding: '18px',
                  background: 'var(--surface)',
                  borderRadius: '12px',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 700, color: 'var(--brass)' }}>
                    {entry.version}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                    {entry.date}
                  </span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)', marginBottom: '8px' }}>
                  {entry.title}
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-dim)', fontSize: '13.5px', lineHeight: 1.6 }}>
                  {entry.changes.map((change: string, idx: number) => (
                    <li key={idx}>{change}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
