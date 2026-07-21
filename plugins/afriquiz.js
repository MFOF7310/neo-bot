'use strict';

/**
 * plugins/afriquiz.js — AfriQuiz
 * Bilingual (FR/EN) Africa-themed trivia for Discord.
 *
 * Commands: /quiz, /quiz-daily, /quiz-streak, /quiz-leaderboard, /quiz-stats, /neo-lang
 * Style: warm & human, dark embeds (#0a0a0a), gold accent (#FFD700), cyan (#00f0ff).
 */

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  AttachmentBuilder,
} = require('discord.js');

const { stmts, getLang, ensureScore, recordAnswer, getRank, db } = require('../lib/db');

/* ── Constants ──────────────────────────────────────────────────── */

const COLORS = { dark: 0x0a0a0a, gold: 0xffd700, cyan: 0x00f0ff, green: 0x2ecc71, red: 0xe74c3c };
const POINTS = { easy: 5, medium: 10, hard: 20 };
const SPEED_BONUS = 3;          // answered in < 5 s
const SPEED_WINDOW_MS = 5000;
const QUIZ_TIMEOUT_MS = 30_000;
const BUTTON_COOLDOWN_MS = 1200;
const CONFIRM_DELETE_MS = 3000;

const CATEGORIES = {
  geo:    { fr: '🌍 Géographie', en: '🌍 Geography' },
  hist:   { fr: '📜 Histoire',   en: '📜 History' },
  lang:   { fr: '🗣️ Langues',    en: '🗣️ Languages' },
  music:  { fr: '🎵 Musique',    en: '🎵 Music' },
  sport:  { fr: '🏆 Sport',      en: '🏆 Sports' },
  nature: { fr: '🌱 Nature',     en: '🌱 Nature' },
};

const DIFF_LABEL = {
  easy:   { fr: 'Facile',   en: 'Easy' },
  medium: { fr: 'Moyen',    en: 'Medium' },
  hard:   { fr: 'Difficile', en: 'Hard' },
};

/* ── i18n ───────────────────────────────────────────────────────── */

