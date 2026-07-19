import type { AnswerResult, Lang, LeaderboardEntry, QuizQuestion } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api/quiz';

/* ── Demo fallback (offline / preview outside the VPS) ───────────── */

const DEMO_QUESTIONS: QuizQuestion[] = [
  {
    id: -1, category: 'geo', difficulty: 'easy',
    question: 'Quelle est la capitale du Mali ? / What is the capital of Mali?',
    options: [
      { letter: 'a', text: 'Bamako' },
      { letter: 'b', text: 'Dakar' },
      { letter: 'c', text: 'Niamey' },
      { letter: 'd', text: 'Conakry' },
    ],
  },
  {
    id: -2, category: 'hist', difficulty: 'medium',
    question: 'Mansa Moussa était empereur de… / Mansa Musa was emperor of…',
    options: [
      { letter: 'a', text: 'Ghana' },
      { letter: 'b', text: 'Mali' },
      { letter: 'c', text: 'Songhaï / Songhai' },
      { letter: 'd', text: 'Éthiopie / Ethiopia' },
    ],
  },
  {
    id: -3, category: 'music', difficulty: 'easy',
    question: 'De quel pays vient Salif Keita ? / Where is Salif Keita from?',
    options: [
      { letter: 'a', text: 'Sénégal / Senegal' },
      { letter: 'b', text: 'Guinée / Guinea' },
      { letter: 'c', text: 'Mali' },
      { letter: 'd', text: 'Niger' },
    ],
  },
];

const DEMO_ANSWERS: Record<number, { correctLetter: string; explanation: string }> = {
  [-1]: { correctLetter: 'a', explanation: "Bamako, sur le fleuve Niger, compte plus de 2 millions d'habitants. / Bamako, on the Niger River, has over 2 million inhabitants." },
  [-2]: { correctLetter: 'b', explanation: "Souvent décrit comme l'homme le plus riche de l'histoire. / Often described as the richest man in history." },
  [-3]: { correctLetter: 'c', explanation: "La « voix d'or de l'Afrique » est malienne ! / The golden voice of Africa is Malian!" },
};

const demoState = { points: 0, streak: 0 };
let demoCursor = 0;

function demoQuestion(): QuizQuestion {
  const q = DEMO_QUESTIONS[demoCursor % DEMO_QUESTIONS.length];
  demoCursor += 1;
  return q;
}

function demoAnswer(questionId: number, answer: string): AnswerResult {
  const meta = DEMO_ANSWERS[questionId] ?? { correctLetter: 'a', explanation: '' };
  const correct = answer === meta.correctLetter;
  if (correct) { demoState.streak += 1; demoState.points += 10; } else { demoState.streak = 0; }
  return {
    correct,
    correctLetter: meta.correctLetter,
    points: correct ? 10 : 0,
    totalPoints: demoState.points,
    streak: demoState.streak,
    speedBonus: false,
    explanation: meta.explanation || null,
  };
}

/* ── Real API (NEO bot, port 5003 via nginx) ─────────────────────── */

export async function fetchQuestion(lang: Lang, category = 'all'): Promise<QuizQuestion> {
  try {
    const res = await fetch(`${API_BASE}/question?lang=${lang}&category=${category}`);
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as QuizQuestion;
  } catch {
    return demoQuestion();
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
    return demoAnswer(params.questionId, params.answer);
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
