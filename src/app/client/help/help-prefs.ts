import { Injectable, signal } from '@angular/core';
import { ParamMap } from '@angular/router';

import { Device, Lang, Text } from './help-content';

const LANG_KEY = 'raf.aide.lang';

/**
 * Langue et telephone du joueur pour le guide d'aide, partages entre ses pages.
 *
 * Les pages sont prerendues en francais, sans telephone connu ; la lecture de
 * l'URL (?lang=ht&appareil=iphone, envoyes par l'app joueur), du stockage et du
 * navigateur se fait apres l'affichage, dans le navigateur (initFromBrowser).
 */
@Injectable({ providedIn: 'root' })
export class HelpPrefs {
  readonly lang = signal<Lang>('fr');
  readonly device = signal<Device | null>(null);
  private initialized = false;

  /** Texte dans la langue choisie. */
  t(text: Text): string {
    return text[this.lang()];
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // Navigation privee : le choix vaut pour la visite en cours.
    }
  }

  /** A appeler dans afterNextRender : n'a d'effet qu'une fois par visite. */
  initFromBrowser(query: ParamMap): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    const fromUrl = query.get('lang');
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANG_KEY);
    } catch {
      // idem
    }
    const lang = fromUrl ?? saved;
    if (lang === 'ht' || lang === 'fr') {
      this.lang.set(lang);
    }

    const device = query.get('appareil');
    this.device.set(device === 'android' || device === 'iphone' ? device : detectDevice());
  }
}

function detectDevice(): Device | null {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'iphone';
  }
  return /Android/.test(ua) ? 'android' : null;
}
