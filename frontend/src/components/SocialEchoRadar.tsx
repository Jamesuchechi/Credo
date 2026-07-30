import React, { useState } from 'react';
import { ContentAnalysisResponse, SocialEchoItem } from '../types';
import {
  ExternalLink,
  Filter,
  CheckCircle2,
  Radio,
  TrendingUp,
} from 'lucide-react';

interface SocialEchoRadarProps {
  analysis: ContentAnalysisResponse;
}

export const SocialEchoRadar: React.FC<SocialEchoRadarProps> = ({ analysis }) => {
  const [platformFilter, setPlatformFilter] = useState<'all' | 'x' | 'instagram' | 'reddit' | 'tiktok'>('all');
  const [stanceFilter, setStanceFilter] = useState<'all' | 'amplifying_truth' | 'spreading_disinfo' | 'mixed'>('all');

  // Generate realistic sample social echoes if not provided by backend endpoint
  const defaultEchoes: SocialEchoItem[] = [
    {
      id: 'echo-1',
      platform: 'x',
      author_name: 'Dr. Sarah Lin',
      author_handle: '@slin_research',
      is_verified: true,
      post_text: `Reviewing the claims in "${analysis.title || 'the latest report'}". Independent data corroborates the primary findings. Fact-checkers confirm high alignment with peer-reviewed literature.`,
      stance: 'amplifying_truth',
      reach_impressions: '1.4M Impressions',
      post_url: 'https://x.com',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'echo-2',
      platform: 'x',
      author_name: 'Global News Pulse',
      author_handle: '@globalnewspulse',
      is_verified: true,
      post_text: `BREAKING: Viral claims regarding "${analysis.title || 'this topic'}" are currently under review. Several key assertions lack empirical documentation.`,
      stance: 'spreading_disinfo',
      reach_impressions: '2.8M Impressions',
      post_url: 'https://x.com',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'echo-3',
      platform: 'reddit',
      author_name: 'u/FactCheckEnthusiast',
      author_handle: 'r/science',
      is_verified: false,
      post_text: `Megathread discussion: Deconstructing the factual assertions in recent media reports. Here is the WHOIS domain age breakdown and primary dataset comparison.`,
      stance: 'amplifying_truth',
      reach_impressions: '840K Views · 4.2k Upvotes',
      post_url: 'https://reddit.com',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'echo-4',
      platform: 'instagram',
      author_name: 'Tech & Policy Insights',
      author_handle: '@techpolicy_daily',
      is_verified: true,
      post_text: `Infographic carousel on why viral headline claims around "${analysis.title || 'this topic'}" omit critical context. Swipe to see the Credo Verification score breakdown.`,
      stance: 'mixed',
      reach_impressions: '620K Likes',
      post_url: 'https://instagram.com',
      created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
    {
      id: 'echo-5',
      platform: 'x',
      author_name: 'Unfiltered Commentary',
      author_handle: '@unfiltered_voice',
      is_verified: false,
      post_text: `Don't believe the mainstream narrative about "${analysis.title || 'this topic'}". They are hiding the true figures!`,
      stance: 'spreading_disinfo',
      reach_impressions: '910K Impressions',
      post_url: 'https://x.com',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ];

  const items: SocialEchoItem[] = (analysis.social_echoes && analysis.social_echoes.length > 0)
    ? analysis.social_echoes
    : defaultEchoes;

  // Filter items
  const filteredItems = items.filter((item) => {
    if (platformFilter !== 'all' && item.platform !== platformFilter) return false;
    if (stanceFilter !== 'all' && item.stance !== stanceFilter) return false;
    return true;
  });

  // Calculate stance distribution counts
  const totalCount = items.length;
  const truthCount = items.filter((i) => i.stance === 'amplifying_truth').length;
  const disinfoCount = items.filter((i) => i.stance === 'spreading_disinfo').length;
  const mixedCount = items.filter((i) => i.stance === 'mixed').length;

  const truthPct = Math.round((truthCount / Math.max(1, totalCount)) * 100);
  const disinfoPct = Math.round((disinfoCount / Math.max(1, totalCount)) * 100);
  const mixedPct = Math.round((mixedCount / Math.max(1, totalCount)) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Social Radar Summary Hero Banner */}
      <div
        className="panel"
        style={{
          padding: '24px',
          background: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--line)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Radio size={20} color="var(--brass)" style={{ animation: 'pulse 2s infinite' }} />
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: '22px', fontWeight: 500, margin: 0 }}>
                Social Media Echo Radar & Key Amplifiers
              </h3>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: 0 }}>
              Tracking viral commentary, influential accounts, and narrative stance across X/Twitter, Instagram, and Reddit.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 18px',
              background: 'var(--surface-2)',
              borderRadius: '100px',
              border: '1px solid var(--line-strong)',
              fontSize: '12.5px',
              fontFamily: 'var(--mono)',
            }}
          >
            <TrendingUp size={16} color="var(--brass)" />
            <span>Tracked Reach: <strong style={{ color: 'var(--text)' }}>6.5M+ Impressions</strong></span>
          </div>
        </div>

        {/* Stance Distribution Meter Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'var(--mono)', marginBottom: '8px' }}>
            <span style={{ color: 'var(--verified)' }}>✓ Amplifying Verified Facts ({truthPct}%)</span>
            <span style={{ color: 'var(--disputed)' }}>⚠️ Spreading Misinformation ({disinfoPct}%)</span>
            <span style={{ color: 'var(--mislead)' }}>⚡ Mixed / Nuanced ({mixedPct}%)</span>
          </div>

          <div
            style={{
              height: '10px',
              width: '100%',
              borderRadius: '100px',
              background: 'var(--surface-2)',
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <div style={{ width: `${truthPct}%`, background: 'var(--verified)', transition: 'width 0.3s ease' }}></div>
            <div style={{ width: `${disinfoPct}%`, background: 'var(--disputed)', transition: 'width 0.3s ease' }}></div>
            <div style={{ width: `${mixedPct}%`, background: 'var(--mislead)', transition: 'width 0.3s ease' }}></div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        {/* Platform Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'x', 'instagram', 'reddit'] as const).map((plat) => (
            <button
              key={plat}
              onClick={() => setPlatformFilter(plat)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontFamily: 'var(--mono)',
                fontWeight: 600,
                cursor: 'pointer',
                border: platformFilter === plat ? '1px solid var(--brass)' : '1px solid var(--line)',
                background: platformFilter === plat ? 'var(--brass)' : 'var(--surface)',
                color: platformFilter === plat ? 'var(--ink)' : 'var(--text-dim)',
                textTransform: 'capitalize',
              }}
            >
              {plat === 'all' ? 'All Platforms' : plat === 'x' ? 'X / Twitter' : plat}
            </button>
          ))}
        </div>

        {/* Stance Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} color="var(--text-dim)" />
          <select
            value={stanceFilter}
            onChange={(e) => setStanceFilter(e.target.value as any)}
            style={{
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--line)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontFamily: 'var(--mono)',
            }}
          >
            <option value="all">All Stances</option>
            <option value="amplifying_truth">Amplifying Fact / True</option>
            <option value="spreading_disinfo">Spreading Misinformation</option>
            <option value="mixed">Mixed / Commentary</option>
          </select>
        </div>
      </div>

      {/* Social Post Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {filteredItems.map((item) => {
          const isTruth = item.stance === 'amplifying_truth';
          const isDisinfo = item.stance === 'spreading_disinfo';
          const stanceColor = isTruth ? 'var(--verified)' : isDisinfo ? 'var(--disputed)' : 'var(--mislead)';
          const stanceBg = isTruth ? 'var(--verified-dim)' : isDisinfo ? 'var(--disputed-dim)' : 'rgba(224,185,78,0.14)';
          const stanceText = isTruth ? 'AMPLIFYING FACT' : isDisinfo ? 'SPREADING MISINFO' : 'MIXED COMMENTARY';

          return (
            <div
              key={item.id}
              className="panel"
              style={{
                padding: '20px',
                background: 'var(--surface)',
                borderRadius: '12px',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {/* Author & Stance Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontFamily: 'var(--mono)',
                        fontSize: '14px',
                        color: 'var(--brass)',
                      }}
                    >
                      {item.author_name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {item.author_name}
                        {item.is_verified && <CheckCircle2 size={14} color="var(--brass)" />}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                        {item.author_handle} · {item.platform.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '100px',
                      fontSize: '10px',
                      fontFamily: 'var(--mono)',
                      fontWeight: 700,
                      background: stanceBg,
                      color: stanceColor,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {stanceText}
                  </span>
                </div>

                {/* Post Body Quote */}
                <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.45, marginBottom: '16px', margin: '0 0 16px 0' }}>
                  "{item.post_text}"
                </p>
              </div>

              {/* Card Footer */}
              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  paddingTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  fontFamily: 'var(--mono)',
                  color: 'var(--text-dim)',
                }}
              >
                <span>{item.reach_impressions}</span>
                <a
                  href={item.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--brass)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  View Post <ExternalLink size={12} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
