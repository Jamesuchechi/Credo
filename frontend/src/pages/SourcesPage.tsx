import React, { useEffect, useState } from 'react';
import { fetchSources } from '../api/client';
import { SourcesListResponse } from '../types';

export const SourcesPage: React.FC = () => {
  const [data, setData] = useState<SourcesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSources(page)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load sources');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  return (
    <div className="sources-page">
      <header className="page-header">
        <h1 className="page-title">Sources</h1>
      </header>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setPage((p) => p)}>Retry</button>
        </div>
      )}

      {loading && !data ? (
        <div className="loading-state">Loading sources...</div>
      ) : (
        <>
          {data ? (
            data.items.length === 0 ? (
              <div className="empty-state">
                <p>No sources tracked yet — submit some analyses to populate this list</p>
              </div>
            ) : (
              <>
                <div className="source-table">
                  <div className="source-table-header">
                    <span>Source</span>
                    <span>Score</span>
                    <span>Rating</span>
                  </div>
                  {data.items.map((source: any) => (
                    <div key={source.id} className="source-table-row">
                      <div>
                        <div className="source-name">{source.name}</div>
                        <div className="source-domain">{source.domain}</div>
                      </div>
                      <span className="source-score">{source.score.toFixed(0)}</span>
                      <span className="source-rating">{source.trend_label}</span>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </button>
                    <span>Page {page} of {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      Next
                    </button>
                  </div>
                )}
              </>
            )
          ) : null}
        </>
      )}

      <style>{`
        .sources-page {
          padding: 28px 32px 60px;
          max-width: 800px;
          margin: 0 auto;
        }
        .page-header {
          margin-bottom: 28px;
        }
        .page-title {
          font-family: var(--serif);
          font-size: 24px;
          font-weight: 600;
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
        .source-table {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .source-table-header {
          display: flex;
          align-items: center;
          padding: 12px 18px;
          background: var(--surface-2);
          border-bottom: 1px solid var(--line);
          font-size: 11px;
          font-weight: 600;
          font-family: var(--mono);
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .source-table-header span:nth-child(2),
        .source-table-header span:nth-child(3) {
          margin-left: auto;
          width: 80px;
          text-align: right;
        }
        .source-table-row {
          display: flex;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid var(--line);
          gap: 16px;
        }
        .source-table-row:last-child {
          border-bottom: none;
        }
        .source-name {
          font-size: 14px;
          font-weight: 600;
        }
        .source-domain {
          font-size: 11.5px;
          color: var(--text-faint);
          font-family: var(--mono);
          margin-top: 2px;
        }
        .source-score {
          font-family: var(--mono);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-dim);
          width: 50px;
          text-align: right;
        }
        .source-rating {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 100px;
          background: var(--surface-2);
          color: var(--text-dim);
          white-space: nowrap;
          text-align: center;
          min-width: 140px;
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