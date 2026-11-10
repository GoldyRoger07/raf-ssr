import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Observable, Subject, debounceTime } from 'rxjs';

import { errorMessage } from '../../core/api';
import { difficultyLabel, questionStatus } from '../../core/labels';
import {
  Category,
  Difficulty,
  Question,
  QuestionFilters,
  QuestionSort,
  QuestionSortField,
  QuestionSource,
  QuestionStatus,
  QuestionType,
  QuestionUsage,
} from '../../core/models';
import { QuestionApi } from '../../core/question-api.service';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZES = [10, 20, 50, 100];

const SORT_FIELDS: QuestionSortField[] = ['text', 'category', 'difficulty', 'successRate', 'status', 'createdAt'];
const STATUSES: QuestionStatus[] = ['PUBLISHED', 'DRAFT', 'ARCHIVED'];
const SOURCES: QuestionSource[] = ['AI', 'IMPORT', 'MANUAL'];
const DIFFICULTIES: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
const TYPES: QuestionType[] = ['SINGLE_CHOICE', 'TRUE_FALSE'];
const USAGES: QuestionUsage[] = ['NEVER_SERVED', 'SERVED', 'SUSPICIOUS'];

/** Onglet « Toutes » : aucun filtre de statut. */
type StatusTab = QuestionStatus | 'ALL';

interface Option<T> {
  label: string;
  value: T;
}

/**
 * Banque de questions : recherche, onglets de statut, filtres cumulables et tri par
 * colonne, cote serveur. Tout l'etat vit dans l'URL ; les liens existants (« categorie »,
 * « statut », « origine ») restent valables.
 */
@Component({
  selector: 'admin-questions',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TabsModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './questions.html',
})
export default class Questions {
  private readonly api = inject(QuestionApi);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly pageSizes = PAGE_SIZES;
  protected readonly questionStatus = questionStatus;
  protected readonly difficultyLabel = difficultyLabel;
  protected readonly tabs: Option<StatusTab>[] = [
    { value: 'PUBLISHED', label: 'Publiees' },
    { value: 'DRAFT', label: 'Brouillons' },
    { value: 'ARCHIVED', label: 'Archivees' },
    { value: 'ALL', label: 'Toutes' },
  ];
  protected readonly sources: Option<QuestionSource>[] = [
    { value: 'AI', label: 'Generees par IA' },
    { value: 'IMPORT', label: 'Import CSV' },
    { value: 'MANUAL', label: 'Saisies' },
  ];
  protected readonly difficulties: Option<Difficulty>[] = DIFFICULTIES.map((d) => ({ value: d, label: difficultyLabel(d) }));
  protected readonly types: Option<QuestionType>[] = [
    { value: 'SINGLE_CHOICE', label: 'Choix multiple' },
    { value: 'TRUE_FALSE', label: 'Vrai / faux' },
  ];
  protected readonly usages: Option<QuestionUsage>[] = [
    { value: 'NEVER_SERVED', label: 'Jamais servie' },
    { value: 'SERVED', label: 'Deja servie' },
    { value: 'SUSPICIOUS', label: 'Reussite suspecte' },
  ];

  protected readonly status = signal<StatusTab>('PUBLISHED');
  protected query = '';
  protected categoryId: number | null = null;
  protected source: QuestionSource | null = null;
  protected difficulty: Difficulty | null = null;
  protected type: QuestionType | null = null;
  protected usage: QuestionUsage | null = null;
  protected sort: QuestionSort | null = null;
  protected page = 0;
  protected pageSize = DEFAULT_PAGE_SIZE;

