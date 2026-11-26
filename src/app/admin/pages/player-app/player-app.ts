import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { PlayerAppConfig, SoloCashbackConfig } from '../../core/models';

/**
 * Comportements de l'app joueur pilotes depuis le back-office. Chaque interrupteur
 * est enregistre aussitot (et trace au journal d'audit) ; l'app le prend en compte
 * a son prochain passage, sans mise a jour.
 */
@Component({
  selector: 'admin-player-app',
  imports: [FormsModule, ButtonModule, InputNumberModule, MessageModule, ToggleSwitchModule],
  templateUrl: './player-app.html',
})
export default class PlayerApp {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);

  protected readonly config = signal<PlayerAppConfig | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  /** Cashback du quasi sans-faute en solo : formulaire enregistre d'un bloc. */
  protected readonly cashback = signal<SoloCashbackConfig | null>(null);
  protected readonly cashbackSaving = signal(false);
  protected cashbackForm: SoloCashbackConfig = { enabled: false, percent: 50, dailyLimit: 3, minQuestions: 5 };

  constructor() {
    this.api.soloCashback().subscribe({
      next: (config) => this.showCashback(config),
      error: (error) => this.messages.add({ severity: 'error', summary: 'Cashback solo illisible', detail: errorMessage(error) }),
    });
    this.api.playerApp().subscribe({
      next: (config) => {
        this.config.set(config);
        this.reminderDelay = config.emailReminderDelaySeconds;
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected setSoloQuizzesVisible(visible: boolean): void {
    this.save({ soloQuizzesVisible: visible }, (config) =>
      config.soloQuizzesVisible
        ? { summary: 'Quiz solo visibles', detail: 'Les joueurs retrouvent les quiz solo ouverts et peuvent de nouveau y jouer.' }
        : { summary: 'Quiz solo masques', detail: "Tous les quiz solo ouverts disparaissent de l'app ; les parties en cours vont a leur terme." },
    );
  }

  protected setFirstSoloFree(enabled: boolean): void {
    this.save({ firstSoloFreeEnabled: enabled }, (config) =>
      config.firstSoloFreeEnabled
        ? { summary: 'Premiere partie solo offerte', detail: "Les joueurs qui n'ont jamais paye de partie solo jouent la premiere gratuitement." }
        : { summary: 'Offre coupee', detail: 'Toutes les parties solo payantes sont de nouveau facturees.' },
    );
  }

  protected setEmailReminder(enabled: boolean): void {
    this.save({ emailReminderEnabled: enabled }, (config) =>
      config.emailReminderEnabled
        ? { summary: 'Rappel active', detail: "Les joueurs dont l'email n'est pas confirme reverront la fenetre." }
        : { summary: 'Rappel desactive', detail: "La fenetre de rappel ne s'affichera plus." },
    );
  }

  /** Delai du rappel de l'email : saisi puis enregistre avec le bouton. */
  protected reminderDelay = 10;

  protected reminderDelayChanged(): boolean {
    const c = this.config();
    return !!c && c.emailReminderDelaySeconds !== this.reminderDelay;
  }

  protected reminderDelayValid(): boolean {
    const d = this.reminderDelay;
    return Number.isInteger(d) && d >= 5 && d <= 86400;
  }

  protected saveReminderDelay(): void {
    if (!this.reminderDelayValid()) {
      return;
    }
    this.save({ emailReminderDelaySeconds: this.reminderDelay }, (config) => ({
      summary: 'Delai du rappel enregistre',
      detail: `La fenetre reviendra ${config.emailReminderDelaySeconds} secondes apres sa fermeture.`,
    }));
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

  protected cashbackChanged(): boolean {
    const c = this.cashback();
    const f = this.cashbackForm;
    return !!c && (c.enabled !== f.enabled || c.percent !== f.percent || c.dailyLimit !== f.dailyLimit
      || c.minQuestions !== f.minQuestions);
  }

  protected cashbackValid(): boolean {
    const f = this.cashbackForm;
    return f.percent >= 1 && f.percent <= 100 && f.dailyLimit >= 1 && f.dailyLimit <= 100
      && f.minQuestions >= 2 && f.minQuestions <= 200;
  }

  protected saveCashback(): void {
    if (!this.cashbackValid()) {
      return;
    }
    this.cashbackSaving.set(true);
    this.api.setSoloCashback({ ...this.cashbackForm }).subscribe({
      next: (config) => {
        this.cashbackSaving.set(false);
        this.showCashback(config);
        this.messages.add(config.enabled
          ? { severity: 'success', summary: 'Cashback solo active', detail: `${config.percent} % du prix rendu pour une seule erreur.` }
          : { severity: 'success', summary: 'Cashback solo coupe', detail: 'Aucun credit ne sera rendu.' });
      },
      error: (error) => {
        this.cashbackSaving.set(false);
        this.messages.add({ severity: 'error', summary: 'Enregistrement impossible', detail: errorMessage(error), life: 8000 });
      },
    });
  }

  private showCashback(config: SoloCashbackConfig): void {
    this.cashback.set(config);
    this.cashbackForm = { ...config };
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
        this.reminderDelay = config.emailReminderDelaySeconds;
        this.messages.add({ severity: 'success', ...message(config) });
      },
      error: (error) => {
        this.saving.set(false);
        this.config.set(previous);
        this.reminderDelay = previous.emailReminderDelaySeconds;
        this.messages.add({ severity: 'error', summary: 'Enregistrement impossible', detail: errorMessage(error), life: 8000 });
      },
    });
  }
}
