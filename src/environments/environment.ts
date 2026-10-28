// Production (npm run build). Remplace par environment.development.ts sous ng serve.
export const environment = {
  /**
   * Adresse du backend. Vide = meme origine : le reverse proxy relaie /api du
   * domaine du site vers le backend, sans CORS ni adresse en dur.
   */
  apiUrl: '',

  /** App joueur (PWA) : tous les boutons « Jouer » et « Installer » y menent. */
  playerAppUrl: 'https://app.rafhaiti.com',
};
