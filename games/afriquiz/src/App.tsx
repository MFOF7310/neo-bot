import { useCallback, useEffect, useRef, useState } from 'react';
import QuestionCard from './components/QuestionCard';
import Timer from './components/Timer';
import Leaderboard from './components/Leaderboard';
import { initDiscord, resolveName } from './lib/discord';
import { fetchLeaderboard, fetchQuestion, postAnswer } from './lib/api';
import { randomOf, t, toLang } from './i18n';
import type { AnswerResult, GameUser, Lang, LeaderboardEntry, QuizQuestion, Reveal } from './types';

const QUESTION_DURATION_S = 30;

type Phase = 'boot' | 'loading' | 'playing' | 'revealed' | 'discord-only';
type Tab = 'game' | 'board';

export default function App() {
  const [user, setUser] = useState<GameUser | null>(null);
  const [lang, setLang] = useState<Lang>('fr');
  const [tab, setTab] = useState<Tab>('game');

  const [phase, setPhase] = useState<Phase>('boot');
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [round, setRound] = useState(0);

  const [totalPoints, setTotalPoints] = useState(0);
  const [streak, setStreak] = useState(0);

  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [boardNames, setBoardNames] = useState<Map<string, string>>(new Map());
  const [boardLoading, setBoardLoading] = useState(false);

  const questionStartRef = useRef<number>(0);
  const bootedRef = useRef(false);

  /* ── boot: Discord SDK (or demo mode) ─────────────────────────── */
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    (async () => {
      const u = await initDiscord().catch((err) => {
        if (err?.message === 'DISCORD_ONLY') {
          setPhase('discord-only');
        }
        return null;
      });
      if (!u) return;
      setUser(u);
      setLang(toLang(u.locale));
    })();
  }, []);

  const loadQuestion = useCallback(
    async (l: Lang) => {
      setPhase('loading');
      setReveal(null);
      setResult(null);
      const q = await fetchQuestion(l);
      setQuestion(q);
      questionStartRef.current = Date.now();
      setRound((r) => r + 1);
      setPhase('playing');
    },
    [],
  );

  /* first question once we know the language */
  useEffect(() => {
    if (user && phase === 'boot') void loadQuestion(lang);
  }, [user, phase, lang, loadQuestion]);

  /* ── answer flow ──────────────────────────────────────────────── */
  const handleAnswer = useCallback(
    async (letter: string) => {
      if (!question || !user || phase !== 'playing') return;
      setPhase('revealed');
      const elapsedMs = Date.now() - questionStartRef.current;
      const res = await postAnswer({
        userId: user.id,
        guildId: user.guildId,
        questionId: question.id,
        answer: letter,
        elapsedMs,
        lang,
      });
      setResult(res);
      setTotalPoints(res.totalPoints);
      setStreak(res.streak);
      setReveal(
        res.correct
          ? { kind: 'correct', correctLetter: res.correctLetter, chosenLetter: letter }
          : { kind: 'wrong', correctLetter: res.correctLetter, chosenLetter: letter },
      );
    },
    [question, user, phase, lang],
  );

  const handleExpire = useCallback(async () => {
    if (!question || !user || phase !== 'playing') return;
    setPhase('revealed');
    const res = await postAnswer({
      userId: user.id,
      guildId: user.guildId,
      questionId: question.id,
      answer: '', // timeout = no answer
      elapsedMs: QUESTION_DURATION_S * 1000,
      lang,
    });
    setResult(res);
    setTotalPoints(res.totalPoints);
    setStreak(res.streak);
    setReveal({ kind: 'expired', correctLetter: res.correctLetter, chosenLetter: null });
  }, [question, user, phase, lang]);

  /* ── leaderboard tab ──────────────────────────────────────────── */
  useEffect(() => {
    if (tab !== 'board' || !user) return;
    setBoardLoading(true);
    void fetchLeaderboard(user.guildId)
      .then(async (entries) => {
        setBoard(entries);
        const names = new Map<string, string>();
        names.set(user.id, user.username);
        await Promise.all(
          entries.slice(0, 10).map(async (e) => {
            if (!names.has(e.userId)) {
              const n = await resolveName(e.userId);
              if (n) names.set(e.userId, n);
            }
          }),
        );
        setBoardNames(names);
      })
      .finally(() => setBoardLoading(false));
  }, [tab, user]);

  /* ── render ───────────────────────────────────────────────────── */

  if (!user) {
    return (
      <Shell>
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <span className="animate-bounce text-5xl">🦅</span>
            <p className="text-sm text-white/60">{t(lang, 'loading')}</p>
          </div>
      </Shell>
    );
  }

  const headerMessage =
    reveal?.kind === 'correct'
      ? `${randomOf(lang, 'goodAnswers')} +${result?.points ?? 0} ${t(lang, 'pts')}${result?.speedBonus ? ' ⚡' : ''}`
      : reveal?.kind === 'wrong'
        ? randomOf(lang, 'wrongAnswers')
        : reveal?.kind === 'expired'
          ? t(lang, 'expired')
          : t(lang, 'answerPlaceholder');

  return (
    <Shell>
      {/* header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black tracking-tight text-white">
            🦅 NEO <span className="text-[#00f0ff]">•</span>{' '}
            <span className="text-[#FFD700]">AfriQuiz</span>
          </h1>
          <p className="text-xs text-white/40">{t(lang, 'tagline')}</p>
        </div>
        <span className="text-2xl" title="Africa">🌍</span>
      </header>

      {user.isDemo && (
        <p className="rounded-lg bg-[#FFD700]/10 px-3 py-1.5 text-center text-[11px] text-[#FFD700]">
          {t(lang, 'demoMode')}
        </p>
      )}

      {/* tabs */}
      <nav className="grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
        {(['game', 'board'] as Tab[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-lg py-2 text-sm font-semibold transition-all duration-300 ${
              tab === k ? 'bg-[#00f0ff]/15 text-[#00f0ff]' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {k === 'game' ? t(lang, 'tabGame') : t(lang, 'tabBoard')}
          </button>
        ))}
      </nav>

      {/* content */}
      {phase === 'discord-only' ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-6 py-24 text-center px-6">
          <span className="text-6xl">🎮</span>
          <h2 className="text-xl font-bold text-white">Discord Only</h2>
          <p className="text-sm text-white/60 max-w-xs">
            AfriQuiz is only available inside Discord.<br />
            Open it via the Neo bot Activity in your server.
          </p>
          <a
            href="https://discord.com/invite/your-invite"
            className="rounded-xl bg-[#5865F2] px-6 py-3 text-sm font-semibold text-white"
          >
            Open Discord
          </a>
        </main>
      ) : tab === 'game' ? (
        <main className="flex flex-1 flex-col gap-4">
          {phase === 'loading' || !question ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
              <span className="animate-spin text-4xl">🌍</span>
              <p className="text-sm text-white/60">{t(lang, 'loadingQ')}</p>
            </div>
          ) : (
            <>
              <Timer
                duration={QUESTION_DURATION_S}
                resetKey={round}
                paused={phase !== 'playing'}
                onExpire={handleExpire}
              />

              <div className="animate-[cardIn_300ms_ease-out] rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <QuestionCard
                  question={question}
                  lang={lang}
                  reveal={reveal}
                  onAnswer={handleAnswer}
                />

                {/* result zone */}
                <div
                  className={`grid transition-all duration-300 ${
                    reveal ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    {reveal && (
                      <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
                        <p
                          className={`text-center text-sm font-bold ${
                            reveal.kind === 'correct' ? 'text-[#00ff88]' : 'text-[#ff4757]'
                          }`}
                        >
                          {headerMessage}
                        </p>
                        {result?.explanation && (
                          <p className="rounded-xl bg-[#00f0ff]/5 px-3 py-2 text-xs leading-relaxed text-white/70">
                            {t(lang, 'didYouKnow')} {result.explanation}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => void loadQuestion(lang)}
                          className="mt-1 rounded-2xl bg-[#FFD700] py-3 text-sm font-black text-black transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
                        >
                          {t(lang, 'nextQuestion')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      ) : (
        <main className="flex-1">
          <Leaderboard
            entries={board}
            currentUserId={user.id}
            names={boardNames}
            loading={boardLoading}
            lang={lang}
            sessionPoints={totalPoints}
          />
        </main>
      )}

      {/* score bar */}
      <footer className="mt-auto flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <span className="text-sm font-bold text-[#FFD700]">
          🏆 {t(lang, 'score')} : {totalPoints} {t(lang, 'pts')}
        </span>
        <span className={`text-sm font-bold ${streak > 0 ? 'text-[#00f0ff]' : 'text-white/40'}`}>
          🔥 {t(lang, 'streak')} : {streak}
        </span>
      </footer>

      <p className="pb-1 text-center text-[10px] tracking-widest text-white/25">
        🦅 NEO • BAMAKO_223 🇲🇱
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 bg-[#0a0a0a] px-4 pt-4 text-white selection:bg-[#00f0ff]/30">
      {children}
    </div>
  );
}
