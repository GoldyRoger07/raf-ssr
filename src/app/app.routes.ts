import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    // Site vitrine : pages publiques prerendues, partageant en-tete et pied de page.
    path: '',
    loadComponent: () => import('./client/layout/site-layout'),
    children: [
      { path: '', title: 'RAF — Le quiz qui récompense ce que tu sais', loadComponent: () => import('./client/pages/home') },
      { path: 'comment-ca-marche', title: 'Comment ça marche — RAF', loadComponent: () => import('./client/pages/how-it-works') },
      { path: 'regles', title: 'Règles du jeu — RAF', loadComponent: () => import('./client/pages/rules') },
      { path: 'installer', title: 'Installer l’app — RAF', loadComponent: () => import('./client/pages/install') },
      { path: 'faq', title: 'Questions fréquentes — RAF', loadComponent: () => import('./client/pages/faq') },
      { path: 'conditions-utilisation', title: 'Conditions d’utilisation — RAF', loadComponent: () => import('./client/pages/terms') },
      { path: 'confidentialite', title: 'Confidentialité — RAF', loadComponent: () => import('./client/pages/privacy') },
      { path: 'jeu-responsable', title: 'Jeu responsable — RAF', loadComponent: () => import('./client/pages/responsible') },
    ],
  },
  { path: 'admin', loadChildren: () => import('./admin/admin.routes') },
  { path: '**', redirectTo: '' },
];
