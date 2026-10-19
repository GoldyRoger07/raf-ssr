import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Observable } from 'rxjs';

import { AdminApi } from '../../core/admin-api.service';
import { Page, errorMessage } from '../../core/api';
import { HaitiDatePipe } from '../../core/format';
import { AdminGameSession, GameReview } from '../../core/models';
import { Severity } from '../../core/labels';

const PAGE_SIZE = 50;

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
    MessageModule,
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

  protected readonly pageSize = PAGE_SIZE;
  protected readonly quizId = Number(inject(ActivatedRoute).snapshot.queryParamMap.get('quiz')) || null;
  protected flaggedOnly = this.quizId === null;

  protected readonly rows = signal<AdminGameSession[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  private page = 0;

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

  constructor() {
    this.load();
  }

  protected status(status: string): { label: string; severity: Severity } {
    return SESSION_STATUS[status] ?? { label: status, severity: 'secondary' };
  }

  protected toggleFlagged(): void {
    this.page = 0;
    this.load();
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const page = Math.floor((event.first ?? 0) / PAGE_SIZE);
    if (page !== this.page) {
      this.page = page;
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
        ? this.api.quizSessions(this.quizId, this.flaggedOnly, this.page, PAGE_SIZE)
        : this.api.flaggedSessions(this.page, PAGE_SIZE);
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