const T = {
  quizTitle:      { fr: '🧠 AfriQuiz — À vous de jouer !', en: '🧠 AfriQuiz — Your turn!' },
  dailyTitle:     { fr: '🌅 AfriQuiz — Question du jour', en: '🌅 AfriQuiz — Daily question' },
  category:       { fr: 'Catégorie', en: 'Category' },
  difficulty:     { fr: 'Difficulté', en: 'Difficulty' },
  pointsAtStake:  { fr: 'Points en jeu', en: 'Points at stake' },
  timer:          { fr: '⏱️ Vous avez 30 secondes… Premier à cliquer gagne !', en: '⏱️ You have 30 seconds… First to click wins!' },
  dailyDouble:    { fr: '✨ Points doublés (question du jour)', en: '✨ Double points (daily question)' },
  correct:        { fr: '✅ Bonne réponse', en: '✅ Correct answer' },
  wrong:          { fr: '❌ Mauvaise réponse', en: '❌ Wrong answer' },
  goodJob:        { fr: 'Bravo {name} ! +{pts} points 🎉', en: 'Well done {name}! +{pts} points 🎉' },
  speedBonus:     { fr: '⚡ Bonus rapidité +{pts} pts !', en: '⚡ Speed bonus +{pts} pts!' },
  tooBad:         { fr: 'Dommage {name}… La bonne réponse était **{ans}**.', en: 'Too bad {name}… The right answer was **{ans}**.' },
  streakInfo:     { fr: '🔥 Série : {n}', en: '🔥 Streak: {n}' },
  expiredTitle:   { fr: '⌛ Temps écoulé !', en: '⌛ Time\'s up!' },
  expiredBody:    { fr: 'Personne n\'a répondu à temps. La bonne réponse était **{ans}**.', en: 'Nobody answered in time. The right answer was **{ans}**.' },
  noQuestion:     { fr: 'Aucune question trouvée pour cette catégorie… Réessayez !', en: 'No question found for this category… Try again!' },
  alreadyAnswered:{ fr: 'Quelqu\'un a déjà répondu à celle-ci 😉', en: 'Someone already answered this one 😉' },
  quizExpired:    { fr: 'Ce quiz a expiré. Lancez `/quiz` pour une nouvelle question !', en: 'This quiz has expired. Run `/quiz` for a new question!' },
  dailyDone:      { fr: 'Tu as déjà joué ta question du jour, {name} ! Reviens demain 🌙', en: 'You already played your daily question, {name}! Come back tomorrow 🌙' },
  explanation:    { fr: '💡 Le savais-tu ?', en: '💡 Did you know?' },
  totalPoints:    { fr: 'Total : {pts} pts', en: 'Total: {pts} pts' },
  streakTitle:    { fr: '🔥 Ta série AfriQuiz', en: '🔥 Your AfriQuiz streak' },
  currentStreak:  { fr: 'Série actuelle', en: 'Current streak' },
  longestStreak:  { fr: 'Record personnel', en: 'Personal best' },
  rank:           { fr: 'Rang sur le serveur', en: 'Server rank' },
  rankValue:      { fr: '#{n}', en: '#{n}' },
  streakWarm:     { fr: 'Continue comme ça, {name} ! 💪', en: 'Keep it up, {name}! 💪' },
  streakStart:    { fr: 'Réponds juste à une question pour lancer ta série, {name} !', en: 'Answer one question right to start your streak, {name}!' },
  lbTitle:        { fr: '🏆 AfriQuiz — Classement du serveur', en: '🏆 AfriQuiz — Server Leaderboard' },
  lbEmpty:        { fr: 'Personne n\'a encore marqué de points… Sois le premier avec `/quiz` ! 🚀', en: 'Nobody has scored yet… Be the first with `/quiz`! 🚀' },
  lbPoints:       { fr: 'pts', en: 'pts' },
  statsTitle:     { fr: '📊 Stats de {name}', en: '📊 Stats for {name}' },
  statsPlayed:    { fr: 'Parties jouées', en: 'Games played' },
  statsCorrect:   { fr: 'Bonnes réponses', en: 'Correct answers' },
  statsAccuracy:  { fr: 'Précision', en: 'Accuracy' },
  statsBestCat:   { fr: 'Meilleure catégorie', en: 'Best category' },
  lobbyTitle:    { fr: '🎮 AfriQuiz — Configuration', en: '🎮 AfriQuiz — Setup' },
  lobbyDesc:     { fr: 'Configure ta partie puis clique sur **▶ Démarrer** !', en: 'Configure your game then click **▶ Start**!' },
  lobbyCategory: { fr: '🌍 Catégorie', en: '🌍 Category' },
  lobbyDiff:     { fr: '⚡ Difficulté', en: '⚡ Difficulty' },
  lobbyLang:     { fr: '🌐 Langue', en: '🌐 Language' },
  lobbyAny:      { fr: 'Aléatoire', en: 'Random' },
  lobbyStart:    { fr: '▶ Démarrer', en: '▶ Start' },
  lobbyTimeout:  { fr: '⌛ Lobby expiré. Lance `/quiz` pour recommencer.', en: '⌛ Lobby expired. Run `/quiz` to try again.' },
  countdown3:    { fr: '⏳ Préparation... **3**', en: '⏳ Getting ready... **3**' },
  countdown2:    { fr: '⏳ Préparation... **2**', en: '⏳ Getting ready... **2**' },
  countdown1:    { fr: '⏳ Préparation... **1**', en: '⏳ Getting ready... **1**' },
  countdownGo:   { fr: '🚀 C\'est parti !', en: '🚀 Here we go!' },
  statsNone:      { fr: 'Pas encore de partie jouée ! Lance `/quiz` pour commencer 🎮', en: 'No games played yet! Run `/quiz` to get started 🎮' },
  langSet:        { fr: '✅ Langue du serveur réglée sur **Français** 🇫🇷', en: '✅ Server language set to **English** 🇬🇧' },
  langNoPerm:     { fr: 'Seuls les administrateurs peuvent changer la langue du serveur.', en: 'Only admins can change the server language.' },
  error:          { fr: 'Oups, petit bug de mon côté… Réessaie dans un instant !', en: 'Oops, small hiccup on my side… Try again in a moment!' },
  playFallback:   { fr: 'Je n\'arrive pas à lancer l\'activité ici… Ouvre un salon vocal et clique sur le bouton 🚀 Activités, ou réessaie dans un instant !', en: 'I can\'t launch the activity here… Join a voice channel and click the 🚀 Activities button, or try again in a moment!' },
};

