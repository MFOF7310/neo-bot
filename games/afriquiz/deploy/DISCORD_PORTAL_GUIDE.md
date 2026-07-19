# 🎮 AfriQuiz Discord Activity — Setup Guide / Guide d'installation

## 🇬🇧 English

### 1. Discord Developer Portal (one-time)

1. Open <https://discord.com/developers/applications> and select app **`1505920607995564092`** (NEO).
2. **OAuth2 → General** → copy the **Client Secret** into the bot's `.env`:
   ```
   DISCORD_CLIENT_SECRET=xxxxx
   ```
3. Left menu → **Activities → Settings** → toggle **Enable Activities** ON.
4. Same page → **URL Mappings** → add two mappings:

   | Prefix (on `1505920607995564092.discordsays.com`) | Target |
   |---|---|
   | `/` | `https://bamako-steel-dev.xyz/games/afriquiz/` |
   | `/api` | `https://bamako-steel-dev.xyz/api/` |

   Discord matches the longest prefix first, so `/api/quiz/question` hits the API
   and everything else loads the React app.
5. Save. No review/approval is needed for Activities in development.

### 2. Bot (.env on the VPS)

```bash
cd /root/neo-bot
# .env must contain:
#   DISCORD_TOKEN=...
#   CLIENT_ID=1505920607995564092
#   DISCORD_CLIENT_SECRET=...
#   PORT=5003
npm run check
pm2 restart neo-afriquiz
curl http://127.0.0.1:5003/health        # → {"status":"ok",...}
curl "http://127.0.0.1:5003/api/quiz/question?lang=fr"   # → question JSON
```

### 3. Frontend deploy

```bash
cd games/afriquiz
npm install
npm run build
sudo mkdir -p /opt/neo-games/afriquiz
sudo rsync -a --delete dist/ /opt/neo-games/afriquiz/
```

### 4. Nginx

- Copy `deploy/nginx.conf` into your nginx config, adjust SSL cert paths.
- `sudo nginx -t && sudo systemctl reload nginx`
- Verify: `curl https://bamako-steel-dev.xyz/api/quiz/question?lang=en`

### 5. Launch in Discord

1. Join a voice channel on a server where NEO is invited.
2. Click the **Activities** button (🚀 rocket) in the voice panel.
3. Select **AfriQuiz**. The game loads inside Discord — that's it!

> First launch inside Discord uses OAuth: the app calls `POST /api/token`
> on the bot to exchange the SDK `code` for an access token. This is why
> `DISCORD_CLIENT_SECRET` is required.

### 6. Local development (outside Discord)

```bash
npm run dev        # http://localhost:3000
```
Outside Discord the app runs in **demo mode** (mock user, 3 built-in
questions, no backend needed). To hit the real API locally:

```bash
# .env.local
VITE_API_BASE=http://localhost:5003/api/quiz
```

---

## 🇫🇷 Français

### 1. Portail développeur Discord (une seule fois)

1. Ouvrez <https://discord.com/developers/applications> et sélectionnez l'app **`1505920607995564092`** (NEO).
2. **OAuth2 → General** → copiez le **Client Secret** dans le `.env` du bot :
   ```
   DISCORD_CLIENT_SECRET=xxxxx
   ```
3. Menu de gauche → **Activities → Settings** → activez **Enable Activities**.
4. Même page → **URL Mappings** → ajoutez deux mappings :

   | Préfixe (sur `1505920607995564092.discordsays.com`) | Cible |
   |---|---|
   | `/` | `https://bamako-steel-dev.xyz/games/afriquiz/` |
   | `/api` | `https://bamako-steel-dev.xyz/api/` |

   Discord choisit le préfixe le plus long : `/api/quiz/question` va vers l'API,
   tout le reste charge l'application React.
5. Sauvegardez. Aucune validation n'est nécessaire en développement.

### 2. Bot (.env sur le VPS)

```bash
cd /root/neo-bot
# .env doit contenir :
#   DISCORD_TOKEN=...
#   CLIENT_ID=1505920607995564092
#   DISCORD_CLIENT_SECRET=...
#   PORT=5003
npm run check
pm2 restart neo-afriquiz
curl http://127.0.0.1:5003/health
curl "http://127.0.0.1:5003/api/quiz/question?lang=fr"
```

### 3. Déploiement du frontend

```bash
cd games/afriquiz
npm install
npm run build
sudo mkdir -p /opt/neo-games/afriquiz
sudo rsync -a --delete dist/ /opt/neo-games/afriquiz/
```

### 4. Nginx

- Copiez `deploy/nginx.conf` dans votre config nginx, ajustez les chemins SSL.
- `sudo nginx -t && sudo systemctl reload nginx`
- Vérifiez : `curl https://bamako-steel-dev.xyz/api/quiz/question?lang=en`

### 5. Lancer dans Discord

1. Rejoignez un salon vocal sur un serveur où NEO est invité.
2. Cliquez sur le bouton **Activités** (🚀 fusée) du panneau vocal.
3. Sélectionnez **AfriQuiz** — le jeu se lance dans Discord !

> Au premier lancement, l'app échange le `code` OAuth via `POST /api/token`
> sur le bot : c'est pourquoi `DISCORD_CLIENT_SECRET` est requis.

### 6. Développement local (hors Discord)

```bash
npm run dev        # http://localhost:3000
```
Hors Discord, l'app tourne en **mode démo** (faux utilisateur, 3 questions
intégrées, pas de backend). Pour utiliser la vraie API en local :

```bash
# .env.local
VITE_API_BASE=http://localhost:5003/api/quiz
```
