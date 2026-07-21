'use strict';

/**
 * lib/db.js — SQLite setup for NEO / AfriQuiz
 * better-sqlite3, WAL mode, foreign keys on.
 * The database file is created automatically; run `npm run seed` to
 * (re)populate the questions bank from lib/questions.js.
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', 'data', 'afriquiz.sqlite');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

/* ── Schema ─────────────────────────────────────────────────────── */

db.exec(`
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,             -- easy|medium|hard
  question_fr TEXT NOT NULL,
  question_en TEXT,
  option_a_fr TEXT NOT NULL, option_a_en TEXT,
  option_b_fr TEXT NOT NULL, option_b_en TEXT,
  option_c_fr TEXT NOT NULL, option_c_en TEXT,
  option_d_fr TEXT NOT NULL, option_d_en TEXT,
  correct TEXT NOT NULL,                -- a|b|c|d
  explanation_fr TEXT,
  explanation_en TEXT
);

CREATE TABLE IF NOT EXISTS scores (
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  total_played INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_daily TEXT,
  PRIMARY KEY (user_id, guild_id)
);

CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  lang TEXT DEFAULT 'fr'
);

-- per-category stats (feeds /quiz-stats "best category")
CREATE TABLE IF NOT EXISTS category_stats (
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  category TEXT NOT NULL,
  played INTEGER DEFAULT 0,
  correct INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, guild_id, category)
);

CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_scores_guild_points ON scores(guild_id, points DESC);
`);

/* ── Prepared statements ────────────────────────────────────────── */

const stmts = {
  getGuildLang: db.prepare('SELECT lang FROM guild_settings WHERE guild_id = ?'),
  setGuildLang: db.prepare(`
    INSERT INTO guild_settings (guild_id, lang) VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET lang = excluded.lang
  `),

  randomQuestion: db.prepare(`
    SELECT * FROM questions
    WHERE (@cat IS NULL OR category = @cat)
      AND (@diff IS NULL OR difficulty = @diff)
    ORDER BY RANDOM() LIMIT 1
  `),
  getQuestionById: db.prepare('SELECT * FROM questions WHERE id = ?'),
  countQuestions: db.prepare('SELECT COUNT(*) AS n FROM questions'),

  getScore: db.prepare('SELECT * FROM scores WHERE user_id = ? AND guild_id = ?'),
  upsertScore: db.prepare(`
    INSERT INTO scores (user_id, guild_id, points, total_played, total_correct, streak, longest_streak, last_daily)
    VALUES (@user_id, @guild_id, @points, @total_played, @total_correct, @streak, @longest_streak, @last_daily)
    ON CONFLICT(user_id, guild_id) DO UPDATE SET
      points         = excluded.points,
      total_played   = excluded.total_played,
      total_correct  = excluded.total_correct,
      streak         = excluded.streak,
      longest_streak = excluded.longest_streak,
      last_daily     = COALESCE(excluded.last_daily, scores.last_daily)
  `),
  topScores: db.prepare(`
    SELECT * FROM scores WHERE guild_id = ? ORDER BY points DESC, total_correct DESC LIMIT 10
  `),
  bumpCategoryStat: db.prepare(`
    INSERT INTO category_stats (user_id, guild_id, category, played, correct)
    VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(user_id, guild_id, category) DO UPDATE SET
      played  = played + 1,
      correct = correct + excluded.correct
  `),
  bestCategory: db.prepare(`
    SELECT category, played, correct FROM category_stats
    WHERE user_id = ? AND guild_id = ? AND played >= 3
    ORDER BY (CAST(correct AS REAL) / played) DESC, correct DESC LIMIT 1
  `),
  userRank: db.prepare(`
    SELECT COUNT(*) + 1 AS rank FROM scores
    WHERE guild_id = ? AND (points > @points OR (points = @points AND total_correct > @correct))
  `),
};

/* ── Helpers ────────────────────────────────────────────────────── */

/** Get a guild's language, defaulting to 'fr'. */
function getLang(guildId) {
  const row = stmts.getGuildLang.get(guildId);
  return row && row.lang === 'en' ? 'en' : 'fr';
}

/** Ensure a score row exists and return it. */
function ensureScore(userId, guildId) {
  let row = stmts.getScore.get(userId, guildId);
  if (!row) {
    stmts.upsertScore.run({
      user_id: userId, guild_id: guildId,
      points: 0, total_played: 0, total_correct: 0,
      streak: 0, longest_streak: 0, last_daily: null,
    });
    row = stmts.getScore.get(userId, guildId);
  }
  return row;
}

/**
 * Record a quiz answer. Returns points earned plus the updated score row.
 * @param {object} p { userId, guildId, correct, points, isDaily, today }
 */
function recordAnswer({ userId, guildId, correct, points, isDaily, today }) {
  const row = ensureScore(userId, guildId);
  const streak = correct ? row.streak + 1 : 0;
  const longest = Math.max(row.longest_streak, streak);
  const earned = correct ? points : 0;
  stmts.upsertScore.run({
    user_id: userId,
    guild_id: guildId,
    points: row.points + earned,
    total_played: row.total_played + 1,
    total_correct: row.total_correct + (correct ? 1 : 0),
    streak,
    longest_streak: longest,
    last_daily: isDaily ? today : row.last_daily,
  });
  return { earned, streak, row: stmts.getScore.get(userId, guildId) };
}

/** Rank of a user inside a guild (1-based). */
function getRank(userId, guildId) {
  const row = ensureScore(userId, guildId);
  return stmts.userRank.get(guildId, { points: row.points, correct: row.total_correct }).rank;
}

module.exports = {
  db,
  stmts,
  getLang,
  ensureScore,
  recordAnswer,
  getRank,
  DB_PATH,
};
