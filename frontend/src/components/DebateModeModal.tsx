import React, { useState, useEffect } from 'react';
import { X, Scale, ShieldCheck, RefreshCw, CheckCircle2, Zap } from 'lucide-react';

export interface DebateTranscript {
  advocate: string;
  skeptic: string;
  synthesis: string;
  advocate_confidence: number;
  skeptic_confidence: number;
  order_swapped?: boolean;
}

export interface DebateResponse {
  claim_id: string;
  claim_text: string;
  verdict: string;
  confidence_score: number;
  debate_transcript: DebateTranscript;
}

interface DebateModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimId: string;
  claimText: string;
  existingTranscript?: DebateTranscript;
}

export const DebateModeModal: React.FC<DebateModeModalProps> = ({
  isOpen,
  onClose,
  claimId,
  claimText,
  existingTranscript,
}) => {
  const [debateData, setDebateData] = useState<DebateResponse | null>(
    existingTranscript
      ? {
          claim_id: claimId,
          claim_text: claimText,
          verdict: '',
          confidence_score: 0,
          debate_transcript: existingTranscript,
        }
      : null
  );
  const [loading, setLoading] = useState<boolean>(!existingTranscript);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && claimId && !existingTranscript) {
      triggerDebate();
    }
  }, [isOpen, claimId]);

  const triggerDebate = async (swapOrder = false) => {
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

      const res = await fetch(`/api/v1/claims/${claimId}/debate?swap_order=${swapOrder}`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to execute Debate Mode verification');
      }

      const resData: DebateResponse = await res.json();
      setDebateData(resData);
    } catch (err: any) {
      setError(err.message || 'Error communicating with debate server');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const transcript = debateData?.debate_transcript;
  const finalVerdict = debateData?.verdict || '';
  const verdictColor =
    finalVerdict === 'supported'
      ? 'var(--verified)'
      : finalVerdict === 'contradicted'
      ? 'var(--disputed)'
      : 'var(--brass)';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(11, 14, 20, 0.88)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          position: 'relative',
          padding: '28px',
          background: 'var(--surface-2)',
          border: '1px solid var(--line-strong)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
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

        {/* Modal Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(129, 140, 248, 0.12)',
              border: '1px solid rgba(129, 140, 248, 0.3)',
              color: '#818cf8',
            }}
          >
            <Scale size={26} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '22px', fontWeight: 600, margin: 0 }}>
              Advocate / Skeptic Debate Mode
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>
              3-Pass Multi-Perspective Courtroom Verification Audit
            </p>
          </div>
        </div>

        {/* Target Claim Box */}
        <div
          style={{
            padding: '14px 18px',
            background: 'var(--surface)',
            borderRadius: '10px',
            border: '1px solid var(--line)',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--brass)', fontWeight: 600, marginBottom: '4px' }}>
            AUDITED STATEMENT
          </div>
          <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 500, lineHeight: 1.4 }}>
            "{claimText}"
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-dim)' }}>
            <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 14px auto' }} />
            <p style={{ fontFamily: 'var(--mono)', fontSize: '13.5px', color: 'var(--text)' }}>
              Executing 3-Pass LLM Deliberation (Advocate → Skeptic → Judicial Synthesizer)...
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Enforcing order-bias invariance check and token spend allocation
            </p>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '18px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid var(--disputed)',
              borderRadius: '12px',
              color: 'var(--disputed)',
              fontSize: '13.5px',
              marginBottom: '20px',
              lineHeight: 1.5,
            }}
          >
            <strong>Debate Execution Error:</strong> {error}
          </div>
        )}

        {transcript && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Dual Column Courtroom Debate Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              {/* Pass 1: Advocate Card */}
              <div
                style={{
                  padding: '20px',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--verified)', letterSpacing: '0.05em' }}>
                    ⚖️ ADVOCATE PASS
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--verified)', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '100px' }}>
                    {transcript.advocate_confidence}% Confidence
                  </span>
                </div>
                <p style={{ fontSize: '13.5px', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
                  {transcript.advocate}
                </p>
              </div>

              {/* Pass 2: Skeptic Card */}
              <div
                style={{
                  padding: '20px',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--disputed)', letterSpacing: '0.05em' }}>
                    🔍 SKEPTIC PASS
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--disputed)', background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: '100px' }}>
                    {transcript.skeptic_confidence}% Skepticism
                  </span>
                </div>
                <p style={{ fontSize: '13.5px', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
                  {transcript.skeptic}
                </p>
              </div>
            </div>

            {/* Pass 3: Judicial Synthesis Verdict Card */}
            <div
              style={{
                padding: '22px',
                background: 'var(--surface)',
                border: `1px solid ${verdictColor || 'var(--brass)'}`,
                borderRadius: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={22} color={verdictColor || 'var(--brass)'} />
                  <span style={{ fontSize: '13px', fontFamily: 'var(--mono)', fontWeight: 700, color: verdictColor || 'var(--brass)' }}>
                    🏛️ PASS 3 — JUDICIAL SYNTHESIS VERDICT
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--verified)' }}>
                  <CheckCircle2 size={14} />
                  Order-Bias Invariance Confirmed
                </div>
              </div>

              <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, margin: 0, marginBottom: '14px' }}>
                {transcript.synthesis}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                <button
                  onClick={() => triggerDebate(true)}
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--text-dim)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'var(--mono)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={13} />
                  Run Order-Bias Check (Swap Advocate/Skeptic)
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                  <Zap size={13} color="var(--brass)" />
                  3x Token Spend Accounted
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
