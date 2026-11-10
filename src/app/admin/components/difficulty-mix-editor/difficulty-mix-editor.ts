import { Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';

import { mixPercent, mixTotal, splitMix } from '../../core/difficulty-mix';
import { Difficulty, DifficultyMix } from '../../core/models';

interface LevelRow {
  level: Difficulty;
  label: string;
  percent: number;
  perGame: number;
  available: number | null;
  /** Moins de questions que n'en demande une seule partie : un niveau voisin complete. */
  short: boolean;
  /** Assez pour une partie, mais sous la taille minimale du vivier : les joueurs les reverront vite. */
  thin: boolean;
}

/**
 * Saisie de la part des questions faciles, moyennes et difficiles d'une partie solo,
 * avec le nombre de questions qu'elle donne par partie et ce que le sujet en compte.
 */
@Component({
  selector: 'difficulty-mix-editor',
  imports: [FormsModule, InputNumberModule],
  templateUrl: './difficulty-mix-editor.html',
})
export class DifficultyMixEditor {
  readonly mix = model.required<DifficultyMix>();
  readonly questionsPerGame = input<number | null>(null);
  /** Questions publiees du sujet par niveau ; null tant qu'elles ne sont pas connues. */
  readonly available = input<Record<Difficulty, number> | null>(null);
  /** Taille minimale du vivier, en multiple du nombre de questions par partie. */
  readonly poolRatio = input<number | null>(null);

  protected readonly total = computed(() => mixTotal(this.mix()));

  protected readonly rows = computed<LevelRow[]>(() => {
    const mix = this.mix();
    const perGame = this.questionsPerGame() ?? 0;
    const split = mixTotal(mix) === 100 && perGame > 0 ? splitMix(mix, perGame) : null;
    const available = this.available();
    const ratio = this.poolRatio();
    const labels: Record<Difficulty, string> = { EASY: 'Facile', MEDIUM: 'Moyen', HARD: 'Difficile' };
    return (['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((level) => {
      const count = split?.[level] ?? 0;
      const have = available?.[level] ?? null;
      return {
        level,
        label: labels[level],
        percent: mixPercent(mix, level),
        perGame: count,
        available: have,
        short: have !== null && count > 0 && have < count,
        thin: have !== null && count > 0 && have >= count && ratio !== null && have < count * ratio,
      };
    });
  });

  protected set(level: Difficulty, value: number | null): void {
    const percent = value ?? 0;
    const key = level === 'EASY' ? 'easyPercent' : level === 'MEDIUM' ? 'mediumPercent' : 'hardPercent';
    this.mix.update((mix) => ({ ...mix, [key]: percent }));
  }
}
