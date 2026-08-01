import React, { useState, useEffect } from 'react';
import { X, GitBranch, AlertTriangle, RefreshCw, ArrowDown } from 'lucide-react';

export interface DiffToken {
  text: string;
  type: 'equal' | 'added' | 'deleted';
}

export interface MutationNode {
  claim_id: string;
  content_item_id: string;
  claim_text: string;
  extracted_speaker?: string;
  verdict: string;
  confidence_score: number;
  mutation_score?: number;
  is_target: boolean;
  is_root: boolean;
  parent_claim_id?: string;
  title?: string;
  url?: string;
  created_at?: string;
  diff_from_parent: DiffToken[];
}

export interface MutationChainData {
  target_claim_id: string;
  root_claim_id: string;
  origin_disclaimer: string;
  chain_length: number;
  nodes: MutationNode[];
}

interface ClaimMutationModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimId: string;
}

export const ClaimMutationModal: React.FC<ClaimMutationModalProps> = ({
  isOpen,
  onClose,
  claimId,
}) => {
  const [chain, setChain] = useState<MutationChainData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && claimId) {
      fetchMutationChain();
    }
  }, [isOpen, claimId]);

  const fetchMutationChain = async () => {
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

      const res = await fetch(`/api/v1/claims/${claimId}/mutation-chain`, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to load claim mutation chain');
      }

      const chainData: MutationChainData = await res.json();
      setChain(chainData);
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
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
          maxWidth: '700px',
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
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              color: 'var(--brass)',
            }}
          >
            <GitBranch size={24} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '22px', fontWeight: 600, margin: 0 }}>
              Claim Mutation & Telephone Drift Lineage
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>
              Track how this statement mutated across reports and platforms
            </p>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>Analyzing claim mutation lineage graph...</p>
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
            {error}
          </div>
        )}

        {chain && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Origin Disclaimer Callout */}
            <div
              style={{
                padding: '14px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '12.5px',
                color: 'var(--text-dim)',
                lineHeight: 1.45,
              }}
            >
              <AlertTriangle size={18} color="var(--brass)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '2px' }}>
                  Earliest Indexed Entry Disclaimer
                </strong>
                {chain.origin_disclaimer}
              </div>
            </div>

            {/* Lineage Tree Sequence */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {chain.nodes.map((node, index) => {
                const verdictColor =
                  node.verdict === 'supported'
                    ? 'var(--verified)'
                    : node.verdict === 'contradicted'
                    ? 'var(--disputed)'
                    : 'var(--brass)';

                return (
                  <React.Fragment key={node.claim_id}>
                    {index > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brass)' }}>
                        <ArrowDown size={20} />
                      </div>
                    )}

                    <div
                      style={{
                        padding: '18px',
                        background: node.is_target ? 'rgba(129, 140, 248, 0.08)' : 'var(--surface)',
                        border: node.is_target ? '1px solid #818cf8' : '1px solid var(--line)',
                        borderRadius: '14px',
                        position: 'relative',
                      }}
                    >
                      {/* Node Header Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontFamily: 'var(--mono)',
                              fontWeight: 700,
                              background: node.is_root ? 'rgba(234, 179, 8, 0.15)' : 'var(--surface-2)',
                              color: node.is_root ? 'var(--brass)' : 'var(--text-dim)',
                              border: node.is_root ? '1px solid var(--brass)' : '1px solid var(--line)',
                            }}
                          >
                            {node.is_root ? '🌱 ROOT ENTRY' : `VAR #${index + 1}`}
                          </span>

                          {node.is_target && (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontFamily: 'var(--mono)',
                                fontWeight: 700,
                                background: 'rgba(129, 140, 248, 0.2)',
                                color: '#818cf8',
                                border: '1px solid #818cf8',
                              }}
                            >
                              CURRENT AUDITED CLAIM
                            </span>
                          )}
                        </div>

                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '100px',
                            fontSize: '11px',
                            fontFamily: 'var(--mono)',
                            fontWeight: 700,
                            color: verdictColor,
                            border: `1px solid ${verdictColor}`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {node.verdict} ({node.confidence_score}%)
                        </span>
                      </div>

                      {/* Word-level diff display */}
                      <div
                        style={{
                          fontSize: '14px',
                          color: 'var(--text)',
                          lineHeight: 1.6,
                          marginBottom: '12px',
                          wordBreak: 'break-word',
                        }}
                      >
                        {node.diff_from_parent.map((token, tIdx) => {
                          if (token.type === 'added') {
                            return (
                              <span
                                key={tIdx}
                                style={{
                                  background: 'rgba(34, 197, 94, 0.2)',
                                  color: '#4ade80',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  margin: '0 2px',
                                  fontWeight: 600,
                                }}
                              >
                                +{token.text}
                              </span>
                            );
                          }
                          if (token.type === 'deleted') {
                            return (
                              <span
                                key={tIdx}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  color: '#f87171',
                                  textDecoration: 'line-through',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  margin: '0 2px',
                                }}
                              >
                                -{token.text}
                              </span>
                            );
                          }
                          return <span key={tIdx}> {token.text} </span>;
                        })}
                      </div>

                      {/* Node Metadata Footer */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11.5px',
                          fontFamily: 'var(--mono)',
                          color: 'var(--text-dim)',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--line)',
                        }}
                      >
                        <div>
                          Speaker: <strong style={{ color: 'var(--text)' }}>{node.extracted_speaker || 'Unattributed'}</strong>
                        </div>
                        {node.created_at && (
                          <div>Indexed: {new Date(node.created_at).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
