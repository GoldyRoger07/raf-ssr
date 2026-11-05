import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';

import { PlayerSearch } from '../../components/player-search/player-search';
import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { CreditsPipe, HaitiDatePipe, HtgPipe } from '../../core/format';
import { LeaderCommission, LeaderPlayer, LeaderSummary, PlayerSummary } from '../../core/models';

const PAGE_SIZE = 20;

/**
 * Un leader : sa commission, ses joueurs (ajout et retrait) et l'historique de ce
 * qu'il a touche. Un changement de commission ne vaut que pour la suite.
 */
@Component({
  selector: 'admin-leader-detail',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputNumberModule,
    MessageModule,
    TableModule,
    TabsModule,
    TagModule,
    CreditsPipe,
    HaitiDatePipe,
    HtgPipe,
    PlayerSearch,
  ],
  templateUrl: './leader-detail.html',
})
export default class LeaderDetail {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  protected readonly pageSize = PAGE_SIZE;
  protected readonly leader = signal<LeaderSummary | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly players = signal<LeaderPlayer[]>([]);
  protected readonly playersTotal = signal(0);
  protected readonly playersLoading = signal(false);
  protected playersPage = 0;

  protected readonly commissions = signal<LeaderCommission[]>([]);
  protected readonly commissionsTotal = signal(0);
  protected readonly commissionsLoading = signal(false);
  protected commissionsPage = 0;

  // Commission
  protected readonly commissionOpen = signal(false);
  protected percent: number | null = null;
  protected readonly commissionBusy = signal(false);
  protected readonly commissionError = signal<string | null>(null);

  protected readonly adding = signal(false);

  constructor() {
    this.loadLeader();
    this.loadPlayers();
    this.loadCommissions();
  }

  protected openCommission(): void {
    this.percent = this.leader()?.commissionPercent ?? null;
    this.commissionError.set(null);
    this.commissionOpen.set(true);
  }

  protected saveCommission(): void {
    if (this.percent === null) {
      this.commissionError.set('Indiquez un pourcentage.');
      return;
    }
    this.commissionBusy.set(true);
    this.commissionError.set(null);
    this.api.setLeaderCommission(this.id, this.percent).subscribe({
      next: (leader) => {
        this.leader.set(leader);
        this.commissionBusy.set(false);
        this.commissionOpen.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Commission mise a jour',
          detail: `${leader.commissionPercent} % pour les parties a venir ; les commissions deja versees ne changent pas.`,
        });
      },
      error: (error) => {
        this.commissionBusy.set(false);
        this.commissionError.set(errorMessage(error));
      },
    });
  }

  protected addPlayer(player: PlayerSummary): void {
    this.adding.set(true);
    this.api.addLeaderPlayer(this.id, player.id).subscribe({
      next: () => {
        this.adding.set(false);
        this.messages.add({ severity: 'success', summary: 'Joueur ajoute', detail: `${player.firstName} ${player.lastName}` });
        this.playersPage = 0;
        this.loadPlayers();
        this.loadLeader();
      },
      error: (error) => {
        this.adding.set(false);
        this.messages.add({ severity: 'error', summary: 'Ajout impossible', detail: errorMessage(error) });
      },
    });
  }

  protected removePlayer(player: LeaderPlayer): void {
    this.confirmation.confirm({
      header: 'Retirer le joueur',
      message: `Retirer ${player.firstName} ${player.lastName} des joueurs de ce leader ? Ses prochaines parties perdues ne lui rapporteront plus rien ; les commissions deja versees restent.`,
      acceptLabel: 'Retirer',
      rejectLabel: 'Garder',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () =>
        this.api.removeLeaderPlayer(this.id, player.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Joueur retire' });
            this.loadPlayers();
            this.loadLeader();
          },
          error: (error) =>
            this.messages.add({ severity: 'error', summary: 'Retrait impossible', detail: errorMessage(error) }),
        }),
    });
  }

  protected demote(): void {
    const leader = this.leader();
    if (!leader) {
      return;
    }
    this.confirmation.confirm({
      header: 'Retirer le role leader',
      message: `${leader.firstName} ${leader.lastName} ne touchera plus de commission et ses ${leader.playerCount} joueur(s) seront detaches. L'historique des commissions est garde.`,
      acceptLabel: 'Retirer le role',
      rejectLabel: 'Annuler',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () =>
        this.api.demoteLeader(this.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: "Ce n'est plus un leader" });
            this.router.navigate(['/admin/leaders']);
          },
          error: (error) =>
            this.messages.add({ severity: 'error', summary: 'Operation impossible', detail: errorMessage(error) }),
        }),
    });
  }

  protected onPlayersPage(event: TableLazyLoadEvent): void {
    const page = Math.floor((event.first ?? 0) / PAGE_SIZE);
    if (page !== this.playersPage) {
      this.playersPage = page;
      this.loadPlayers();
    }
  }

  protected onCommissionsPage(event: TableLazyLoadEvent): void {
    const page = Math.floor((event.first ?? 0) / PAGE_SIZE);
    if (page !== this.commissionsPage) {
      this.commissionsPage = page;
      this.loadCommissions();
    }
  }

  private loadLeader(): void {
    this.api.leader(this.id).subscribe({
      next: (leader) => this.leader.set(leader),
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  private loadPlayers(): void {
    this.playersLoading.set(true);
    this.api.leaderPlayers(this.id, this.playersPage, PAGE_SIZE).subscribe({
      next: (page) => {
        this.players.set(page.content);
        this.playersTotal.set(page.totalElements);
        this.playersLoading.set(false);
      },
      error: () => this.playersLoading.set(false),
    });
  }

  private loadCommissions(): void {
    this.commissionsLoading.set(true);
    this.api.leaderCommissions(this.id, this.commissionsPage, PAGE_SIZE).subscribe({
      next: (page) => {
        this.commissions.set(page.content);
        this.commissionsTotal.set(page.totalElements);
        this.commissionsLoading.set(false);
      },
      error: () => this.commissionsLoading.set(false),
    });
  }
}
