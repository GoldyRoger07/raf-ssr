import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';

import { API_BASE_URL } from './api';
import { RoleName, TokenResponse, UserResponse } from './models';

const REFRESH_KEY = 'raf-admin-refresh';

/** Roles qui donnent acces au back-office. */
const STAFF_ROLES: RoleName[] = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'];

/**
 * Session du back-office.
 *
 * Le jeton d'acces (15 min) ne vit qu'en memoire. Le refresh token est garde
 * dans le localStorage pour survivre a un rechargement de page ; le backend le
 * fait tourner a chaque usage et revoque toute la famille s'il est rejoue.
 *
 * Fourni par les routes /admin (voir admin.routes.ts), comme le client HTTP : le
 * site public n'en a pas besoin.
 */
@Injectable()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = inject(API_BASE_URL);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly accessToken = signal<string | null>(null);
  readonly user = signal<UserResponse | null>(null);

  readonly isAuthenticated = computed(() => this.accessToken() !== null);
  readonly roles = computed(() => this.user()?.roles ?? []);
  readonly isAdmin = computed(() =>
    this.roles().some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN'),
  );
  readonly isSuperAdmin = computed(() => this.roles().includes('SUPER_ADMIN'));

  /** Rafraichissement en cours, partage par toutes les requetes qui l'attendent. */
  private refreshing$: Observable<string> | null = null;

  token(): string | null {
    return this.accessToken();
  }

  login(email: string, password: string): Observable<UserResponse> {
    return this.http
      .post<TokenResponse>(`${this.apiUrl}/api/auth/login`, { email, password })
      .pipe(
        map((response) => {
          if (!response.user.roles.some((role) => STAFF_ROLES.includes(role))) {
            // Le compte existe mais n'a rien a faire ici : on referme sa session.
            this.http
              .post(`${this.apiUrl}/api/auth/logout`, { refreshToken: response.refreshToken })
              .subscribe({ error: () => undefined });
            throw new Error("Ce compte n'a pas acces au back-office.");
          }
          this.store(response);
          return response.user;
        }),
      );
  }

  /**
   * Restaure la session au chargement (refresh token du localStorage).
   * Renvoie vrai si une session valide existe.
   */
  restore(): Observable<boolean> {
    if (this.isAuthenticated()) {
      return of(true);
    }
    if (!this.storedRefreshToken()) {
      return of(false);
    }
    return this.refresh().pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  /** Nouveau jeton d'acces ; un seul appel reseau meme si dix requetes le demandent. */
  refresh(): Observable<string> {
    if (this.refreshing$) {
      return this.refreshing$;
    }
    const refreshToken = this.storedRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Session expiree.'));
    }

    this.refreshing$ = this.http
      .post<TokenResponse>(`${this.apiUrl}/api/auth/refresh`, { refreshToken })
      .pipe(
        tap((response) => this.store(response)),
        map((response) => response.accessToken),
        catchError((error) => {
          this.clear();
          return throwError(() => error);
        }),
        finalize(() => (this.refreshing$ = null)),
        shareReplay(1),
      );
    return this.refreshing$;
  }

  logout(): void {
    const refreshToken = this.storedRefreshToken();
    if (refreshToken) {
      this.http
        .post(`${this.apiUrl}/api/auth/logout`, { refreshToken })
        .subscribe({ error: () => undefined });
    }
    this.clear();
    this.router.navigate(['/admin/login']);
  }

  /** Session perdue (refresh refuse) : retour a la connexion. */
  sessionExpired(): void {
    this.clear();
    this.router.navigate(['/admin/login'], { queryParams: { expired: 1 } });
  }

  private store(response: TokenResponse): void {
    this.accessToken.set(response.accessToken);
    this.user.set(response.user);
    if (this.isBrowser) {
      localStorage.setItem(REFRESH_KEY, response.refreshToken);
    }
  }

  private clear(): void {
    this.accessToken.set(null);
    this.user.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(REFRESH_KEY);
    }
  }

  private storedRefreshToken(): string | null {
    return this.isBrowser ? localStorage.getItem(REFRESH_KEY) : null;
  }
}
