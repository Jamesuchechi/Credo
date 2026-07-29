import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Network,
  Share2,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Sparkles,
  Info,
  ChevronRight,
} from 'lucide-react';

interface GraphNode {
  id: string;
  label: string;
  type: 'claim' | 'source' | 'content';
  verdict?: 'supported' | 'contradicted' | 'unverified' | 'mixed';
  score?: number;
  domain?: string;
  x: number;
  y: number;
  connections: string[];
}

const INITIAL_NODES: GraphNode[] = [
  { id: 'n1', label: 'Central Bank Inflation Forecast Claim', type: 'claim', verdict: 'supported', score: 88, x: 280, y: 160, connections: ['n4', 'n5', 'n6'] },
  { id: 'n2', label: 'Viral Election Ballot Video Snippet', type: 'claim', verdict: 'contradicted', score: 14, x: 540, y: 120, connections: ['n6', 'n7', 'n8'] },
  { id: 'n3', label: 'Fuel Subsidy Removal Regional Pact', type: 'claim', verdict: 'mixed', score: 55, x: 380, y: 340, connections: ['n4', 'n8'] },
  { id: 'n4', label: 'reuters.com', type: 'source', score: 96, domain: 'reuters.com', x: 140, y: 220, connections: ['n1', 'n3'] },
  { id: 'n5', label: 'bloomberg.com', type: 'source', score: 94, domain: 'bloomberg.com', x: 220, y: 60, connections: ['n1'] },
  { id: 'n6', label: 'BBC News Coverage', type: 'content', x: 420, y: 220, connections: ['n1', 'n2'] },
  { id: 'n7', label: 'Unverified Telegram Broadcast', type: 'source', score: 22, domain: 'telegram.me', x: 680, y: 180, connections: ['n2'] },
  { id: 'n8', label: 'FactCheck.org Verification Index', type: 'source', score: 98, domain: 'factcheck.org', x: 580, y: 320, connections: ['n2', 'n3'] },
];

