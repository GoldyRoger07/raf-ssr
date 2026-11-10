import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Subject, debounceTime } from 'rxjs';

import { PlayerSearch } from '../../components/player-search/player-search';
import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { HtgPipe } from '../../core/format';
import { LeaderSummary, PlayerSummary, UserStatus } from '../../core/models';

const PAGE_SIZE = 20;
const PAGE_SIZES = [10, 20, 50, 100];
const SORT_FIELDS = ['name', 'commission', 'players', 'last30Days', 'total'];

/**
 * Leaders : joueurs qui touchent une commission sur les parties perdues des joueurs
 * qu'on leur rattache. Reserve au super-administrateur.
 */
@Component({
  selector: 'admin-leaders',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TagModule,
    HtgPipe,
    PlayerSearch,
  ],
  templateUrl: './leaders.html',
})
export default class Leaders {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  protected pageSize = PAGE_SIZE;
  protected query = '';
  protected page = 0;
  protected readonly rows = signal<LeaderSummary[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly typed = new Subject<void>();

  // Nommer un leader
  protected readonly promoteOpen = signal(false);
  protected readonly candidate = signal<PlayerSummary | null>(null);
  protected percent: number | null = null;
  protected readonly busy = signal(false);
  protected readonly promoteError = signal<string | null>(null);

  constructor() {
    this.typed.pipe(debounceTime(300), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      this.page = 0;
      this.load();
    });
    this.load();
  }

  protected onInput(): void {
    this.typed.next();
  }

  protected status: UserStatus | null = null;
  protected sort: { field: string; direction: 'asc' | 'desc' } | null = null;
  protected readonly pageSizes = PAGE_SIZES;
  protected readonly statusOptions: { label: string; value: UserStatus }[] = [
    { label: 'Actif', value: 'ACTIVE' },
    { label: 'Suspendu', value: 'SUSPENDED' },
    { label: 'Banni', value: 'BANNED' },
  ];

  protected get activeCount(): number {
    return (this.query.trim() ? 1 : 0) + (this.status ? 1 : 0);
  }

  protected apply(): void {
    this.page = 0;
    this.load();
  }

  protected reset(): void {
    this.query = '';
    this.status = null;
    this.sort = null;
    this.apply();
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize;
    const page = Math.floor((event.first ?? 0) / rows);
    const field = typeof event.sortField === 'string' && SORT_FIELDS.includes(event.sortField) ? event.sortField : null;
    const sort = field ? { field, direction: event.sortOrder === -1 ? ('desc' as const) : ('asc' as const) } : null;
    const sortChanged = sort?.field !== this.sort?.field || sort?.direction !== this.sort?.direction;
    if (page !== this.page || rows !== this.pageSize || sortChanged) {
      this.page = sortChanged || rows !== this.pageSize ? 0 : page;
      this.pageSize = rows;
      this.sort = sort;
      this.load();
    }
  }

  protected openPromote(): void {
    this.candidate.set(null);
    this.percent = null;
    this.promoteError.set(null);
    this.promoteOpen.set(true);
  }

  protected promote(): void {
    const player = this.candidate();
    if (!player || this.percent === null) {
      this.promoteError.set('Choisissez un joueur et sa commission.');
      return;
    }
    this.busy.set(true);
    this.promoteError.set(null);
    this.api.promoteLeader(player.id, this.percent).subscribe({
      next: (leader) => {
        this.busy.set(false);
        this.promoteOpen.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Leader nomme',
          detail: `${leader.firstName} ${leader.lastName} : ajoutez-lui maintenant ses joueurs.`,
        });
        this.router.navigate(['/admin/leaders', leader.id]);
      },
      error: (error) => {
        this.busy.set(false);
        this.promoteError.set(errorMessage(error));
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.leaders(this.query.trim(), this.page, this.pageSize, this.status, this.sort ?? undefined).subscribe({
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
}