function t(lang, key, vars = {}) {
  let s = (T[key] && (T[key][lang] || T[key].en)) || key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/* ── In-memory quiz sessions (per message) ─────────────────────── */

/** messageId -> { qid, daily, startTime, answered, correctLetter, timeout } */
const sessions = new Map();
const lobbies = new Map(); // messageId -> { userId, category, difficulty, lang, timeout }

function getUserLang(guildId, userId, defaultLang) {
  try {
    const row = stmts.getUserLang?.get(userId, guildId);
    return row?.lang || defaultLang;
  } catch { return defaultLang; }
}

function setUserLang(guildId, userId, lang) {
  try { stmts.setUserLang?.run(lang, userId, guildId); } catch {}
}
/** "userId:customId" -> timestamp (1.2 s anti-spam) */
const buttonCooldowns = new Map();

/* ── Question helpers ───────────────────────────────────────────── */

function pickQuestion(category, difficulty) {
  return stmts.randomQuestion.get({ cat: category || null, diff: difficulty || null });
}

function qText(q, field, lang) {
  // bilingual fallback: FR missing -> EN and vice versa
  return q[`${field}_${lang}`] || q[`${field}_en`] || q[`${field}_fr`];
}

function basePoints(q, daily) {
  const base = POINTS[q.difficulty] || POINTS.easy;
  return daily ? base * 2 : base;
}

function buildQuizEmbed(q, lang, daily) {
  const cat = CATEGORIES[q.category] || { fr: q.category, en: q.category };
  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle(t(lang, daily ? 'dailyTitle' : 'quizTitle'))
    .setDescription(`**${qText(q, 'question', lang)}**\n\n${t(lang, 'timer')}`)
    .addFields(
      { name: t(lang, 'category'), value: cat[lang] || cat.en, inline: true },
      { name: t(lang, 'difficulty'), value: DIFF_LABEL[q.difficulty][lang], inline: true },
      { name: t(lang, 'pointsAtStake'), value: `**${basePoints(q, daily)}**${daily ? ' ' + t(lang, 'dailyDouble') : ''}`, inline: true },
    )
    .setFooter({ text: 'NEO • AfriQuiz' })
    .setTimestamp();
  return embed;
}

function buildAnswerRows(q, lang, daily, reveal = null, chosenLetter = null) {
  // reveal: null | 'correct' | 'wrong' | 'expired'
  const letters = ['a', 'b', 'c', 'd'];
  const row = new ActionRowBuilder();
  for (const letter of letters) {
    let style = ButtonStyle.Primary;
    if (reveal) {
      if (letter === q.correct) style = ButtonStyle.Success;
      else if (letter === chosenLetter) style = ButtonStyle.Danger;
      else style = ButtonStyle.Secondary;
    }
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`afq:${q.id}:${letter}:${daily ? 'd' : 's'}`)
        .setLabel(`${letter.toUpperCase()}. ${qText(q, `option_${letter}`, lang)}`.slice(0, 80))
        .setStyle(style)
        .setDisabled(Boolean(reveal)),
    );
  }
  return [row];
}

/* ── Quiz flow ──────────────────────────────────────────────────── */

function buildLobbyEmbed(lang, category, difficulty) {
  const catLabel = category ? (CATEGORIES[category]?.[lang] || category) : t(lang, 'lobbyAny');
  const diffLabel = difficulty ? DIFF_LABEL[difficulty][lang] : t(lang, 'lobbyAny');
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle(t(lang, 'lobbyTitle'))
    .setDescription(t(lang, 'lobbyDesc'))
    .addFields(
      { name: t(lang, 'lobbyCategory'), value: catLabel, inline: true },
      { name: t(lang, 'lobbyDiff'), value: diffLabel, inline: true },
      { name: t(lang, 'lobbyLang'), value: lang === 'fr' ? '🇫🇷 Français' : '🇬🇧 English', inline: true },
    )
    .setFooter({ text: 'NEO • AfriQuiz' });
}

