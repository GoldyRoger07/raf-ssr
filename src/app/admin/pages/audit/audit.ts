import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime } from 'rxjs';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { HaitiDatePipe } from '../../core/format';
import { AuditEntry } from '../../core/models';

const PAGE_SIZE = 50;
const PAGE_SIZES = [20, 50, 100];
const SORT_FIELDS = ['createdAt', 'action', 'entityType'] as const;
type AuditSortField = (typeof SORT_FIELDS)[number];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Journal d'audit, en lecture seule : recherche libre, filtres par action, objet, auteur
 * et periode, tri par colonne. Tout l'etat vit dans l'URL :
 * ?entityType=User&entityId=12 donne l'historique d'un compte.
 */
@Component({
  selector: 'admin-audit',
  imports: [
    FormsModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    HaitiDatePipe,
  ],
  templateUrl: './audit.html',
})
export default class Audit {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected pageSize = PAGE_SIZE;
  protected readonly pageSizes = PAGE_SIZES;
  protected q = '';
  protected action: string | null = null;
  protected entityType: string | null = null;
  protected entityId = '';
  protected actorId: number | null = null;
  protected from: string | null = null;
  protected to: string | null = null;
  protected sort: { field: AuditSortField; direction: 'asc' | 'desc' } | null = null;

  protected readonly actions = signal<string[]>([]);
  protected readonly entityTypes = signal<string[]>([]);
  protected readonly rows = signal<AuditEntry[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly expanded = signal<number | null>(null);
  protected page = 0;
  private readonly typed = new Subject<void>();

  constructor() {
    this.readUrl(this.route.snapshot.queryParams);
    this.api.auditFilters().subscribe((filters) => {
      this.actions.set(filters.actions);
      this.entityTypes.set(filters.entityTypes);
    });
    this.typed.pipe(debounceTime(300), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.apply());
    this.load();
  }

  protected get activeCount(): number {
    return [this.q.trim(), this.action, this.entityType, this.entityId.trim(), this.actorId, this.from, this.to].filter(
      (v) => v !== null && v !== '',
    ).length;
  }

  protected onInput(): void {
    this.typed.next();
  }

  protected apply(): void {
    this.page = 0;
    this.writeUrl();
    this.load();
  }

  protected reset(): void {
    this.q = '';
    this.action = null;
    this.entityType = null;
    this.entityId = '';
    this.actorId = null;
    this.from = null;
    this.to = null;
    this.sort = null;
    this.apply();
  }

  /** Filtre sur l'auteur d'une ligne : « tout ce qu'a fait cette personne ». */
  protected byActor(entry: AuditEntry): void {
    this.actorId = entry.actorUserId ?? null;
    this.apply();
  }

  protected toggle(entry: AuditEntry): void {
    this.expanded.update((id) => (id === entry.id ? null : entry.id));
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize;
    const page = Math.floor((event.first ?? 0) / rows);
    const field = typeof event.sortField === 'string' ? event.sortField : null;
    const sort =
      field && (SORT_FIELDS as readonly string[]).includes(field)
        ? { field: field as AuditSortField, direction: event.sortOrder === -1 ? ('desc' as const) : ('asc' as const) }
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

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .audit(
        {
          q: this.q,
          action: this.action,
          entityType: this.entityType,
          entityId: this.entityId,
          actorId: this.actorId,
          from: this.from,
          to: this.to,
          sort: this.sort ? `${this.sort.field},${this.sort.direction}` : null,
        },
        this.page,
        this.pageSize,
      )
      .subscribe({
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

  /** Restaure la vue depuis l'URL ; les liens existants (?entityType=&entityId=) restent valables. */
  private readUrl(params: Params): void {
    this.q = params['q'] ?? '';
    this.action = params['action'] ?? null;
    this.entityType = params['entityType'] ?? null;
    this.entityId = params['entityId'] ?? '';
    this.actorId = Number(params['actorId']) || null;
    this.from = DATE.test(params['from'] ?? '') ? params['from'] : null;
    this.to = DATE.test(params['to'] ?? '') ? params['to'] : null;
    const [field, direction] = `${params['sort'] ?? ''}`.split(',');
    this.sort = (SORT_FIELDS as readonly string[]).includes(field)
      ? { field: field as AuditSortField, direction: direction === 'asc' ? 'asc' : 'desc' }
      : null;
    const size = Number(params['size']);
    this.pageSize = PAGE_SIZES.includes(size) ? size : PAGE_SIZE;
    this.page = Math.max(0, Number(params['page']) || 0);
  }

  private writeUrl(): void {
    const queryParams: Params = {};
    const set = (key: string, value: unknown) => {
      if (value !== null && value !== undefined && `${value}`.trim() !== '') {
        queryParams[key] = `${value}`.trim();
      }
    };
    set('q', this.q);
    set('action', this.action);
    set('entityType', this.entityType);
    set('entityId', this.entityId);
    set('actorId', this.actorId);
    set('from', this.from);
    set('to', this.to);
    set('sort', this.sort ? `${this.sort.field},${this.sort.direction}` : null);
    set('page', this.page > 0 ? this.page : null);
    set('size', this.pageSize !== PAGE_SIZE ? this.pageSize : null);
    this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
  }
}
