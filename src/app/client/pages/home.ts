import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SITE } from '../site';
import { IconComponent } from '../ui/icon';
import { loadMotion } from '../ui/motion';
import { PlayCta, pageDescription } from '../ui/page';
import { RevealDirective } from '../ui/reveal';

interface Item {
  icon: string;
  title: string;
  text: string;
}

const STEPS: Item[] = [
  {
    icon: 'coin',
    title: 'Recharge tes crédits',
    text: 'Crée ton compte gratuitement, puis recharge des crédits de jeu auprès d’un agent RAF. MonCash et NatCash arrivent bientôt.',
  },
  {
    icon: 'ticket',
    title: 'Prends ton ticket',
    text: 'Choisis un quiz, achète ton ticket avec tes crédits et vote pour le sujet qui te donne l’avantage.',
  },
  {
    icon: 'clock',
    title: 'Réponds vite et juste',
    text: 'Chaque question a son propre chrono : réponds avant la fin du temps. Chaque bonne réponse rapporte des points.',
  },
  {
    icon: 'cash',
    title: 'Encaisse tes gains',
    text: 'Les meilleurs du classement gagnent des gourdes, versées sur ton solde de gains et retirables quand tu veux.',
  },
];

const PERKS: Item[] = [
  { icon: 'cash', title: 'De vraies gourdes', text: 'Les gains sont en HTG, sur un solde séparé, retirables vers MonCash, NatCash ou en espèces au guichet.' },
  { icon: 'shield', title: 'Un jeu équitable', text: 'Le chrono est tenu par nos serveurs et les bonnes réponses ne quittent jamais nos serveurs pendant la partie.' },
  { icon: 'vote', title: 'Tu choisis le sujet', text: 'Pour beaucoup de quiz, les détenteurs de ticket votent pour le sujet final. Joue sur ton terrain.' },
  { icon: 'check', title: 'Remboursé si annulé', text: 'Si un quiz est annulé, chaque ticket est remboursé intégralement en crédits. Sans démarche.' },
  { icon: 'bell', title: 'Rien ne t’échappe', text: 'Début d’un quiz, compte à rebours final, résultats, gains : l’app te prévient au bon moment.' },
  { icon: 'phone', title: 'Léger et rapide', text: 'Pas de store, pas de gros téléchargement : RAF s’installe depuis ton navigateur en quelques secondes.' },
];

const TOPICS = ['Culture haïtienne', 'Histoire', 'Sport', 'Musique', 'Géographie', 'Sciences', 'Cinéma', 'Kreyòl', 'Football', 'Actualité'];

const FAQ_TEASER = [
  {
    q: 'Est-ce que l’inscription est payante ?',
    a: 'Non. Le compte est gratuit. Tu paies seulement les tickets des quiz auxquels tu participes, avec tes crédits de jeu.',
  },
  {
    q: 'Comment je récupère mon argent ?',
    a: 'Tes gains arrivent sur ton solde de gains, en gourdes. Tu demandes un retrait depuis l’app, vers MonCash, NatCash ou en espèces au guichet.',
  },
  {
    q: 'Faut-il télécharger une application ?',
    a: 'RAF est une application web : tu l’ouvres dans ton navigateur et tu peux l’ajouter à ton écran d’accueil comme une vraie app.',
  },
];

/**
 * Page d'accueil : faire installer l'app joueur.
 *
 * Animations GSAP : entree du hero, icones flottantes, parallaxe du telephone,
 * bandeau de sujets en boucle et ligne des etapes qui se trace au defilement.
 * Tout ne touche que transform et opacity, et rien ne joue si le visiteur
 * demande moins d'animations.
 */
@Component({
  selector: 'raf-home',
  imports: [RouterLink, IconComponent, RevealDirective, PlayCta],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HomePage {
  protected readonly site = SITE;
  protected readonly steps = STEPS;
  protected readonly perks = PERKS;
  protected readonly topics = TOPICS;
  protected readonly faq = FAQ_TEASER;
  protected readonly choices = ['Toussaint Louverture', 'Jean-Jacques Dessalines', 'Henri Christophe', 'Alexandre Pétion'];
  protected readonly letters = ['A', 'B', 'C', 'D'];

  constructor() {
    pageDescription(
      'RAF, le quiz qui récompense ce que tu sais. Achète ton ticket, réponds vite et juste, grimpe au classement et gagne des gourdes. Gratuit à installer.',
    );

    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      void loadMotion().then(({ gsap, reduced }) => {
        if (reduced) {
          return;
        }
        const ctx = gsap.context(() => this.animate(gsap), host);
        destroyRef.onDestroy(() => ctx.revert());
      });
    });
  }

  private animate(gsap: typeof import('gsap').gsap): void {
    // Entree du hero.
    gsap
      .timeline({ defaults: { duration: 0.45 } })
      .from('[data-hero="chip"]', { y: 16, autoAlpha: 0 })
      .from('[data-hero="title"] > span', { y: 40, autoAlpha: 0, rotate: -3, stagger: 0.07, ease: 'back.out(1.6)' }, '-=0.3')
      .from('[data-hero="lead"]', { y: 18, autoAlpha: 0 }, '-=0.3')
      .from('[data-hero="cta"] > *', { y: 18, autoAlpha: 0, stagger: 0.06, ease: 'back.out(2)' }, '-=0.3')
      .from('[data-hero="trust"] > *', { y: 10, autoAlpha: 0, stagger: 0.04 }, '-=0.3')
      .from('.phone', { y: 90, autoAlpha: 0, rotate: 6, duration: 0.7, ease: 'power4.out' }, 0.1)
      .from('.choice', { x: 24, autoAlpha: 0, stagger: 0.05 }, 0.4)
      .from('.float', { scale: 0, autoAlpha: 0, stagger: 0.05, ease: 'back.out(2.5)' }, 0.5);

    // Icones qui flottent autour du telephone.
    gsap.utils.toArray<HTMLElement>('.float').forEach((el, i) => {
      gsap.to(el, {
        y: i % 2 ? 14 : -14,
        rotate: i % 2 ? 8 : -8,
        duration: 2.2 + i * 0.3,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    });

    // Chrono de la question : la barre se vide en boucle.
    gsap.fromTo('.timer-fill', { scaleX: 1 }, { scaleX: 0.08, duration: 5, ease: 'none', repeat: -1 });

    // Parallaxe : le telephone remonte moins vite que la page.
    gsap.to('.phone-wrap', {
      yPercent: -12,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });

    // Bandeau de sujets en boucle (le contenu est double pour boucler sans saut).
    gsap.to('.marquee-track', { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });

    // Ligne qui relie les etapes, tracee au rythme du defilement.
    gsap.fromTo(
      '.steps-line-fill',
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { trigger: '.steps', start: 'top 70%', end: 'bottom 60%', scrub: 0.6 },
      },
    );

    // Les deux portefeuilles se croisent en entrant.
    gsap.from('.wallet-card', {
      y: 60,
      rotate: (i: number) => (i ? 6 : -6),
      autoAlpha: 0,
      stagger: 0.15,
      ease: 'back.out(1.4)',
      scrollTrigger: { trigger: '.wallets', start: 'top 80%', once: true },
    });
  }
}
