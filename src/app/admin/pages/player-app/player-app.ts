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
    this.save({ emailReminderEnabled: enabled }, (config) =>
      config.emailReminderEnabled
        ? { summary: 'Rappel active', detail: "Les joueurs dont l'email n'est pas confirme reverront la fenetre." }
        : { summary: 'Rappel desactive', detail: "La fenetre de rappel ne s'affichera plus." },
    );
  }

  protected setLeaderTransfer(enabled: boolean): void {
    this.save({ leaderTransferEnabled: enabled }, (config) =>
      config.leaderTransferEnabled
        ? { summary: 'Recharge par les leaders activee', detail: 'Les leaders peuvent de nouveau recharger leurs joueurs.' }
        : { summary: 'Recharge par les leaders coupee', detail: 'Le bouton disparait et les nouvelles recharges sont refusees.' },
    );
  }

  protected setWinningsConversion(enabled: boolean): void {
    this.save({ winningsConversionEnabled: enabled }, (config) =>
      config.winningsConversionEnabled
        ? { summary: 'Recharge avec les gains activee', detail: 'Les joueurs peuvent de nouveau convertir leurs gains en credits.' }
        : { summary: 'Recharge avec les gains coupee', detail: 'Le bouton disparait et les nouvelles conversions sont refusees.' },
    );
  }

  protected setOnlineTopUp(enabled: boolean): void {
    this.save({ onlineTopUpEnabled: enabled }, (config) =>
      config.onlineTopUpEnabled
        ? { summary: 'Paiement en ligne active', detail: "Les joueurs peuvent recharger par MonCash et NatCash depuis l'app." }
        : { summary: 'Paiement en ligne coupe', detail: "L'option disparait ; les paiements deja lances seront tout de meme credites." },
    );
  }

  protected setAutoPayout(enabled: boolean): void {
    this.save({ autoPayoutEnabled: enabled }, (config) =>
      config.autoPayoutEnabled
        ? { summary: 'Retraits automatiques actives', detail: "Approuver un retrait MonCash / NatCash enverra l'argent par Tranzak." }
        : { summary: 'Retraits automatiques coupes', detail: 'Les retraits MonCash / NatCash se versent de nouveau a la main.' },
    );
  }

  private save(
    change: Partial<PlayerAppConfig>,
    message: (config: PlayerAppConfig) => { summary: string; detail: string },
  ): void {
    const previous = this.config();
    if (!previous || Object.entries(change).every(([key, value]) => previous[key as keyof PlayerAppConfig] === value)) {
      return;
    }
    this.config.set({ ...previous, ...change });
    this.saving.set(true);
    this.api.updatePlayerApp({ ...previous, ...change }).subscribe({
      next: (config) => {
        this.saving.set(false);
        this.config.set(config);
        this.messages.add({ severity: 'success', ...message(config) });
      },
      error: (error) => {
        this.saving.set(false);
        this.config.set(previous);
        this.messages.add({ severity: 'error', summary: 'Enregistrement impossible', detail: errorMessage(error), life: 8000 });
      },
    });
  }
}
