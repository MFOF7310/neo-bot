export type Lang = 'fr' | 'en';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuizOption {
  letter: string;
  text: string;
}

export interface QuizQuestion {
  id: number;
  category: string;
  difficulty: Difficulty;
  question: string;
  options: QuizOption[];
}

export interface AnswerResult {
  correct: boolean;
  correctLetter: string;
  points: number;
  totalPoints: number;
  streak: number;
  speedBonus: boolean;
  explanation: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  points: number;
  totalCorrect: number;
}

export interface GameUser {
  id: string;
  username: string;
  avatar: string | null;
  locale: string;
  guildId: string | null;
  isDemo: boolean;
}

export type Reveal =
  | { kind: 'correct'; correctLetter: string; chosenLetter: string }
  | { kind: 'wrong'; correctLetter: string; chosenLetter: string }
  | { kind: 'expired'; correctLetter: string; chosenLetter: null };

export const CATEGORY_META: Record<string, { fr: string; en: string; emoji: string }> = {
  geo:    { fr: 'Géographie', en: 'Geography', emoji: '🌍' },
  hist:   { fr: 'Histoire',   en: 'History',   emoji: '📜' },
  lang:   { fr: 'Langues',    en: 'Languages', emoji: '🗣️' },
  music:  { fr: 'Musique',    en: 'Music',     emoji: '🎵' },
  sport:  { fr: 'Sport',      en: 'Sports',    emoji: '🏆' },
  nature: { fr: 'Nature',     en: 'Nature',    emoji: '🌱' },
};

export const DIFF_META: Record<Difficulty, { fr: string; en: string; points: number }> = {
  easy:   { fr: 'Facile',    en: 'Easy',   points: 5 },
  medium: { fr: 'Moyen',     en: 'Medium', points: 10 },
  hard:   { fr: 'Difficile', en: 'Hard',   points: 20 },
};
