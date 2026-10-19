import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Back-office : rendu dans le navigateur uniquement. La session (jeton) n'existe
    // que cote navigateur, et un outil interne n'a pas besoin d'etre indexe.
    path: 'admin/**',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