function buildLobbyComponents(lang, category, difficulty) {
  const categoryChoicesLobby = [
    { label: t(lang, 'lobbyAny'), value: 'any' },
    ...Object.entries(CATEGORIES).map(([v, l]) => ({ label: l[lang] || l.en, value: v })),
  ];
  const diffChoices = [
    { label: t(lang, 'lobbyAny'), value: 'any' },
    { label: `🟢 ${DIFF_LABEL.easy[lang]} (5pts)`, value: 'easy' },
    { label: `🟡 ${DIFF_LABEL.medium[lang]} (10pts)`, value: 'medium' },
    { label: `🔴 ${DIFF_LABEL.hard[lang]} (20pts)`, value: 'hard' },
  ];

  const row1 = new ActionRowBuilder().addComponents(
    categoryChoicesLobby.map(c =>
      new ButtonBuilder()
        .setCustomId(`lobby:cat:${c.value}`)
        .setLabel(c.label.slice(0, 80))
        .setStyle(category === c.value || (c.value === 'any' && !category)
          ? ButtonStyle.Primary : ButtonStyle.Secondary)
    ).slice(0, 5)
  );

  const row2 = new ActionRowBuilder().addComponents(
    diffChoices.map(d =>
      new ButtonBuilder()
        .setCustomId(`lobby:diff:${d.value}`)
        .setLabel(d.label.slice(0, 80))
        .setStyle(difficulty === d.value || (d.value === 'any' && !difficulty)
          ? ButtonStyle.Primary : ButtonStyle.Secondary)
    )
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('lobby:lang:fr')
      .setLabel('🇫🇷 Français')
      .setStyle(lang === 'fr' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('lobby:lang:en')
      .setLabel('🇬🇧 English')
      .setStyle(lang === 'en' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('lobby:start')
      .setLabel(t(lang, 'lobbyStart'))
      .setStyle(ButtonStyle.Success),
  );

  return [row1, row2, row3];
}

async function cmdQuiz(interaction) {
  const guildLang = getLang(interaction.guildId);
  const userLang = getUserLang(interaction.guildId, interaction.user.id, guildLang);
  const category = interaction.options.getString('categorie') || interaction.options.getString('category') || null;
  const difficulty = interaction.options.getString('difficulte') || interaction.options.getString('difficulty') || null;

  const msg = await interaction.reply({
    embeds: [buildLobbyEmbed(userLang, category, difficulty)],
    components: buildLobbyComponents(userLang, category, difficulty),
    fetchReply: true,
  });

  const lobbyTimeout = setTimeout(async () => {
    lobbies.delete(msg.id);
    try {
      await msg.edit({
        embeds: [new EmbedBuilder().setColor(COLORS.red).setDescription(t(userLang, 'lobbyTimeout'))],
        components: [],
      });
    } catch {}
  }, 30_000);

  lobbies.set(msg.id, {
    userId: interaction.user.id,
    category,
    difficulty,
    lang: userLang,
    timeout: lobbyTimeout,
  });
}

async function launchQuiz(interaction, { daily = false, category = null, difficulty = null, forceLang = null, fromLobby = false }) {
  const lang = forceLang || getLang(interaction.guildId);

  if (daily) {
    const today = new Date().toISOString().slice(0, 10);
    const score = ensureScore(interaction.user.id, interaction.guildId);
    if (score.last_daily === today) {
      return interaction.reply({
        content: t(lang, 'dailyDone', { name: interaction.user.displayName }),
        ephemeral: true,
      });
    }
  }

  const q = pickQuestion(category, difficulty);
  if (!q) {
    return interaction.reply({ content: t(lang, 'noQuestion'), ephemeral: true });
  }

  const replyPayload = {
    embeds: [buildQuizEmbed(q, lang, daily)],
    components: buildAnswerRows(q, lang, daily),
  };
  const msg = fromLobby
    ? await interaction.editReply(replyPayload)
    : await interaction.reply({ ...replyPayload, fetchReply: true });

  const session = {
    qid: q.id, daily, startTime: Date.now(), answered: false,
    correctLetter: q.correct, guildId: interaction.guildId, channelId: msg.channelId,
  };
  const timeout = setTimeout(() => expireQuiz(interaction.client, msg.id).catch(() => {}), QUIZ_TIMEOUT_MS);
  session.timeout = timeout;
  sessions.set(msg.id, session);
}

async function expireQuiz(client, messageId) {
  const session = sessions.get(messageId);
  if (!session || session.answered) return;
  session.answered = true;
  sessions.delete(messageId);

  try {
    const channel = await client.channels.fetch(session.channelId);
    const msg = await channel.messages.fetch(messageId);
    const lang = getLang(session.guildId);
    const q = stmts.getQuestionById.get(session.qid);
    if (!q) return;

    const embed = EmbedBuilder.from(msg.embeds[0])
      .setColor(COLORS.red)
      .setTitle(t(lang, 'expiredTitle'))
      .setDescription(
        `**${qText(q, 'question', lang)}**\n\n` +
        t(lang, 'expiredBody', { ans: qText(q, `option_${q.correct}`, lang) }) +
        (qText(q, 'explanation', lang) ? `\n\n${t(lang, 'explanation')} ${qText(q, 'explanation', lang)}` : ''),
      );

    await msg.edit({ embeds: [embed], components: buildAnswerRows(q, lang, session.daily, 'expired') });
  } catch { /* silent fail */ }
}

/* ── Button handler ─────────────────────────────────────────────── */

async function handleButton(interaction) {
  try {
    // ── Lobby buttons ──
    if (interaction.customId.startsWith('lobby:')) {
      const lobby = lobbies.get(interaction.message.id);
      if (!lobby) return interaction.reply({ content: '⌛', ephemeral: true });
      if (interaction.user.id !== lobby.userId) {
        return interaction.reply({ content: '🔒 Only the person who started this lobby can configure it.', ephemeral: true });
      }

      const [, action, value] = interaction.customId.split(':');

      if (action === 'cat') {
        lobby.category = value === 'any' ? null : value;
      } else if (action === 'diff') {
        lobby.difficulty = value === 'any' ? null : value;
      } else if (action === 'lang') {
        lobby.lang = value;
        setUserLang(interaction.guildId, interaction.user.id, value);
      } else if (action === 'start') {
        clearTimeout(lobby.timeout);
        lobbies.delete(interaction.message.id);

        // Countdown
        const cd = [
          t(lobby.lang, 'countdown3'),
          t(lobby.lang, 'countdown2'),
          t(lobby.lang, 'countdown1'),
          t(lobby.lang, 'countdownGo'),
        ];
        const countdownEmbed = new EmbedBuilder().setColor(COLORS.gold).setDescription(cd[0]);
        await interaction.update({ embeds: [countdownEmbed], components: [] });
        for (let i = 1; i < cd.length; i++) {
          await new Promise(r => setTimeout(r, 1000));
          await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.gold).setDescription(cd[i])], components: [] });
        }
        await new Promise(r => setTimeout(r, 600));

        // Override guild lang with user's persistent lang
        const origGetLang = getLang;
        await launchQuiz(interaction, { daily: false, category: lobby.category, difficulty: lobby.difficulty, forceLang: lobby.lang, fromLobby: true });
        return;
      }

      // Update lobby embed
      await interaction.update({
        embeds: [buildLobbyEmbed(lobby.lang, lobby.category, lobby.difficulty)],
        components: buildLobbyComponents(lobby.lang, lobby.category, lobby.difficulty),
      });
      return;
    }

    const [, qid, letter, flag] = interaction.customId.split(':');
    const session = sessions.get(interaction.message.id);

    // 1.2 s anti-spam per user+button
    const cdKey = `${interaction.user.id}:${interaction.customId}`;
    const now = Date.now();
    if (buttonCooldowns.has(cdKey) && now - buttonCooldowns.get(cdKey) < BUTTON_COOLDOWN_MS) {
      return interaction.deferUpdate().catch(() => {});
    }
    buttonCooldowns.set(cdKey, now);

    const lang = getLang(interaction.guildId);

    if (!session) {
      return interaction.reply({ content: t(lang, 'quizExpired'), ephemeral: true }).catch(() => {});
    }
    if (session.answered || String(session.qid) !== qid) {
      return interaction.reply({ content: t(lang, 'alreadyAnswered'), ephemeral: true }).catch(() => {});
    }

    session.answered = true;
    clearTimeout(session.timeout);
    sessions.delete(interaction.message.id);

    const q = stmts.getQuestionById.get(session.qid);
    if (!q) return interaction.deferUpdate().catch(() => {});

    const isCorrect = letter === q.correct;
    const elapsed = now - session.startTime;
    let pts = isCorrect ? basePoints(q, session.daily) : 0;
    const speedy = isCorrect && elapsed < SPEED_WINDOW_MS;
    if (speedy) pts += SPEED_BONUS;

    const today = new Date().toISOString().slice(0, 10);
    const { streak, row: score } = recordAnswer({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      correct: isCorrect,
      points: pts,
      isDaily: session.daily,
      today,
    });
    // per-category stats for /quiz-stats "best category"
    stmts.bumpCategoryStat.run(interaction.user.id, interaction.guildId, q.category, isCorrect ? 1 : 0);

    const name = interaction.member?.displayName || interaction.user.username;
    const resultLines = [
      `**${qText(q, 'question', lang)}**`,
      '',
      isCorrect
        ? t(lang, 'goodJob', { name, pts }) + (speedy ? ` ${t(lang, 'speedBonus', { pts: SPEED_BONUS })}` : '')
        : t(lang, 'tooBad', { name, ans: qText(q, `option_${q.correct}`, lang) }),
      `${t(lang, 'streakInfo', { n: streak })} • ${t(lang, 'totalPoints', { pts: score.points })}`,
    ];
    if (qText(q, 'explanation', lang)) {
      resultLines.push('', `${t(lang, 'explanation')} ${qText(q, 'explanation', lang)}`);
    }

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(isCorrect ? COLORS.green : COLORS.red)
      .setTitle(t(lang, isCorrect ? 'correct' : 'wrong'))
      .setDescription(resultLines.join('\n'));

    await interaction.update({
      embeds: [embed],
      components: buildAnswerRows(q, lang, session.daily, isCorrect ? 'correct' : 'wrong', letter),
    });

    // short confirmation, auto-deleted after 3 s
    const confirm = await interaction.followUp({
      content: isCorrect
        ? `🎉 **${name}** +${pts} pts`
        : `💨 **${name}** ${lang === 'fr' ? 'se trompe…' : 'missed it…'}`,
    }).catch(() => null);
    if (confirm) setTimeout(() => interaction.deleteReply(confirm).catch(() => {}), CONFIRM_DELETE_MS);
  } catch (err) {
    // silent fail, ephemeral fallback
    try {
      const lang = getLang(interaction.guildId);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: t(lang, 'error'), ephemeral: true });
      }
    } catch { /* ignore */ }
  }
}

