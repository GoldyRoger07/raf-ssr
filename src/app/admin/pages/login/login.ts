import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { errorMessage } from '../../core/api';
import { AuthService } from '../../core/auth.service';

/**
 * Connexion au back-office en deux etapes : mot de passe, puis code a 6 chiffres
 * recu par email. Le mot de passe reste en memoire le temps de la seconde etape,
 * pour pouvoir redemander un code sans le ressaisir.
 */
@Component({
  selector: 'admin-login',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule, MessageModule],
  templateUrl: './login.html',
})
export default class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly codeForm = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly info = signal<string | null>(null);
  /** Challenge de la seconde etape ; null tant que le mot de passe n'est pas valide. */
  protected readonly mfaToken = signal<string | null>(null);
  protected readonly expired = this.route.snapshot.queryParamMap.has('expired');

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.requestCode(false);
  }

  /** Nouveau code : refait la premiere etape, ce qui annule le code precedent. */
  protected resend(): void {
    this.requestCode(true);
  }

  protected submitCode(): void {
    const mfaToken = this.mfaToken();
    if (!mfaToken || this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }
    this.start();

    this.auth.verifyCode(mfaToken, this.codeForm.getRawValue().code).subscribe({
      next: () => this.goNext(),
      error: (error) => this.fail(error),
    });
  }

  /** Retour a la saisie du mot de passe (autre compte, email jamais recu...). */
  protected back(): void {
    this.mfaToken.set(null);
    this.codeForm.reset();
    this.form.controls.password.reset();
    this.error.set(null);
    this.info.set(null);
  }

  private requestCode(resend: boolean): void {
    this.start();
    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: (result) => {
        if (result.status === 'authenticated') {
          this.goNext();
          return;
        }
        this.loading.set(false);
        this.mfaToken.set(result.mfaToken);
        this.codeForm.reset();
        this.info.set(resend ? 'Un nouveau code vient de vous etre envoye.' : null);
      },
      error: (error) => this.fail(error),
    });
  }

  private start(): void {
    this.loading.set(true);
    this.error.set(null);
    this.info.set(null);
  }

  private goNext(): void {
    const next = this.route.snapshot.queryParamMap.get('next');
    this.router.navigateByUrl(next?.startsWith('/admin') ? next : '/admin');
  }

  private fail(error: unknown): void {
    this.loading.set(false);
    this.error.set(error instanceof Error && !('status' in error) ? error.message : errorMessage(error));
  }
}
