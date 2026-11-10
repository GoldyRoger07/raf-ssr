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
  GroupQuizFilters,
  GroupQuizSort,
  GroupQuizSortField,
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
const PAGE_SIZES = [10, 20, 50, 100];
const SEARCH_DELAY_MS = 300;

const DEFAULT_GROUP_FILTERS: GroupQuizFilters = { q: '', categoryId: null, free: null, test: null };
const GROUP_SORT_FIELDS: GroupQuizSortField[] = ['title', 'category', 'ticketPrice', 'players', 'deadline', 'createdAt'];

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

  protected pageSize = PAGE_SIZE;
  protected readonly pageSizes = PAGE_SIZES;
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

  // --- En groupe : recherche, filtres et tri par colonne ----------------------------
  protected groupFilters: GroupQuizFilters = { ...DEFAULT_GROUP_FILTERS };
  protected groupSort: GroupQuizSort | null = null;
  protected readonly priceOptions = [
    { label: 'Gratuits', value: true },
    { label: 'Payants', value: false },
  ];
  protected readonly testOptions = [
    { label: 'Hors quiz de test', value: false },
    { label: 'Quiz de test seulement', value: true },
  ];

  protected filters: SoloStatsFilters = { ...DEFAULT_SOLO_FILTERS };
  protected readonly soloRows = signal<SoloQuizStatsRow[]>([]);
  protected readonly summary = signal<SoloQuizStatsSummary | null>(null);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.readGroupUrl();
    this.load();
    this.questionApi.categories().subscribe({
      next: (categories) => this.categories.set([...categories].sort((a, b) => a.name.localeCompare(b.name, 'fr'))),
    });
  }

  /** Criteres actifs de la vue En groupe (recherche et tri compris). */
  protected get groupFiltersActive(): boolean {
    const f = this.groupFilters;
    return f.q.trim() !== '' || f.categoryId != null || f.free != null || f.test != null || this.groupSort != null;
  }

  protected get filtersActive(): boolean {
    const f = this.filters;
    const d = DEFAULT_SOLO_FILTERS;
    return f.period !== d.period || f.q.trim() !== '' || f.categoryId != null || f.perfect !== d.perfect
      || f.result !== d.result || f.sort !== d.sort;
  }

  protected applyFilters(): void {
    this.page = 0;
    this.syncUrl();
    this.load();
  }

  protected onSearch(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.applyFilters(), SEARCH_DELAY_MS);
  }

  protected resetFilters(): void {
    if (this.mode() === 'SOLO') {
      this.filters = { ...DEFAULT_SOLO_FILTERS };
    } else {
      this.groupFilters = { ...DEFAULT_GROUP_FILTERS };
      this.groupSort = null;
    }
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
    const rows = event.rows ?? this.pageSize;
    const page = Math.floor((event.first ?? 0) / rows);
    // Tri par colonne en groupe seulement ; en solo, il passe par « Trier par ».
    let sort = this.groupSort;
    if (this.mode() === 'GROUP') {
      const field = typeof event.sortField === 'string' ? event.sortField : null;
      sort = field && GROUP_SORT_FIELDS.includes(field as GroupQuizSortField)
        ? { field: field as GroupQuizSortField, direction: event.sortOrder === -1 ? 'desc' : 'asc' }
        : null;
    }
    const sortChanged = sort?.field !== this.groupSort?.field || sort?.direction !== this.groupSort?.direction;
    if (page !== this.page || rows !== this.pageSize || sortChanged) {
      this.page = sortChanged || rows !== this.pageSize ? 0 : page;
      this.pageSize = rows;
      this.groupSort = sort;
      this.syncUrl();
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    if (this.mode() === 'SOLO') {
      this.api.soloStats(this.status(), this.filters, this.page, this.pageSize).subscribe({
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
    this.api.list(this.status(), this.mode(), this.page, this.pageSize, this.groupFilters, this.groupSort ?? undefined).subscribe({
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

  /** Mode et statut ; pour la vue En groupe, aussi recherche, filtres et tri. */
  private syncUrl(): void {
    const group = this.mode() === 'GROUP';
    const f = this.groupFilters;
    this.router.navigate([], {
      queryParams: {
        mode: group ? null : 'solo',
        statut: this.status(),
        q: group && f.q.trim() ? f.q.trim() : null,
        sujet: group ? f.categoryId : null,
        gratuit: group && f.free != null ? f.free : null,
        test: group && f.test != null ? f.test : null,
        tri: group && this.groupSort ? `${this.groupSort.field},${this.groupSort.direction}` : null,
        page: this.page > 0 ? this.page : null,
        taille: this.pageSize !== PAGE_SIZE ? this.pageSize : null,
      },
      replaceUrl: true,
    });
  }

  private readGroupUrl(): void {
    const bool = (value: string | null) => (value === 'true' ? true : value === 'false' ? false : null);
    this.groupFilters = {
      q: this.query.get('q') ?? '',
      categoryId: Number(this.query.get('sujet')) || null,
      free: bool(this.query.get('gratuit')),
      test: bool(this.query.get('test')),
    };
    const [field, direction] = (this.query.get('tri') ?? '').split(',');
    this.groupSort = GROUP_SORT_FIELDS.includes(field as GroupQuizSortField)
      ? { field: field as GroupQuizSortField, direction: direction === 'desc' ? 'desc' : 'asc' }
      : null;
    const size = Number(this.query.get('taille'));
    this.pageSize = PAGE_SIZES.includes(size) ? size : PAGE_SIZE;
    this.page = Math.max(0, Number(this.query.get('page')) || 0);
  }

  private initialStatus(): QuizStatus {
    const requested = this.query.get('statut') as QuizStatus | null;
    return requested && this.tabs().some((tab) => tab.status === requested) ? requested : 'DRAFT';
  }
}
