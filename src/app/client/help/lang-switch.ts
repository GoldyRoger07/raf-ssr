import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { HelpPrefs } from './help-prefs';

/** Choix Francais / Kreyol du guide d'aide. */
@Component({
  selector: 'help-lang-switch',
  template: `
    <div class="switch" role="group" aria-label="Langue / Lang">
      <button type="button" [class.on]="prefs.lang() === 'fr'" [attr.aria-pressed]="prefs.lang() === 'fr'" (click)="prefs.setLang('fr')">
        Français
      </button>
      <button type="button" [class.on]="prefs.lang() === 'ht'" [attr.aria-pressed]="prefs.lang() === 'ht'" (click)="prefs.setLang('ht')">
        Kreyòl
      </button>
    </div>
  `,
  styles: `
    .switch {
      display: inline-flex;
      padding: 4px;
      gap: 4px;
      border-radius: 999px;
      background: #fff;
      border: 3px solid var(--raf-p200);
      box-shadow: 0 4px 0 var(--raf-p200);
    }
    button {
      padding: 8px 18px;
      border: 0;
      border-radius: 999px;
      background: transparent;
      font-family: var(--raf-font);
      font-weight: 900;
      font-size: 1rem;
      color: var(--raf-ink-soft);
      cursor: pointer;
    }
    button.on {
      background: linear-gradient(180deg, #ffc078, var(--raf-primary));
      color: #fff;
      text-shadow: 0 1px 0 rgba(150, 70, 0, 0.5);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangSwitch {
  protected readonly prefs = inject(HelpPrefs);
}
