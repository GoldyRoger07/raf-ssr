import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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

import { Page, errorMessage } from '../../core/api';
import { difficultyLabel, questionStatus } from '../../core/labels';
import { Category, Question, QuestionSource, QuestionStatus } from '../../core/models';
import { QuestionApi } from '../../core/question-api.service';

const PAGE_SIZE = 20;

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

  protected readonly pageSize = PAGE_SIZE;
  protected readonly questionStatus = questionStatus;
  protected readonly difficultyLabel = difficultyLabel;
  protected readonly statuses: { value: QuestionStatus; label: string }[] = [
    { value: 'PUBLISHED', label: 'Publiees' },
    { value: 'DRAFT', label: 'Brouillons' },
    { value: 'ARCHIVED', label: 'Archivees' },
  ];

  protected readonly sources: { value: QuestionSource; label: string }[] = [
    { value: 'AI', label: 'Generees par IA' },
    { value: 'IMPORT', label: 'Import CSV' },
    { value: 'MANUAL', label: 'Saisies' },
  ];

  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  protected readonly status = signal<QuestionStatus>((this.query.get('statut') as QuestionStatus) || 'PUBLISHED');
  protected categoryId: number | null = Number(this.query.get('categorie')) || null;
  protected source: QuestionSource | null = (this.query.get('origine') as QuestionSource) || null;
  protected search = '';
  protected readonly categories = signal<Category[]>([]);
  protected readonly rows = signal<Question[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  private page = 0;
  private readonly typed = new Subject<void>();

  constructor() {
    this.api.categories().subscribe((categories) => this.categories.set(categories));
    this.typed.pipe(debounceTime(300), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.reload());
    this.load();
  }

  protected selectTab(value: string | number | undefined): void {
    this.status.set(value as QuestionStatus);
    this.reload();
  }

  protected onSearch(): void {
    this.typed.next();
  }

  protected reload(): void {
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

  protected setStatus(question: Question, status: QuestionStatus): void {
    this.act(this.api.changeStatus(question.id, status), status === 'PUBLISHED' ? 'Question publiee' : status === 'ARCHIVED' ? 'Question archivee' : 'Question remise en brouillon');
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

  /** Une recherche porte sur tous les statuts et toutes les categories. */
  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    const term = this.search.trim();
    const request: Observable<Page<Question>> =
      term.length >= 2
        ? this.api.search(term, this.page, PAGE_SIZE)
        : this.api.list(this.status(), this.categoryId, this.page, PAGE_SIZE, this.source);

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
