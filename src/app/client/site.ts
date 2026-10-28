import { environment } from '../../environments/environment';

/*
 * Informations publiques du site vitrine, regroupees ici pour n'avoir qu'un
 * endroit a modifier.
 *
 * Les montants (prix des tickets, frais et minimums de retrait, valeur du credit)
 * sont des parametres reglables depuis le back-office : le site ne les ecrit
 * jamais en dur et renvoie vers l'app, qui affiche toujours la valeur en vigueur.
 */
export const SITE = {
  name: 'RAF',
  company: 'Raiki Services',

  /** Adresse de l'app joueur (PWA), selon l'environnement de build. */
  playerAppUrl: environment.playerAppUrl,

  /** Adresse du backend, pour les reglages publics lus dans le navigateur (lien Instagram). */
  apiUrl: environment.apiUrl,

  phone: '(509) 34 97 7530',
  phoneHref: 'tel:+50934977530',
  whatsappHref: 'https://wa.me/50934977530',

  /** Date de derniere mise a jour des pages legales (conditions, confidentialite, regles). */
  legalUpdatedAt: '21 octobre 2026',
  minimumAge: 18,
};

export interface NavLink {
  label: string;
  path: string;
}

export const MAIN_NAV: NavLink[] = [
  { label: 'Comment ça marche', path: '/comment-ca-marche' },
  { label: 'Règles du jeu', path: '/regles' },
  { label: 'Installer l’app', path: '/installer' },
  { label: 'FAQ', path: '/faq' },
];

export const LEGAL_NAV: NavLink[] = [
  { label: 'Règles du jeu', path: '/regles' },
  { label: 'Conditions d’utilisation', path: '/conditions-utilisation' },
  { label: 'Confidentialité', path: '/confidentialite' },
  { label: 'Jeu responsable', path: '/jeu-responsable' },
];
