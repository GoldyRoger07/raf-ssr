import { Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'white';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class Button {
  /** Variante de couleur prédéfinie. */
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  

  /**
   * Surcharges de couleur (prioritaires sur la variante).
   * `accent`    : bordure, texte au repos et remplissage.
   * `hoverText` : couleur du texte une fois le bouton rempli.
   * Accepte n'importe quelle couleur CSS (hex, var(--...), etc.).
   */
  readonly accent = input<string>();
  readonly hoverText = input<string>();
   v = input<number>(2)

  protected readonly styleVars = computed<Record<string, string>>(() => {
    const vars: Record<string, string> = {};
    const accent = this.accent();
    const hoverText = this.hoverText();
    if (accent) {
      vars['--btn-accent'] = accent;
    }
    if (hoverText) {
      vars['--btn-hover-text'] = hoverText;
    }
    return vars;
  });
}
