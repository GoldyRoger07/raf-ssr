import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/*
 * Icones illustrees de RAF, copiees de l'app joueur (raf-ionic/src/app/ui/icon.component.ts)
 * pour que le site et l'app parlent la meme langue visuelle.
 *
 * Les degrades (url(#g-gold)...) sont declares une seule fois par <raf-icon-defs>,
 * places dans la mise en page du site (SiteLayout) : chaque page en profite.
 * Les chaines ci-dessous sont des constantes du
 * code, d'ou le contournement du nettoyage d'Angular (qui retirerait le SVG).
 */

const HL = '<ellipse cx="17" cy="14" rx="7" ry="4" fill="#fff" opacity=".55" transform="rotate(-25 17 14)"/>';

const ICONS: Record<string, string> = {
  coin: `
    <circle cx="24" cy="25" r="19" fill="#a86a00"/>
    <circle cx="24" cy="23" r="19" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="3"/>
    <circle cx="24" cy="23" r="12.5" fill="none" stroke="#d99a10" stroke-width="2.5"/>
    <path d="M24 14.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="#fff6b0" stroke="#c98a00" stroke-width="1.6" stroke-linejoin="round"/>
    ${HL}`,

  cash: `
    <rect x="9" y="9" width="34" height="22" rx="4" fill="url(#g-green)" stroke="#1d630b" stroke-width="3" transform="rotate(-10 26 20)"/>
    <rect x="5" y="17" width="34" height="22" rx="4" fill="url(#g-green)" stroke="#1d630b" stroke-width="3"/>
    <rect x="9" y="21" width="26" height="14" rx="3" fill="none" stroke="#c9f5b0" stroke-width="1.8" opacity=".9"/>
    <circle cx="22" cy="28" r="5" fill="#d8ffc0" stroke="#1d630b" stroke-width="2"/>
    <text x="22" y="31.3" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="9" fill="#1d630b">G</text>
    <ellipse cx="13" cy="21" rx="5" ry="2" fill="#fff" opacity=".5"/>`,

  ticket: `
    <path d="M6 14a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v5a5 5 0 0 0 0 10v5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-5a5 5 0 0 0 0-10z" fill="url(#g-orange)" stroke="#9a4700" stroke-width="3" stroke-linejoin="round"/>
    <path d="M31 13v22" stroke="#9a4700" stroke-width="2" stroke-dasharray="3 3"/>
    <path d="M18.5 17.5l1.9 3.8 4.2.6-3 3 .7 4.1-3.8-2-3.7 2 .7-4.1-3-3 4.2-.6z" fill="#fff6b0" stroke="#9a4700" stroke-width="1.5" stroke-linejoin="round"/>
    <rect x="9" y="13.5" width="20" height="3" rx="1.5" fill="#fff" opacity=".45"/>`,

  trophy: `
    <path d="M14 10h-6a2 2 0 0 0-2 2c0 7 4 11 10 12M34 10h6a2 2 0 0 1 2 2c0 7-4 11-10 12" fill="none" stroke="#8f5d00" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M13 7h22v9c0 7-5 12-11 12S13 23 13 16z" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="3" stroke-linejoin="round"/>
    <rect x="21" y="27" width="6" height="7" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="2.5"/>
    <rect x="13" y="34" width="22" height="8" rx="2.5" fill="url(#g-brown)" stroke="#3b220b" stroke-width="3"/>
    <rect x="19" y="36.5" width="10" height="3" rx="1" fill="#ffd23f"/>
    <ellipse cx="18.5" cy="12" rx="2.5" ry="4" fill="#fff" opacity=".6"/>`,

  crown: `
    <path d="M6 17l9 7 9-13 9 13 9-7-4 21H10z" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="3" stroke-linejoin="round"/>
    <rect x="10" y="34" width="28" height="6" rx="2" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="3"/>
    <circle cx="24" cy="27" r="3.5" fill="url(#g-red)" stroke="#8a0d1f" stroke-width="1.8"/>
    <circle cx="15" cy="30" r="2.3" fill="url(#g-blue)" stroke="#0d468f" stroke-width="1.5"/>
    <circle cx="33" cy="30" r="2.3" fill="url(#g-green)" stroke="#1d630b" stroke-width="1.5"/>
    <circle cx="6" cy="16" r="3" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="2"/>
    <circle cx="24" cy="10" r="3" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="2"/>
    <circle cx="42" cy="16" r="3" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="2"/>`,

  star: `
    <path d="M24 4.5l5.9 12 13.2 1.9-9.6 9.3 2.3 13.1L24 34.6l-11.8 6.2 2.3-13.1-9.6-9.3 13.2-1.9z" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="3" stroke-linejoin="round"/>
    <path d="M24 12l3 6.4" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>`,

  'star-empty': `
    <path d="M24 4.5l5.9 12 13.2 1.9-9.6 9.3 2.3 13.1L24 34.6l-11.8 6.2 2.3-13.1-9.6-9.3 13.2-1.9z" fill="#1b2a5c" stroke="#0a1436" stroke-width="3" stroke-linejoin="round"/>`,

  home: `
    <path d="M8 23v17a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2V23" fill="url(#g-cream)" stroke="#7a4b17" stroke-width="3" stroke-linejoin="round"/>
    <path d="M4 24L24 7l20 17" fill="url(#g-red)" stroke="#8a0d1f" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M10 19l14-12 14 12" fill="url(#g-red)"/>
    <rect x="19" y="28" width="10" height="14" rx="2" fill="url(#g-blue)" stroke="#0d468f" stroke-width="2.5"/>
    <circle cx="26" cy="35" r="1.2" fill="#fff"/>`,

  chest: `
    <path d="M6 20c0-8 8-12 18-12s18 4 18 12z" fill="url(#g-brown)" stroke="#3b220b" stroke-width="3" stroke-linejoin="round"/>
    <rect x="6" y="20" width="36" height="20" rx="3" fill="url(#g-brown)" stroke="#3b220b" stroke-width="3"/>
    <path d="M12 9.5V40M36 9.5V40" stroke="url(#g-gold)" stroke-width="4"/>
    <path d="M6 20h36" stroke="#3b220b" stroke-width="3"/>
    <rect x="19" y="16" width="10" height="11" rx="2.5" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="2.5"/>
    <circle cx="24" cy="21.5" r="1.8" fill="#5b3a00"/>
    <path d="M14 12c4-1.6 8-2 10-2" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".35"/>`,

  sound: `
    <path d="M8 18h7l10-8v28l-10-8H8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" fill="url(#g-blue)" stroke="#0d468f" stroke-width="3" stroke-linejoin="round"/>
    <path d="M31 17a9 9 0 0 1 0 14M36 12a16 16 0 0 1 0 24" fill="none" stroke="#0d468f" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="12" cy="21" rx="2" ry="1.5" fill="#fff" opacity=".55"/>`,

  bell: `
    <path d="M24 6a3 3 0 0 1 3 3v1.4c6 1.4 10 6.6 10 13v8l4 5H7l4-5v-8c0-6.4 4-11.6 10-13V9a3 3 0 0 1 3-3z" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="3" stroke-linejoin="round"/>
    <path d="M19 40a5 5 0 0 0 10 0" fill="url(#g-orange)" stroke="#8f5d00" stroke-width="3"/>
    <ellipse cx="18" cy="20" rx="2.5" ry="5" fill="#fff" opacity=".55"/>`,

  user: `
    <circle cx="24" cy="24" r="20" fill="url(#g-blue)" stroke="#0d468f" stroke-width="3"/>
    <circle cx="24" cy="19" r="7" fill="url(#g-cream)" stroke="#0d468f" stroke-width="2.5"/>
    <path d="M11 37c2-7 7-10 13-10s11 3 13 10" fill="url(#g-cream)" stroke="#0d468f" stroke-width="2.5" stroke-linejoin="round"/>
    ${HL}`,

  users: `
    <circle cx="31" cy="17" r="6.5" fill="url(#g-purple)" stroke="#3d1691" stroke-width="2.5"/>
    <path d="M21 39c1-7 5-11 10-11s9 4 10 11z" fill="url(#g-purple)" stroke="#3d1691" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="18" cy="19" r="7" fill="url(#g-blue)" stroke="#0d468f" stroke-width="2.5"/>
    <path d="M6 41c1-8 6-12 12-12s11 4 12 12z" fill="url(#g-blue)" stroke="#0d468f" stroke-width="2.5" stroke-linejoin="round"/>`,

  clock: `
    <circle cx="24" cy="25" r="18" fill="url(#g-blue)" stroke="#0d468f" stroke-width="3"/>
    <circle cx="24" cy="25" r="13" fill="#fff" stroke="#0d468f" stroke-width="2"/>
    <path d="M24 17v8l5 4" stroke="#0b2a6f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="20" y="3" width="8" height="5" rx="1.5" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="2"/>`,

  question: `
    <path d="M24 5c10.5 0 19 7.6 19 17s-8.5 17-19 17c-2 0-4-.3-5.8-.8L9 43l2.2-8.3C7.4 31.6 5 27 5 22 5 12.6 13.5 5 24 5z" fill="url(#g-orange)" stroke="#9a4700" stroke-width="3" stroke-linejoin="round"/>
    <path d="M19 17.5c0-3 2.3-5 5.2-5 3 0 5.3 2 5.3 4.7 0 4-5 4.2-5 8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
    <circle cx="24.5" cy="31" r="2.5" fill="#fff"/>`,

  gift: `
    <rect x="7" y="20" width="34" height="21" rx="3" fill="url(#g-purple)" stroke="#3d1691" stroke-width="3"/>
    <rect x="5" y="13" width="38" height="9" rx="3" fill="url(#g-purple)" stroke="#3d1691" stroke-width="3"/>
    <rect x="20" y="13" width="8" height="28" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="2.5"/>
    <path d="M24 13c-3-6-10-7-10-2 0 3 6 2 10 2zM24 13c3-6 10-7 10-2 0 3-6 2-10 2z" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="2.5" stroke-linejoin="round"/>`,

  lock: `
    <path d="M15 21v-5a9 9 0 0 1 18 0v5" fill="none" stroke="#5c6270" stroke-width="4"/>
    <rect x="9" y="20" width="30" height="22" rx="4" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="3"/>
    <circle cx="24" cy="29" r="3" fill="#5b3a00"/><rect x="22.5" y="30" width="3" height="6" rx="1.5" fill="#5b3a00"/>`,

  check: `
    <circle cx="24" cy="24" r="19" fill="url(#g-green)" stroke="#1d630b" stroke-width="3"/>
    <path d="M15 24.5l6 6 12-13" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,

  cross: `
    <circle cx="24" cy="24" r="19" fill="url(#g-red)" stroke="#8a0d1f" stroke-width="3"/>
    <path d="M17 17l14 14M31 17L17 31" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`,

  medal1: medal('g-gold', '#8f5d00', '1'),
  medal2: medal('g-silver', '#59627a', '2'),
  medal3: medal('g-bronze', '#7a3d12', '3'),

  phone: `
    <rect x="12" y="4" width="24" height="40" rx="5" fill="url(#g-blue)" stroke="#0d468f" stroke-width="3"/>
    <rect x="15.5" y="9" width="17" height="27" rx="2" fill="#e9f5ff"/>
    <circle cx="24" cy="40" r="1.8" fill="#fff"/>`,

  mail: `
    <rect x="5" y="10" width="38" height="28" rx="4" fill="url(#g-cream)" stroke="#7a4b17" stroke-width="3"/>
    <path d="M6 12l18 14 18-14" fill="none" stroke="#7a4b17" stroke-width="3" stroke-linejoin="round"/>`,

  key: `
    <circle cx="16" cy="24" r="10" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="3"/>
    <circle cx="16" cy="24" r="3.5" fill="#5b3a00"/>
    <path d="M25 24h18M37 24v7M42 24v5" stroke="#8f5d00" stroke-width="4" stroke-linecap="round"/>`,

  device: `
    <rect x="4" y="10" width="30" height="21" rx="3" fill="url(#g-blue)" stroke="#0d468f" stroke-width="3"/>
    <rect x="8" y="14" width="22" height="13" rx="1.5" fill="#e9f5ff"/>
    <path d="M12 38h14" stroke="#0d468f" stroke-width="3" stroke-linecap="round"/><path d="M19 31v7" stroke="#0d468f" stroke-width="3"/>
    <rect x="31" y="20" width="13" height="22" rx="3" fill="url(#g-purple)" stroke="#3d1691" stroke-width="3"/>`,

  shield: `
    <path d="M24 4l17 6v12c0 10-7 18-17 22C14 40 7 32 7 22V10z" fill="url(#g-blue)" stroke="#0d468f" stroke-width="3" stroke-linejoin="round"/>
    <path d="M16 23l6 6 11-12" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`,

  bank: `
    <path d="M5 18L24 7l19 11z" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="3" stroke-linejoin="round"/>
    <path d="M10 21v14M19 21v14M29 21v14M38 21v14" stroke="url(#g-cream)" stroke-width="5"/>
    <path d="M10 21v14M19 21v14M29 21v14M38 21v14" stroke="#7a4b17" stroke-width="1.5" opacity=".5"/>
    <rect x="5" y="35" width="38" height="7" rx="2" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="3"/>`,

  flame: `
    <path d="M24 4c3 8 13 12 13 24a13 13 0 0 1-26 0c0-6 3-9 6-12 0 4 2 6 4 6-1-7 1-13 3-18z" fill="url(#g-orange)" stroke="#9a4700" stroke-width="3" stroke-linejoin="round"/>
    <path d="M24 26c2 3 6 4 6 9a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3 0-4 1-6z" fill="#fff3a0"/>`,

  vote: `
    <rect x="7" y="22" width="34" height="20" rx="3" fill="url(#g-blue)" stroke="#0d468f" stroke-width="3"/>
    <rect x="14" y="6" width="20" height="22" rx="2" fill="#fff" stroke="#0d468f" stroke-width="2.5" transform="rotate(8 24 17)"/>
    <path d="M18 17l4 4 7-8" fill="none" stroke="#2f8f12" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" transform="rotate(8 24 17)"/>
    <rect x="12" y="25" width="24" height="4" rx="2" fill="#0b2a6f"/>`,

  settings: `
    <path d="M24 5l4 1 1 5 4 2 4-3 3 3-3 4 2 4 5 1 1 4-1 4-5 1-2 4 3 4-3 3-4-3-4 2-1 5-4 1-4-1-1-5-4-2-4 3-3-3 3-4-2-4-5-1-1-4 1-4 5-1 2-4-3-4 3-3 4 3 4-2 1-5z" fill="url(#g-silver)" stroke="#3b4256" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="24" cy="24" r="6" fill="#e8ecf5" stroke="#3b4256" stroke-width="2.5"/>`,

  logout: `
    <rect x="6" y="6" width="22" height="36" rx="3" fill="url(#g-brown)" stroke="#3b220b" stroke-width="3"/>
    <circle cx="22" cy="25" r="2" fill="#ffd23f"/>
    <path d="M27 24h15M36 18l6 6-6 6" fill="none" stroke="#f2364d" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`,

  info: `
    <circle cx="24" cy="24" r="19" fill="url(#g-blue)" stroke="#0d468f" stroke-width="3"/>
    <circle cx="24" cy="15" r="3" fill="#fff"/><rect x="21" y="21" width="6" height="15" rx="3" fill="#fff"/>`,

  warning: `
    <path d="M24 5l20 35H4z" fill="url(#g-gold)" stroke="#8f5d00" stroke-width="3" stroke-linejoin="round"/>
    <rect x="21.5" y="16" width="5" height="13" rx="2.5" fill="#5b3a00"/><circle cx="24" cy="34" r="2.8" fill="#5b3a00"/>`,

  hourglass: `
    <rect x="10" y="4" width="28" height="5" rx="2" fill="url(#g-brown)" stroke="#3b220b" stroke-width="2.5"/>
    <rect x="10" y="39" width="28" height="5" rx="2" fill="url(#g-brown)" stroke="#3b220b" stroke-width="2.5"/>
    <path d="M14 9h20c0 8-7 11-7 15s7 7 7 15H14c0-8 7-11 7-15s-7-7-7-15z" fill="#e9f5ff" stroke="#0d468f" stroke-width="2.5"/>
    <path d="M17 36c2-4 5-5 7-5s5 1 7 5zM19 14h10c-1 3-3 5-5 6-2-1-4-3-5-6z" fill="url(#g-gold)"/>`,

  play: `<path d="M15 9.5v29a2 2 0 0 0 3 1.7l23-14.5a2 2 0 0 0 0-3.4L18 7.8a2 2 0 0 0-3 1.7z" fill="#fff"/>`,
  plus: `<path d="M24 10v28M10 24h28" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,
  back: `<path d="M29 9L14 24l15 15" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
  close: `<path d="M13 13l22 22M35 13L13 35" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,
  chevron: `<path d="M18 10l14 14-14 14" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
};

function medal(gradient: string, edge: string, n: string): string {
  return `
    <path d="M14 4h8l4 12h-8zM34 4h-8l-4 12h8z" fill="url(#g-red)" stroke="#8a0d1f" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="24" cy="29" r="15" fill="url(#${gradient})" stroke="${edge}" stroke-width="3"/>
    <circle cx="24" cy="29" r="10" fill="none" stroke="#fff" stroke-width="1.5" opacity=".55"/>
    <text x="24" y="35" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="17" fill="#fff" stroke="${edge}" stroke-width="3" paint-order="stroke">${n}</text>`;
}

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'raf-icon',
  // Le SVG entier passe par innerHTML sur un element HTML : le DOM du rendu serveur
  // (domino) ne sait pas remplir un <svg> par innerHTML.
  template: `<span [innerHTML]="markup()"></span>`,
  styles: `
    :host { display: inline-flex; line-height: 0; flex: none; }
    span { display: contents; }
    :host ::ng-deep svg { overflow: visible; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly name = input.required<string>();
  readonly size = input<number>(28);

  protected readonly markup = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      `<svg viewBox="0 0 48 48" width="${this.size()}" height="${this.size()}" aria-hidden="true">` +
        (ICONS[this.name()] ?? ICONS['question']) +
        '</svg>',
    ),
  );
}

