import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { Routes } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { AdminApi } from './core/admin-api.service';
import { authInterceptor } from './core/auth.interceptor';
import { adminGuard, staffGuard } from './core/auth.guard';
import { AuthService } from './core/auth.service';

/**
 * Back-office. Rendu uniquement dans le navigateur (voir app.routes.server.ts) :
 * la session vit dans le navigateur, et un outil interne n'a pas besoin de SSR.
 *
 * Le client HTTP et les services sont fournis ici et non dans app.config : le
 * site public n'en depend pas.
 */
export default [
  {
    path: '',
    providers: [
      provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
      AuthService,
      AdminApi,
      MessageService,
      ConfirmationService,
    ],
    children: [
      { path: 'login', title: 'Connexion - RAF Admin', loadComponent: () => import('./pages/login/login') },
      {
        path: '',
        canActivate: [staffGuard],
        loadComponent: () => import('./layout/admin-layout'),
        children: [
          {
            path: '',
            title: 'Tableau de bord - RAF Admin',
            loadComponent: () => import('./pages/dashboard/dashboard'),
          },
          {
            path: 'retraits',
            title: 'Retraits - RAF Admin',
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/withdrawals/withdrawals'),
          },
          {
            path: 'guichet',
            title: 'Guichet - RAF Admin',
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/counter/counter'),
          },
          {
            path: 'joueurs',
            title: 'Joueurs - RAF Admin',
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/players/players'),
          },
          {
            path: 'joueurs/:id',
            title: 'Fiche joueur - RAF Admin',
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/player-detail/player-detail'),
          },
        ],
      },
    ],
  },
] satisfies Routes;
