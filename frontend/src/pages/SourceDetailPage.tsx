import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

interface TrackRecord {
  domain: string;
  name: string;
  historical_accuracy_score: number;
  total_items_checked: number;
  verified_percentage: number;
  bias_rating: string;
}

export default function SourceDetailPage() {
  const { domain } = useParams<{ domain: string }>();
  const [data, setData] = useState<TrackRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domain) return;
    fetch(`/api/v1/sources/${domain}/track-record`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [domain]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/dashboard/sources" className="text-sm text-sky-400 hover:underline">
            ← Back to Sources
          </Link>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{data?.name || domain}</h1>
          <p className="text-slate-400 text-sm">{domain}</p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading source track record...</div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <span className="text-xs uppercase text-slate-400 font-semibold">Credibility Rating</span>
            <div className="text-3xl font-bold text-emerald-400 mt-2">
              {data.historical_accuracy_score.toFixed(1)}/100
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <span className="text-xs uppercase text-slate-400 font-semibold">Items Verified</span>
            <div className="text-3xl font-bold text-slate-100 mt-2">{data.total_items_checked}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <span className="text-xs uppercase text-slate-400 font-semibold">Bias Rating</span>
            <div className="text-3xl font-bold text-sky-400 mt-2">{data.bias_rating}</div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-rose-400">Source track record unavailable.</div>
      )}
    </div>
  );
}
