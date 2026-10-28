import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { API_BASE_URL } from './api';
import { AuthService } from './auth.service';

/** Appels d'authentification : jamais de jeton, jamais de nouvel essai. */
const AUTH_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];

/**
 * Ajoute le jeton d'acces aux appels du backend. Sur un 401, rafraichit le jeton
 * une fois puis rejoue la requete ; si le rafraichissement echoue, la session est
 * perdue et l'utilisateur revient a la connexion.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const apiUrl = inject(API_BASE_URL);

  // `${apiUrl}/api/` et non apiUrl seul : en production apiUrl est vide, et tout
  // appel (y compris vers un autre site) recevrait le jeton.
  if (!request.url.startsWith(`${apiUrl}/api/`) || AUTH_PATHS.some((path) => request.url.includes(path))) {
    return next(request);
  }

  const withToken = (req: HttpRequest<unknown>, token: string | null) =>
    token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(withToken(request, auth.token())).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        catchError((refreshError) => {
          auth.sessionExpired();
          return throwError(() => refreshError);
        }),
        switchMap((token) => next(withToken(request, token))),
      );
    }),
  );
};
