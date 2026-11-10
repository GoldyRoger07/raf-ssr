import { Difficulty, DifficultyMix } from './models';

/** Plus difficile d'abord : ordre de depart des questions en trop (comme le backend). */
const HARDEST_FIRST: Difficulty[] = ['HARD', 'MEDIUM', 'EASY'];

/** Point de depart quand l'admin active la repartition. */
export const DEFAULT_DIFFICULTY_MIX: DifficultyMix = { easyPercent: 40, mediumPercent: 40, hardPercent: 20 };

export function mixPercent(mix: DifficultyMix, level: Difficulty): number {
  switch (level) {
    case 'EASY':
      return mix.easyPercent;
    case 'MEDIUM':
      return mix.mediumPercent;
    case 'HARD':
      return mix.hardPercent;
  }
}

export function mixTotal(mix: DifficultyMix): number {
  return (mix.easyPercent ?? 0) + (mix.mediumPercent ?? 0) + (mix.hardPercent ?? 0);
}

/** Trois entiers de 0 a 100 qui font 100. */
export function mixValid(mix: DifficultyMix): boolean {
  return (
    [mix.easyPercent, mix.mediumPercent, mix.hardPercent].every(
      (p) => Number.isInteger(p) && p >= 0 && p <= 100,
    ) && mixTotal(mix) === 100
  );
}

/**
 * Questions par niveau pour une partie, calcule comme le backend : partie entiere de
 * chaque part, puis les questions restantes aux plus fortes decimales, a egalite au
 * plus difficile. 33/33/34 % sur 10 donne 3/3/4.
 */
export function splitMix(mix: DifficultyMix, questions: number): Record<Difficulty, number> {
  const counts: Record<Difficulty, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const remainders: Record<Difficulty, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  let assigned = 0;
  for (const level of HARDEST_FIRST) {
    const share = questions * mixPercent(mix, level);
    counts[level] = Math.floor(share / 100);
    remainders[level] = share % 100;
    assigned += counts[level];
  }
  // Tri stable : a reste egal, l'ordre « plus difficile d'abord » est garde.
  const byRemainder = [...HARDEST_FIRST].sort((a, b) => remainders[b] - remainders[a]);
  for (let i = 0; assigned < questions && i < byRemainder.length; i++, assigned++) {
    counts[byRemainder[i]]++;
  }
  return counts;
}

/** « 40 / 40 / 20 % ». */
export function formatMix(mix: DifficultyMix): string {
  return `${mix.easyPercent} / ${mix.mediumPercent} / ${mix.hardPercent} %`;
}

/** « 4 faciles, 4 moyennes, 2 difficiles ». */
export function describeSplit(split: Record<Difficulty, number>): string {
  const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
  return [plural(split.EASY, 'facile'), plural(split.MEDIUM, 'moyenne'), plural(split.HARD, 'difficile')].join(', ');
}
