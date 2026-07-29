import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Shield,
  Code,
  Activity,
  Zap,
  Sparkles,
  X,
  Lock,
} from 'lucide-react';
import { fetchApiKeys, createApiKey, revokeApiKey } from '../api/client';
import { ApiKeyItem } from '../types';

export const ApiKeysPage: React.FC = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [selectedScope, setSelectedScope] = useState<'read_only' | 'full_access'>('read_only');
  const [createdKeySecret, setCreatedKeySecret] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const data = await fetchApiKeys();
      setKeys(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    try {
      const newKey = await createApiKey(keyName.trim(), [selectedScope]);
      if (newKey.secret_key) {
        setCreatedKeySecret(newKey.secret_key);
      }
      setKeyName('');
      loadKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to create API key');
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to revoke this API token? Any applications using it will lose access immediately.')) return;
    try {
      await revokeApiKey(keyId);
      loadKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke API key');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate(-1)}
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
              Developer API Keys & Access Tokens
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              Generate, manage, and monitor secret API keys for programmatic access to Credo's verification engine.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setCreatedKeySecret(null);
            setIsModalOpen(true);
          }}
          style={{
            background: 'var(--brass)',
            color: 'var(--ink)',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Plus size={16} /> Generate New Key
        </button>
      </header>

      {/* KPI Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(217,169,78,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Key size={20} color="var(--brass)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Active Keys
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              {keys.length} Tokens
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--verified-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="var(--verified)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Monthly API Credit
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--verified)', marginTop: '2px' }}>
              2,450 / 10k
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="var(--brass)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Rate Limit Tier
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              100 req/min
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--verified-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={20} color="var(--verified)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              API Gateway Uptime
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--verified)', marginTop: '2px' }}>
              99.98%
            </div>
          </div>
        </div>
      </div>

      {/* Error Notification */}
      {error && (
        <div style={{ background: 'var(--disputed-dim)', border: '1px solid var(--disputed)', borderRadius: '10px', padding: '14px 20px', marginBottom: '24px', color: 'var(--disputed)', fontSize: '13.5px' }}>
          {error}
        </div>
      )}

      {/* Main Keys List Section */}
      <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--line)', padding: '24px', marginBottom: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0' }}>
          Active Tokens
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
            <Sparkles size={20} color="var(--brass)" style={{ animation: 'spin 2s linear infinite', marginBottom: '8px' }} />
            <div>Loading API keys...</div>
          </div>
        ) : keys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <Lock size={36} color="var(--text-faint)" style={{ marginBottom: '12px' }} />
            <h4 style={{ fontFamily: 'var(--serif)', fontSize: '18px', margin: '0 0 6px 0' }}>No Active API Keys</h4>
            <p style={{ color: 'var(--text-dim)', fontSize: '13.5px', margin: '0 0 16px 0' }}>
              Generate your first API secret token to start building custom integrations with Credo.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {keys.map((k) => (
              <div
                key={k.id}
                style={{
                  padding: '16px 20px',
                  background: 'var(--surface-2)',
                  borderRadius: '12px',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{k.name}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--mono)',
                        padding: '2px 8px',
                        borderRadius: '100px',
                        background: 'rgba(217,169,78,0.14)',
                        color: 'var(--brass)',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      {k.scopes.join(', ')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-faint)' }}>
                    <span>Prefix: <strong style={{ color: 'var(--text)' }}>{k.prefix}...</strong></span>
                    <span>Created: {new Date(k.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => handleCopy(k.prefix, k.id)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {copiedId === k.id ? <Check size={14} color="var(--verified)" /> : <Copy size={14} />}
                    {copiedId === k.id ? 'Copied' : 'Copy Prefix'}
                  </button>

                  <button
                    onClick={() => handleRevokeKey(k.id)}
                    style={{
                      background: 'var(--disputed-dim)',
                      border: '1px solid var(--disputed)',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      color: 'var(--disputed)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Trash2 size={14} /> Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Integration Code Snippets Panel */}
      <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--line)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Code size={20} color="var(--brass)" />
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: 0 }}>
            Quickstart API Integration
          </h3>
        </div>

        <div style={{ background: '#090a0f', borderRadius: '10px', border: '1px solid var(--line)', padding: '16px', fontFamily: 'var(--mono)', fontSize: '12.5px', color: '#e2e8f0', overflowX: 'auto', lineHeight: 1.6 }}>
          <pre style={{ margin: 0 }}>
{`curl -X POST "http://localhost:8000/api/v1/content" \\
  -H "Authorization: Bearer YOUR_CR_LIVE_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Breaking news statement to evaluate..."}'`}
          </pre>
        </div>
      </div>

      {/* Create Key Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: '20px', margin: 0 }}>
                {createdKeySecret ? 'API Key Generated' : 'Generate API Secret Key'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {createdKeySecret ? (
              <div>
                <div style={{ padding: '14px', background: 'var(--verified-dim)', border: '1px solid var(--verified)', borderRadius: '10px', marginBottom: '16px', color: 'var(--verified)', fontSize: '13px' }}>
                  <strong>Important:</strong> Copy your secret key now. You will not be able to see it again!
                </div>

                <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--line)', fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--brass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <span style={{ wordBreak: 'break-all' }}>{createdKeySecret}</span>
                  <button onClick={() => handleCopy(createdKeySecret, 'secret')} style={{ background: 'transparent', border: 'none', color: 'var(--brass)', cursor: 'pointer', marginLeft: '10px' }}>
                    {copiedId === 'secret' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>

                <button onClick={() => setIsModalOpen(false)} style={{ width: '100%', background: 'var(--brass)', color: 'var(--ink)', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>Key Label Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Mobile Production App"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    required
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '8px', color: 'var(--text)', outline: 'none' }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>Token Scope</label>
                  <select
                    value={selectedScope}
                    onChange={(e) => setSelectedScope(e.target.value as any)}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '8px', color: 'var(--text)', outline: 'none' }}
                  >
                    <option value="read_only">Read Only (Analysis & Lookup)</option>
                    <option value="full_access">Full Access (Submit & Fact-Check)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '10px 18px', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ background: 'var(--brass)', color: 'var(--ink)', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                    Generate Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};