import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';

import { errorMessage } from '../../core/api';
import { CreditsPipe, HaitiDatePipe, HtgPipe } from '../../core/format';
import { quizStatus } from '../../core/labels';
import { Quiz, QuizStatus } from '../../core/models';
import { QuizApi } from '../../core/quiz-api.service';

const TABS: { status: QuizStatus; label: string }[] = [
  { status: 'DRAFT', label: 'Brouillons' },
  { status: 'REGISTRATION', label: 'Inscriptions' },
  { status: 'SCHEDULED', label: 'Programmes' },
  { status: 'RUNNING', label: 'En cours' },
  { status: 'CLOSING', label: 'En cloture' },
  { status: 'COMPUTING', label: 'Calcul' },
  { status: 'FINISHED', label: 'Termines' },
  { status: 'CANCELLED', label: 'Annules' },
];
const PAGE_SIZE = 20;

@Component({
  selector: 'admin-quizzes',
  imports: [RouterLink, ButtonModule, MessageModule, TableModule, TabsModule, TagModule, CreditsPipe, HtgPipe, HaitiDatePipe],
  templateUrl: './quizzes.html',
})
export default class Quizzes {
  private readonly api = inject(QuizApi);
  private readonly router = inject(Router);

  protected readonly tabs = TABS;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly quizStatus = quizStatus;

  protected readonly status = signal<QuizStatus>(this.initialStatus());
  protected readonly rows = signal<Quiz[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  private page = 0;

  constructor() {
    this.load();
  }

  protected selectTab(value: string | number | undefined): void {
    const status = value as QuizStatus;
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

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(this.status(), this.page, PAGE_SIZE).subscribe({
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

  private initialStatus(): QuizStatus {
    const requested = inject(ActivatedRoute).snapshot.queryParamMap.get('statut') as QuizStatus | null;
    return requested && TABS.some((tab) => tab.status === requested) ? requested : 'DRAFT';
  }
}
