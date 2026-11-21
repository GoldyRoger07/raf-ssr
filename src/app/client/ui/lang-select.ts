import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SITE_LANGS, SiteLang, setSiteLang, siteLang } from '../i18n';

/** Choix Francais / Kreyol du site (et du guide d'aide), garde sur l'appareil. */
@Component({
  selector: 'site-lang-select',
  template: `
    <label class="lang">
      <span class="sr-only">Langue / Lang</span>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
        <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" fill="none" stroke="currentColor" stroke-width="2" />
      </svg>
      <select [value]="current()" (change)="choose($event)">
        @for (option of langs; track option.value) {
          <option [value]="option.value" [selected]="option.value === current()">{{ option.label }}</option>
        }
      </select>
    </label>
  `,
  styles: `
    .lang {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      background: #fff;
      border: 3px solid var(--raf-p200);
      color: var(--raf-ink);
      font-family: var(--raf-font);
      font-weight: 900;
    }
    select {
      border: 0;
      background: transparent;
      font: inherit;
      color: inherit;
      cursor: pointer;
      outline: none;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangSelect {
  protected readonly langs = SITE_LANGS;
  protected readonly current = siteLang;

  protected choose(event: Event): void {
    setSiteLang((event.target as HTMLSelectElement).value as SiteLang);
  }
}
