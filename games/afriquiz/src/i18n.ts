import type { Lang } from './types';

const STRINGS = {
  tagline:        { fr: 'Le quiz 100% Afrique', en: 'The 100% Africa quiz' },
  loading:        { fr: 'Connexion à Discord…', en: 'Connecting to Discord…' },
  loadingQ:       { fr: 'Je pioche une question…', en: 'Picking a question…' },
  demoMode:       { fr: 'Mode démo — hors Discord', en: 'Demo mode — outside Discord' },
  tabGame:        { fr: '🎮 Jeu', en: '🎮 Game' },
  tabBoard:       { fr: '🏆 Classement', en: '🏆 Leaderboard' },
  score:          { fr: 'Score', en: 'Score' },
  streak:         { fr: 'Série', en: 'Streak' },
  correct:        { fr: 'Bonne réponse ! 🎉', en: 'Correct! 🎉' },
  wrong:          { fr: 'Aïe, raté…', en: 'Ouch, missed…' },
  expired:        { fr: 'Temps écoulé ! ⏳', en: "Time's up! ⏳" },
  goodAnswers:    { fr: ['Bien joué !', 'Excellent !', 'Tu gères !', 'Impressionnant !', 'Chapeau !'],
                    en: ['Well played!', 'Excellent!', 'You rock!', 'Impressive!', 'Hats off!'] },
  wrongAnswers:   { fr: ['La prochaine sera la bonne !', 'On ne lâche rien !', 'Courage, tu progresses !'],
                    en: ['Next one is yours!', 'Never give up!', 'Keep going, you are learning!'] },
  theAnswerWas:   { fr: 'La bonne réponse :', en: 'The right answer:' },
  nextQuestion:   { fr: 'Question suivante ➜', en: 'Next question ➜' },
  didYouKnow:     { fr: '💡 Le savais-tu ?', en: '💡 Did you know?' },
  speedBonus:     { fr: '⚡ Bonus rapidité', en: '⚡ Speed bonus' },
  pts:            { fr: 'pts', en: 'pts' },
  lbEmpty:        { fr: 'Personne n\'a encore marqué… Sois le premier ! 🚀', en: 'Nobody has scored yet… Be the first! 🚀' },
  lbYou:          { fr: 'toi', en: 'you' },
  lbGuild:        { fr: 'Top du serveur', en: 'Server top' },
  errorNet:       { fr: 'Petit souci réseau… on réessaie !', en: 'Small network hiccup… let us retry!' },
  answerPlaceholder: { fr: 'Choisis ta réponse !', en: 'Pick your answer!' },
} as const;

export function t(lang: Lang, key: keyof typeof STRINGS): string {
  const v = STRINGS[key][lang];
  return typeof v === 'string' ? v : (v as readonly string[])[0];
}

export function randomOf(lang: Lang, key: 'goodAnswers' | 'wrongAnswers'): string {
  const arr = STRINGS[key][lang] as readonly string[];
  return arr[Math.floor(Math.random() * arr.length)];
}

/** fr unless the locale clearly says otherwise */
export function toLang(locale: string | null | undefined): Lang {
  return locale && locale.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}
