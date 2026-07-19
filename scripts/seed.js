'use strict';

/**
 * scripts/seed.js — Seed the AfriQuiz question bank into SQLite.
 * Idempotent: wipes and re-inserts all questions from lib/questions.js.
 * Options are shuffled with a fixed seed so results are reproducible.
 *
 *   npm run seed
 */

require('dotenv').config({ path: ['.env', 'config.env'] });

const { db } = require('../lib/db');
const { QUESTIONS } = require('../lib/questions');

/* deterministic PRNG (mulberry32) so shuffles are reproducible */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const rng = mulberry32(0xAFCA); // fixed seed
const LETTERS = ['a', 'b', 'c', 'd'];

const insert = db.prepare(`
  INSERT INTO questions (
    category, difficulty, question_fr, question_en,
    option_a_fr, option_a_en, option_b_fr, option_b_en,
    option_c_fr, option_c_en, option_d_fr, option_d_en,
    correct, explanation_fr, explanation_en
  ) VALUES (
    @category, @difficulty, @question_fr, @question_en,
    @option_a_fr, @option_a_en, @option_b_fr, @option_b_en,
    @option_c_fr, @option_c_en, @option_d_fr, @option_d_en,
    @correct, @explanation_fr, @explanation_en
  )
`);

const seedAll = db.transaction((questions) => {
  db.prepare('DELETE FROM questions').run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name = 'questions'").run();

  for (const q of questions) {
    if (!q.options || q.options.length !== 4) {
      throw new Error(`Question has ${q.options?.length} options instead of 4: ${q.question_fr}`);
    }
    // options[0] is the correct answer in the source file
    const order = shuffle([0, 1, 2, 3], rng);
    const row = {
      category: q.category,
      difficulty: q.difficulty,
      question_fr: q.question_fr,
      question_en: q.question_en,
      explanation_fr: q.explanation_fr || null,
      explanation_en: q.explanation_en || null,
    };
    order.forEach((srcIdx, pos) => {
      const letter = LETTERS[pos];
      row[`option_${letter}_fr`] = q.options[srcIdx][0];
      row[`option_${letter}_en`] = q.options[srcIdx][1];
      if (srcIdx === 0) row.correct = letter;
    });
    insert.run(row);
  }
});

seedAll(QUESTIONS);

const n = db.prepare('SELECT COUNT(*) AS n FROM questions').get().n;
const byCat = db.prepare('SELECT category, COUNT(*) AS n FROM questions GROUP BY category ORDER BY category').all();
const byDiff = db.prepare('SELECT difficulty, COUNT(*) AS n FROM questions GROUP BY difficulty').all();

console.log(`✅ Seeded ${n} questions into the database.`);
console.table(byCat);
console.table(byDiff);
