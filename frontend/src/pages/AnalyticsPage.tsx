import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Zap,
  Clock,
  DollarSign,
  Cpu,
  Server,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
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
              Usage Analytics & LLM Cost Monitoring
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              Track token consumption, cost-per-analysis, pipeline latency breakdown, and provider availability.
            </p>
          </div>
        </div>
      </header>

      {/* Analytics KPI Metric Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(217,169,78,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={20} color="var(--brass)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Total API Volume
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              18,420 Calls
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--verified-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={20} color="var(--verified)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Monthly LLM Cost
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--verified)', marginTop: '2px' }}>
              $14.28
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} color="var(--brass)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Avg Pipeline Latency
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              240ms
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--verified-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="var(--verified)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Gateway Success Rate
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--verified)', marginTop: '2px' }}>
              99.98%
            </div>
          </div>
        </div>
      </div>

      {/* Provider Performance Grid */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0' }}>
          LLM Provider Performance Breakdown
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ padding: '18px', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Cpu size={18} color="var(--brass)" />
              <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text)' }}>Groq Llama-3</div>
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginBottom: '8px' }}>
              Role: Fast Claim Extraction & Scoring
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--verified)', fontFamily: 'var(--mono)' }}>
              85ms Latency · $0.0008 / call
            </div>
          </div>

          <div style={{ padding: '18px', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Server size={18} color="var(--brass)" />
              <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text)' }}>OpenRouter Claude-3</div>
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginBottom: '8px' }}>
              Role: Deep Reasoning Chain & Satire Detection
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brass)', fontFamily: 'var(--mono)' }}>
              420ms Latency · $0.0024 / call
            </div>
          </div>

          <div style={{ padding: '18px', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Zap size={18} color="var(--brass)" />
              <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text)' }}>Whisper Speech-to-Text</div>
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginBottom: '8px' }}>
              Role: Audio / Video Broadcast Parsing
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--verified)', fontFamily: 'var(--mono)' }}>
              1.2s Latency · $0.0010 / call
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