/** Degrades partages par toutes les icones : a placer une fois, dans le composant racine. */
@Component({
  selector: 'raf-icon-defs',
  template: `
    <svg width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="g-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff7b0" /><stop offset=".45" stop-color="#ffd23f" /><stop offset="1" stop-color="#e59a00" />
        </linearGradient>
        <linearGradient id="g-orange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffd27a" /><stop offset=".5" stop-color="#ff9a1a" /><stop offset="1" stop-color="#e86a00" />
        </linearGradient>
        <linearGradient id="g-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#b4f58c" /><stop offset=".5" stop-color="#5fd034" /><stop offset="1" stop-color="#2f9a17" />
        </linearGradient>
        <linearGradient id="g-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffa0aa" /><stop offset=".5" stop-color="#ff5468" /><stop offset="1" stop-color="#d0203a" />
        </linearGradient>
        <linearGradient id="g-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#a6dbff" /><stop offset=".5" stop-color="#43a6ff" /><stop offset="1" stop-color="#1765d6" />
        </linearGradient>
        <linearGradient id="g-purple" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#dcc2ff" /><stop offset=".5" stop-color="#a46bff" /><stop offset="1" stop-color="#6a35d9" />
        </linearGradient>
        <linearGradient id="g-silver" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" /><stop offset=".5" stop-color="#c9d1e3" /><stop offset="1" stop-color="#8a95b0" />
        </linearGradient>
        <linearGradient id="g-bronze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffd0a0" /><stop offset=".5" stop-color="#d9894a" /><stop offset="1" stop-color="#9c5220" />
        </linearGradient>
        <linearGradient id="g-cream" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" /><stop offset="1" stop-color="#ffe2b0" />
        </linearGradient>
        <linearGradient id="g-brown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#c98a4a" /><stop offset="1" stop-color="#7a4b17" />
        </linearGradient>
      </defs>
    </svg>
  `,
  styles: `:host { position: absolute; width: 0; height: 0; overflow: hidden; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconDefsComponent {}
