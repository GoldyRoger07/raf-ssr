import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

import { loadMotion } from './motion';

/**
 * Trait de progression qui se remplit au rythme du defilement (GSAP scrub).
 * L'hote est le remplissage ; il grandit de 0 a 100 % pendant que son parent
 * traverse l'ecran. Seul transform est anime.
 */
@Directive({ selector: '[scrubLine]' })
export class ScrubLineDirective {
  readonly scrubLine = input<'x' | 'y' | ''>('y');

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    let cleanup: (() => void) | null = null;
    inject(DestroyRef).onDestroy(() => cleanup?.());

    afterNextRender(() => {
      void loadMotion().then(({ gsap, reduced }) => {
        if (reduced) {
          return;
        }
        const axis = this.scrubLine() === 'x' ? 'scaleX' : 'scaleY';
        host.style.transformOrigin = axis === 'scaleX' ? 'left center' : 'center top';
        const tween = gsap.fromTo(
          host,
          { [axis]: 0 },
          {
            [axis]: 1,
            ease: 'none',
            scrollTrigger: { trigger: host.parentElement, start: 'top 75%', end: 'bottom 55%', scrub: 0.6 },
          },
        );
        cleanup = () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });
    });
  }
}
