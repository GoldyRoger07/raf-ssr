import { Directive, inject, ElementRef, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[animateOnScroll]',
})
export class AnimateOnScrollDirective implements OnInit, OnDestroy {
  private observer!: IntersectionObserver;

  constructor(private el: ElementRef) {}

  platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if(isPlatformBrowser(this.platformId)){

          this.observer = new IntersectionObserver(
            ([entry]) => {
              if (entry.isIntersecting) {
                this.el.nativeElement.classList.add('active');
                this.observer.unobserve(this.el.nativeElement); // Optionnel : arrête l'écoute une fois activé
              }
            },
            { threshold: 0.4 }
          );
      
          this.observer.observe(this.el.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.observer) {
      this.observer.disconnect();
    }
  }
}
