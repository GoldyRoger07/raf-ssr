import type { gsap as Gsap } from 'gsap';
import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';

export interface Motion {
  gsap: typeof Gsap;
  ScrollTrigger: typeof ScrollTriggerType;
  /** Le visiteur a demande a reduire les animations (reglage du systeme). */
  reduced: boolean;
}

let loading: Promise<Motion> | null = null;

/*
 * GSAP et ScrollTrigger, charges a la demande et dans le navigateur seulement :
 * le rendu serveur (prerendu) n'en a pas besoin, et le premier affichage ne paie
 * pas leur poids. Le plugin n'est enregistre qu'une fois.
 */
export function loadMotion(): Promise<Motion> {
  loading ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
    gsap.registerPlugin(ScrollTrigger);
    // Seules les proprietes composees par le GPU (transform, opacity) sont animees :
    // pas de recalcul de mise en page pendant le defilement.
    gsap.defaults({ ease: 'power3.out', duration: 0.8 });
    // Sur un telephone lent, les animations sautent des images plutot que de
    // ralentir : le contenu cache par une entree reapparait toujours a l'heure.
    gsap.ticker.lagSmoothing(0);
    return {
      gsap,
      ScrollTrigger,
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  });
  return loading;
}
