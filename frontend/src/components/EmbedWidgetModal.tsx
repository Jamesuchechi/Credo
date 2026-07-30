import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck } from 'lucide-react';
import { ContentAnalysisResponse } from '../types';

interface EmbedWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ContentAnalysisResponse;
}

export const EmbedWidgetModal: React.FC<EmbedWidgetModalProps> = ({ isOpen, onClose, analysis }) => {
  const [widgetStyle, setWidgetStyle] = useState<'pill' | 'card' | 'banner'>('card');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const numericScore = analysis.composite_score ?? 0;
  const score = numericScore.toFixed(1);
  const verdictLabel = numericScore >= 80 ? 'VERIFIED ACCURACY' : numericScore >= 50 ? 'MODERATE / CAUTION' : 'DISPUTED';
  const scoreColor = numericScore >= 80 ? '#22c55e' : numericScore >= 50 ? '#eab308' : '#ef4444';

  const baseUrl = window.location.origin;
  const analysisUrl = `${baseUrl}/analysis/${analysis.content_id}`;

  const iframeSnippet = `<iframe src="${analysisUrl}?embed=true&style=${widgetStyle}" width="${widgetStyle === 'banner' ? '100%' : '380'}" height="${widgetStyle === 'pill' ? '60' : '220'}" frameborder="0" scrolling="no" style="border-radius:12px; border:1px solid rgba(255,255,255,0.1);"></iframe>`;
  const markdownSnippet = `[![Credo Verification - ${verdictLabel}](${baseUrl}/api/v1/content/${analysis.content_id}/badge.svg)](${analysisUrl})`;
  const scriptSnippet = `<div id="credo-widget-${analysis.content_id}"></div>\n<script src="${baseUrl}/credo-embed.js" data-id="${analysis.content_id}" data-style="${widgetStyle}" async></script>`;

  const copyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
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
          maxWidth: '640px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          padding: '28px',
          background: 'var(--surface-2)',
          border: '1px solid var(--line-strong)',
          borderRadius: '20px',
          boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <ShieldCheck size={22} color="var(--brass)" />
          <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--brass)', letterSpacing: '0.06em', fontWeight: 600 }}>
            PUBLISHER & JOURNALIST EMBEDS
          </span>
        </div>

        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '24px', margin: '0 0 16px 0' }}>
          Embed Credibility Seal & Web Widget
        </h2>
        <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: '0 0 24px 0', lineHeight: 1.5 }}>
          Integrate live credibility scores directly into your news website, Substack newsletter, or blog posts.
        </p>

        {/* Style Selector Controls */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setWidgetStyle('card')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: widgetStyle === 'card' ? '2px solid var(--brass)' : '1px solid var(--line)',
              background: widgetStyle === 'card' ? 'var(--surface)' : 'var(--surface-2)',
              color: widgetStyle === 'card' ? 'var(--brass)' : 'var(--text-dim)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Card Widget
          </button>
          <button
            onClick={() => setWidgetStyle('pill')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: widgetStyle === 'pill' ? '2px solid var(--brass)' : '1px solid var(--line)',
              background: widgetStyle === 'pill' ? 'var(--surface)' : 'var(--surface-2)',
              color: widgetStyle === 'pill' ? 'var(--brass)' : 'var(--text-dim)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Compact Pill Seal
          </button>
          <button
            onClick={() => setWidgetStyle('banner')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: widgetStyle === 'banner' ? '2px solid var(--brass)' : '1px solid var(--line)',
              background: widgetStyle === 'banner' ? 'var(--surface)' : 'var(--surface-2)',
              color: widgetStyle === 'banner' ? 'var(--brass)' : 'var(--text-dim)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Horizontal Banner
          </button>
        </div>

        {/* Live Widget Preview Box */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Live Widget Preview
          </div>

          <div
            style={{
              padding: '24px',
              background: '#090d14',
              borderRadius: '12px',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {widgetStyle === 'card' && (
              <div
                style={{
                  width: '320px',
                  padding: '16px',
                  background: '#121824',
                  borderRadius: '12px',
                  border: '1px solid #222f43',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  fontFamily: 'sans-serif',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--brass)', fontWeight: 700 }}>
                    CREDO VERIFIED
                  </span>
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    v3.0 Engine
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginBottom: '10px', lineHeight: 1.3 }}>
                  {analysis.title || 'Submitted Article Analysis'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0b0f19', padding: '10px 12px', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace' }}>Score</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: scoreColor, fontFamily: 'monospace' }}>{score} / 100</div>
                  </div>
                  <div style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '10px', fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: scoreColor, fontFamily: 'monospace' }}>
                    {verdictLabel}
                  </div>
                </div>
              </div>
            )}

            {widgetStyle === 'pill' && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 16px',
                  background: '#121824',
                  border: '1px solid #222f43',
                  borderRadius: '100px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: scoreColor }}></span>
                <span style={{ color: '#f8fafc', fontWeight: 700 }}>CREDO SCORE: {score}</span>
                <span style={{ color: scoreColor, fontWeight: 600 }}>({verdictLabel})</span>
              </div>
            )}

            {widgetStyle === 'banner' && (
              <div
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: '#121824',
                  border: '1px solid #222f43',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShieldCheck size={20} color="var(--brass)" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                      {analysis.title || 'Fact-Check Verification'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {analysis.claims?.length || 0} claims extracted & cross-verified
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: scoreColor, fontFamily: 'monospace' }}>
                  {score} / 100
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Code Snippet Generators */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--brass)', fontWeight: 600 }}>
                HTML iFrame Embed
              </span>
              <button
                onClick={() => copyText(iframeSnippet, 'iframe')}
                style={{ background: 'transparent', border: 'none', color: 'var(--brass)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--mono)' }}
              >
                {copiedType === 'iframe' ? <Check size={14} /> : <Copy size={14} />}
                {copiedType === 'iframe' ? 'Copied' : 'Copy HTML'}
              </button>
            </div>
            <pre style={{ background: 'var(--ink)', padding: '12px', borderRadius: '8px', color: '#94a3b8', fontSize: '11.5px', fontFamily: 'var(--mono)', overflowX: 'auto', margin: 0 }}>
              {iframeSnippet}
            </pre>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--brass)', fontWeight: 600 }}>
                Markdown Badge (Substack & GitHub)
              </span>
              <button
                onClick={() => copyText(markdownSnippet, 'markdown')}
                style={{ background: 'transparent', border: 'none', color: 'var(--brass)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--mono)' }}
              >
                {copiedType === 'markdown' ? <Check size={14} /> : <Copy size={14} />}
                {copiedType === 'markdown' ? 'Copied' : 'Copy Markdown'}
              </button>
            </div>
            <pre style={{ background: 'var(--ink)', padding: '12px', borderRadius: '8px', color: '#94a3b8', fontSize: '11.5px', fontFamily: 'var(--mono)', overflowX: 'auto', margin: 0 }}>
              {markdownSnippet}
            </pre>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--brass)', fontWeight: 600 }}>
                Async JavaScript Web Widget
              </span>
              <button
                onClick={() => copyText(scriptSnippet, 'script')}
                style={{ background: 'transparent', border: 'none', color: 'var(--brass)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--mono)' }}
              >
                {copiedType === 'script' ? <Check size={14} /> : <Copy size={14} />}
                {copiedType === 'script' ? 'Copied' : 'Copy JS Script'}
              </button>
            </div>
            <pre style={{ background: 'var(--ink)', padding: '12px', borderRadius: '8px', color: '#94a3b8', fontSize: '11.5px', fontFamily: 'var(--mono)', overflowX: 'auto', margin: 0 }}>
              {scriptSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
