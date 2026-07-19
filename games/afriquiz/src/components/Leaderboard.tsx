import type { Lang, LeaderboardEntry } from '../types';
import { t } from '../i18n';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  names: Map<string, string>;
  loading: boolean;
  lang: Lang;
  /** local session score, shown even if the API is unreachable */
  sessionPoints: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({
  entries,
  currentUserId,
  names,
  loading,
  lang,
  sessionPoints,
}: LeaderboardProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-4xl">🌍</p>
        <p className="mt-3 text-sm text-white/70">{t(lang, 'lbEmpty')}</p>
        {sessionPoints > 0 && (
          <p className="mt-2 text-[#FFD700]">
            {t(lang, 'lbYou')} : {sessionPoints} {t(lang, 'pts')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/40">
        {t(lang, 'lbGuild')}
      </p>
      {entries.map((e) => {
        const isYou = e.userId === currentUserId;
        return (
          <div
            key={e.userId}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-300 ${
              isYou
                ? 'border-[#FFD700]/60 bg-[#FFD700]/10'
                : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            <span className="w-8 text-center text-lg">
              {MEDALS[e.rank - 1] ?? (
                <span className="text-sm font-bold text-[#00f0ff]">#{e.rank}</span>
              )}
            </span>
            <span className={`flex-1 truncate text-sm font-semibold ${isYou ? 'text-[#FFD700]' : 'text-white'}`}>
              {names.get(e.userId) ?? (isYou ? t(lang, 'lbYou') : e.userId)}
              {isYou && <span className="ml-2 text-xs opacity-70">({t(lang, 'lbYou')})</span>}
            </span>
            <span className="font-mono text-sm font-bold text-[#00f0ff]">
              {e.points} {t(lang, 'pts')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
