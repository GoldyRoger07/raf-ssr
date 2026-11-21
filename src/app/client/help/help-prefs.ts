import { Injectable, signal } from '@angular/core';
import { ParamMap } from '@angular/router';

import { initSiteLang, setSiteLang, siteLang } from '../i18n';
import { Device, Lang, Text } from './help-content';

/**
 * Langue et telephone du joueur pour le guide d'aide, partages entre ses pages.
 * La langue est celle du site (choisie dans l'en-tete) : le guide la suit.
 *
 * Les pages sont prerendues en francais, sans telephone connu ; la lecture de
 * l'URL (?lang=ht&appareil=iphone, envoyes par l'app joueur), du stockage et du
 * navigateur se fait apres l'affichage, dans le navigateur (initFromBrowser).
 */
@Injectable({ providedIn: 'root' })
export class HelpPrefs {
  readonly lang = siteLang.asReadonly();
  readonly device = signal<Device | null>(null);
  private initialized = false;

  /** Texte dans la langue choisie. */
  t(text: Text): string {
    return text[this.lang()];
  }

  setLang(lang: Lang): void {
    setSiteLang(lang);
  }

  /** A appeler dans afterNextRender : n'a d'effet qu'une fois par visite. */
  initFromBrowser(query: ParamMap): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    initSiteLang(query.get('lang'));

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