  protected readonly categories = signal<Category[]>([]);
  protected readonly rows = signal<Question[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly typed = new Subject<void>();

  constructor() {
    this.readUrl(this.route.snapshot.queryParams);
    this.api.categories().subscribe((categories) =>
      this.categories.set([...categories].sort((a, b) => a.name.localeCompare(b.name, 'fr'))),
    );
    this.typed.pipe(debounceTime(300), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.apply());
    this.load();
  }

  /** Criteres actifs hors onglet de statut, recherche comprise. */
  protected get activeCount(): number {
    return (
      [this.categoryId, this.source, this.difficulty, this.type, this.usage].filter((v) => v !== null).length +
      (this.query.trim() ? 1 : 0)
    );
  }

  protected selectTab(value: string | number | undefined): void {
    this.status.set(value as StatusTab);
    this.apply();
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

  /** Efface recherche, filtres et tri ; l'onglet de statut est conserve. */
  protected reset(): void {
    this.query = '';
    this.categoryId = null;
    this.source = null;
    this.difficulty = null;
    this.type = null;
    this.usage = null;
    this.sort = null;
    this.apply();
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize;
    const page = Math.floor((event.first ?? 0) / rows);
    const field = typeof event.sortField === 'string' ? event.sortField : null;
    const sort: QuestionSort | null =
      field && SORT_FIELDS.includes(field as QuestionSortField)
        ? { field: field as QuestionSortField, direction: event.sortOrder === -1 ? 'desc' : 'asc' }
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

  protected setStatus(question: Question, status: QuestionStatus): void {
    this.act(
      this.api.changeStatus(question.id, status),
      status === 'PUBLISHED' ? 'Question publiee' : status === 'ARCHIVED' ? 'Question archivee' : 'Question remise en brouillon',
    );
  }

  protected remove(question: Question): void {
    this.confirmation.confirm({
      header: 'Supprimer la question',
      message: 'Supprimer definitivement cette question ? Une question deja servie doit etre archivee a la place.',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.act(this.api.delete(question.id), 'Question supprimee'),
    });
  }

  private act(action: Observable<unknown>, success: string): void {
    action.subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: success });
        this.load();
      },
      error: (error) => this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) }),
    });
  }

  private filters(): QuestionFilters {
    const status = this.status();
    return {
      query: this.query,
      status: status === 'ALL' ? null : status,
      categoryId: this.categoryId,
      source: this.source,
      difficulty: this.difficulty,
      type: this.type,
      usage: this.usage,
    };
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(this.filters(), this.page, this.pageSize, this.sort ?? undefined).subscribe({
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
    const pick = <T>(value: unknown, allowed: T[]): T | null => (allowed.includes(value as T) ? (value as T) : null);
    const status = params['statut'];
    this.status.set(status === 'ALL' ? 'ALL' : (pick(status, STATUSES) ?? 'PUBLISHED'));
    this.query = params['q'] ?? '';
    this.categoryId = Number(params['categorie']) || null;
    this.source = pick(params['origine'], SOURCES);
    this.difficulty = pick(params['difficulte'], DIFFICULTIES);
    this.type = pick(params['type'], TYPES);
    this.usage = pick(params['usage'], USAGES);
    const [field, direction] = `${params['tri'] ?? ''}`.split(',');
    this.sort = SORT_FIELDS.includes(field as QuestionSortField)
      ? { field: field as QuestionSortField, direction: direction === 'desc' ? 'desc' : 'asc' }
      : null;
    this.pageSize = pick(Number(params['taille']), PAGE_SIZES) ?? DEFAULT_PAGE_SIZE;
    this.page = Math.max(0, Number(params['page']) || 0);
  }

  private writeUrl(): void {
    const queryParams: Params = {};
    const set = (key: string, value: unknown) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams[key] = `${value}`;
      }
    };
    set('q', this.query.trim());
    set('statut', this.status() === 'PUBLISHED' ? null : this.status());
    set('categorie', this.categoryId);
    set('origine', this.source);
    set('difficulte', this.difficulty);
    set('type', this.type);
    set('usage', this.usage);
    set('tri', this.sort ? `${this.sort.field},${this.sort.direction}` : null);
    set('page', this.page > 0 ? this.page : null);
    set('taille', this.pageSize !== DEFAULT_PAGE_SIZE ? this.pageSize : null);
    this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
  }
}
