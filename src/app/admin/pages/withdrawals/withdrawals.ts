import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { Subject, debounceTime } from 'rxjs';

import { CashPickupDialog } from '../../components/cash-pickup-dialog/cash-pickup-dialog';
import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { HaitiDatePipe, HtgPipe } from '../../core/format';
import { WITHDRAWAL_STATUS, providerLabel, withdrawalStatus } from '../../core/labels';
import {
  AdminWithdrawal,
  PaymentProvider,
  PayoutConfig,
  Withdrawal,
  WithdrawalFilters,
  WithdrawalSort,
  WithdrawalSortField,
  WithdrawalStatus,
} from '../../core/models';

const TABS: WithdrawalStatus[] = ['PENDING', 'APPROVED', 'SENDING', 'PAID', 'REJECTED'];
const PAGE_SIZE = 20;
const PAGE_SIZES = [10, 20, 50, 100];
const SORT_FIELDS: WithdrawalSortField[] = ['createdAt', 'player', 'netHtg', 'provider'];
const PROVIDERS: PaymentProvider[] = ['MONCASH', 'NATCASH', 'MANUAL'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NO_FILTERS: WithdrawalFilters = { q: '', provider: null, counter: null, from: null, to: null };

@Component({
  selector: 'admin-withdrawals',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    SelectModule,
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
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs = TABS;
  protected readonly withdrawalStatus = withdrawalStatus;
  protected readonly providerLabel = providerLabel;
  protected pageSize = PAGE_SIZE;
  protected readonly pageSizes = PAGE_SIZES;
  protected filters: WithdrawalFilters = { ...NO_FILTERS };
  protected sort: WithdrawalSort | null = null;
  protected readonly providerOptions = PROVIDERS.map((p) => ({ label: providerLabel(p), value: p }));
  protected readonly counterOptions = [
    { label: 'Saisis au guichet', value: true },
    { label: 'Demandes des joueurs', value: false },
  ];
  private readonly typed = new Subject<void>();

  protected readonly status = signal<WithdrawalStatus>(this.initialStatus());
  protected readonly rows = signal<AdminWithdrawal[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected page = 0;
  /** Envoi automatique des retraits MonCash / NatCash ; null tant qu'on ne sait pas. */
  protected readonly payout = signal<PayoutConfig | null>(null);

  // Dialogues
  protected readonly selected = signal<AdminWithdrawal | null>(null);
  protected readonly rejectOpen = signal(false);
  protected readonly payOpen = signal(false);
  protected readonly pickupOpen = signal(false);
  protected readonly busy = signal(false);
  protected rejectReason = '';
  protected payoutReference = '';

  constructor() {
    this.readUrl(this.route.snapshot.queryParams);
    this.typed.pipe(debounceTime(300), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.apply());
    this.load();
    this.api.payoutConfig().subscribe({
      next: (config) => this.payout.set(config),
      error: () => this.payout.set(null),
    });
  }

  /** Retrait qui partira (ou repartira) par Tranzak. */
  protected automatic(row: AdminWithdrawal): boolean {
    return !!this.payout()?.enabled && row.withdrawal.provider !== 'MANUAL' && !row.withdrawal.initiatedByAdminId;
  }

  protected selectTab(value: string | number | undefined): void {
    const status = value as WithdrawalStatus;
    if (status === this.status()) {
      return;
    }
    this.status.set(status);
    this.apply();
  }

  /** Criteres actifs, recherche comprise. */
  protected get activeCount(): number {
    const f = this.filters;
    return [f.provider, f.counter, f.from, f.to].filter((v) => v !== null && v !== '').length + (f.q.trim() ? 1 : 0);
  }

  protected onInput(): void {
    this.typed.next();
  }

  /** Un critere a change : retour a la premiere page. */
  protected apply(): void {
    this.page = 0;
    this.writeUrl();
    this.load();
  }

  protected reset(): void {
    this.filters = { ...NO_FILTERS };
    this.sort = null;
    this.apply();
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize;
    const page = Math.floor((event.first ?? 0) / rows);
    const field = typeof event.sortField === 'string' ? event.sortField : null;
    const sort: WithdrawalSort | null =
      field && SORT_FIELDS.includes(field as WithdrawalSortField)
        ? { field: field as WithdrawalSortField, direction: event.sortOrder === -1 ? 'desc' : 'asc' }
        : null;
    const sortChanged = sort?.field !== this.sort?.field || sort?.direction !== this.sort?.direction;
    if (page !== this.page || rows !== this.pageSize || sortChanged) {
      this.page = sortChanged || rows !== this.pageSize ? 0 : page;
      this.pageSize = rows;
      this.sort = sort;
      this.writeUrl();
      this.load();
    }
  }

  /** Restaure la vue depuis l'URL ; une valeur inconnue est ignoree. */
  private readUrl(params: Params): void {
    this.filters = {
      q: params['q'] ?? '',
      provider: PROVIDERS.includes(params['moyen']) ? params['moyen'] : null,
      counter: params['guichet'] === 'true' ? true : params['guichet'] === 'false' ? false : null,
      from: DATE.test(params['du'] ?? '') ? params['du'] : null,
      to: DATE.test(params['au'] ?? '') ? params['au'] : null,
    };
    const [field, direction] = `${params['tri'] ?? ''}`.split(',');
    this.sort = SORT_FIELDS.includes(field as WithdrawalSortField)
      ? { field: field as WithdrawalSortField, direction: direction === 'desc' ? 'desc' : 'asc' }
      : null;
    const size = Number(params['taille']);
    this.pageSize = PAGE_SIZES.includes(size) ? size : PAGE_SIZE;
    this.page = Math.max(0, Number(params['page']) || 0);
  }

  private writeUrl(): void {
    const f = this.filters;
    const queryParams: Params = { statut: this.status() };
    const set = (key: string, value: unknown) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams[key] = `${value}`;
      }
    };
    set('q', f.q.trim());
    set('moyen', f.provider);
    set('guichet', f.counter);
    set('du', f.from);
    set('au', f.to);
    set('tri', this.sort ? `${this.sort.field},${this.sort.direction}` : null);
    set('page', this.page > 0 ? this.page : null);
    set('taille', this.pageSize !== PAGE_SIZE ? this.pageSize : null);
    this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.withdrawals(this.status(), this.page, this.pageSize, this.filters, this.sort ?? undefined).subscribe({
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
    const automatic = this.automatic(row);
    this.confirmation.confirm({
      header: automatic ? 'Approuver et envoyer' : 'Approuver le retrait',
      message: automatic
        ? `Envoyer ${row.withdrawal.netHtg} HTG sur le compte ${this.providerLabel(row.withdrawal.provider)} ` +
          `${row.withdrawal.destinationNumber} de ${row.playerName} ? L'argent part tout de suite par Tranzak.`
        : `Approuver le retrait de ${row.withdrawal.netHtg} HTG pour ${row.playerName} ?`,
      icon: 'pi pi-check-circle',
      acceptLabel: automatic ? 'Approuver et envoyer' : 'Approuver',
      rejectLabel: 'Annuler',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () =>
        this.api.approve(row.withdrawal.id).subscribe({
          next: (result) => this.afterSend(row, result, 'Retrait approuve'),
          error: (error) => this.fail(error),
        }),
    });
  }

  /** Nouvel essai d'envoi automatique, apres un echec. */
  protected resend(row: AdminWithdrawal): void {
    this.confirmation.confirm({
      header: "Relancer l'envoi",
      message: `Renvoyer ${row.withdrawal.netHtg} HTG sur ${this.providerLabel(row.withdrawal.provider)} ` +
        `${row.withdrawal.destinationNumber} ? Dernier echec : ${row.withdrawal.payoutError}.`,
      icon: 'pi pi-send',
      acceptLabel: 'Relancer',
      rejectLabel: 'Annuler',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () =>
        this.api.sendPayout(row.withdrawal.id).subscribe({
          next: (result) => this.afterSend(row, result, 'Envoi relance'),
          error: (error) => this.fail(error),
        }),
    });
  }

  private afterSend(row: AdminWithdrawal, result: Withdrawal, summary: string): void {
    if (result.status === 'PAID') {
      this.done('Retrait verse', `${row.withdrawal.netHtg} HTG envoyes a ${row.playerName}.`);
    } else if (result.status === 'SENDING') {
      this.done(summary, "Envoi en cours chez Tranzak : le retrait passera en « Verse » des confirmation.");
    } else if (result.payoutError) {
      this.busy.set(false);
      this.messages.add({ severity: 'warn', summary: 'Envoi automatique echoue', detail: result.payoutError, life: 10000 });
      this.load();
    } else {
      this.done(summary, `${row.playerName} est prevenu.`);
    }
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
