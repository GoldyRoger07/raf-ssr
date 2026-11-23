import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, signal, viewChildren } from '@angular/core';

import { SITE_LANGS, SiteLang, setSiteLang, siteLang } from '../i18n';

/**
 * Choix Francais / Kreyol du site (et du guide d'aide), garde sur l'appareil.
 *
 * Meme liste deroulante que l'app joueur (raf-ionic, ui/lang-select.component.ts),
 * aux couleurs du jeu. Accessible : bouton annonce comme ouvrant une liste, fleches
 * haut et bas, Entree ou Espace pour choisir, Echap pour fermer, et un clic en
 * dehors referme la liste. Prerendu en francais, la liste n'existe qu'une fois ouverte.
 */
@Component({
  selector: 'site-lang-select',
  template: `
    <button
      class="trigger"
      type="button"
      aria-haspopup="listbox"
      [attr.aria-expanded]="open()"
      aria-label="Langue / Lang"
      (click)="toggle()"
      (keydown)="onTriggerKey($event)"
    >
      <svg class="globe" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
        <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" fill="none" stroke="currentColor" stroke-width="2" />
      </svg>
      <span class="label">{{ currentLabel() }}</span>
      <svg class="chevron" [class.up]="open()" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    @if (open()) {
      <ul class="menu pop" role="listbox" aria-label="Langue / Lang" [attr.aria-activedescendant]="'site-lang-' + langs[active()].value">
        @for (option of langs; track option.value; let i = $index) {
          <li
            #item
            [id]="'site-lang-' + option.value"
            role="option"
            tabindex="-1"
            class="option"
            [class.selected]="option.value === current()"
            [class.active]="i === active()"
            [attr.aria-selected]="option.value === current()"
            (click)="choose(option.value)"
            (mouseenter)="active.set(i)"
            (keydown)="onMenuKey($event)"
          >
            <span class="grow">{{ option.label }}</span>
            @if (option.value === current()) {
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            }
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host { position: relative; display: inline-block; }
    .trigger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px 6px 12px;
      border-radius: 999px;
      background: #fff;
      border: 3px solid var(--raf-p200);
      box-shadow: 0 3px 0 var(--raf-p200);
      font-family: var(--raf-font);
      font-weight: 900;
      font-size: 15px;
      color: var(--raf-ink);
      cursor: pointer;
      transition: transform 0.08s ease, box-shadow 0.08s ease;
    }
    .trigger:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--raf-p200); }
    .trigger:focus-visible { outline: 3px solid var(--raf-primary); outline-offset: 2px; }
    .chevron { color: var(--raf-primary); transition: transform 0.15s ease; }
    .chevron.up { transform: rotate(180deg); }
    .menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      z-index: 60;
      min-width: 170px;
      margin: 0;
      padding: 6px;
      list-style: none;
      background: #fffaf2;
      border: 3px solid var(--raf-p200);
      border-radius: 18px;
      box-shadow: 0 5px 0 var(--raf-p200), 0 12px 26px rgba(74, 47, 18, 0.22);
    }
    .option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      font-family: var(--raf-font);
      font-weight: 900;
      font-size: 15px;
      color: var(--raf-ink);
      cursor: pointer;
      outline: none;
    }
    .option.active { background: var(--raf-p100); }
    .option.selected {
      background: linear-gradient(180deg, #ffc078, var(--raf-primary));
      color: #fff;
      text-shadow: 0 1px 0 rgba(150, 70, 0, 0.45);
    }
    .grow { flex: 1; }
    .pop { animation: site-lang-pop 0.14s ease-out; transform-origin: top right; }
    @keyframes site-lang-pop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) { .pop { animation: none; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangSelect {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly items = viewChildren<ElementRef<HTMLElement>>('item');

  protected readonly langs = SITE_LANGS;
  protected readonly current = siteLang;
  protected readonly open = signal(false);
  /** Option survolee ou atteinte au clavier. */
  protected readonly active = signal(0);
  protected readonly currentLabel = computed(() => SITE_LANGS.find((l) => l.value === siteLang())?.label ?? '');

  protected toggle(): void {
    if (this.open()) {
      this.close(false);
    } else {
      this.openMenu();
    }
  }

  protected choose(value: SiteLang): void {
    setSiteLang(value);
    this.close(true);
  }

  protected onTriggerKey(event: KeyboardEvent): void {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key) && !this.open()) {
      event.preventDefault();
      this.openMenu();
    }
  }

  protected onMenuKey(event: KeyboardEvent): void {
    const count = SITE_LANGS.length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusOption((this.active() + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusOption((this.active() - 1 + count) % count);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.choose(SITE_LANGS[this.active()].value);
        break;
      case 'Escape':
      case 'Tab':
        this.close(event.key === 'Escape');
        break;
    }
  }

  /** Un clic ou un toucher en dehors referme la liste. */
  @HostListener('document:pointerdown', ['$event'])
  protected onOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }

  private openMenu(): void {
    this.active.set(Math.max(0, SITE_LANGS.findIndex((l) => l.value === siteLang())));
    this.open.set(true);
    // Apres rendu de la liste : le clavier se place sur l'option en cours.
    setTimeout(() => this.focusOption(this.active()));
  }

  private focusOption(index: number): void {
    this.active.set(index);
    this.items()[index]?.nativeElement.focus();
  }

  private close(returnFocus: boolean): void {
    this.open.set(false);
    if (returnFocus) {
      this.host.nativeElement.querySelector<HTMLButtonElement>('.trigger')?.focus();
    }
  }
}
