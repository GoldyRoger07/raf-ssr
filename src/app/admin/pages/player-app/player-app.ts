import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { PlayerAppConfig } from '../../core/models';

/**
 * Comportements de l'app joueur pilotes depuis le back-office. Chaque interrupteur
 * est enregistre aussitot (et trace au journal d'audit) ; l'app le prend en compte
 * a son prochain passage, sans mise a jour.
 */
@Component({
  selector: 'admin-player-app',
  imports: [FormsModule, MessageModule, ToggleSwitchModule],
  templateUrl: './player-app.html',
})
export default class PlayerApp {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);

  protected readonly config = signal<PlayerAppConfig | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  constructor() {
    this.api.playerApp().subscribe({
      next: (config) => {
        this.config.set(config);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected setEmailReminder(enabled: boolean): void {
    const previous = this.config();
    if (!previous || previous.emailReminderEnabled === enabled) {
      return;
    }
    this.config.set({ ...previous, emailReminderEnabled: enabled });
    this.saving.set(true);
    this.api.updatePlayerApp({ ...previous, emailReminderEnabled: enabled }).subscribe({
      next: (config) => {
        this.saving.set(false);
        this.config.set(config);
        this.messages.add({
          severity: 'success',
          summary: config.emailReminderEnabled ? 'Rappel active' : 'Rappel desactive',
          detail: config.emailReminderEnabled
            ? "Les joueurs dont l'email n'est pas confirme reverront la fenetre."
            : "La fenetre de rappel ne s'affichera plus.",
        });
      },
      error: (error) => {
        this.saving.set(false);
        this.config.set(previous);
        this.messages.add({ severity: 'error', summary: 'Enregistrement impossible', detail: errorMessage(error), life: 8000 });
      },
    });
  }
}
