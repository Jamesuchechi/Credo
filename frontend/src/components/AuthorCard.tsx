import React from 'react';
import { CheckCircle2, ShieldAlert, Award, Calendar, Users } from 'lucide-react';

export interface AuthorCardProps {
  platform: string;
  handle: string;
  displayName?: string | null;
  verified?: boolean;
  followerCount?: number | null;
  accountCreatedAt?: string | null;
  reputationScore?: number;
  reputationLabel?: string;
  claimsCount?: number;
}

export const AuthorCard: React.FC<AuthorCardProps> = ({
  platform,
  handle,
  displayName,
  verified = false,
  followerCount,
  accountCreatedAt,
  reputationScore = 65.0,
  claimsCount = 0,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const formattedFollowers = followerCount
    ? followerCount >= 1_000_000
      ? `${(followerCount / 1_000_000).toFixed(1)}M`
      : followerCount >= 1_000
      ? `${(followerCount / 1_000).toFixed(1)}K`
      : followerCount.toLocaleString()
    : null;

  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold uppercase">
            {handle ? handle.charAt(0) : 'A'}
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-zinc-100">
              <span>{displayName || handle}</span>
              {verified && (
                <span title="Verified Account" className="inline-flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 fill-sky-400/20" />
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono uppercase">
                {platform}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">@{handle}</p>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${getScoreColor(reputationScore)}`}>
          <Award className="w-3.5 h-3.5" />
          <span>{reputationScore.toFixed(1)} Author Score</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-xs">
        {formattedFollowers && (
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Users className="w-3.5 h-3.5 text-zinc-500" />
            <span>{formattedFollowers} followers</span>
          </div>
        )}
        {accountCreatedAt && (
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>Joined {new Date(accountCreatedAt).getFullYear()}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-zinc-400">
          <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
          <span>{claimsCount} claims analyzed</span>
        </div>
      </div>
    </div>
  );
};
