import { RenderMode, ServerRoute } from '@angular/ssr';

import { HELP_TOPICS } from './client/help/help-content';

export const serverRoutes: ServerRoute[] = [
  {
    // Back-office : rendu dans le navigateur uniquement. La session (jeton) n'existe
    // que cote navigateur, et un outil interne n'a pas besoin d'etre indexe.
    path: 'admin/**',
    renderMode: RenderMode.Client
  },
  {
    // Une page prerendue par sujet du guide d'aide.
    path: 'aide/:sujet',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => HELP_TOPICS.map((topic) => ({ sujet: topic.id })),
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
