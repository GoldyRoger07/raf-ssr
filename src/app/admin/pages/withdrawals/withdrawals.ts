import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import { CashPickupDialog } from '../../components/cash-pickup-dialog/cash-pickup-dialog';
import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { HaitiDatePipe, HtgPipe } from '../../core/format';
import { WITHDRAWAL_STATUS, providerLabel, withdrawalStatus } from '../../core/labels';
import { AdminWithdrawal, WithdrawalStatus } from '../../core/models';

const TABS: WithdrawalStatus[] = ['PENDING', 'APPROVED', 'PAID', 'REJECTED'];
const PAGE_SIZE = 20;

@Component({
  selector: 'admin-withdrawals',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    TableModule,
    TabsModule,
    TagModule,
    TextareaModule,
    CashPickupDialog,
    HtgPipe,
    HaitiDatePipe,
  ],
  templateUrl: './withdrawals.html',
})
export default class Withdrawals {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);

  protected readonly tabs = TABS;
  protected readonly withdrawalStatus = withdrawalStatus;
  protected readonly providerLabel = providerLabel;
  protected readonly pageSize = PAGE_SIZE;

  protected readonly status = signal<WithdrawalStatus>(this.initialStatus());
  protected readonly rows = signal<AdminWithdrawal[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  private page = 0;

  // Dialogues
  protected readonly selected = signal<AdminWithdrawal | null>(null);
  protected readonly rejectOpen = signal(false);
  protected readonly payOpen = signal(false);
  protected readonly pickupOpen = signal(false);
  protected readonly busy = signal(false);
  protected rejectReason = '';
  protected payoutReference = '';

  constructor() {
    this.load();
  }

  protected selectTab(value: string | number | undefined): void {
    const status = value as WithdrawalStatus;
    if (status === this.status()) {
      return;
    }
    this.status.set(status);
    this.page = 0;
    this.router.navigate([], { queryParams: { statut: status }, replaceUrl: true });
    this.load();
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const page = Math.floor((event.first ?? 0) / PAGE_SIZE);
    if (page !== this.page) {
      this.page = page;
      this.load();
    }
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.withdrawals(this.status(), this.page, PAGE_SIZE).subscribe({
      next: (page) => {
        this.rows.set(page.content);
        this.total.set(page.totalElements);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected approve(row: AdminWithdrawal): void {
    this.confirmation.confirm({
      header: 'Approuver le retrait',
      message: `Approuver le retrait de ${row.withdrawal.netHtg} HTG pour ${row.playerName} ?`,
      icon: 'pi pi-check-circle',
      acceptLabel: 'Approuver',
      rejectLabel: 'Annuler',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () =>
        this.api.approve(row.withdrawal.id).subscribe({
          next: () => this.done('Retrait approuve', `${row.playerName} est prevenu.`),
          error: (error) => this.fail(error),
        }),
    });
  }

  protected openReject(row: AdminWithdrawal): void {
    this.selected.set(row);
    this.rejectReason = '';
    this.rejectOpen.set(true);
  }

  protected reject(): void {
    const row = this.selected();
    if (!row || !this.rejectReason.trim()) {
      return;
    }
    this.busy.set(true);
    this.api.reject(row.withdrawal.id, this.rejectReason.trim()).subscribe({
      next: () => {
        this.rejectOpen.set(false);
        this.done('Retrait refuse', 'Les gains ont ete rendus au joueur.');
      },
      error: (error) => this.fail(error),
    });
  }

  /** Especes : remise au guichet avec code ; operateur : reference du versement. */
  protected openPay(row: AdminWithdrawal): void {
    this.selected.set(row);
    if (row.withdrawal.provider === 'MANUAL') {
      this.pickupOpen.set(true);
    } else {
      this.payoutReference = '';
      this.payOpen.set(true);
    }
  }

  protected markPaid(): void {
    const row = this.selected();
    if (!row || !this.payoutReference.trim()) {
      return;
    }
    this.busy.set(true);
    this.api.markPaid(row.withdrawal.id, this.payoutReference.trim(), null).subscribe({
      next: () => {
        this.payOpen.set(false);
        this.done('Versement enregistre', `${row.playerName} est prevenu.`);
      },
      error: (error) => this.fail(error),
    });
  }

  private done(summary: string, detail: string): void {
    this.busy.set(false);
    this.messages.add({ severity: 'success', summary, detail });
    this.load();
  }

  private fail(error: unknown): void {
    this.busy.set(false);
    this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) });
  }

  private initialStatus(): WithdrawalStatus {
    const requested = inject(ActivatedRoute).snapshot.queryParamMap.get('statut') as WithdrawalStatus | null;
    return requested && TABS.includes(requested) ? requested : 'PENDING';
  }
}
