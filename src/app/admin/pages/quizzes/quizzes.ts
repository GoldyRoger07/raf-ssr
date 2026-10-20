import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';

import { errorMessage } from '../../core/api';
import { CreditsPipe, HaitiDatePipe, HtgPipe } from '../../core/format';
import { quizStatus } from '../../core/labels';
import { GameMode, Quiz, QuizStatus } from '../../core/models';
import { QuizApi } from '../../core/quiz-api.service';

const GROUP_TABS: { status: QuizStatus; label: string }[] = [
  { status: 'DRAFT', label: 'Brouillons' },
  { status: 'REGISTRATION', label: 'Inscriptions' },
  { status: 'SCHEDULED', label: 'Programmes' },
  { status: 'RUNNING', label: 'En cours' },
  { status: 'CLOSING', label: 'En cloture' },
  { status: 'COMPUTING', label: 'Calcul' },
  { status: 'FINISHED', label: 'Termines' },
  { status: 'CANCELLED', label: 'Annules' },
];

/** Un quiz solo passe directement du brouillon a l'ouverture, puis a la fermeture. */
const SOLO_TABS: { status: QuizStatus; label: string }[] = [
  { status: 'DRAFT', label: 'Brouillons' },
  { status: 'RUNNING', label: 'Ouverts' },
  { status: 'FINISHED', label: 'Fermes' },
  { status: 'CANCELLED', label: 'Annules' },
];

const PAGE_SIZE = 20;

@Component({
  selector: 'admin-quizzes',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    MessageModule,
    SelectButtonModule,
    TableModule,
    TabsModule,
    TagModule,
    CreditsPipe,
    HtgPipe,
    HaitiDatePipe,
  ],
  templateUrl: './quizzes.html',
})
export default class Quizzes {
  private readonly api = inject(QuizApi);
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly pageSize = PAGE_SIZE;
  protected readonly quizStatus = quizStatus;
  protected readonly modeOptions = [
    { label: 'En groupe', value: 'GROUP' },
    { label: 'Solo', value: 'SOLO' },
  ];

  protected readonly mode = signal<GameMode>(this.query.get('mode') === 'solo' ? 'SOLO' : 'GROUP');
  protected readonly tabs = computed(() => (this.mode() === 'SOLO' ? SOLO_TABS : GROUP_TABS));
  protected readonly status = signal<QuizStatus>(this.initialStatus());
  protected readonly rows = signal<Quiz[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  private page = 0;

  constructor() {
    this.load();
  }

  protected selectMode(mode: GameMode): void {
    if (!mode || mode === this.mode()) {
      return;
    }
    this.mode.set(mode);
    // Le statut courant n'existe pas forcement dans l'autre mode.
    if (!this.tabs().some((tab) => tab.status === this.status())) {
      this.status.set('DRAFT');
    }
    this.page = 0;
    this.syncUrl();
    this.load();
  }

  protected selectTab(value: string | number | undefined): void {
    const status = value as QuizStatus;
    if (status === this.status()) {
      return;
    }
    this.status.set(status);
    this.page = 0;
    this.syncUrl();
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
    this.api.list(this.status(), this.mode(), this.page, PAGE_SIZE).subscribe({
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

  private syncUrl(): void {
    this.router.navigate([], {
      queryParams: { mode: this.mode() === 'SOLO' ? 'solo' : null, statut: this.status() },
      replaceUrl: true,
    });
  }

  private initialStatus(): QuizStatus {
    const requested = this.query.get('statut') as QuizStatus | null;
    return requested && this.tabs().some((tab) => tab.status === requested) ? requested : 'DRAFT';
  }
}
