// Production (npm run build). Remplace par environment.development.ts sous ng serve.
export const environment = {
  /**
   * Adresse du backend, appele directement (CORS : CORS_ALLOWED_ORIGINS du
   * backend doit contenir https://rafhaiti.com). Pas de relais /api par le
   * domaine du site : Coolify retire le prefixe /api au passage.
   */
  apiUrl: 'https://api.rafhaiti.com',

  /** App joueur (PWA) : tous les boutons « Jouer » et « Installer » y menent. */
  playerAppUrl: 'https://app.rafhaiti.com',
};
