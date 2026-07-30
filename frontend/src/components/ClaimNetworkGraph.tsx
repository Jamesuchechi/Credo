import React, { useState } from 'react';
import { ContentAnalysisResponse } from '../types';
import { ZoomIn, ZoomOut, RefreshCw, ExternalLink, X } from 'lucide-react';

interface ClaimNetworkGraphProps {
  analysis: ContentAnalysisResponse;
}

interface NodeData {
  id: string;
  label: string;
  type: 'root' | 'claim' | 'source';
  verdict?: 'supported' | 'contradicted' | 'unverified';
  score?: number;
  sublabel?: string;
  x: number;
  y: number;
  raw?: any;
}

interface EdgeData {
  from: string;
  to: string;
  type: 'claim_to_root' | 'source_to_claim';
}

export const ClaimNetworkGraph: React.FC<ClaimNetworkGraphProps> = ({ analysis }) => {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Generate layout coordinates for nodes
  const width = 800;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;

  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];

  // Root node (Center)
  const rootId = 'root-node';
  nodes.push({
    id: rootId,
    label: analysis.title || 'Submitted Analysis Payload',
    type: 'root',
    score: analysis.composite_score || 0,
    sublabel: analysis.url || 'Direct Text Submission',
    x: centerX,
    y: centerY,
  });

  // Claim nodes (Middle Ring)
  const claims = analysis.claims || [];
  const claimRadius = 170;
  claims.forEach((claim, idx) => {
    const angle = (idx / Math.max(1, claims.length)) * 2 * Math.PI - Math.PI / 2;
    const cx = centerX + claimRadius * Math.cos(angle);
    const cy = centerY + claimRadius * Math.sin(angle);
    const claimId = `claim-${claim.id || idx}`;

    nodes.push({
      id: claimId,
      label: claim.claim_text.length > 35 ? claim.claim_text.slice(0, 35) + '...' : claim.claim_text,
      type: 'claim',
      verdict: claim.verdict,
      score: claim.confidence_score,
      sublabel: claim.extracted_speaker ? `Speaker: ${claim.extracted_speaker}` : 'Extracted Assertion',
      x: cx,
      y: cy,
      raw: claim,
    });

    edges.push({ from: rootId, to: claimId, type: 'claim_to_root' });
  });

  // Corroborating Source nodes (Outer Ring)
  const sources = analysis.corroborating_sources || [];
  const sourceRadius = 240;
  sources.forEach((src, idx) => {
    const angle = ((idx + 0.5) / Math.max(1, sources.length)) * 2 * Math.PI - Math.PI / 2;
    const sx = centerX + sourceRadius * Math.cos(angle);
    const sy = centerY + sourceRadius * Math.sin(angle);
    const sourceId = `src-${idx}`;

    nodes.push({
      id: sourceId,
      label: src.source || (src.title ? src.title.slice(0, 25) : 'Reference Source'),
      type: 'source',
      sublabel: src.provider || 'Corroborating Provider',
      x: sx,
      y: sy,
      raw: src,
    });

    // Link source to closest claim or root
    if (claims.length > 0) {
      const targetClaimId = `claim-${claims[idx % claims.length].id || (idx % claims.length)}`;
      edges.push({ from: targetClaimId, to: sourceId, type: 'source_to_claim' });
    } else {
      edges.push({ from: rootId, to: sourceId, type: 'source_to_claim' });
    }
  });

  const getConnectedNodeIds = (nodeId: string): Set<string> => {
    const connected = new Set<string>([nodeId]);
    edges.forEach((edge) => {
      if (edge.from === nodeId) connected.add(edge.to);
      if (edge.to === nodeId) connected.add(edge.from);
    });
    return connected;
  };

  const activeConnected = hoveredNodeId ? getConnectedNodeIds(hoveredNodeId) : null;

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--line-strong)',
        borderRadius: '16px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 500, margin: 0 }}>
            Interactive Claim & Evidence Network Graph
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
            Hover nodes to highlight claim dependencies; click any node for deep audit details.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              color: 'var(--text)',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontFamily: 'var(--mono)',
            }}
          >
            <ZoomIn size={14} /> Zoom In
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              color: 'var(--text)',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontFamily: 'var(--mono)',
            }}
          >
            <ZoomOut size={14} /> Zoom Out
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setSelectedNode(null);
            }}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              color: 'var(--text-dim)',
              padding: '6px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontFamily: 'var(--mono)',
            }}
          >
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ position: 'relative', width: '100%', height: `${height}px`, background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: '100%',
            height: '100%',
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.25s ease',
          }}
        >
          <defs>
            <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render Edge Connections */}
          {edges.map((edge, i) => {
            const fromNode = nodes.find((n) => n.id === edge.from);
            const toNode = nodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            const isHighlighted = activeConnected
              ? activeConnected.has(edge.from) && activeConnected.has(edge.to)
              : false;

            return (
              <line
                key={i}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={isHighlighted ? 'var(--brass)' : 'var(--line-strong)'}
                strokeWidth={isHighlighted ? 2.5 : 1.2}
                strokeDasharray={edge.type === 'source_to_claim' ? '4 4' : 'none'}
                opacity={activeConnected ? (isHighlighted ? 1 : 0.2) : 0.6}
                style={{ transition: 'all 0.2s ease' }}
              />
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => {
            const isHovered = hoveredNodeId === node.id;
            const isSelected = selectedNode?.id === node.id;
            const isDimmed = activeConnected ? !activeConnected.has(node.id) : false;

            let fillColor = 'var(--surface-2)';
            let strokeColor = 'var(--line)';

            if (node.type === 'root') {
              fillColor = 'rgba(217, 169, 78, 0.2)';
              strokeColor = 'var(--brass)';
            } else if (node.type === 'claim') {
              if (node.verdict === 'supported') {
                fillColor = 'var(--verified-dim)';
                strokeColor = 'var(--verified)';
              } else if (node.verdict === 'contradicted') {
                fillColor = 'var(--disputed-dim)';
                strokeColor = 'var(--disputed)';
              } else {
                fillColor = 'rgba(224,185,78,0.15)';
                strokeColor = 'var(--mislead)';
              }
            } else if (node.type === 'source') {
              fillColor = 'rgba(59, 130, 246, 0.15)';
              strokeColor = '#3b82f6';
            }

            const radius = node.type === 'root' ? 32 : node.type === 'claim' ? 24 : 18;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => setSelectedNode(node)}
                style={{ cursor: 'pointer', opacity: isDimmed ? 0.25 : 1, transition: 'all 0.2s ease' }}
              >
                <circle
                  r={radius}
                  fill={fillColor}
                  stroke={isSelected ? '#ffffff' : strokeColor}
                  strokeWidth={isSelected || isHovered ? 3 : 1.8}
                  filter={node.type === 'root' ? 'url(#glow-gold)' : undefined}
                />
                <text
                  textAnchor="middle"
                  dy={node.type === 'root' ? 4 : 4}
                  fill={node.type === 'root' ? 'var(--brass)' : 'var(--text)'}
                  fontSize={node.type === 'root' ? '12px' : '10.5px'}
                  fontWeight={600}
                  fontFamily="var(--mono)"
                  pointerEvents="none"
                >
                  {node.type === 'root' ? 'CREDO' : node.type === 'claim' ? 'CLAIM' : 'SRC'}
                </text>
                <text
                  textAnchor="middle"
                  dy={radius + 16}
                  fill="var(--text)"
                  fontSize="11.5px"
                  fontFamily="var(--mono)"
                  pointerEvents="none"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Detail Side Drawer Overlay */}
        {selectedNode && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '300px',
              background: 'var(--surface-2)',
              border: '1px solid var(--line-strong)',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--brass)', textTransform: 'uppercase', fontWeight: 600 }}>
                {selectedNode.type} Node Details
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
              {selectedNode.label}
            </div>

            {selectedNode.sublabel && (
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', marginBottom: '10px' }}>
                {selectedNode.sublabel}
              </div>
            )}

            {selectedNode.verdict && (
              <div style={{ marginBottom: '10px' }}>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: selectedNode.verdict === 'supported' ? 'var(--verified-dim)' : selectedNode.verdict === 'contradicted' ? 'var(--disputed-dim)' : 'rgba(224,185,78,0.14)',
                    color: selectedNode.verdict === 'supported' ? 'var(--verified)' : selectedNode.verdict === 'contradicted' ? 'var(--disputed)' : 'var(--mislead)',
                  }}
                >
                  {selectedNode.verdict}
                </span>
                {selectedNode.score !== undefined && (
                  <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--brass)', marginLeft: '8px' }}>
                    {selectedNode.score.toFixed(0)}% Confidence
                  </span>
                )}
              </div>
            )}

            {selectedNode.raw?.evidence_summary && (
              <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', lineHeight: 1.4, margin: '8px 0 0 0' }}>
                <strong>Evidence:</strong> {selectedNode.raw.evidence_summary}
              </p>
            )}

            {selectedNode.raw?.url && (
              <a
                href={selectedNode.raw.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: 'var(--brass)',
                  marginTop: '10px',
                  textDecoration: 'none',
                  fontFamily: 'var(--mono)',
                }}
              >
                Visit Reference <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '16px', fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--brass)' }}></span> Root Content
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--verified)' }}></span> Supported Claim
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--disputed)' }}></span> Contradicted Claim
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></span> Corroborating Source
        </div>
      </div>
    </div>
  );
};
