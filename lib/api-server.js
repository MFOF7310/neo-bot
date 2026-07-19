'use strict';

/**
 * lib/api-server.js — HTTP + API server for NEO (port 5003)
 *
 * Routes:
 *   GET  /health
 *   GET  /api/quiz/question?lang=fr&category=all
 *   POST /api/quiz/answer          { userId, guildId, questionId, answer, elapsedMs, lang }
 *   GET  /api/quiz/leaderboard?guildId=xxx
 *   POST /api/token                { code }  (Discord OAuth2 exchange for Activities)
 *
 * CORS: https://bamako-steel-dev.xyz, https://*.discordsays.com, http://localhost:*
 */

const http = require('http');
const { stmts, recordAnswer } = require('./db');

const POINTS = { easy: 5, medium: 10, hard: 20 };
const SPEED_BONUS = 3;
const SPEED_WINDOW_MS = 5000;

const ALLOWED_ORIGINS = [
  /^https:\/\/([a-z0-9-]+\.)?bamako-steel-dev\.xyz$/,
  /^https:\/\/[a-z0-9-]+\.discordsays\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

function corsOrigin(req) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.some((re) => re.test(origin))) return origin;
  return null;
}

function setCors(req, res) {
  const origin = corsOrigin(req);
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e5) reject(new Error('body too large'));
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error('invalid JSON')); }
    });
    req.on('error', reject);
  });
}

/** localized field with FR/EN fallback */
function pick(row, field, lang) {
  return row[`${field}_${lang}`] || row[`${field}_en`] || row[`${field}_fr`] || '';
}

/* ── Route handlers ─────────────────────────────────────────────── */

function handleQuestion(url, res) {
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'fr';
  const category = url.searchParams.get('category');
  const q = stmts.randomQuestion.get({
    cat: category && category !== 'all' ? category : null,
  });
  if (!q) return sendJson(res, 404, { error: 'no_question' });

  sendJson(res, 200, {
    id: q.id,
    category: q.category,
    difficulty: q.difficulty,
    question: pick(q, 'question', lang),
    options: ['a', 'b', 'c', 'd'].map((letter) => ({
      letter,
      text: pick(q, `option_${letter}`, lang),
    })),
  });
}

async function handleAnswer(req, res) {
  const body = await readBody(req);
  const { userId, questionId, answer } = body;
  const guildId = body.guildId || 'dm';
  const lang = body.lang === 'en' ? 'en' : 'fr';
  const elapsedMs = Math.max(0, Math.min(Number(body.elapsedMs) || 99999, 30000));

  if (!userId || !questionId) return sendJson(res, 400, { error: 'missing_fields' });

  const q = stmts.getQuestionById.get(Number(questionId));
  if (!q) return sendJson(res, 404, { error: 'question_not_found' });

  const correct = typeof answer === 'string' && answer === q.correct;
  const speedBonus = correct && elapsedMs < SPEED_WINDOW_MS;
  let points = 0;
  if (correct) {
    points = POINTS[q.difficulty] || POINTS.easy;
    if (speedBonus) points += SPEED_BONUS;
  }

  const today = new Date().toISOString().slice(0, 10);
  const { streak, row } = recordAnswer({
    userId: String(userId),
    guildId: String(guildId),
    correct,
    points,
    isDaily: false,
    today,
  });
  stmts.bumpCategoryStat.run(String(userId), String(guildId), q.category, correct ? 1 : 0);

  sendJson(res, 200, {
    correct,
    correctLetter: q.correct,
    points,
    totalPoints: row.points,
    streak,
    speedBonus,
    explanation: pick(q, 'explanation', lang) || null,
  });
}

function handleLeaderboard(url, res) {
  const guildId = url.searchParams.get('guildId');
  if (!guildId) return sendJson(res, 400, { error: 'missing_guildId' });
  const rows = stmts.topScores.all(String(guildId));
  sendJson(res, 200, {
    entries: rows.map((r, i) => ({
      rank: i + 1,
      userId: r.user_id,
      points: r.points,
      totalCorrect: r.total_correct,
    })),
  });
}

async function handleToken(req, res) {
  const { code } = await readBody(req);
  if (!code) return sendJson(res, 400, { error: 'missing_code' });

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return sendJson(res, 500, { error: 'server_not_configured' });
  }

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: String(code),
    }),
  });

  if (!tokenRes.ok) {
    return sendJson(res, 401, { error: 'token_exchange_failed' });
  }
  const data = await tokenRes.json();
  sendJson(res, 200, { access_token: data.access_token });
}

/* ── Server factory ─────────────────────────────────────────────── */

function createApiServer(client) {
  return http.createServer(async (req, res) => {
    setCors(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const url = new URL(req.url || '/', 'http://localhost');
    // nginx mounts the bot under /neo/ — accept both /api/... and /neo/api/...
    url.pathname = url.pathname.replace(/^\/neo(?=\/)/, '');

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, {
          status: 'ok',
          bot: client.user ? client.user.tag : 'starting',
          uptime: Math.round(process.uptime()),
        });
      }
      if (req.method === 'GET' && url.pathname === '/api/quiz/question') {
        return handleQuestion(url, res);
      }
      if (req.method === 'POST' && url.pathname === '/api/quiz/answer') {
        return await handleAnswer(req, res);
      }
      if (req.method === 'GET' && url.pathname === '/api/quiz/leaderboard') {
        return handleLeaderboard(url, res);
      }
      if (req.method === 'POST' && url.pathname === '/api/token') {
        return await handleToken(req, res);
      }
      if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('NEO is alive 🦅');
      }
      sendJson(res, 404, { error: 'not_found' });
    } catch (err) {
      console.error('[NEO] API error:', err.message);
      if (!res.headersSent) sendJson(res, 500, { error: 'internal_error' });
    }
  });
}

module.exports = { createApiServer };
