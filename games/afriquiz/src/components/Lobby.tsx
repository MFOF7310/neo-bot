import { useState } from 'react';
import type { Lang } from '../types';


const CATEGORIES = [
  { value: 'all', emoji: '🌍', fr: 'Tout', en: 'All' },
  { value: 'geo', emoji: '🗺️', fr: 'Géo', en: 'Geo' },
  { value: 'hist', emoji: '📜', fr: 'Histoire', en: 'History' },
  { value: 'lang', emoji: '🗣️', fr: 'Langues', en: 'Languages' },
  { value: 'music', emoji: '🎵', fr: 'Musique', en: 'Music' },
  { value: 'sport', emoji: '🏆', fr: 'Sport', en: 'Sport' },
  { value: 'nature', emoji: '🌱', fr: 'Nature', en: 'Nature' },
];

const DIFFICULTIES = [
  { value: 'all', emoji: '🎲', fr: 'Mixte', en: 'Mixed' },
  { value: 'easy', emoji: '🟢', fr: 'Facile', en: 'Easy', pts: 5 },
  { value: 'medium', emoji: '🟡', fr: 'Moyen', en: 'Medium', pts: 10 },
  { value: 'hard', emoji: '🔴', fr: 'Difficile', en: 'Hard', pts: 20 },
];

interface Props {
  lang: Lang;
  username: string;
  onStart: (opts: { lang: Lang; category: string; difficulty: string }) => void;
}

export default function Lobby({ lang: initialLang, username, onStart }: Props) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    setStarting(true);
    await new Promise(r => setTimeout(r, 600));
    onStart({ lang, category, difficulty });
  }

  return (
    <div className="flex flex-col gap-5 animate-[fadeIn_0.6s_ease-out]">

      {/* Hero */}
      <div className="text-center py-4">
        <div className="text-5xl mb-2 animate-[bounce_1s_ease-in-out_3]">🦅</div>
        <h1 className="text-2xl font-black tracking-tight text-white">
          NEO <span className="text-[#00f0ff]">•</span>{' '}
          <span className="text-[#FFD700]">AfriQuiz</span>
        </h1>
        <p className="text-xs text-white/40 mt-1">
          {lang === 'fr' ? `Prêt à jouer, ${username} ?` : `Ready to play, ${username}?`}
        </p>
      </div>

      {/* Lang toggle */}
      <div>
        <p className="text-xs text-white/40 font-mono mb-2">🌐 {lang === 'fr' ? 'LANGUE' : 'LANGUAGE'}</p>
        <div className="grid grid-cols-2 gap-2">
          {(['fr', 'en'] as Lang[]).map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                lang === l
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40'
                  : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
              }`}>
              {l === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <p className="text-xs text-white/40 font-mono mb-2">🌍 {lang === 'fr' ? 'CATÉGORIE' : 'CATEGORY'}</p>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`py-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                category === c.value
                  ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40'
                  : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
              }`}>
              <span className="text-lg">{c.emoji}</span>
              <span>{lang === 'fr' ? c.fr : c.en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <p className="text-xs text-white/40 font-mono mb-2">⚡ {lang === 'fr' ? 'DIFFICULTÉ' : 'DIFFICULTY'}</p>
        <div className="grid grid-cols-4 gap-2">
          {DIFFICULTIES.map(d => (
            <button key={d.value} onClick={() => setDifficulty(d.value)}
              className={`py-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                difficulty === d.value
                  ? 'bg-[#7b2fff]/20 text-[#b388ff] border border-[#7b2fff]/40'
                  : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
              }`}>
              <span className="text-lg">{d.emoji}</span>
              <span>{lang === 'fr' ? d.fr : d.en}</span>
              {'pts' in d && <span className="text-[10px] opacity-60">{d.pts}pts</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button onClick={handleStart} disabled={starting}
        className={`w-full py-4 rounded-2xl font-black text-lg tracking-wide transition-all ${
          starting
            ? 'bg-[#00f0ff]/20 text-[#00f0ff]/50 animate-pulse'
            : 'bg-gradient-to-r from-[#00f0ff] to-[#7b2fff] text-white shadow-lg shadow-[#00f0ff]/20 hover:shadow-[#00f0ff]/40 hover:scale-[1.02] active:scale-[0.98]'
        }`}>
        {starting
          ? (lang === 'fr' ? '🚀 Lancement...' : '🚀 Launching...')
          : (lang === 'fr' ? '▶ Démarrer' : '▶ Start')}
      </button>
    </div>
  );
}
