import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { CreditsPipe, HaitiDatePipe, HtgPipe } from '../../core/format';
import { TRANSACTION_TYPE, providerLabel, withdrawalStatus } from '../../core/labels';
import { AdminWithdrawal, BalanceType, PlayerSummary, WalletTransaction } from '../../core/models';

const PAGE_SIZE = 15;

@Component({
  selector: 'admin-player-detail',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectButtonModule,
    TableModule,
    TabsModule,
    TagModule,
    CreditsPipe,
    HtgPipe,
    HaitiDatePipe,
  ],
  templateUrl: './player-detail.html',
})
export default class PlayerDetail implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);

  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** Parametre de route :id. Suivi en continu : passer d'une fiche a l'autre reutilise le composant. */
  protected readonly id = signal(0);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly typeLabels = TRANSACTION_TYPE;
  protected readonly withdrawalStatus = withdrawalStatus;
  protected readonly providerLabel = providerLabel;

  protected readonly player = signal<PlayerSummary | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly transactions = signal<WalletTransaction[]>([]);
  protected readonly transactionsTotal = signal(0);
  protected readonly withdrawals = signal<AdminWithdrawal[]>([]);
  protected readonly loadingTransactions = signal(false);
  private transactionsPage = 0;

  // Recharge manuelle
  protected readonly topUpOpen = signal(false);
  protected topUpAmount: number | null = null;
  protected topUpReference = '';
  protected topUpNote = '';

  // Ajustement
  protected readonly adjustOpen = signal(false);
  protected readonly balanceOptions = [
    { label: 'Credits', value: 'CREDIT' },
    { label: 'Gains', value: 'WINNINGS' },
  ];
  protected adjustBalance: BalanceType = 'CREDIT';
  protected adjustAmount: number | null = null;
  protected adjustReason = '';

  protected readonly busy = signal(false);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.id.set(Number(params.get('id')));
      this.player.set(null);
      this.error.set(null);
      this.transactionsPage = 0;
      this.reload();
    });
  }

  protected reload(): void {
    this.api.player(this.id()).subscribe({
      next: (player) => this.player.set(player),
      error: (error) => this.error.set(errorMessage(error)),
    });
    this.loadTransactions();
    this.api.playerWithdrawals(this.id(), 0, 50).subscribe({
      next: (page) => this.withdrawals.set(page.content),
      error: () => this.withdrawals.set([]),
    });
  }

  protected onTransactionsPage(event: TableLazyLoadEvent): void {
    const page = Math.floor((event.first ?? 0) / PAGE_SIZE);
    if (page !== this.transactionsPage) {
      this.transactionsPage = page;
      this.loadTransactions();
    }
  }

  protected openTopUp(): void {
    this.topUpAmount = null;
    // Reference proposee : unique, mais l'agent peut la remplacer par le numero du recu.
    this.topUpReference = `GUICHET-${Date.now()}`;
    this.topUpNote = '';
    this.topUpOpen.set(true);
  }

  protected topUp(): void {
    if (!this.topUpAmount || !this.topUpReference.trim()) {
      return;
    }
    this.busy.set(true);
    this.api.manualTopUp(this.id(), this.topUpAmount, this.topUpReference.trim(), this.topUpNote.trim() || null).subscribe({
      next: () => {
        this.topUpOpen.set(false);
        this.done('Recharge enregistree', `${this.topUpAmount} HTG credites.`);
      },
      error: (error) => this.fail(error),
    });
  }

  protected openAdjust(): void {
    this.adjustBalance = 'CREDIT';
    this.adjustAmount = null;
    this.adjustReason = '';
    this.adjustOpen.set(true);
  }

  protected adjust(): void {
    if (!this.adjustAmount || !this.adjustReason.trim()) {
      return;
    }
    this.busy.set(true);
    this.api.adjust(this.id(), this.adjustBalance, this.adjustAmount, this.adjustReason.trim()).subscribe({
      next: () => {
        this.adjustOpen.set(false);
        this.done('Solde ajuste', 'La correction est tracee dans le journal d\'audit.');
      },
      error: (error) => this.fail(error),
    });
  }

  private loadTransactions(): void {
    this.loadingTransactions.set(true);
    this.api.transactions(this.id(), this.transactionsPage, PAGE_SIZE).subscribe({
      next: (page) => {
        this.transactions.set(page.content);
        this.transactionsTotal.set(page.totalElements);
        this.loadingTransactions.set(false);
      },
      error: () => this.loadingTransactions.set(false),
    });
  }

  private done(summary: string, detail: string): void {
    this.busy.set(false);
    this.messages.add({ severity: 'success', summary, detail });
    this.transactionsPage = 0;
    this.reload();
  }

  private fail(error: unknown): void {
    this.busy.set(false);
    this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) });
  }
}
