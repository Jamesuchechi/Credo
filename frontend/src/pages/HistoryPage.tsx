import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, FileText, Globe, Video } from 'lucide-react';
import { fetchContentList } from '../api/client';
import { ContentListResponse } from '../types';

const verdictColors: Record<string, string> = {
  verified: 'var(--verified)',
  disputed: 'var(--disputed)',
  mixed: 'var(--mislead)',
};

const verdictBg: Record<string, string> = {
  verified: 'var(--verified-dim)',
  disputed: 'var(--disputed-dim)',
  mixed: 'rgba(224,185,78,0.14)',
};

const iconMap: Record<string, React.ElementType> = {
  url: Globe,
  text: FileText,
  video: Video,
};

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ContentListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchContentList(page)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load history');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  return (
    <div className="history-page">
      <header className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
        </button>
        <h1 className="page-title">History</h1>
      </header>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setPage((p) => p)}>Retry</button>
        </div>
      )}

      {loading && !data ? (
        <div className="loading-state">Loading analyses...</div>
      ) : (
        <>
          {data && data.items.length === 0 ? (
            <div className="empty-state">
              <p>No analyses yet — submit your first link above</p>
            </div>
          ) : (
            <>
              <div className="analysis-list">
                {data && data.items.map((item) => {
                  const Icon = iconMap[item.status === 'processing' ? 'url' : 'text'] || FileText;
                  return (
                    <div key={item.id} className="history-row">
                      <div className="history-icon">
                        <Icon size={18} />
                      </div>
                      <div className="history-body">
                        <div className="history-title">
                          {item.title || 'Untitled analysis'}
                        </div>
                        <div className="history-meta">
                          {item.source_domain && (
                            <span>{item.source_domain}</span>
                          )}
                          <span>· {item.claims_count} claim{item.claims_count !== 1 ? 's' : ''}</span>
                          <span>· {new Date(item.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      {item.verdict && (
                        <span
                          className="history-verdict"
                          style={{
                            color: verdictColors[item.verdict] || 'var(--text-dim)',
                            background: verdictBg[item.verdict] || 'transparent',
                          }}
                        >
                          {item.verdict}
                        </span>
                      )}
                      <Clock size={14} className="history-time" />
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <style>{`
        .history-page {
          padding: 28px 32px 60px;
          max-width: 900px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 28px;
        }
        .page-title {
          font-family: var(--serif);
          font-size: 24px;
          font-weight: 600;
        }
        .btn-back {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 8px 12px;
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .btn-back:hover {
          background: var(--surface-hover);
        }
        .error-banner {
          background: var(--disputed-dim);
          border: 1px solid var(--disputed);
          border-radius: var(--radius);
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
        }
        .error-banner button {
          background: var(--disputed);
          color: var(--ink);
          border: none;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        .loading-state {
          text-align: center;
          padding: 60px 0;
          color: var(--text-dim);
          font-family: var(--mono);
          font-size: 14px;
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-dim);
          font-size: 15px;
        }
        .analysis-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .history-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          transition: background 0.18s ease;
        }
        .history-row:hover {
          background: var(--surface-hover);
        }
        .history-icon {
          color: var(--text-dim);
          flex-shrink: 0;
        }
        .history-body {
          flex: 1;
          min-width: 0;
        }
        .history-title {
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .history-meta {
          font-size: 11.5px;
          color: var(--text-faint);
          margin-top: 3px;
          font-family: var(--mono);
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .history-verdict {
          font-family: var(--mono);
          font-size: 10.5px;
          font-weight: 600;
          padding: 4px 9px;
          border-radius: 100px;
          white-space: nowrap;
          flex-shrink: 0;
          text-transform: uppercase;
        }
        .history-time {
          color: var(--text-faint);
          flex-shrink: 0;
        }
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 28px;
          padding: 16px 0;
          font-family: var(--mono);
          font-size: 13px;
        }
        .pagination button {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 8px 16px;
          color: var(--text);
          cursor: pointer;
          font-family: var(--mono);
          font-size: 12px;
        }
        .pagination button:disabled {
          opacity: 0.4;
          cursor: default;
        }
        .pagination button:not(:disabled):hover {
          background: var(--surface-hover);
        }
        .pagination span {
          color: var(--text-dim);
        }
      `}</style>
    </div>
  );
};