import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { Routes } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { AdminApi } from './core/admin-api.service';
import { QuestionApi } from './core/question-api.service';
import { QuizApi } from './core/quiz-api.service';
import { authInterceptor } from './core/auth.interceptor';
import { adminGuard, staffGuard, superAdminGuard } from './core/auth.guard';
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
      QuizApi,
      QuestionApi,
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
          // --- Quiz (administrateurs : prix et recompenses engagent de l'argent)
          {
            path: 'quiz',
            title: 'Quiz - RAF Admin',
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/quizzes/quizzes'),
          },
          {
            path: 'quiz/nouveau',
            title: 'Nouveau quiz - RAF Admin',
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/quiz-form/quiz-form'),
          },
          {
            path: 'quiz/solo/nouveau',
            title: 'Nouveau quiz solo - RAF Admin',
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/solo-quiz-form/solo-quiz-form'),
          },
          {
            path: 'quiz/solo/:id/modifier',
            title: 'Modifier le quiz solo - RAF Admin',
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/solo-quiz-form/solo-quiz-form'),
          },
          {
            path: 'quiz/:id',
            title: 'Quiz - RAF Admin',
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/quiz-detail/quiz-detail'),
          },
          {
            path: 'quiz/:id/modifier',
            title: 'Modifier le quiz - RAF Admin',
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/quiz-form/quiz-form'),
          },
          {
            path: 'parties',
            title: 'Parties - RAF Admin',
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/game-sessions/game-sessions'),
          },
          // --- Controle
          {
            path: 'rapprochement',
            title: 'Rapprochement - RAF Admin',
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/reconciliation/reconciliation'),
          },
          {
            path: 'rapprochement/:id',
            title: 'Rapprochement - RAF Admin',
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/reconciliation-detail/reconciliation-detail'),
          },
          {
            path: 'journal',
            title: "Journal d'audit - RAF Admin",
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/audit/audit'),
          },
          {
            path: 'comptes',
            title: 'Comptes et roles - RAF Admin',
            canActivate: [superAdminGuard],
            loadComponent: () => import('./pages/accounts/accounts'),
          },
          {
            path: 'reseaux-sociaux',
            title: 'Reseaux sociaux - RAF Admin',
            canActivate: [adminGuard],
            loadComponent: () => import('./pages/social/social'),
          },
          {
            path: 'parametres',
            title: 'Parametres - RAF Admin',
            canActivate: [superAdminGuard],
            loadComponent: () => import('./pages/settings/settings'),
          },
          // --- Banque de questions (moderateurs et administrateurs)
          {
            path: 'questions',
            title: 'Questions - RAF Admin',
            loadComponent: () => import('./pages/questions/questions'),
          },
          {
            path: 'generation',
            title: 'Generation IA - RAF Admin',
            loadComponent: () => import('./pages/generate/generate'),
          },
          {
            path: 'questions/nouvelle',
            title: 'Nouvelle question - RAF Admin',
            loadComponent: () => import('./pages/question-form/question-form'),
          },
          {
            path: 'questions/:id',
            title: 'Question - RAF Admin',
            loadComponent: () => import('./pages/question-form/question-form'),
          },
          {
            path: 'categories',
            title: 'Categories - RAF Admin',
            loadComponent: () => import('./pages/categories/categories'),
          },
          {
            path: 'import',
            title: 'Import CSV - RAF Admin',
            loadComponent: () => import('./pages/import/import'),
          },
        ],
      },
    ],
  },
] satisfies Routes;
