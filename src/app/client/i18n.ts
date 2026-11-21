import { Pipe, PipeTransform, signal } from '@angular/core';

import { HT } from './i18n-ht';

/*
 * Langue du site public : francais (par defaut) ou kreyol ayisyen.
 *
 * Les pages sont prerendues en francais (c'est ce que voient les moteurs de
 * recherche) ; le choix du visiteur s'applique ensuite dans le navigateur, sans
 * changer d'adresse. Il est garde sur l'appareil et vaut aussi pour le guide d'aide.
 *
 * Comme dans l'app joueur, le francais sert de cle : HT (i18n-ht.ts) donne la
 * traduction, un texte absent reste en francais. Parties variables : {nom}.
 */

export type SiteLang = 'fr' | 'ht';

export const SITE_LANGS: { value: SiteLang; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'ht', label: 'Kreyòl' },
];

const KEY = 'raf.lang';
/** Ancienne cle du guide d'aide, reprise une fois. */
const OLD_KEY = 'raf.aide.lang';

/** Langue affichee. Sur le serveur, toujours le francais. */
export const siteLang = signal<SiteLang>('fr');

export function setSiteLang(value: SiteLang): void {
  siteLang.set(value);
  document.documentElement.lang = value;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Navigation privee : le choix vaut pour la visite en cours.
  }
}

let initialized = false;

/**
 * Dans le navigateur, apres le premier affichage : ?lang=ht (lien de l'app joueur),
 * sinon le choix garde sur l'appareil.
 */
export function initSiteLang(fromUrl: string | null): void {
  if (initialized) {
    return;
  }
  initialized = true;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
  } catch {
    // idem
  }
  const wanted = fromUrl === 'ht' || fromUrl === 'fr' ? fromUrl : saved;
  if (wanted === 'ht' || (wanted === 'fr' && fromUrl === 'fr')) {
    setSiteLang(wanted);
  }
}

/** Texte dans la langue affichee. */
export function t(fr: string, params?: Record<string, string | number>): string {
  let text = siteLang() === 'ht' ? (HT[fr] ?? fr) : fr;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/** {{ 'Jouer' | t }} ; impur : il suit le changement de langue. */
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  transform(fr: string, params?: Record<string, string | number>): string {
    return t(fr, params);
  }
}
