# 🦅 NEO Bot — AfriQuiz

A bilingual (FR/EN) Africa-themed trivia bot for Discord, built with Discord.js v14.
*Un bot Discord de quiz bilingue (FR/EN) sur l'Afrique, construit avec Discord.js v14.*

---

## 🇬🇧 English

### Features
- **`/quiz [categorie]`** — random question, 4 answer buttons, 30-second timer, auto-expire
- **`/quiz-daily`** — one bonus question per user per day, **double points**
- **`/quiz-streak`** — current streak, personal best, server rank
- **`/quiz-leaderboard`** — server top 10 as a generated image card (dark/gold style)
- **`/quiz-stats`** — games played, correct answers, accuracy %, best category
- **`/neo-lang set fr|en`** — set the server language (admins only, default: FR)

**Points:** Easy 5 • Medium 10 • Hard 20 • Daily ×2 • Answer in under 5 s → +3 speed bonus

**Categories:** 🌍 Geography • 📜 History • 🗣️ Languages • 🎵 Music • 🏆 Sports • 🌱 Nature

The question bank ships with **200 fully bilingual questions** (70 easy, 92 medium, 38 hard), including Mali specials (Mansa Musa, Timbuktu, Bambara…), West Africa, pan-African history, Afrobeats and AFCON.

### Setup
```bash
git clone https://github.com/MFOF7310/neo-bot.git
cd neo-bot
npm install
cp config.env.example .env     # fill in DISCORD_TOKEN + CLIENT_ID
npm run seed                   # only if data/afriquiz.sqlite is missing
npm start
```

### Discord Developer Portal
1. Create an application at <https://discord.com/developers/applications>
2. **Bot** tab → copy the token into `.env` (`DISCORD_TOKEN`)
3. **General Information** → copy the Application ID (`CLIENT_ID`)
4. Invite URL (OAuth2 → URL Generator, scopes `bot` + `applications.commands`, permission `Send Messages`):
   ```
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot%20applications.commands&permissions=3072
   ```

Commands are registered automatically at boot. Set `GUILD_ID` in `.env` during development for instant registration; leave it empty for global registration (can take up to 1 h to propagate).

### Deploy on the VPS (PM2)
```bash
pm2 start index.js --name neo-afriquiz
pm2 save
```
Add to `/root/ecosystem.config.cjs`:
```js
{
  name: 'neo-afriquiz',
  script: './index.js',
  cwd: '/root/neo-bot',
  env: { PORT: 5003, NODE_ENV: 'production' },
}
```
Health check: `curl http://138.199.146.139:5003/health`

### Deploy workflow (same as ARCHON)
```bash
npm run check      # node --check on every file, before any restart
pm2 restart neo-afriquiz
```

### Project structure
```
neo-bot/
├── index.js               # bot entry, command registration, health server (port 5003)
├── plugins/
│   └── afriquiz.js        # all 6 commands + button logic
├── lib/
│   ├── db.js              # better-sqlite3, WAL mode, schema + helpers
│   └── questions.js       # 200-question bilingual bank (source of truth)
├── scripts/
│   ├── seed.js            # seed/re-seed the question bank
│   └── register.js        # re-register slash commands without restart
├── data/
│   └── afriquiz.sqlite    # pre-seeded database
├── config.env.example
└── package.json
```

---

## 🇫🇷 Français

### Fonctionnalités
- **`/quiz [categorie]`** — question aléatoire, 4 boutons de réponse, minuteur de 30 s, expiration automatique
- **`/quiz-daily`** — une question bonus par joueur et par jour, **points doublés**
- **`/quiz-streak`** — série en cours, record personnel, rang sur le serveur
- **`/quiz-leaderboard`** — top 10 du serveur en image générée (style sombre/doré)
- **`/quiz-stats`** — parties jouées, bonnes réponses, précision %, meilleure catégorie
- **`/neo-lang set fr|en`** — langue du serveur (admins uniquement, défaut : FR)

**Points :** Facile 5 • Moyen 10 • Difficile 20 • Quotidien ×2 • Réponse en moins de 5 s → bonus rapidité +3

**Catégories :** 🌍 Géographie • 📜 Histoire • 🗣️ Langues • 🎵 Musique • 🏆 Sport • 🌱 Nature

La banque contient **200 questions entièrement bilingues** (70 faciles, 92 moyennes, 38 difficiles), dont des spéciales Mali (Mansa Moussa, Tombouctou, bambara…), l'Afrique de l'Ouest, l'histoire panafricaine, les afrobeats et la CAN.

### Installation
```bash
git clone https://github.com/MFOF7310/neo-bot.git
cd neo-bot
npm install
cp config.env.example .env     # remplir DISCORD_TOKEN + CLIENT_ID
npm run seed                   # seulement si data/afriquiz.sqlite est absent
npm start
```

### Portail développeur Discord
1. Créer une application sur <https://discord.com/developers/applications>
2. Onglet **Bot** → copier le token dans `.env` (`DISCORD_TOKEN`)
3. **General Information** → copier l'Application ID (`CLIENT_ID`)
4. URL d'invitation (OAuth2 → URL Generator, scopes `bot` + `applications.commands`, permission `Send Messages`) :
   ```
   https://discord.com/oauth2/authorize?client_id=VOTRE_CLIENT_ID&scope=bot%20applications.commands&permissions=3072
   ```

Les commandes sont enregistrées automatiquement au démarrage. Renseignez `GUILD_ID` dans `.env` en développement pour un enregistrement instantané ; laissez vide pour un enregistrement global (jusqu'à 1 h de propagation).

### Déploiement sur le VPS (PM2)
```bash
pm2 start index.js --name neo-afriquiz
pm2 save
```
Ajouter dans `/root/ecosystem.config.cjs` :
```js
{
  name: 'neo-afriquiz',
  script: './index.js',
  cwd: '/root/neo-bot',
  env: { PORT: 5003, NODE_ENV: 'production' },
}
```
Vérification : `curl http://138.199.146.139:5003/health`

### Règles avant redémarrage (comme ARCHON)
```bash
npm run check      # node --check sur chaque fichier, avant tout redémarrage
pm2 restart neo-afriquiz
```

---

*Made with 🌍 for African Discord communities — Fait avec 🌍 pour les communautés Discord africaines.*
