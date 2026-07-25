import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Readonly Marketing Column (Desktop only, hidden on mobile) */}
      <div className="auth-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2.2px solid var(--brass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} color="var(--brass)" />
          </div>
          <span style={{ fontFamily: 'var(--serif)', fontSize: '24px', fontWeight: 600, color: 'var(--text)' }}>Credo</span>
        </div>

        <div style={{ maxWidth: '440px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'var(--brass-dim)', borderRadius: '100px', fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--brass)', marginBottom: '24px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brass)' }}></span>
            ENTERPRISE TRUTH VERIFICATION
          </div>

          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '38px', lineHeight: 1.25, fontWeight: 500, marginBottom: '20px', color: 'var(--text)' }}>
            Credibility is multi-dimensional. See what’s actually true.
          </h2>

          <p style={{ color: 'var(--text-dim)', fontSize: '15px', lineHeight: 1.65, marginBottom: '32px' }}>
            Access your personal dashboard to track real-time claim verifications, domain WHOIS age signals, and independent corroborations.
          </p>

          <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-2)', border: '1px solid var(--line-strong)' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <span className="hl-badge" style={{ opacity: 1, position: 'relative', top: 0, right: 0, background: 'var(--verified-dim)', color: 'var(--verified)' }}>VERIFIED</span>
              <span className="hl-badge" style={{ opacity: 1, position: 'relative', top: 0, right: 0, background: 'var(--mislead-dim)', color: 'var(--mislead)' }}>MISLEADING</span>
              <span className="hl-badge" style={{ opacity: 1, position: 'relative', top: 0, right: 0, background: 'var(--disputed-dim)', color: 'var(--disputed)' }}>CONTRADICTED</span>
            </div>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '16px', fontStyle: 'italic', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              "Credo never gives a single opaque score. Every claim is cross-referenced with exact source provenance."
            </p>
          </div>
        </div>
      </div>

      {/* Form Column (Desktop & Mobile) */}
      <div className="auth-right" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
          <ThemeToggle />
        </div>
        <div style={{ maxWidth: '400px', width: '100%' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: '32px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
              Sign in to Credo
            </h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '14.5px' }}>
              Welcome back. Enter your credentials to access your account.
            </p>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: 'var(--disputed-dim)', border: '1px solid var(--disputed)', borderRadius: '10px', color: 'var(--disputed)', fontSize: '13.5px', marginBottom: '24px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>
                Email address
              </label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--line-strong)',
                  borderRadius: '10px',
                  padding: '13px 16px',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)' }}>
                  Password
                </label>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--line-strong)',
                  borderRadius: '10px',
                  padding: '13px 16px',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '14px',
                fontSize: '14px',
                borderRadius: '10px',
                marginTop: '8px',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-dim)', marginTop: '28px' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--brass)', fontWeight: 600 }}>
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        .auth-container {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          min-height: 100vh;
          background: var(--ink);
        }
        .auth-left {
          background: var(--ink-2);
          border-right: 1px solid var(--line);
          padding: 60px 48px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .auth-right {
          padding: 60px 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 900px) {
          .auth-container {
            grid-template-columns: 1fr;
          }
          .auth-left {
            display: none;
          }
          .auth-right {
            padding: 40px 24px;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
