import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Subject, debounceTime } from 'rxjs';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { CreditsPipe, HaitiDatePipe, HtgPipe } from '../../core/format';
import { PlayerFilters, PlayerSort, PlayerSortField, PlayerSummary } from '../../core/models';

const PAGE_SIZE = 20;

const SORT_FIELDS: PlayerSortField[] = ['name', 'email', 'creditBalance', 'winningsBalanceHtg', 'createdAt'];
const BOOLEAN_FILTERS = ['emailVerified', 'phoneVerified', 'hasCredit', 'hasWinnings', 'test'] as const;
const STATUSES: string[] = ['ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED'];

interface Option<T> {
  label: string;
  value: T;
}

/**
 * Liste des joueurs : recherche, filtres combinables et tri par colonne. Tout l'etat
 * (recherche, filtres, tri, page) vit dans l'URL : une vue se met en favori ou se partage.
 */
@Component({
  selector: 'admin-players',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TagModule,
    CreditsPipe,
    HtgPipe,
    HaitiDatePipe,
  ],
  templateUrl: './players.html',
})
export default class Players {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly pageSize = PAGE_SIZE;
  protected query = '';
  protected filters: PlayerFilters = {};
  protected sort: PlayerSort | null = null;
  protected page = 0;

  protected readonly rows = signal<PlayerSummary[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly typed = new Subject<void>();

  protected readonly verifiedOptions: Option<boolean>[] = [
    { label: 'Verifie', value: true },
    { label: 'Non verifie', value: false },
  ];
  protected readonly creditOptions: Option<boolean>[] = [
    { label: 'A du credit', value: true },
    { label: 'A zero', value: false },
  ];
  protected readonly winningsOptions: Option<boolean>[] = [
    { label: 'A des gains', value: true },
    { label: 'A zero', value: false },
  ];
  protected readonly statusOptions: Option<PlayerFilters['status']>[] = [
    { label: 'Actif', value: 'ACTIVE' },
    { label: 'Suspendu', value: 'SUSPENDED' },
    { label: 'Banni', value: 'BANNED' },
    { label: 'Supprime', value: 'DELETED' },
  ];
  protected readonly testOptions: Option<boolean>[] = [
    { label: 'Hors comptes de test', value: false },
    { label: 'Comptes de test seulement', value: true },
  ];

  constructor() {
    this.readUrl(this.route.snapshot.queryParams);
    this.typed.pipe(debounceTime(300), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.apply());
    this.load();
  }

  /** Nombre de criteres actifs, recherche comprise. */
  protected get activeCount(): number {
    const filters = Object.values(this.filters).filter((v) => v !== null && v !== undefined && v !== '').length;
    return filters + (this.query.trim() ? 1 : 0);
  }

  protected onInput(): void {
    this.typed.next();
  }

  /** Un filtre a change : retour a la premiere page. */
  protected apply(): void {
    this.page = 0;
    this.writeUrl();
    this.load();
  }

  /** Efface recherche, filtres et tri : retour a la liste par defaut (derniers inscrits). */
  protected reset(): void {
    this.query = '';
    this.filters = {};
    this.sort = null;
    this.apply();
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const page = Math.floor((event.first ?? 0) / PAGE_SIZE);
    const field = typeof event.sortField === 'string' ? event.sortField : null;
    const sort: PlayerSort | null =
      field && SORT_FIELDS.includes(field as PlayerSortField)
        ? { field: field as PlayerSortField, direction: event.sortOrder === -1 ? 'desc' : 'asc' }
        : null;
    const sortChanged = sort?.field !== this.sort?.field || sort?.direction !== this.sort?.direction;
    if (page !== this.page || sortChanged) {
      this.page = sortChanged ? 0 : page;
      this.sort = sort;
      this.writeUrl();
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.searchPlayers(this.query.trim(), this.page, PAGE_SIZE, this.filters, this.sort ?? undefined).subscribe({
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

  /** Restaure la vue depuis l'URL ; une valeur inconnue est ignoree. */
  private readUrl(params: Params): void {
    this.query = params['query'] ?? '';
    const filters: PlayerFilters = {};
    for (const key of BOOLEAN_FILTERS) {
      if (params[key] === 'true' || params[key] === 'false') {
        filters[key] = params[key] === 'true';
      }
    }
    if (STATUSES.includes(params['status'])) {
      filters.status = params['status'];
    }
    for (const key of ['createdFrom', 'createdTo'] as const) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(params[key] ?? '')) {
        filters[key] = params[key];
      }
    }
    this.filters = filters;

    const [field, direction] = `${params['sort'] ?? ''}`.split(',');
    this.sort = SORT_FIELDS.includes(field as PlayerSortField)
      ? { field: field as PlayerSortField, direction: direction === 'desc' ? 'desc' : 'asc' }
      : null;
    this.page = Math.max(0, Number(params['page']) || 0);
  }

  private writeUrl(): void {
    const queryParams: Params = {};
    if (this.query.trim()) {
      queryParams['query'] = this.query.trim();
    }
    for (const [key, value] of Object.entries(this.filters)) {
      if (value !== null && value !== undefined && value !== '') {
        queryParams[key] = `${value}`;
      }
    }
    if (this.sort) {
      queryParams['sort'] = `${this.sort.field},${this.sort.direction}`;
    }
    if (this.page > 0) {
      queryParams['page'] = this.page;
    }
    this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
  }
}
