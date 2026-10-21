import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

import { loadMotion } from './motion';

export type RevealEffect = 'up' | 'left' | 'right' | 'zoom' | 'fade';

const FROM: Record<RevealEffect, gsap.TweenVars> = {
  up: { y: 48, autoAlpha: 0 },
  left: { x: -60, autoAlpha: 0 },
  right: { x: 60, autoAlpha: 0 },
  zoom: { scale: 0.85, autoAlpha: 0 },
  fade: { autoAlpha: 0 },
};

/**
 * Apparition au defilement, pilotee par GSAP ScrollTrigger.
 *
 *   <h2 reveal>…</h2>                       glisse vers le haut
 *   <div reveal="zoom" [revealDelay]="0.2">  grossit, avec un leger retard
 *   <ul reveal revealStagger>               anime ses enfants l'un apres l'autre
 *
 * Le contenu est rendu visible par le serveur : sans JavaScript, ou si le
 * visiteur demande moins d'animations, rien n'est cache. Chaque declencheur ne
 * joue qu'une fois puis se detruit.
 */
@Directive({ selector: '[reveal]' })
export class RevealDirective {
  readonly reveal = input<RevealEffect | ''>('up');
  readonly revealDelay = input(0);
  /** Anime les enfants directs en cascade plutot que l'element lui-meme. */
  readonly revealStagger = input(false, { transform: (v: boolean | '') => v === '' || v });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    let cleanup: (() => void) | null = null;
    inject(DestroyRef).onDestroy(() => cleanup?.());

    afterNextRender(() => {
      void loadMotion().then(({ gsap, reduced }) => {
        if (reduced) {
          return;
        }
        const targets = this.revealStagger() ? Array.from(host.children) : [host];
        const tween = gsap.from(targets, {
          ...FROM[this.reveal() || 'up'],
          delay: this.revealDelay(),
          stagger: 0.12,
          clearProps: 'transform,opacity,visibility',
          scrollTrigger: { trigger: host, start: 'top 85%', once: true },
        });
        cleanup = () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });
    });
  }
}
