import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';

import { errorMessage } from '../../core/api';
import { CreditsPipe, HaitiDatePipe, HtgPipe } from '../../core/format';
import { quizStatus } from '../../core/labels';
import {
  Category,
  GameMode,
  Quiz,
  QuizStatus,
  SoloQuizStatsRow,
  SoloQuizStatsSummary,
  SoloStatsFilters,
} from '../../core/models';
import { QuestionApi } from '../../core/question-api.service';
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
const SEARCH_DELAY_MS = 300;

const DEFAULT_SOLO_FILTERS: SoloStatsFilters = {
  period: 'ALL_TIME',
  q: '',
  categoryId: null,
  perfect: 'ALL',
  result: 'ALL',
  sort: 'RECENT',
};

@Component({
  selector: 'admin-quizzes',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    SelectModule,
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
  private readonly questionApi = inject(QuestionApi);
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
  protected page = 0;

  // --- Solo : activite, filtres et tri ---------------------------------------------
  protected readonly periodOptions = [
    { label: '7 derniers jours', value: 'LAST_7_DAYS' },
    { label: '30 derniers jours', value: 'LAST_30_DAYS' },
    { label: 'Depuis le lancement', value: 'ALL_TIME' },
  ];
  protected readonly perfectOptions = [
    { label: 'Tous', value: 'ALL' },
    { label: 'Avec au moins un sans-faute', value: 'WITH' },
    { label: 'Joues, sans aucun sans-faute', value: 'WITHOUT' },
    { label: 'Jamais joues', value: 'NEVER_PLAYED' },
  ];
  protected readonly resultOptions = [
    { label: 'Tous', value: 'ALL' },
    { label: 'Beneficiaires', value: 'PROFIT' },
    { label: 'Deficitaires', value: 'LOSS' },
  ];
  protected readonly sortOptions = [
    { label: 'Plus recents', value: 'RECENT' },
    { label: 'Plus joues', value: 'MOST_PLAYED' },
    { label: 'Plus de sans-fautes', value: 'MOST_PERFECT' },
    { label: 'Meilleur resultat', value: 'BEST_RESULT' },
    { label: 'Pire resultat', value: 'WORST_RESULT' },
    { label: 'Derniere partie', value: 'LAST_PLAYED' },
  ];
  protected readonly categories = signal<Category[]>([]);
  protected filters: SoloStatsFilters = { ...DEFAULT_SOLO_FILTERS };
  protected readonly soloRows = signal<SoloQuizStatsRow[]>([]);
  protected readonly summary = signal<SoloQuizStatsSummary | null>(null);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.load();
    this.questionApi.categories().subscribe({
      next: (categories) => this.categories.set([...categories].sort((a, b) => a.name.localeCompare(b.name, 'fr'))),
    });
  }

  protected get filtersActive(): boolean {
    const f = this.filters;
    const d = DEFAULT_SOLO_FILTERS;
    return f.period !== d.period || f.q.trim() !== '' || f.categoryId != null || f.perfect !== d.perfect
      || f.result !== d.result || f.sort !== d.sort;
  }

  protected applyFilters(): void {
    this.page = 0;
    this.load();
  }

  protected onSearch(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.applyFilters(), SEARCH_DELAY_MS);
  }

  protected resetFilters(): void {
    this.filters = { ...DEFAULT_SOLO_FILTERS };
    this.applyFilters();
  }

  /** Taux de sans-faute de la selection, en pourcentage. */
  protected summaryRate(s: SoloQuizStatsSummary): number {
    return s.games === 0 ? 0 : Math.round((s.perfectGames * 1000) / s.games) / 10;
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
    if (this.mode() === 'SOLO') {
      this.api.soloStats(this.status(), this.filters, this.page, PAGE_SIZE).subscribe({
        next: (stats) => {
          this.soloRows.set(stats.page.content);
          this.summary.set(stats.summary);
          this.total.set(stats.page.totalElements);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
      return;
    }
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
