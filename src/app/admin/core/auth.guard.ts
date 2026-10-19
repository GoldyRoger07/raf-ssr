import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from './auth.service';

/** Back-office : session valide exigee (restauree depuis le refresh token si besoin). */
export const staffGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth
    .restore()
    .pipe(
      map((ok) =>
        ok ? true : router.createUrlTree(['/admin/login'], { queryParams: { next: state.url } }),
      ),
    );
};

/** Pages d'argent et d'exploitation : administrateurs seulement (pas les moderateurs). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAdmin() ? true : router.createUrlTree(['/admin']);
};
