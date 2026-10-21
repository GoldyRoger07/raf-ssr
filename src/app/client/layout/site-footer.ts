import { ChangeDetectionStrategy, Component, afterNextRender, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LEGAL_NAV, MAIN_NAV, SITE } from '../site';

@Component({
  selector: 'site-footer',
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="inner">
        <div class="brand">
          <img src="img/logo-raf.svg" alt="RAF" width="120" height="42" />
          <p>Le quiz qui récompense ce que tu sais. Joue depuis ton téléphone, grimpe au classement, encaisse tes gains en gourdes.</p>
          <a class="btn3d sm light" [href]="site.playerAppUrl">Ouvrir l’app</a>
        </div>

        <div>
          <h2>Découvrir</h2>
          <a routerLink="/">Accueil</a>
          @for (item of mainNav; track item.path) {
            <a [routerLink]="item.path">{{ item.label }}</a>
          }
        </div>

        <div>
          <h2>Informations</h2>
          @for (item of legalNav; track item.path) {
            <a [routerLink]="item.path">{{ item.label }}</a>
          }
        </div>

        <div>
          <h2>Nous contacter</h2>
          <a [href]="site.phoneHref">{{ site.phone }}</a>
          <a [href]="site.whatsappHref" target="_blank" rel="noopener"><i class="pi pi-whatsapp"></i> WhatsApp</a>
          @if (instagramUrl(); as url) {
            <a [href]="url" target="_blank" rel="noopener"><i class="pi pi-instagram"></i> Instagram</a>
          }
        </div>
      </div>

      <div class="bottom">
        <p class="age"><span>{{ site.minimumAge }}+</span> RAF est réservé aux personnes majeures. Joue pour le plaisir et fixe-toi une limite.</p>
        <p>© {{ year }} {{ site.company }}. Tous droits réservés.</p>
      </div>
    </footer>
  `,
  styles: `
    .footer {
      background: linear-gradient(180deg, var(--raf-primary) 0%, var(--raf-edge) 100%);
      color: #fff;
      border-top: 4px solid var(--raf-p300);
      box-shadow: inset 0 3px 0 rgba(255, 255, 255, 0.4);
    }
    .inner {
      max-width: 72rem;
      margin: 0 auto;
      padding: 56px 18px 36px;
      display: grid;
      gap: 32px;
    }
    .brand img {
      height: 44px;
      width: auto;
      padding: 6px 10px;
      border-radius: 14px;
      background: #fff;
    }
    .brand p { margin: 14px 0 18px; max-width: 30ch; font-weight: 700; opacity: 0.95; }
    h2 { margin-bottom: 12px; font-family: var(--raf-font-display); font-size: 1.25rem; font-weight: 400; }
    a:not(.btn3d) { display: flex; align-items: center; gap: 6px; padding: 4px 0; font-weight: 700; opacity: 0.92; }
    a:not(.btn3d):hover { opacity: 1; text-decoration: underline; }
    .bottom {
      max-width: 72rem;
      margin: 0 auto;
      padding: 20px 18px 28px;
      border-top: 2px solid rgba(255, 255, 255, 0.35);
      display: grid;
      gap: 10px;
      font-size: 0.9rem;
      font-weight: 700;
    }
    .age { display: flex; align-items: center; gap: 10px; }
    .age span {
      flex: none;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #fff;
      color: #d0203a;
      font-family: var(--raf-font-display);
      border: 3px solid #d0203a;
    }
    @media (min-width: 768px) {
      .inner { grid-template-columns: 1.6fr 1fr 1fr 1fr; }
      .bottom { grid-template-columns: 1fr auto; align-items: center; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {
  protected readonly site = SITE;
  protected readonly mainNav = MAIN_NAV;
  protected readonly legalNav = LEGAL_NAV;
  protected readonly year = new Date().getFullYear();

  /** Lien Instagram, affiche seulement quand l'administrateur l'a active. */
  protected readonly instagramUrl = signal<string | null>(null);

  constructor() {
    // Lu dans le navigateur : le site est prerendu, le reglage peut changer apres.
    afterNextRender(() => {
      fetch(`${SITE.apiUrl}/api/public/social`)
        .then((response) => (response.ok ? response.json() : null))
        .then((links: { instagramUrl?: string | null } | null) => this.instagramUrl.set(links?.instagramUrl ?? null))
        .catch(() => undefined);
    });
  }
}
