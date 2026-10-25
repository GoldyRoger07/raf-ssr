import { Component, computed, input } from '@angular/core';

import { HtgPipe } from '../../core/format';
import { SoloEconomics } from '../../core/models';

/**
 * Bilan d'un quiz solo : sans-faute estime sur le vivier, marge attendue par
 * partie, prix maximal supportable et, une fois le quiz ouvert, ce qu'il a
 * reellement rapporte.
 */
@Component({
  selector: 'solo-economics',
  imports: [HtgPipe],
  templateUrl: './solo-economics.html',
})
export class SoloEconomicsPanel {
  readonly economics = input.required<SoloEconomics>();

  protected readonly free = computed(() => this.economics().entryPriceHtg === 0);

  /** Moins de la moitie du vivier a un historique : l'estimation repose surtout sur la difficulte declaree. */
  protected readonly fewStats = computed(() => {
    const e = this.economics();
    return e.questionsWithStats * 2 < e.poolQuestions;
  });

  /** Prix ramene a la marge visee : 30 % de la mise conservee en moyenne. */
  protected readonly suggestedPrizeHtg = computed(() => Math.floor(this.economics().breakEvenPrizeHtg * 0.7));

  /** Fraction -> pourcentage lisible, meme pour les tres petits taux. */
  protected pct(rate: number | null): string {
    if (rate == null) {
      return '—';
    }
    const value = rate * 100;
    const digits = value >= 10 ? 1 : value >= 1 ? 2 : 3;
    return `${value.toLocaleString('fr-FR', { maximumFractionDigits: digits })} %`;
  }
}
