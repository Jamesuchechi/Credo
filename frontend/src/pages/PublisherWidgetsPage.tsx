import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';

export const PublisherWidgetsPage: React.FC = () => {
  const navigate = useNavigate();

  const [theme, setTheme] = useState<'dark' | 'light' | 'brass'>('dark');
  const [badgeSize, setBadgeSize] = useState<'pill' | 'card' | 'banner'>('card');
  const [copied, setCopied] = useState(false);

  const embedCode = `<script src="https://credo-verify.org/widget.js" 
  data-publisher-id="pub_live_89f2a" 
  data-theme="${theme}" 
  data-style="${badgeSize}" 
  async></script>
<div id="credo-trust-seal"></div>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 600, margin: 0 }}>
              Publisher & Newsroom Trust Badges Hub
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              Embed Credo's verified trust seal JS widget onto your publication website to surface real-time factual integrity score.
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid: Customizer on Left, Live Preview & Code on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', marginBottom: '32px' }}>
        {/* Widget Customizer Controls */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0' }}>
            Widget Configuration
          </h3>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '8px' }}>
              Seal Visual Theme
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['dark', 'light', 'brass'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  style={{
                    flex: 1,
                    background: theme === t ? 'var(--brass)' : 'var(--surface-2)',
                    color: theme === t ? 'var(--ink)' : 'var(--text)',
                    border: '1px solid var(--line)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontFamily: 'var(--mono)',
                    fontWeight: theme === t ? 700 : 500,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {t} Theme
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '8px' }}>
              Badge Form Factor
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['pill', 'card', 'banner'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setBadgeSize(s)}
                  style={{
                    flex: 1,
                    background: badgeSize === s ? 'var(--brass)' : 'var(--surface-2)',
                    color: badgeSize === s ? 'var(--ink)' : 'var(--text)',
                    border: '1px solid var(--line)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontFamily: 'var(--mono)',
                    fontWeight: badgeSize === s ? 700 : 500,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {s} Layout
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '10px', fontSize: '12.5px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text)' }}>Note:</strong> Embeddable trust seals automatically link to your publication's public track-record audit page, building verified reader trust.
          </div>
        </div>

        {/* Live Interactive Preview Panel */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0' }}>
              Live Widget Preview
            </h3>

            {/* Interactive Rendered Seal */}
            <div
              style={{
                padding: '24px',
                borderRadius: '12px',
                background: theme === 'light' ? '#ffffff' : theme === 'brass' ? '#1b170e' : '#090a0f',
                border: theme === 'brass' ? '1px solid var(--brass)' : '1px solid var(--line)',
                color: theme === 'light' ? '#0f172a' : '#f1eee6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--verified)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>Verified Factual Outlet</div>
                  <div style={{ fontSize: '11px', opacity: 0.7, fontFamily: 'var(--mono)' }}>Indexed by Credo Scoring Engine</div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--verified)' }}>
                  94.8%
                </div>
                <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', opacity: 0.7 }}>
                  Trust Score
                </div>
              </div>
            </div>
          </div>

          {/* Copyable HTML Code Box */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                Embed Code Snippet
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  color: 'var(--brass)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--mono)',
                }}
              >
                {copied ? <Check size={14} color="var(--verified)" /> : <Copy size={14} />}
                {copied ? 'Copied HTML' : 'Copy Code'}
              </button>
            </div>

            <div style={{ background: '#090a0f', borderRadius: '8px', border: '1px solid var(--line)', padding: '12px', fontFamily: 'var(--mono)', fontSize: '11.5px', color: '#e2e8f0', overflowX: 'auto' }}>
              <pre style={{ margin: 0 }}>{embedCode}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
