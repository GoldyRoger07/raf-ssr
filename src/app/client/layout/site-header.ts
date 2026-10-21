import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MAIN_NAV, SITE } from '../site';

/**
 * En-tete du site : transparent sur le haut de page, il prend un fond des que
 * l'on defile. Le bouton « Jouer » mene toujours a l'app joueur.
 */
@Component({
  selector: 'site-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="header" [class.solid]="scrolled() || menuOpen()">
      <nav class="inner" aria-label="Navigation principale">
        <a routerLink="/" class="logo" aria-label="RAF, accueil">
          <img src="img/logo-raf.svg" alt="RAF" width="120" height="42" />
        </a>

        <ul class="links">
          @for (item of nav; track item.path) {
            <li>
              <a [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
            </li>
          }
        </ul>

        <a class="btn3d sm play" [href]="site.playerAppUrl">Jouer</a>

        <button
          type="button"
          class="burger"
          [attr.aria-expanded]="menuOpen()"
          aria-controls="site-menu"
          [attr.aria-label]="menuOpen() ? 'Fermer le menu' : 'Ouvrir le menu'"
          (click)="menuOpen.set(!menuOpen())"
        >
          <span></span><span></span><span></span>
        </button>
      </nav>

      <div id="site-menu" class="menu" [class.open]="menuOpen()">
        @for (item of nav; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
        }
        <a class="btn3d" [href]="site.playerAppUrl">Jouer maintenant</a>
      </div>
    </header>
  `,
  styles: `
    .header {
      position: fixed;
      inset: 0 0 auto;
      z-index: 50;
      transition: background 0.25s ease, box-shadow 0.25s ease;
    }
    .header.solid {
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(10px);
      box-shadow: 0 3px 0 var(--raf-p200), 0 10px 24px rgba(184, 106, 0, 0.08);
    }
    .inner {
      max-width: 72rem;
      margin: 0 auto;
      height: 72px;
      padding: 0 18px;
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .logo img { height: 42px; width: auto; display: block; }
    .links {
      display: none;
      flex: 1;
      justify-content: center;
      gap: 6px;
    }
    .links a {
      display: block;
      padding: 8px 14px;
      border-radius: 12px;
      font-weight: 800;
      color: var(--raf-ink-soft);
      transition: color 0.15s ease, background 0.15s ease;
    }
    .links a:hover, .links a.active { color: var(--raf-edge-dark); background: var(--raf-p100); }
    .play { margin-left: auto; }
    .burger {
      display: grid;
      gap: 5px;
      width: 46px;
      height: 46px;
      place-content: center;
      border-radius: 14px;
      background: #fff;
      border: 2px solid var(--raf-p200);
      cursor: pointer;
    }
    .burger span {
      display: block;
      width: 20px;
      height: 3px;
      border-radius: 2px;
      background: var(--raf-edge-dark);
      transition: transform 0.2s, opacity 0.2s;
    }
    /* Ouvert, les trois barres deviennent une croix. */
    .burger[aria-expanded='true'] span:nth-child(1) { transform: translateY(8px) rotate(45deg); }
    .burger[aria-expanded='true'] span:nth-child(2) { opacity: 0; }
    .burger[aria-expanded='true'] span:nth-child(3) { transform: translateY(-8px) rotate(-45deg); }
    .menu {
      display: grid;
      gap: 4px;
      padding: 0 18px;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease, padding 0.3s ease;
    }
    .menu.open { max-height: 420px; padding: 8px 18px 22px; }
    .menu a:not(.btn3d) {
      padding: 12px 14px;
      border-radius: 14px;
      font-weight: 800;
      font-size: 1.1rem;
    }
    .menu a.active { background: var(--raf-p100); color: var(--raf-edge-dark); }
    .menu .btn3d { margin-top: 10px; }

    @media (min-width: 1024px) {
      .links { display: flex; }
      .play { margin-left: 0; }
      .burger, .menu { display: none; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  protected readonly site = SITE;
  protected readonly nav = MAIN_NAV;
  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);

    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(() => this.menuOpen.set(false));

    afterNextRender(() => {
      const onScroll = () => this.scrolled.set(window.scrollY > 24);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    });
  }
}
