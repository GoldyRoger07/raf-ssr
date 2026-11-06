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
import {
  AdminWithdrawal,
  BalanceType,
  PlayerSummary,
  RetentionReason,
  TopUpRetentionView,
  WalletTransaction,
} from '../../core/models';

const RETENTION_REASON: Record<RetentionReason, string> = {
  KEPT: 'Reste d\'une recharge',
  USED: 'Reprise par une recharge',
  ADJUSTMENT: 'Correction',
};

/** « 3712 3456 » -> « +50937123456 » ; un numero deja international est garde. */
function normalizePhone(raw: string): string {
  const compact = raw.replace(/[\s().-]/g, '');
  if (compact.startsWith('+')) {
    return compact;
  }
  if (compact.startsWith('00')) {
    return '+' + compact.slice(2);
  }
  if (compact.startsWith('509') && compact.length === 11) {
    return '+' + compact;
  }
  return '+509' + compact;
}

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
  protected readonly testBusy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly transactions = signal<WalletTransaction[]>([]);
  protected readonly transactionsTotal = signal(0);
  protected readonly withdrawals = signal<AdminWithdrawal[]>([]);
  protected readonly withdrawalsTotal = signal(0);
  protected readonly loadingWithdrawals = signal(false);
  protected withdrawalsPage = 0;
  protected readonly loadingTransactions = signal(false);
  protected transactionsPage = 0;

  // Recharge manuelle
  protected readonly topUpOpen = signal(false);
  protected topUpAmount: number | null = null;
  protected topUpReference = '';
  protected topUpNote = '';

  // Ajustement
  protected readonly phoneOpen = signal(false);
  protected readonly phoneError = signal<string | null>(null);
  protected newPhone = '';
  protected readonly emailOpen = signal(false);
  protected readonly emailError = signal<string | null>(null);
  protected newEmail = '';
  protected readonly adjustOpen = signal(false);
  protected readonly balanceOptions = [
    { label: 'Credits', value: 'CREDIT' },
    { label: 'Gains', value: 'WINNINGS' },
  ];
  protected adjustBalance: BalanceType = 'CREDIT';
  protected adjustAmount: number | null = null;
  protected adjustReason = '';

  // Retenue de recharge : gourdes qui ne formaient pas un credit entier.
  protected readonly retention = signal<TopUpRetentionView | null>(null);
  protected retentionLabel(reason: string): string {
    return RETENTION_REASON[reason as RetentionReason] ?? reason;
  }
  protected readonly retentionOpen = signal(false);
  protected retentionAmount: number | null = null;
  protected retentionReason = '';

  protected readonly busy = signal(false);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.id.set(Number(params.get('id')));
      this.player.set(null);
      this.error.set(null);
      this.transactionsPage = 0;
      this.withdrawalsPage = 0;
      this.reload();
    });
  }

  /** Compte de test : son activite sort du tableau de bord, il voit les quiz de test. */
  protected toggleTest(): void {
    const p = this.player();
    if (!p) {
      return;
    }
    const test = !p.test;
    this.testBusy.set(true);
    this.api.setUserTest(p.id, test).subscribe({
      next: () => {
        this.testBusy.set(false);
        this.player.set({ ...p, test });
        this.messages.add({
          severity: 'success',
          summary: test ? 'Compte marque comme test' : 'Compte de nouveau reel',
          detail: test ? 'Il joue gratuitement et sans gain ; son activite ne compte plus.' : undefined,
        });
      },
      error: (error) => {
        this.testBusy.set(false);
        this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) });
      },
    });
  }

  protected reload(): void {
    this.api.player(this.id()).subscribe({
      next: (player) => this.player.set(player),
      error: (error) => this.error.set(errorMessage(error)),
    });
    this.loadTransactions();
    this.loadWithdrawals();
    this.loadRetention();
  }

  private loadRetention(): void {
    this.api.retention(this.id()).subscribe({ next: (view) => this.retention.set(view) });
  }

  /** Apercu de la recharge en cours de saisie : credits et reste, retenue actuelle comprise. */
  protected topUpPreview(): { credits: number; kept: number; used: number } | null {
    const view = this.retention();
    if (!view || !this.topUpAmount || this.topUpAmount <= 0) {
      return null;
    }
    const total = this.topUpAmount + view.balanceHtg;
    return { credits: Math.floor(total / view.htgRate), kept: total % view.htgRate, used: view.balanceHtg };
  }

  protected openRetention(): void {
    this.retentionAmount = null;
    this.retentionReason = '';
    this.retentionOpen.set(true);
  }

  protected adjustRetention(): void {
    if (!this.retentionAmount || !this.retentionReason.trim()) {
      return;
    }
    this.busy.set(true);
    this.api.adjustRetention(this.id(), this.retentionAmount, this.retentionReason.trim()).subscribe({
      next: (view) => {
        this.retention.set(view);
        this.retentionOpen.set(false);
        this.done('Retenue corrigee', `Nouvelle retenue : ${view.balanceHtg} HTG. La correction est tracee dans le journal d'audit.`);
      },
      error: (error) => this.fail(error),
    });
  }

  protected onWithdrawalsPage(event: TableLazyLoadEvent): void {
    const page = Math.floor((event.first ?? 0) / PAGE_SIZE);
    if (page !== this.withdrawalsPage) {
      this.withdrawalsPage = page;
      this.loadWithdrawals();
    }
  }

  private loadWithdrawals(): void {
    this.loadingWithdrawals.set(true);
    this.api.playerWithdrawals(this.id(), this.withdrawalsPage, PAGE_SIZE).subscribe({
      next: (page) => {
        this.withdrawals.set(page.content);
        this.withdrawalsTotal.set(page.totalElements);
        this.loadingWithdrawals.set(false);
      },
      error: () => {
        this.withdrawals.set([]);
        this.withdrawalsTotal.set(0);
        this.loadingWithdrawals.set(false);
      },
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
      next: (result) => {
        this.topUpOpen.set(false);
        const parts = [`${result.amountHtg} HTG recus : ${result.credits} credit(s) ajoute(s).`];
        if (result.retentionUsedHtg > 0) {
          parts.push(`${result.retentionUsedHtg} HTG de retenue repris.`);
        }
        if (result.retentionKeptHtg > 0) {
          parts.push(`${result.retentionKeptHtg} HTG gardes pour la prochaine recharge.`);
        }
        this.done('Recharge enregistree', parts.join(' '));
      },
      error: (error) => this.fail(error),
    });
  }

  protected openPhone(): void {
    this.newPhone = this.player()?.phone ?? '';
    this.phoneError.set(null);
    this.phoneOpen.set(true);
  }

  protected changePhone(): void {
    const p = this.player();
    const phone = normalizePhone(this.newPhone);
    if (!p) {
      return;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      this.phoneError.set('Numero invalide : 8 chiffres (Haiti) ou format international, ex. +50937123456.');
      return;
    }
    this.busy.set(true);
    this.phoneError.set(null);
    this.api.changePlayerPhone(p.id, phone).subscribe({
      next: (user) => {
        this.busy.set(false);
        this.phoneOpen.set(false);
        this.player.set({ ...p, phone: user.phone, phoneVerified: user.phoneVerified });
        this.messages.add({ severity: 'success', summary: 'Numero modifie', detail: `${user.phone}, a verifier par le joueur.` });
      },
      error: (error) => {
        this.busy.set(false);
        this.phoneError.set(errorMessage(error));
      },
    });
  }

  protected openEmail(): void {
    this.newEmail = this.player()?.email ?? '';
    this.emailError.set(null);
    this.emailOpen.set(true);
  }

  protected changeEmail(): void {
    const p = this.player();
    const email = this.newEmail.trim();
    if (!p || !email) {
      return;
    }
    this.busy.set(true);
    this.emailError.set(null);
    this.api.changePlayerEmail(p.id, email).subscribe({
      next: (user) => {
        this.busy.set(false);
        this.emailOpen.set(false);
        this.player.set({ ...p, email: user.email, emailVerified: user.emailVerified });
        this.messages.add({ severity: 'success', summary: 'Email modifie', detail: `Lien de confirmation envoye a ${user.email}.` });
      },
      error: (error) => {
        this.busy.set(false);
        this.emailError.set(errorMessage(error));
      },
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
