'use strict';

/**
 * scripts/register.js — Re-register slash commands without restarting the bot.
 *   npm run register
 */

require('dotenv').config({ path: ['.env', 'config.env'] });

const { REST, Routes } = require('discord.js');
const afriquiz = require('../plugins/afriquiz');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('❌ DISCORD_TOKEN and CLIENT_ID are required.');
  process.exit(1);
}

(async () => {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  if (GUILD_ID) {
    // Fetch existing commands to preserve Entry Point
const existing = await rest.get(Routes.applicationCommands(CLIENT_ID));
const entryPoint = existing.find(c => c.type === 4); // CHAT_INPUT Entry Point
const entryPointCmd = entryPoint ? [entryPoint] : [];

await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: afriquiz.commands });
    console.log(`✅ ${afriquiz.commands.length} commands registered on guild ${GUILD_ID}.`);
  } else {
    const existing = await rest.get(Routes.applicationCommands(CLIENT_ID));
    const entryPoint = existing.find(c => c.type === 4);
    const body = [...afriquiz.commands, ...(entryPoint ? [entryPoint] : [])];
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body });
    console.log(`✅ ${body.length} commands registered globally.`);
  }
})().catch((err) => {
  console.error('❌ Registration failed:', err);
  process.exit(1);
});
