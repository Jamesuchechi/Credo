import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await register({ full_name: fullName, email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
            START YOUR FREE TRIAL
          </div>

          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '38px', lineHeight: 1.25, fontWeight: 500, marginBottom: '20px', color: 'var(--text)' }}>
            Join the next generation of truth verification.
          </h2>

          <p style={{ color: 'var(--text-dim)', fontSize: '15px', lineHeight: 1.65, marginBottom: '32px' }}>
            Get instant access to automated claim extraction, domain reputation scoring, and corroboration across global news wire APIs.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14.5px', color: 'var(--text-dim)' }}>
              <CheckCircle2 size={18} color="var(--verified)" style={{ flexShrink: 0 }} />
              <span>Multi-dimensional composite scoring (0–100)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14.5px', color: 'var(--text-dim)' }}>
              <CheckCircle2 size={18} color="var(--verified)" style={{ flexShrink: 0 }} />
              <span>Automatic WHOIS domain age & satire identification</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14.5px', color: 'var(--text-dim)' }}>
              <CheckCircle2 size={18} color="var(--verified)" style={{ flexShrink: 0 }} />
              <span>News API, GNews & Google Fact Check corroboration</span>
            </div>
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
              Create your account
            </h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '14.5px' }}>
              Start verifying claims in seconds. No credit card required.
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
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>
                Password (min 8 chars)
              </label>
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
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-dim)', marginTop: '28px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--brass)', fontWeight: 600 }}>
              Sign in
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