export const ClaimGraphPage: React.FC = () => {
  const navigate = useNavigate();
  const [nodes] = useState<GraphNode[]>(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('n1');
  const [filterType, setFilterType] = useState<'all' | 'claim' | 'source' | 'disputed'>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Filter nodes
  const filteredNodes = useMemo(() => {
    if (filterType === 'all') return nodes;
    if (filterType === 'claim') return nodes.filter((n) => n.type === 'claim');
    if (filterType === 'source') return nodes.filter((n) => n.type === 'source');
    if (filterType === 'disputed') return nodes.filter((n) => n.verdict === 'contradicted' || (n.score !== undefined && n.score < 50));
    return nodes;
  }, [nodes, filterType]);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  // Connected edges
  const edges = useMemo(() => {
    const edgeList: { from: GraphNode; to: GraphNode }[] = [];
    nodes.forEach((sourceNode) => {
      sourceNode.connections.forEach((targetId) => {
        const targetNode = nodes.find((n) => n.id === targetId);
        if (targetNode && sourceNode.id < targetNode.id) {
          edgeList.push({ from: sourceNode, to: targetNode });
        }
      });
    });
    return edgeList;
  }, [nodes]);

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: '1300px', margin: '0 auto' }}>
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
              Interactive Claim Propagation & Knowledge Graph
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              Map relationships between claims, publisher sources, and corroborating cross-checks across the information ecosystem.
            </p>
          </div>
        </div>
      </header>

      {/* Analytics KPI Metric Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Network size={20} color="var(--brass)" />
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Graph Nodes
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              {nodes.length} Elements
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Share2 size={20} color="var(--verified)" />
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Propagation Pathways
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--verified)', marginTop: '2px' }}>
              {edges.length} Edges
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <AlertTriangle size={20} color="var(--disputed)" />
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Disputed Clusters
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--disputed)', marginTop: '2px' }}>
              1 Main Cluster
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Sparkles size={20} color="var(--brass)" />
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Network Centrality
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              0.84 Score
            </div>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface)',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid var(--line)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginRight: '6px' }}>
            Node View:
          </span>
          {(['all', 'claim', 'source', 'disputed'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{
                background: filterType === type ? 'var(--brass)' : 'transparent',
                color: filterType === type ? 'var(--ink)' : 'var(--text-dim)',
                border: filterType === type ? 'none' : '1px solid var(--line)',
                borderRadius: '100px',
                padding: '4px 12px',
                fontSize: '11.5px',
                fontFamily: 'var(--mono)',
                fontWeight: filterType === type ? 700 : 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {type}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '6px', color: 'var(--text)', cursor: 'pointer' }}
          >
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.15))}
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '6px', color: 'var(--text)', cursor: 'pointer' }}
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '6px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--mono)' }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main Canvas & Inspection Sidebar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        {/* Interactive SVG Canvas */}
        <div
          style={{
            position: 'relative',
            background: '#090a0f',
            borderRadius: '16px',
            border: '1px solid var(--line)',
            height: '520px',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)',
          }}
        >
          <svg
            width="100%"
            height="100%"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}
          >
            {/* Draw Edges */}
            {edges.map((edge, idx) => {
              const isSelected = selectedNode && (selectedNode.id === edge.from.id || selectedNode.id === edge.to.id);
              return (
                <line
                  key={idx}
                  x1={edge.from.x}
                  y1={edge.from.y}
                  x2={edge.to.x}
                  y2={edge.to.y}
                  stroke={isSelected ? 'var(--brass)' : 'rgba(255,255,255,0.12)'}
                  strokeWidth={isSelected ? 2.5 : 1}
                  strokeDasharray={isSelected ? 'none' : '4 4'}
                />
              );
            })}

            {/* Draw Nodes */}
            {filteredNodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isSupp = node.verdict === 'supported' || (node.score !== undefined && node.score >= 75);
              const isDis = node.verdict === 'contradicted' || (node.score !== undefined && node.score < 50);

              const fillColor = node.type === 'source'
                ? 'var(--brass)'
                : isSupp
                ? 'var(--verified)'
                : isDis
                ? 'var(--disputed)'
                : 'var(--mislead)';

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNodeId(node.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Outer Glow Circle */}
                  <circle
                    r={isSelected ? 28 : 20}
                    fill={fillColor}
                    fillOpacity={isSelected ? 0.35 : 0.15}
                    stroke={fillColor}
                    strokeWidth={isSelected ? 2.5 : 1}
                  />

                  {/* Core Node Circle */}
                  <circle r={12} fill={fillColor} />

                  {/* Node Label Text */}
                  <text
                    y={32}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={11}
                    fontFamily="var(--mono)"
                    fontWeight={isSelected ? 700 : 500}
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.label.length > 20 ? node.label.slice(0, 20) + '...' : node.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Canvas Legend Overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              background: 'rgba(15,17,23,0.85)',
              backdropFilter: 'blur(8px)',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--line)',
              display: 'flex',
              gap: '16px',
              fontSize: '11px',
              fontFamily: 'var(--mono)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--verified)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--verified)' }} /> Verified
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--disputed)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--disputed)' }} /> Disputed
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brass)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brass)' }} /> Publisher Source
            </span>
          </div>
        </div>

        {/* Right Side: Selected Node Inspection Panel */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--line)' }}>
            <Info size={20} color="var(--brass)" />
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: 0 }}>
              Node Inspection
            </h3>
          </div>

          {selectedNode ? (
            <div>
              <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--brass)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>
                {selectedNode.type} Node
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px', lineHeight: 1.4 }}>
                {selectedNode.label}
              </div>

              {selectedNode.score !== undefined && (
                <div style={{ padding: '14px', background: 'var(--surface-2)', borderRadius: '10px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginBottom: '6px' }}>
                    <span>Credibility Index</span>
                    <span style={{ color: selectedNode.score >= 70 ? 'var(--verified)' : 'var(--disputed)', fontWeight: 700 }}>
                      {selectedNode.score}%
                    </span>
                  </div>
                  <div style={{ height: '5px', width: '100%', background: 'var(--surface)', borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${selectedNode.score}%`, background: selectedNode.score >= 70 ? 'var(--verified)' : 'var(--disputed)' }} />
                  </div>
                </div>
              )}

              {selectedNode.verdict && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>Verdict:</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--mono)',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '100px',
                      background: selectedNode.verdict === 'supported' ? 'var(--verified-dim)' : 'var(--disputed-dim)',
                      color: selectedNode.verdict === 'supported' ? 'var(--verified)' : 'var(--disputed)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {selectedNode.verdict}
                  </span>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '14px', marginTop: '14px' }}>
                <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginBottom: '10px' }}>
                  Connected Edge Nodes ({selectedNode.connections.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedNode.connections.map((targetId) => {
                    const target = nodes.find((n) => n.id === targetId);
                    if (!target) return null;
                    return (
                      <div
                        key={targetId}
                        onClick={() => setSelectedNodeId(target.id)}
                        style={{
                          padding: '8px 12px',
                          background: 'var(--surface-2)',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                          {target.label}
                        </span>
                        <ChevronRight size={14} color="var(--brass)" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
              Click any node on the graph to inspect its propagation details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};