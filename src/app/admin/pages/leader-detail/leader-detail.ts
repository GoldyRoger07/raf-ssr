import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { Subject, debounceTime } from 'rxjs';

import { PlayerSearch } from '../../components/player-search/player-search';
import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { CreditsPipe, HaitiDatePipe, HtgPipe } from '../../core/format';
import { LeaderCommission, LeaderPlayer, LeaderSummary, LeaderTransfer, PlayerSummary } from '../../core/models';
import { PAGE_SIZE_OPTIONS, TableState } from '../../core/table-state';

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
    IconFieldModule,
    InputIconModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
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
  protected readonly pageSizes = PAGE_SIZE_OPTIONS;

  // Recherche, filtres et tri des trois onglets (cote serveur).
  protected readonly playersTable = new TableState(['name', 'addedAt', 'lastPlayed', 'commissions'], PAGE_SIZE);
  protected readonly commissionsTable = new TableState(['createdAt', 'player', 'quiz', 'baseCredits', 'amount'], PAGE_SIZE);
  protected readonly transfersTable = new TableState(['createdAt', 'player', 'credits'], PAGE_SIZE);
  protected playersFilters: { q: string; viaInvite: boolean | null } = { q: '', viaInvite: null };
  protected commissionsFilters: { q: string; source: 'QUIZ' | 'SOLO' | null; from: string | null; to: string | null } = {
    q: '',
    source: null,
    from: null,
    to: null,
  };
  protected transfersQuery = '';
  protected readonly viaInviteOptions = [
    { label: 'Par son lien', value: true },
    { label: 'Par un administrateur', value: false },
  ];
  protected readonly sourceOptions = [
    { label: 'Quiz en groupe', value: 'QUIZ' },
    { label: 'Partie solo', value: 'SOLO' },
  ];
  private readonly typed = new Subject<'players' | 'commissions' | 'transfers'>();
  protected readonly leader = signal<LeaderSummary | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly players = signal<LeaderPlayer[]>([]);
  protected readonly playersTotal = signal(0);
  protected readonly playersLoading = signal(false);

  protected readonly commissions = signal<LeaderCommission[]>([]);
  protected readonly commissionsTotal = signal(0);
  protected readonly commissionsLoading = signal(false);

  protected readonly transfers = signal<LeaderTransfer[]>([]);
  protected readonly transfersTotal = signal(0);
  protected readonly transfersLoading = signal(false);

  // Commission
  protected readonly commissionOpen = signal(false);
  protected percent: number | null = null;
  protected readonly commissionBusy = signal(false);
  protected readonly commissionError = signal<string | null>(null);

  // Bonus d'inscription
  protected readonly bonusOpen = signal(false);
  protected bonusCredits: number | null = null;
  protected readonly bonusBusy = signal(false);
  protected readonly bonusError = signal<string | null>(null);

  protected readonly adding = signal(false);

  constructor() {
    this.typed.pipe(debounceTime(300), takeUntilDestroyed(inject(DestroyRef))).subscribe((tab) =>
      tab === 'players' ? this.applyPlayers() : tab === 'commissions' ? this.applyCommissions() : this.applyTransfers(),
    );
    this.loadLeader();
    this.loadPlayers();
    this.loadCommissions();
    this.loadTransfers();
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

  protected openBonus(): void {
    this.bonusCredits = this.leader()?.signupBonusCredits ?? 0;
    this.bonusError.set(null);
    this.bonusOpen.set(true);
  }

  protected saveBonus(): void {
    if (this.bonusCredits === null) {
      this.bonusError.set('Indiquez un nombre de credits (0 pour aucun bonus).');
      return;
    }
    this.bonusBusy.set(true);
    this.bonusError.set(null);
    this.api.setLeaderSignupBonus(this.id, this.bonusCredits).subscribe({
      next: (leader) => {
        this.leader.set(leader);
        this.bonusBusy.set(false);
        this.bonusOpen.set(false);
        this.messages.add({
          severity: 'success',
          summary: "Bonus d'inscription mis a jour",
          detail: `${leader.signupBonusCredits} credits pour les prochains inscrits ; le bonus deja promis aux inscrits ne change pas.`,
        });
      },
      error: (error) => {
        this.bonusBusy.set(false);
        this.bonusError.set(errorMessage(error));
      },
    });
  }

  protected addPlayer(player: PlayerSummary): void {
    this.adding.set(true);
    this.api.addLeaderPlayer(this.id, player.id).subscribe({
      next: () => {
        this.adding.set(false);
        this.messages.add({ severity: 'success', summary: 'Joueur ajoute', detail: `${player.firstName} ${player.lastName}` });
        this.playersTable.restart();
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
    if (this.playersTable.onLazyLoad(event)) {
      this.loadPlayers();
    }
  }

  protected onCommissionsPage(event: TableLazyLoadEvent): void {
    if (this.commissionsTable.onLazyLoad(event)) {
      this.loadCommissions();
    }
  }

  protected onTransfersPage(event: TableLazyLoadEvent): void {
    if (this.transfersTable.onLazyLoad(event)) {
      this.loadTransfers();
    }
  }

  protected onInput(tab: 'players' | 'commissions' | 'transfers'): void {
    this.typed.next(tab);
  }

  protected get playersFiltered(): boolean {
    return !!this.playersFilters.q.trim() || this.playersFilters.viaInvite !== null;
  }

  protected get commissionsFiltered(): boolean {
    const f = this.commissionsFilters;
    return !!f.q.trim() || f.source !== null || !!f.from || !!f.to;
  }

  protected applyPlayers(): void {
    this.playersTable.restart();
    this.loadPlayers();
  }

  protected applyCommissions(): void {
    this.commissionsTable.restart();
    this.loadCommissions();
  }

  protected applyTransfers(): void {
    this.transfersTable.restart();
    this.loadTransfers();
  }

  protected resetPlayers(): void {
    this.playersFilters = { q: '', viaInvite: null };
    this.playersTable.reset();
    this.loadPlayers();
  }

  protected resetCommissions(): void {
    this.commissionsFilters = { q: '', source: null, from: null, to: null };
    this.commissionsTable.reset();
    this.loadCommissions();
  }

  protected resetTransfers(): void {
    this.transfersQuery = '';
    this.transfersTable.reset();
    this.loadTransfers();
  }

  private loadTransfers(): void {
    this.transfersLoading.set(true);
    const t = this.transfersTable;
    this.api.leaderTransfers(this.id, t.page, t.pageSize, this.transfersQuery, t.sort ?? undefined).subscribe({
      next: (page) => {
        this.transfers.set(page.content);
        this.transfersTotal.set(page.totalElements);
        this.transfersLoading.set(false);
      },
      error: () => this.transfersLoading.set(false),
    });
  }

  private loadLeader(): void {
    this.api.leader(this.id).subscribe({
      next: (leader) => this.leader.set(leader),
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  private loadPlayers(): void {
    this.playersLoading.set(true);
    const t = this.playersTable;
    this.api.leaderPlayers(this.id, t.page, t.pageSize, this.playersFilters, t.sort ?? undefined).subscribe({
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
    const t = this.commissionsTable;
    this.api.leaderCommissions(this.id, t.page, t.pageSize, this.commissionsFilters, t.sort ?? undefined).subscribe({
      next: (page) => {
        this.commissions.set(page.content);
        this.commissionsTotal.set(page.totalElements);
        this.commissionsLoading.set(false);
      },
      error: () => this.commissionsLoading.set(false),
    });
  }
}