/* ── Commands ───────────────────────────────────────────────────── */



async function cmdQuizDaily(interaction) {
  await launchQuiz(interaction, { daily: true });
}

async function cmdQuizStreak(interaction) {
  const lang = getLang(interaction.guildId);
  const score = ensureScore(interaction.user.id, interaction.guildId);
  const rank = getRank(interaction.user.id, interaction.guildId);
  const name = interaction.member?.displayName || interaction.user.username;

  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle(t(lang, 'streakTitle'))
    .addFields(
      { name: t(lang, 'currentStreak'), value: `🔥 **${score.streak}**`, inline: true },
      { name: t(lang, 'longestStreak'), value: `🏅 **${score.longest_streak}**`, inline: true },
      { name: t(lang, 'rank'), value: t(lang, 'rankValue', { n: rank }), inline: true },
    )
    .setDescription(score.streak > 0 ? t(lang, 'streakWarm', { name }) : t(lang, 'streakStart', { name }))
    .setFooter({ text: 'NEO • AfriQuiz' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function cmdQuizStats(interaction) {
  const lang = getLang(interaction.guildId);
  const target = interaction.options.getUser('utilisateur') || interaction.options.getUser('user') || interaction.user;
  const score = stmts.getScore.get(target.id, interaction.guildId);

  if (!score || score.total_played === 0) {
    return interaction.reply({ content: t(lang, 'statsNone'), ephemeral: true });
  }

  const best = stmts.bestCategory.get(target.id, interaction.guildId);
  const cat = best ? (CATEGORIES[best.category] || { fr: best.category, en: best.category }) : null;
  const accuracy = Math.round((score.total_correct / score.total_played) * 100);
  const name = interaction.guild.members.cache.get(target.id)?.displayName || target.username;

  const embed = new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle(t(lang, 'statsTitle', { name }))
    .addFields(
      { name: t(lang, 'statsPlayed'), value: `🎮 **${score.total_played}**`, inline: true },
      { name: t(lang, 'statsCorrect'), value: `✅ **${score.total_correct}**`, inline: true },
      { name: t(lang, 'statsAccuracy'), value: `🎯 **${accuracy}%**`, inline: true },
      { name: t(lang, 'pointsAtStake').replace(' en jeu', '').replace(' at stake', ''), value: `⭐ **${score.points}**`, inline: true },
      { name: t(lang, 'currentStreak'), value: `🔥 **${score.streak}**`, inline: true },
      { name: t(lang, 'statsBestCat'), value: cat ? (cat[lang] || cat.en) : '—', inline: true },
    )
    .setThumbnail(target.displayAvatarURL({ size: 128 }))
    .setFooter({ text: 'NEO • AfriQuiz' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/* ── Leaderboard (canvas card + embed fallback) ────────────────── */

async function renderLeaderboardCard(rows, names, lang) {
  let createCanvas;
  try {
    ({ createCanvas } = require('@napi-rs/canvas'));
  } catch {
    return null; // canvas unavailable -> caller falls back to embed
  }

  const W = 900;
  const rowH = 64;
  const topPad = 150;
  const H = topPad + rows.length * rowH + 50;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);
  // gold top bar + cyan underline
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(0, 0, W, 8);
  ctx.fillStyle = '#00f0ff';
  ctx.fillRect(0, 8, W, 2);

  // title
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(lang === 'fr' ? '🏆 CLASSEMENT AFRIQUIZ' : '🏆 AFRIQUIZ LEADERBOARD', 40, 80);
  ctx.fillStyle = '#888888';
  ctx.font = '24px sans-serif';
  ctx.fillText('NEO • AfriQuiz', 40, 120);

  const medals = ['#FFD700', '#C0C0C0', '#CD7F32'];
  rows.forEach((row, i) => {
    const y = topPad + i * rowH;
    // row background
    ctx.fillStyle = i % 2 === 0 ? '#141414' : '#0f0f0f';
    ctx.fillRect(30, y, W - 60, rowH - 10);

    // rank
    ctx.fillStyle = medals[i] || '#00f0ff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`#${i + 1}`, 50, y + 38);

    // name
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px sans-serif';
    const name = (names.get(row.user_id) || row.user_id).slice(0, 24);
    ctx.fillText(name, 140, y + 38);

    // points
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px sans-serif';
    const ptsStr = `${row.points} ${t(lang, 'lbPoints')}`;
    const w = ctx.measureText(ptsStr).width;
    ctx.fillText(ptsStr, W - 60 - w, y + 38);
  });

  return canvas.toBuffer('image/png');
}

async function cmdQuizLeaderboard(interaction) {
  const lang = getLang(interaction.guildId);
  await interaction.deferReply();

  const rows = stmts.topScores.all(interaction.guildId);
  if (rows.length === 0) {
    return interaction.editReply({ content: t(lang, 'lbEmpty') });
  }

  // resolve display names
  const names = new Map();
  await Promise.all(rows.map(async (r) => {
    try {
      const m = await interaction.guild.members.fetch(r.user_id);
      names.set(r.user_id, m.displayName);
    } catch {
      try {
        const u = await interaction.client.users.fetch(r.user_id);
        names.set(r.user_id, u.username);
      } catch { names.set(r.user_id, r.user_id); }
    }
  }));

  const card = await renderLeaderboardCard(rows, names, lang).catch(() => null);
  if (card) {
    const file = new AttachmentBuilder(card, { name: 'afriquiz-leaderboard.png' });
    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle(t(lang, 'lbTitle'))
      .setImage('attachment://afriquiz-leaderboard.png')
      .setFooter({ text: 'NEO • AfriQuiz' })
      .setTimestamp();
    return interaction.editReply({ embeds: [embed], files: [file] });
  }

  // embed fallback
  const lines = rows.map((r, i) => {
    const medal = ['🥇', '🥈', '🥉'][i] || `**#${i + 1}**`;
    return `${medal} ${names.get(r.user_id) || r.user_id} — **${r.points}** ${t(lang, 'lbPoints')}`;
  });
  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle(t(lang, 'lbTitle'))
    .setDescription(lines.join('\n'))
    .setFooter({ text: 'NEO • AfriQuiz' })
    .setTimestamp();
  await interaction.editReply({ embeds: [embed] });
}

/**
 * /play — launch the AfriQuiz Activity straight from a text channel.
 * Uses Discord's LAUNCH_ACTIVITY (type 12) interaction callback:
 * Discord itself opens the Activity panel for the user, no voice
 * channel required. Falls back to an ephemeral hint if the client
 * or API refuses the callback.
 */
async function cmdPlay(interaction) {
  const lang = getLang(interaction.guildId);
  try {
    await interaction.client.rest.post(
      `/interactions/${interaction.id}/${interaction.token}/callback`,
      { body: { type: 12 } }, // 12 = LAUNCH_ACTIVITY
    );
  } catch {
    await interaction.reply({ content: t(lang, 'playFallback'), ephemeral: true }).catch(() => {});
  }
}

async function cmdNeoLang(interaction) {
  const lang = getLang(interaction.guildId);
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: t(lang, 'langNoPerm'), ephemeral: true });
  }
  const choice = interaction.options.getString('langue') || interaction.options.getString('language');
  stmts.setGuildLang.run(interaction.guildId, choice);
  await interaction.reply({ content: t(choice, 'langSet') });
}

/* ── Command definitions (slash registration) ──────────────────── */

const categoryChoices = Object.entries(CATEGORIES).map(([value, l]) => ({
  name: `${l.fr} / ${l.en}`,
  value,
}));

const commands = [
  new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('🧠 Question aléatoire / Random trivia question')
    .addStringOption((o) =>
      o.setName('categorie')
        .setDescription('Catégorie (optionnel) / Category (optional)')
        .addChoices(...categoryChoices)
        .setRequired(false))
    .addStringOption((o) =>
      o.setName('difficulte')
        .setDescription('Difficulté / Difficulty')
        .addChoices(
          { name: '🟢 Facile / Easy (5 pts)', value: 'easy' },
          { name: '🟡 Moyen / Medium (10 pts)', value: 'medium' },
          { name: '🔴 Difficile / Hard (20 pts)', value: 'hard' },
        )
        .setRequired(false)),
  new SlashCommandBuilder()
    .setName('quiz-daily')
    .setDescription('🌅 Question bonus du jour, points doublés / Daily bonus question, double points'),
  new SlashCommandBuilder()
    .setName('quiz-streak')
    .setDescription('🔥 Ta série et ton rang / Your streak and rank'),
  new SlashCommandBuilder()
    .setName('quiz-leaderboard')
    .setDescription('🏆 Top 10 du serveur / Server top 10'),
  new SlashCommandBuilder()
    .setName('quiz-stats')
    .setDescription('📊 Tes statistiques / Your stats')
    .addUserOption((o) =>
      o.setName('utilisateur')
        .setDescription('Voir les stats de quelqu\'un d\'autre / View someone else\'s stats')
        .setRequired(false)),
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('🚀 Lancer AfriQuiz ici, sans salon vocal / Launch AfriQuiz here, no voice channel needed'),
  new SlashCommandBuilder()
    .setName('neo-lang')
    .setDescription('🌐 Langue du serveur / Server language')
    .addStringOption((o) =>
      o.setName('langue')
        .setDescription('fr ou en / fr or en')
        .addChoices({ name: 'Français 🇫🇷', value: 'fr' }, { name: 'English 🇬🇧', value: 'en' })
        .setRequired(true)),
].map((c) => c.toJSON());

const handlers = {
  'play': cmdPlay,
  'quiz': cmdQuiz,
  'quiz-daily': cmdQuizDaily,
  'quiz-streak': cmdQuizStreak,
  'quiz-leaderboard': cmdQuizLeaderboard,
  'quiz-stats': cmdQuizStats,
  'neo-lang': cmdNeoLang,
};

module.exports = { commands, handlers, handleButton };
