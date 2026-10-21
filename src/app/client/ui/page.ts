import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { SITE } from '../site';
import { IconComponent } from './icon';
import { RevealDirective } from './reveal';

/**
 * Description de la page pour les moteurs de recherche et les apercus de liens.
 * A appeler dans le constructeur de la page (le titre vient de la route).
 */
export function pageDescription(description: string): void {
  const meta = inject(Meta);
  meta.updateTag({ name: 'description', content: description });
  meta.updateTag({ property: 'og:description', content: description });
}

/** Bandeau de titre des pages interieures, sur le fond rayonnant du jeu. */
@Component({
  selector: 'page-hero',
  imports: [IconComponent, RevealDirective],
  template: `
    <section class="hero sunburst">
      <div class="inner">
        @if (icon(); as name) {
          <span reveal="zoom" class="badge"><raf-icon [name]="name" [size]="64" /></span>
        }
        @if (kicker(); as k) {
          <p reveal class="chip-raf">{{ k }}</p>
        }
        <h1 reveal [revealDelay]="0.08" class="title-stroke">{{ title() }}</h1>
        @if (lead(); as l) {
          <p reveal [revealDelay]="0.16" class="lead">{{ l }}</p>
        }
      </div>
    </section>
  `,
  styles: `
    .hero { padding: 128px 18px 64px; text-align: center; border-bottom: 4px solid var(--raf-p200); }
    .inner { max-width: 48rem; margin: 0 auto; display: grid; justify-items: center; gap: 14px; }
    .badge {
      display: grid;
      place-items: center;
      width: 96px;
      height: 96px;
      border-radius: 30px;
      background: #fff;
      border: 4px solid var(--raf-p200);
      box-shadow: 0 6px 0 var(--raf-p300);
    }
    h1 { font-size: clamp(2.3rem, 6vw, 3.6rem); line-height: 1.1; }
    .lead { font-size: 1.2rem; font-weight: 700; color: var(--raf-ink-soft); max-width: 40rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHero {
  readonly title = input.required<string>();
  readonly lead = input<string | null>(null);
  readonly kicker = input<string | null>(null);
  readonly icon = input<string | null>(null);
}

/** Dernier appel a l'action, en bas des pages : ouvrir l'app joueur. */
@Component({
  selector: 'play-cta',
  imports: [IconComponent, RevealDirective, RouterLink],
  template: `
    <section class="wrap">
      <div reveal="zoom" class="cta">
        <raf-icon class="coin c1" name="coin" [size]="54" />
        <raf-icon class="coin c2" name="trophy" [size]="60" />
        <h2 class="title-stroke">{{ title() }}</h2>
        <p>{{ text() }}</p>
        <div class="actions">
          <a class="btn3d green" [href]="site.playerAppUrl">Jouer maintenant</a>
          <a class="btn3d light" routerLink="/installer">Installer l’app</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .wrap { padding: 72px 18px; }
    .cta {
      position: relative;
      max-width: 60rem;
      margin: 0 auto;
      padding: 56px 24px;
      text-align: center;
      border-radius: 34px;
      background: linear-gradient(180deg, #ffc078 0%, var(--raf-primary) 60%, var(--raf-edge) 100%);
      border: 4px solid #fff;
      box-shadow: 0 8px 0 var(--raf-edge-dark), 0 24px 50px rgba(184, 106, 0, 0.3);
      color: #fff;
    }
    h2 {
      font-size: clamp(2rem, 5vw, 3rem);
      -webkit-text-stroke-color: var(--raf-edge-dark);
      text-shadow: 0 5px 0 rgba(120, 55, 0, 0.5);
    }
    p { margin: 14px auto 28px; max-width: 34rem; font-size: 1.15rem; font-weight: 800; }
    .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; }
    .coin { position: absolute; filter: drop-shadow(0 6px 0 rgba(120, 55, 0, 0.3)); }
    .c1 { top: -24px; left: 8%; transform: rotate(-14deg); }
    .c2 { bottom: -22px; right: 7%; transform: rotate(10deg); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayCta {
  protected readonly site = SITE;
  readonly title = input('Prêt à jouer ?');
  readonly text = input('Crée ton compte en une minute, recharge tes crédits et rejoins ton premier quiz.');
}
