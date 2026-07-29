import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Flame,
  TrendingUp,
  ShieldCheck,
  Search,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { AnalysisModal } from '../components/AnalysisModal';

interface TrendingClaimItem {
  id: string;
  claim: string;
  category: string;
  virality_score: number;
  spread_velocity: 'Critical Spike' | 'High Velocity' | 'Moderate';
  verdict: 'disputed' | 'verified' | 'mixed';
  source_count: number;
  emotional_score: number;
  reported_at: string;
}

const TRENDING_MOCK_DATA: TrendingClaimItem[] = [
  {
    id: '7ce601c5-d8c1-49a6-b732-d8ea6eed3baf',
    claim: 'Central Bank Emergency Currency Devaluation Announcement for Q3',
    category: 'Economy',
    virality_score: 94,
    spread_velocity: 'Critical Spike',
    verdict: 'disputed',
    source_count: 14,
    emotional_score: 88,
    reported_at: '2 hours ago',
  },
  {
    id: 'a9f182c4-33d1-41b6-a212-e8ef4eed11aa',
    claim: 'National Electoral Commission Extends Voter Registration Deadline by 30 Days',
    category: 'Politics',
    virality_score: 86,
    spread_velocity: 'High Velocity',
    verdict: 'verified',
    source_count: 22,
    emotional_score: 42,
    reported_at: '4 hours ago',
  },
  {
    id: 'b12c89f4-11e2-45a1-99c8-d1ab3eed22bb',
    claim: 'New Regional Fuel Subsidy Pact Signed in Abuja Summit',
    category: 'Economy',
    virality_score: 78,
    spread_velocity: 'High Velocity',
    verdict: 'mixed',
    source_count: 8,
    emotional_score: 65,
    reported_at: '6 hours ago',
  },
  {
    id: 'c34d90e5-22f3-46b2-88d9-e2bc4eed33cc',
    claim: 'Outbreak of Unverified Respiratory Virus Reported Across Border Stations',
    category: 'Public Health',
    virality_score: 91,
    spread_velocity: 'Critical Spike',
    verdict: 'disputed',
    source_count: 5,
    emotional_score: 95,
    reported_at: '8 hours ago',
  },
];

export const TrendingFeedPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let items = [...TRENDING_MOCK_DATA];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) => i.claim.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }

    if (activeCategory !== 'all') {
      items = items.filter((i) => i.category.toLowerCase() === activeCategory.toLowerCase());
    }

    return items;
  }, [activeCategory, searchQuery]);

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
              Trending Misinformation & Virality Monitor
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              Real-time feed of viral claims circulating across web and social networks, ranked by spread risk and emotional manipulation.
            </p>
          </div>
        </div>
      </header>

      {/* KPI Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(217,105,95,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={20} color="var(--disputed)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Viral Spikes Today
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--disputed)', marginTop: '2px' }}>
              4 Active
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(217,169,78,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={20} color="var(--brass)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Avg Virality Risk
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              87.2%
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--verified-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} color="var(--verified)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Debunked & Verified
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--verified)', marginTop: '2px' }}>
              3 Claims
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={20} color="var(--brass)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Top Vector Category
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
              Economy
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          background: 'var(--surface)',
          padding: '14px 18px',
          borderRadius: '12px',
          border: '1px solid var(--line)',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, background: 'var(--surface-2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
          <Search size={14} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="Search viral claims or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontSize: '13px',
              outline: 'none',
              width: '100%',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(['all', 'economy', 'politics', 'public health'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                background: activeCategory === cat ? 'var(--brass)' : 'transparent',
                color: activeCategory === cat ? 'var(--ink)' : 'var(--text-dim)',
                border: activeCategory === cat ? 'none' : '1px solid var(--line)',
                borderRadius: '100px',
                padding: '4px 12px',
                fontSize: '11.5px',
                fontFamily: 'var(--mono)',
                fontWeight: activeCategory === cat ? 700 : 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Virality Stream Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredItems.map((item) => {
          const isDis = item.verdict === 'disputed';
          const isSupp = item.verdict === 'verified';
          const vColor = isSupp ? 'var(--verified)' : isDis ? 'var(--disputed)' : 'var(--brass)';
          const vBg = isSupp ? 'var(--verified-dim)' : isDis ? 'var(--disputed-dim)' : 'rgba(217,169,78,0.14)';

          return (
            <div
              key={item.id}
              onClick={() => setActiveAnalysisId(item.id)}
              style={{
                padding: '24px',
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--brass)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--line)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--mono)',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '100px',
                      background: item.spread_velocity === 'Critical Spike' ? 'var(--disputed-dim)' : 'rgba(217,169,78,0.14)',
                      color: item.spread_velocity === 'Critical Spike' ? 'var(--disputed)' : 'var(--brass)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.spread_velocity}
                  </span>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-faint)' }}>
                    Category: <strong style={{ color: 'var(--text)' }}>{item.category}</strong> · Reported {item.reported_at}
                  </span>
                </div>

                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px', lineHeight: 1.4 }}>
                  "{item.claim}"
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                  <span>Emotional Sensitivity: <strong style={{ color: 'var(--disputed)' }}>{item.emotional_score}%</strong></span>
                  <span>Cross-Checked Outlets: <strong style={{ color: 'var(--verified)' }}>{item.source_count} sources</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--disputed)' }}>
                    {item.virality_score}%
                  </div>
                  <div style={{ fontSize: '10.5px', fontFamily: 'var(--mono)', color: 'var(--text-faint)' }}>
                    Virality Risk
                  </div>
                </div>

                <span
                  style={{
                    padding: '6px 14px',
                    borderRadius: '100px',
                    fontSize: '11.5px',
                    fontFamily: 'var(--mono)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: vBg,
                    color: vColor,
                  }}
                >
                  {item.verdict}
                </span>

                <ChevronRight size={18} color="var(--text-faint)" />
              </div>
            </div>
          );
        })}
      </div>

      <AnalysisModal contentId={activeAnalysisId} onClose={() => setActiveAnalysisId(null)} />
    </div>
  );
};
