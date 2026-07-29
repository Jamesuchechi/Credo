import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Newspaper,
  ShieldCheck,
  Search,
  ExternalLink,
  Sparkles,
  Globe,
  X,
} from 'lucide-react';
import { fetchTrendingNews, submitContent } from '../api/client';
import { AnalysisModal } from '../components/AnalysisModal';

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source_domain: string;
  source_name: string;
  url: string;
  category: string;
  published_at: string;
  credibility_score: number;
  whois_age_years: number;
  claims_count: number;
  image_url: string;
}

export const TrendingFeedPage: React.FC = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Selected Article for Reader View Modal
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [verifyingUrl, setVerifyingUrl] = useState<boolean>(false);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);

  const loadNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrendingNews(activeCategory, searchQuery);
      setArticles(data.articles || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch live news feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [activeCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadNews();
  };

  const handleVerifyArticle = async (url: string) => {
    setVerifyingUrl(true);
    try {
      const res = await submitContent({ modality: 'url', payload: url });
      setSelectedArticle(null);
      setActiveAnalysisId(res.content_id);
    } catch (err: any) {
      alert(`Verification submission failed: ${err.message}`);
    } finally {
      setVerifyingUrl(false);
    }
  };

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <button
            onClick={() => navigate('/dashboard')}
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
              Live Verified News Wire & Global Reader
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              Browse real-time breaking headlines powered by News API & GNews, complete with Credo Publisher Trust Ratings and one-click factual verification.
            </p>
          </div>
        </div>
      </header>

      {/* Categories & Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          background: 'var(--surface)',
          padding: '14px 18px',
          borderRadius: '16px',
          border: '1px solid var(--line)',
          marginBottom: '28px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, background: 'var(--surface-2)', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--line)' }}>
          <Search size={15} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="Search breaking stories, topics, or publishers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontSize: '13.5px',
              outline: 'none',
              width: '100%',
            }}
          />
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'all', label: 'All Headlines' },
            { id: 'technology', label: 'Technology & AI' },
            { id: 'african', label: 'African News' },
            { id: 'business', label: 'Economy & Markets' },
            { id: 'science', label: 'Climate & Energy' },
            { id: 'health', label: 'World & Health' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                background: activeCategory === cat.id ? 'var(--brass)' : 'transparent',
                color: activeCategory === cat.id ? 'var(--ink)' : 'var(--text-dim)',
                border: activeCategory === cat.id ? 'none' : '1px solid var(--line)',
                borderRadius: '100px',
                padding: '6px 14px',
                fontSize: '12px',
                fontFamily: 'var(--mono)',
                fontWeight: activeCategory === cat.id ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Article Cards Grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: '13.5px' }}>
          <Sparkles size={24} color="var(--brass)" style={{ animation: 'spin 2s linear infinite', marginBottom: '12px' }} />
          <div>Fetching live articles via News API gateway…</div>
        </div>
      ) : error ? (
        <div style={{ padding: '24px', background: 'var(--surface)', borderRadius: '14px', color: 'var(--disputed)', border: '1px solid var(--line)', fontSize: '13.5px' }}>
          {error}
        </div>
      ) : articles.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--line)' }}>
          <Newspaper size={36} color="var(--text-faint)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', margin: '0 0 6px 0' }}>No breaking articles found for this search</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Try clearing your search query or switching categories above.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {articles.map((article) => (
            <div
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--brass)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--line)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              {/* Article Thumbnail */}
              <div style={{ height: '160px', width: '100%', overflow: 'hidden', position: 'relative', background: 'var(--surface-2)' }}>
                <img
                  src={article.image_url}
                  alt={article.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--verified)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} /> {article.credibility_score}% Rating
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px', fontSize: '11.5px', fontFamily: 'var(--mono)', color: 'var(--text-faint)' }}>
                    <span style={{ color: 'var(--brass)', fontWeight: 700 }}>{article.source_name}</span>
                    <span>{new Date(article.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>

                  <h3 style={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--text)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                    {article.title}
                  </h3>

                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {article.description}
                  </p>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                    {article.whois_age_years} yrs WHOIS age
                  </span>
                  <span style={{ fontSize: '12.5px', color: 'var(--brass)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Read & Verify →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reader Modal View */}
      {selectedArticle && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '720px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Globe size={18} color="var(--brass)" />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Article Intelligence & Reader</span>
              </div>
              <button onClick={() => setSelectedArticle(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ background: 'var(--verified-dim)', color: 'var(--verified)', padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                  {selectedArticle.source_name} ({selectedArticle.source_domain})
                </span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-faint)' }}>
                  {new Date(selectedArticle.published_at).toLocaleString()}
                </span>
              </div>

              <h2 style={{ fontFamily: 'var(--serif)', fontSize: '22px', fontWeight: 600, color: 'var(--text)', margin: '0 0 16px 0', lineHeight: 1.3 }}>
                {selectedArticle.title}
              </h2>

              {selectedArticle.image_url && (
                <img
                  src={selectedArticle.image_url}
                  alt={selectedArticle.title}
                  style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '12px', marginBottom: '20px' }}
                />
              )}

              <p style={{ fontSize: '14px', color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: '24px' }}>
                {selectedArticle.description}
              </p>

              <div style={{ background: 'var(--surface-2)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--line)', marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Publisher Credibility Card</div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                  <span>Trust Score: <strong style={{ color: 'var(--verified)' }}>{selectedArticle.credibility_score}%</strong></span>
                  <span>Domain Age: <strong style={{ color: 'var(--text)' }}>{selectedArticle.whois_age_years} Years</strong></span>
                  <span>Category: <strong style={{ color: 'var(--brass)' }}>{selectedArticle.category}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handleVerifyArticle(selectedArticle.url)}
                  disabled={verifyingUrl}
                  style={{
                    flex: 1,
                    background: 'var(--brass)',
                    color: 'var(--ink)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 18px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: verifyingUrl ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Sparkles size={16} />
                  {verifyingUrl ? 'Submitting to Pipeline...' : 'Run Full Credo AI Verification →'}
                </button>

                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    borderRadius: '10px',
                    padding: '12px 18px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  Original Source <ExternalLink size={15} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Pipeline Output */}
      <AnalysisModal contentId={activeAnalysisId} onClose={() => setActiveAnalysisId(null)} />
    </div>
  );
};
