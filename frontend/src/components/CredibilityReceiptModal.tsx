import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ShieldCheck, Lock, ExternalLink, RefreshCw } from 'lucide-react';
import { ContentAnalysisResponse } from '../types';

export interface CredibilityReceiptData {
  public_slug: string;
  issued_at: string;
  verdict_summary: {
    composite_score: number;
    verdict_label: string;
    claims_count: number;
    supported_claims: number;
    contradicted_claims: number;
    unverified_claims: number;
    corroboration_percentage: number;
    dimension_scores?: Record<string, number>;
    model_version?: string;
    snapshot_notice?: string;
  };
  signature: string;
  is_valid_signature: boolean;
  public_url: string;
  verification_page_url: string;
}

interface CredibilityReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ContentAnalysisResponse;
}

export const CredibilityReceiptModal: React.FC<CredibilityReceiptModalProps> = ({
  isOpen,
  onClose,
  analysis,
}) => {
  const [receipt, setReceipt] = useState<CredibilityReceiptData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const baseUrl = window.location.origin;

  useEffect(() => {
    if (isOpen && analysis?.content_id) {
      issueOrFetchReceipt();
    }
  }, [isOpen, analysis?.content_id]);

  const issueOrFetchReceipt = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('credo_access_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/v1/content/${analysis.content_id}/receipt`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to issue credibility receipt');
      }

      const receiptData: CredibilityReceiptData = await res.json();
      setReceipt(receiptData);
    } catch (err: any) {
      setError(err.message || 'Error communicating with receipt server');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const publicLink = receipt ? `${baseUrl}/api/v1/receipts/${receipt.public_slug}` : '';
  const embedScriptSnippet = receipt
    ? `<script src="${baseUrl}/api/v1/receipts/${receipt.public_slug}/embed.js" async></script>`
    : '';
  const badgeSvgSnippet = receipt
    ? `[![Credo Receipt](${baseUrl}/api/v1/receipts/${receipt.public_slug}/badge.svg)](${publicLink})`
    : '';

  const score = receipt?.verdict_summary?.composite_score ?? (analysis.composite_score ?? 0);
  const scoreColor = score >= 80 ? 'var(--verified)' : score >= 60 ? 'var(--brass)' : 'var(--disputed)';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(11, 14, 20, 0.85)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: '620px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          padding: '28px',
          background: 'var(--surface-2)',
          border: '1px solid var(--line-strong)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            color: 'var(--text-dim)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(129, 140, 248, 0.1)',
              border: '1px solid rgba(129, 140, 248, 0.25)',
              color: '#818cf8',
            }}
          >
            <Lock size={24} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '22px', fontWeight: 600, margin: 0 }}>
              Signed Credibility Receipt
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>
              Cryptographically signed point-in-time verdict certificate
            </p>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>Generating HMAC-SHA256 Signed Receipt...</p>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '16px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid var(--disputed)',
              borderRadius: '12px',
              color: 'var(--disputed)',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            Failed to issue receipt: {error}
          </div>
        )}

        {receipt && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Signed Badge Certificate Box */}
            <div
              style={{
                padding: '20px',
                background: 'var(--surface)',
                borderRadius: '14px',
                border: `1px solid ${scoreColor}`,
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color={scoreColor} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
                    POINT-IN-TIME VERIFICATION SNAPSHOT
                  </span>
                </div>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '100px',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--verified)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  ✓ Signature Authentic
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '32px', fontWeight: 800, color: scoreColor, fontFamily: 'var(--mono)' }}>
                  {score.toFixed(1)}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
                  {receipt.verdict_summary.verdict_label}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px', fontFamily: 'var(--mono)', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block' }}>Supported</span>
                  <strong style={{ color: 'var(--verified)' }}>{receipt.verdict_summary.supported_claims} Claims</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block' }}>Contradicted</span>
                  <strong style={{ color: 'var(--disputed)' }}>{receipt.verdict_summary.contradicted_claims} Claims</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block' }}>Issued Date</span>
                  <strong style={{ color: 'var(--text)' }}>{new Date(receipt.issued_at).toLocaleDateString()}</strong>
                </div>
              </div>
            </div>

            {/* Cryptographic Signature Key Section */}
            <div style={{ background: 'var(--ink)', padding: '14px', borderRadius: '10px', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--brass)', fontWeight: 600 }}>
                  HMAC-SHA256 Signature (Tamper Detection)
                </span>
                <span style={{ fontSize: '10.5px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                  Slug: {receipt.public_slug}
                </span>
              </div>
              <code style={{ fontSize: '11px', color: '#4ade80', fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>
                {receipt.signature}
              </code>
            </div>

            {/* Public Link & Embed Code Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Option 1: Public URL */}
              <div>
                <label style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                  Public Verification Endpoint URL
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={publicLink}
                    style={{
                      flex: 1,
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'var(--text)',
                      fontSize: '12px',
                      fontFamily: 'var(--mono)',
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(publicLink, 'link')}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      color: 'var(--text)',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {copiedType === 'link' ? <Check size={14} color="var(--verified)" /> : <Copy size={14} />}
                    {copiedType === 'link' ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={publicLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'var(--brass)',
                      color: 'var(--ink)',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <ExternalLink size={14} />
                    Open
                  </a>
                </div>
              </div>

              {/* Option 2: JS Embed Script */}
              <div>
                <label style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                  JavaScript Publisher Embed Snippet
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={embedScriptSnippet}
                    style={{
                      flex: 1,
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'var(--text)',
                      fontSize: '12px',
                      fontFamily: 'var(--mono)',
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(embedScriptSnippet, 'script')}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      color: 'var(--text)',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {copiedType === 'script' ? <Check size={14} color="var(--verified)" /> : <Copy size={14} />}
                    {copiedType === 'script' ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
              </div>

              {/* Option 3: SVG Badge Markdown */}
              <div>
                <label style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                  Markdown Badge Snippet (for GitHub / Articles)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={badgeSvgSnippet}
                    style={{
                      flex: 1,
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'var(--text)',
                      fontSize: '12px',
                      fontFamily: 'var(--mono)',
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(badgeSvgSnippet, 'badge')}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      color: 'var(--text)',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {copiedType === 'badge' ? <Check size={14} color="var(--verified)" /> : <Copy size={14} />}
                    {copiedType === 'badge' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
