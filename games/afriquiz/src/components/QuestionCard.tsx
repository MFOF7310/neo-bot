import type { Lang, QuizQuestion, Reveal } from '../types';
import { CATEGORY_META, DIFF_META } from '../types';
import { t } from '../i18n';

interface QuestionCardProps {
  question: QuizQuestion;
  lang: Lang;
  reveal: Reveal | null;
  onAnswer: (letter: string) => void;
}

/**
 * Question text + 2×2 answer grid.
 * Reveal: correct → green, chosen-wrong → red, others → gray (300 ms transitions).
 */
export default function QuestionCard({ question, lang, reveal, onAnswer }: QuestionCardProps) {
  const cat = CATEGORY_META[question.category] ?? { fr: question.category, en: question.category, emoji: '❓' };
  const diff = DIFF_META[question.difficulty];

  function buttonClass(letter: string): string {
    const base =
      'group flex min-h-[4.25rem] items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left ' +
      'transition-all duration-300 ease-out active:scale-[0.97]';
    if (!reveal) {
      return (
        base +
        ' cursor-pointer border-white/15 bg-white/5 text-white hover:border-[#00f0ff]/70 hover:bg-[#00f0ff]/10'
      );
    }
    if (letter === reveal.correctLetter) {
      return base + ' border-[#00ff88] bg-[#00ff88]/20 text-[#00ff88] shadow-[0_0_24px_rgba(0,255,136,0.25)]';
    }
    if (reveal.chosenLetter === letter) {
      return base + ' border-[#ff4757] bg-[#ff4757]/20 text-[#ff4757]';
    }
    return base + ' border-white/5 bg-white/[0.02] text-white/30';
  }

  function badgeClass(letter: string): string {
    const base =
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold transition-colors duration-300';
    if (!reveal) return base + ' bg-[#00f0ff]/15 text-[#00f0ff] group-hover:bg-[#00f0ff]/30';
    if (letter === reveal.correctLetter) return base + ' bg-[#00ff88] text-black';
    if (reveal.chosenLetter === letter) return base + ' bg-[#ff4757] text-white';
    return base + ' bg-white/5 text-white/30';
  }

  return (
    <div className="flex flex-col gap-4">
      {/* meta row */}
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="rounded-full bg-white/5 px-3 py-1 text-white/70">
          {cat.emoji} {lang === 'fr' ? cat.fr : cat.en}
        </span>
        <span className="rounded-full bg-[#FFD700]/10 px-3 py-1 text-[#FFD700]">
          {lang === 'fr' ? diff.fr : diff.en} • {diff.points} {t(lang, 'pts')}
        </span>
      </div>

      {/* question */}
      <h2 className="min-h-[3.5rem] text-balance text-xl font-bold leading-snug text-white sm:text-2xl">
        {question.question}
      </h2>

      {/* answers */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        {question.options.map((opt) => (
          <button
            key={opt.letter}
            type="button"
            disabled={reveal !== null}
            onClick={() => onAnswer(opt.letter)}
            className={buttonClass(opt.letter)}
          >
            <span className={badgeClass(opt.letter)}>{opt.letter.toUpperCase()}</span>
            <span className="text-sm font-semibold leading-tight sm:text-base">{opt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
