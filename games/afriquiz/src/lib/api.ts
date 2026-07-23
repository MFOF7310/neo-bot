import type { AnswerResult, Lang, LeaderboardEntry, QuizQuestion } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/neo/api/quiz';

/* ── Real API (NEO bot, port 5003 via nginx) ─────────────────────── */

export async function fetchQuestion(lang: Lang, category?: string, difficulty?: string): Promise<QuizQuestion> {
  try {
    const params = new URLSearchParams({ lang });
    if (category) params.set('category', category);
    if (difficulty) params.set('difficulty', difficulty);
    const res = await fetch(`${API_BASE}/question?${params.toString()}`);
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as QuizQuestion;
  } catch {
    throw new Error('question_fetch_failed');
  }
}

export async function postAnswer(params: {
  userId: string;
  guildId: string | null;
  questionId: number;
  answer: string;
  elapsedMs: number;
  lang: Lang;
}): Promise<AnswerResult> {
  try {
    const res = await fetch(`${API_BASE}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as AnswerResult;
  } catch {
    throw new Error('answer_post_failed');
  }
}

export async function fetchLeaderboard(guildId: string | null): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/leaderboard?guildId=${encodeURIComponent(guildId ?? 'demo')}`);
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { entries: LeaderboardEntry[] };
    return data.entries;
  } catch {
    return [];
  }
}
