import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Observable, Subject, debounceTime } from 'rxjs';

import { AdminApi } from '../../core/admin-api.service';
import { Page, errorMessage } from '../../core/api';
import { HaitiDatePipe } from '../../core/format';
import { AdminGameSession, GameReview } from '../../core/models';
import { Severity } from '../../core/labels';

const PAGE_SIZE = 50;
const PAGE_SIZES = [20, 50, 100];
const SORT_FIELDS = ['startedAt', 'player', 'quiz', 'score', 'status'];

const SESSION_STATUS: Record<string, { label: string; severity: Severity }> = {
  IN_PROGRESS: { label: 'En cours', severity: 'info' },
  SUBMITTED: { label: 'Validee', severity: 'success' },
  EXPIRED: { label: 'Expiree', severity: 'secondary' },
  INVALIDATED: { label: 'Invalidee', severity: 'danger' },
};

/**
 * Parties a revoir : par defaut les signalements encore actionnables (avant le
 * versement des gains), tous quiz confondus ; avec ?quiz=, toutes les parties d'un quiz.
 */
@Component({
  selector: 'admin-game-sessions',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
    ToggleSwitchModule,
    HaitiDatePipe,
  ],
  templateUrl: './game-sessions.html',
})
export default class GameSessions {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);

  protected pageSize = PAGE_SIZE;
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  protected readonly quizId = Number(this.query.get('quiz')) || null;
  /** Arrivee depuis la fiche d'un joueur (un mouvement solo) : retour vers lui. */
  protected readonly fromPlayerId = Number(this.query.get('joueur')) || null;
  protected flaggedOnly = this.quizId === null;

  protected readonly rows = signal<AdminGameSession[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected page = 0;

  // Revue
  protected readonly reviewOpen = signal(false);
  protected readonly reviewed = signal<AdminGameSession | null>(null);
  protected readonly review = signal<GameReview | null>(null);

  /** Ecart entre deux reponses : c'est lui qui trahit un robot, pas le temps total. */
  protected readonly gaps = computed(() => {
    const items = this.review()?.items ?? [];
    let previous = 0;
    return items.map((item) => {
      if (item.elapsedMs == null) {
        return null;
      }
      const gap = item.elapsedMs - previous;
      previous = item.elapsedMs;
      return gap;
    });
  });

  // Invalidation
  protected readonly invalidateOpen = signal(false);
  protected reason = '';
  protected readonly busy = signal(false);

  protected q = '';
  protected statusFilter: string | null = null;
  protected sort: { field: string; direction: 'asc' | 'desc' } | null = null;
  protected readonly pageSizes = PAGE_SIZES;
  protected readonly statusOptions = Object.entries(SESSION_STATUS).map(([value, s]) => ({ value, label: s.label }));
  private readonly typed = new Subject<void>();

  constructor() {
    this.typed.pipe(debounceTime(300), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.toggleFlagged());
    this.load();
    this.openFromLink();
  }

  /** ?partie= ou ?mouvement= : ouvre directement le corrige de la partie. */
  private openFromLink(): void {
    const sessionId = Number(this.query.get('partie')) || null;
    const transactionId = Number(this.query.get('mouvement')) || null;
    const request = sessionId
      ? this.api.session(sessionId)
      : transactionId
        ? this.api.sessionOfTransaction(transactionId)
        : null;
    request?.subscribe({
      next: (session) => this.openReview(session),
      error: (error) => this.messages.add({ severity: 'error', summary: 'Partie introuvable', detail: errorMessage(error) }),
    });
  }

  protected get activeCount(): number {
    return (this.q.trim() ? 1 : 0) + (this.statusFilter ? 1 : 0);
  }

  protected onInput(): void {
    this.typed.next();
  }

  protected reset(): void {
    this.q = '';
    this.statusFilter = null;
    this.sort = null;
    this.toggleFlagged();
  }

  protected status(status: string): { label: string; severity: Severity } {
    return SESSION_STATUS[status] ?? { label: status, severity: 'secondary' };
  }

  protected toggleFlagged(): void {
    this.page = 0;
    this.load();
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

  protected openReview(session: AdminGameSession): void {
    this.reviewed.set(session);
    this.review.set(null);
    this.reviewOpen.set(true);
    this.api.sessionReview(session.id).subscribe({
      next: (review) => this.review.set(review),
      error: (error) => this.messages.add({ severity: 'error', summary: 'Corrige indisponible', detail: errorMessage(error) }),
    });
  }

  protected openInvalidate(session: AdminGameSession): void {
    this.reviewed.set(session);
    this.reason = '';
    this.invalidateOpen.set(true);
  }

  protected invalidate(): void {
    const session = this.reviewed();
    if (!session || !this.reason.trim()) {
      return;
    }
    this.busy.set(true);
    this.api.invalidateSession(session.id, this.reason.trim()).subscribe({
      next: () => {
        this.busy.set(false);
        this.invalidateOpen.set(false);
        this.reviewOpen.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Partie invalidee',
          detail: `${session.playerName} ne sera pas classe avec cette partie.`,
        });
        this.load();
      },
      error: (error) => {
        this.busy.set(false);
        this.messages.add({ severity: 'error', summary: 'Invalidation impossible', detail: errorMessage(error) });
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    const request: Observable<Page<AdminGameSession>> =
      this.quizId !== null
        ? this.api.quizSessions(this.quizId, this.flaggedOnly, this.page, this.pageSize, this.q, this.statusFilter, this.sort ?? undefined)
        : this.api.flaggedSessions(this.page, this.pageSize, this.q, this.sort ?? undefined);
    request.subscribe({
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
