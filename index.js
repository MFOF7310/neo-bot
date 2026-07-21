'use strict';

/**
 * index.js — NEO bot entry point
 * Discord.js v14, PM2-ready, slash commands auto-registered at boot.
 *
 *   npm install
 *   cp config.env.example .env   # fill in DISCORD_TOKEN + CLIENT_ID
 *   npm run seed                 # seed the 200-question bank (first run only)
 *   npm start                    # or: pm2 start index.js --name neo-afriquiz
 */

require('dotenv').config({ path: ['.env', 'config.env'] });

const path = require('path');
const { createApiServer } = require('./lib/api-server');
const { Client, GatewayIntentBits, Events, REST, Routes } = require('discord.js');

const afriquiz = require('./plugins/afriquiz');
const { DB_PATH, db } = require('./lib/db');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID || null;
const PORT = Number(process.env.PORT || 5003);

if (!TOKEN || !CLIENT_ID) {
  console.error('[NEO] ❌ DISCORD_TOKEN and CLIENT_ID are required (see config.env.example).');
  process.exit(1);
}

/* ── Slash command registration ─────────────────────────────────── */

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  const slashBody = afriquiz.commands.map(c => c.toJSON ? c.toJSON() : c);
  try {
    // Fetch existing commands to preserve Entry Point (type 4) command
    let existing = [];
    if (GUILD_ID) {
      existing = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
    } else {
      existing = await rest.get(Routes.applicationCommands(CLIENT_ID));
    }
    // Keep any Entry Point commands Discord manages
    const entryPoints = existing.filter(c => c.type === 4);
    const body = [...slashBody, ...entryPoints];

    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body });
      console.log(`[NEO] ✅ ${slashBody.length} commands registered on guild ${GUILD_ID} (instant).`);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body });
      console.log(`[NEO] ✅ ${slashBody.length} commands registered globally (may take up to 1h).`);
    }
  } catch (err) {
    console.error('[NEO] ⚠️  Command registration failed (bot will still run):', err.message);
  }
}

/* ── Client ─────────────────────────────────────────────────────── */

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (c) => {
  const qCount = db.prepare('SELECT COUNT(*) AS n FROM questions').get().n;
  console.log(`[NEO] 🦅 Logged in as ${c.user.tag}`);
  console.log(`[NEO] 📚 Question bank: ${qCount} questions (${path.basename(DB_PATH)})`);
  console.log(`[NEO] 🌐 Health check on :${PORT}`);
  c.user.setActivity('/quiz • AfriQuiz 🌍', { type: 3 }); // WATCHING
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const handler = afriquiz.handlers[interaction.commandName];
      if (handler) return await handler(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('afq:') || interaction.customId.startsWith('lobby:')) {
      return await afriquiz.handleButton(interaction);
    }
  } catch (err) {
    console.error(`[NEO] Interaction error (${interaction.customId || interaction.commandName}):`, err);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Oups, erreur interne / Internal error…', ephemeral: true });
      }
    } catch { /* silent */ }
  }
});

/* ── HTTP + API server (port 5003) ────────────────────────────────
   /health, /api/quiz/question, /api/quiz/answer,
   /api/quiz/leaderboard, /api/token (see lib/api-server.js)        */

const server = createApiServer(client);
server.listen(PORT, () => console.log(`[NEO] HTTP + API server listening on port ${PORT}`));

/* ── Graceful shutdown (PM2) ────────────────────────────────────── */

function shutdown(signal) {
  console.log(`[NEO] ${signal} received, shutting down…`);
  server.close(() => {});
  client.destroy();
  db.close();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => console.error('[NEO] Unhandled rejection:', err));

/* ── Boot ───────────────────────────────────────────────────────── */

(async () => {
  await registerCommands();
  await client.login(TOKEN);
})();
