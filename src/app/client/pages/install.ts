import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SITE } from '../site';
import { IconComponent } from '../ui/icon';
import { PageHero, PlayCta, pageDescription } from '../ui/page';
import { RevealDirective } from '../ui/reveal';

interface Guide {
  id: string;
  title: string;
  browser: string;
  steps: string[];
}

const GUIDES: Guide[] = [
  {
    id: 'android',
    title: 'Android',
    browser: 'avec Chrome',
    steps: [
      'Ouvre RAF dans Chrome.',
      'Touche le bouton « Installer » proposé par Chrome, ou ouvre le menu ⋮ en haut à droite.',
      'Choisis « Installer l’application » (ou « Ajouter à l’écran d’accueil »).',
      'Confirme : l’icône RAF apparaît avec tes autres applications.',
    ],
  },
  {
    id: 'iphone',
    title: 'iPhone et iPad',
    browser: 'avec Safari',
    steps: [
      'Ouvre RAF dans Safari.',
      'Touche le bouton Partager (le carré avec une flèche vers le haut).',
      'Fais défiler et choisis « Sur l’écran d’accueil ».',
      'Touche « Ajouter » : RAF s’ouvre désormais depuis ton écran d’accueil.',
    ],
  },
  {
    id: 'ordinateur',
    title: 'Ordinateur',
    browser: 'avec Chrome ou Edge',
    steps: [
      'Ouvre RAF dans ton navigateur.',
      'Clique sur l’icône d’installation à droite de la barre d’adresse.',
      'Confirme « Installer » : RAF s’ouvre dans sa propre fenêtre.',
    ],
  },
];

@Component({
  selector: 'raf-install',
  imports: [IconComponent, PageHero, PlayCta, RevealDirective],
  template: `
    <page-hero
      icon="phone"
      title="Installer l’app RAF"
      lead="RAF s’installe directement depuis ton navigateur. Léger, gratuit, et prêt en quelques secondes."
    />

    <section class="section">
      <div class="container">
        <div reveal revealStagger class="grid three perks">
          <article class="tile card-raf">
            <raf-icon name="flame" [size]="48" />
            <h3>Rapide à installer</h3>
            <p>Aucun téléchargement lourd, aucun compte de store : quelques touches suffisent.</p>
          </article>
          <article class="tile card-raf">
            <raf-icon name="bell" [size]="48" />
            <h3>Notifications incluses</h3>
            <p>Une fois installée, l’app peut te prévenir du début d’un quiz, des résultats et de tes gains.</p>
          </article>
          <article class="tile card-raf">
            <raf-icon name="check" [size]="48" />
            <h3>Toujours à jour</h3>
            <p>Les nouveautés arrivent automatiquement, sans rien réinstaller.</p>
          </article>
        </div>

        <div class="guides">
          @for (g of guides; track g.id; let i = $index) {
            <article reveal [revealDelay]="i * 0.1" class="guide card-raf" [id]="g.id">
              <h2 class="font-display">{{ g.title }} <small>{{ g.browser }}</small></h2>
              <ol>
                @for (s of g.steps; track s; let n = $index) {
                  <li><span class="num">{{ n + 1 }}</span>{{ s }}</li>
                }
              </ol>
            </article>
          }
        </div>

        <p reveal class="open">
          <a class="btn3d green" [href]="site.playerAppUrl"><raf-icon name="play" [size]="22" /> Ouvrir RAF maintenant</a>
        </p>
        <p reveal class="hint">
          Tu ne vois pas l’option d’installation ? Mets ton navigateur à jour, ou continue simplement à jouer depuis le
          navigateur : tout fonctionne de la même façon.
        </p>
      </div>
    </section>

    <play-cta title="Ton premier quiz t’attend" />
  `,
  styleUrl: './content.css',
  styles: `
    .perks { margin-bottom: 56px; }
    .guides { display: grid; gap: 24px; }
    .guide { padding: 28px 26px; }
    .guide h2 { font-size: 1.9rem; font-weight: 400; margin-bottom: 18px; }
    .guide small { font-family: var(--raf-font); font-size: 1rem; font-weight: 800; color: var(--raf-ink-soft); }
    .guide ol { display: grid; gap: 14px; }
    .guide li { display: flex; align-items: flex-start; gap: 12px; font-weight: 700; line-height: 1.5; }
    .num {
      flex: none;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(180deg, #ffc078, var(--raf-primary));
      border: 3px solid #fff;
      box-shadow: 0 3px 0 var(--raf-edge-dark);
      color: #fff;
      font-family: var(--raf-font-display);
    }
    .open { margin-top: 44px; text-align: center; }
    .hint { margin: 18px auto 0; max-width: 36rem; text-align: center; font-weight: 700; color: var(--raf-ink-soft); }
    @media (min-width: 1024px) {
      .guides { grid-template-columns: repeat(3, 1fr); }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InstallPage {
  protected readonly site = SITE;
  protected readonly guides = GUIDES;

  constructor() {
    pageDescription('Installer RAF sur Android, iPhone ou ordinateur, directement depuis le navigateur, sans passer par un store.');
  }
}
