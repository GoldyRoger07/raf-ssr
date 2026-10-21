import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { SocialLinks } from '../../core/models';

/**
 * Lien vers le compte Instagram de Raiki Services. Active, il apparait dans
 * l'app joueur (apres un ticket ou une partie gratuite, en fin de partie) et
 * dans le pied de page du site. Chaque modification est tracee au journal d'audit.
 */
@Component({
  selector: 'admin-social',
  imports: [FormsModule, ButtonModule, InputTextModule, MessageModule, ToggleSwitchModule],
  templateUrl: './social.html',
})
export default class Social {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);

  protected readonly saved = signal<SocialLinks | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly enabled = signal(false);
  protected readonly account = signal('');

  protected readonly changed = computed(() => {
    const s = this.saved();
    return !!s && (s.instagramEnabled !== this.enabled() || (s.instagramUrl ?? '') !== this.account().trim());
  });

  constructor() {
    this.api.social().subscribe({
      next: (social) => {
        this.apply(social);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected reset(): void {
    const s = this.saved();
    if (s) {
      this.apply(s);
    }
  }

  protected save(): void {
    if (this.enabled() && !this.account().trim()) {
      this.messages.add({ severity: 'warn', summary: 'Compte manquant', detail: 'Indiquez le compte Instagram avant d\'activer le lien.' });
      return;
    }
    this.saving.set(true);
    this.api.updateSocial(this.enabled(), this.account().trim() || null).subscribe({
      next: (social) => {
        this.saving.set(false);
        this.apply(social);
        this.messages.add({
          severity: 'success',
          summary: 'Lien enregistre',
          detail: social.instagramEnabled ? `Instagram affiche : ${social.instagramHandle}` : 'Instagram n\'est plus affiche.',
        });
      },
      error: (error) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: 'Enregistrement impossible', detail: errorMessage(error), life: 8000 });
      },
    });
  }

  private apply(social: SocialLinks): void {
    this.saved.set(social);
    this.enabled.set(social.instagramEnabled);
    this.account.set(social.instagramUrl ?? '');
  }
}
