import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { forkJoin } from 'rxjs';

import { errorMessage } from '../../core/api';
import { difficultyLabel, questionStatus } from '../../core/labels';
import { AiStatus, Category, Difficulty, GenerationReport, Question, QuestionType } from '../../core/models';
import { QuestionApi } from '../../core/question-api.service';

/**
 * Generation de questions par IA : un moyen de plus d'alimenter la banque, a
 * cote de la saisie et de l'import CSV. Les questions arrivent en brouillon ;
 * elles se relisent ici, puis se publient, se corrigent ou se suppriment.
 */
@Component({
  selector: 'admin-generate',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    InputNumberModule,
    MessageModule,
    SelectModule,
    SelectButtonModule,
    TableModule,
    TagModule,
    TextareaModule,
  ],
  templateUrl: './generate.html',
})
export default class Generate {
  private readonly api = inject(QuestionApi);
  private readonly messages = inject(MessageService);

  protected readonly difficultyLabel = difficultyLabel;
  protected readonly questionStatus = questionStatus;
  protected readonly difficultyOptions: { label: string; value: Difficulty | null }[] = [
    { label: 'Melangee', value: null },
    { label: 'Facile', value: 'EASY' },
    { label: 'Moyenne', value: 'MEDIUM' },
    { label: 'Difficile', value: 'HARD' },
  ];
  protected readonly typeOptions: { label: string; value: QuestionType | null }[] = [
    { label: 'Melange', value: null },
    { label: 'QCM', value: 'SINGLE_CHOICE' },
    { label: 'Vrai / faux', value: 'TRUE_FALSE' },
  ];

  protected readonly categories = signal<Category[]>([]);
  protected readonly status = signal<AiStatus | null>(null);
  protected readonly statusError = signal<string | null>(null);

  protected categoryId: number | null = null;
  protected count = 10;
  protected difficulty: Difficulty | null = null;
  protected type: QuestionType | null = null;
  protected instructions = '';

  protected readonly generating = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly report = signal<GenerationReport | null>(null);
  /** Questions generees, mises a jour au fil de la relecture (publiees, supprimees). */
  protected readonly questions = signal<Question[]>([]);
  protected readonly busy = signal<number | 'all' | null>(null);

  protected readonly drafts = computed(() => this.questions().filter((q) => q.status === 'DRAFT'));
  protected readonly limitReached = computed(() => {
    const s = this.status();
    return !!s && s.requestsToday >= s.maxRequestsPerDay;
  });

  constructor() {
    this.api.categories().subscribe((categories) => this.categories.set(categories.filter((c) => c.active)));
    this.loadStatus();
  }

  protected generate(): void {
    const status = this.status();
    if (!this.categoryId || !status?.enabled) {
      return;
    }
    this.generating.set(true);
    this.error.set(null);
    this.api
      .generate({
        categoryId: this.categoryId,
        count: this.count,
        difficulty: this.difficulty,
        type: this.type,
        instructions: this.instructions.trim() || null,
      })
      .subscribe({
        next: (report) => {
          this.generating.set(false);
          this.report.set(report);
          this.questions.set(report.questions);
          this.loadStatus();
        },
        error: (error) => {
          this.generating.set(false);
          this.error.set(errorMessage(error));
          this.loadStatus();
        },
      });
  }

  protected publish(question: Question): void {
    this.busy.set(question.id);
    this.api.changeStatus(question.id, 'PUBLISHED').subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.replace(updated);
      },
      error: (error) => this.fail(error),
    });
  }

  protected remove(question: Question): void {
    this.busy.set(question.id);
    this.api.delete(question.id).subscribe({
      next: () => {
        this.busy.set(null);
        this.questions.update((list) => list.filter((q) => q.id !== question.id));
      },
      error: (error) => this.fail(error),
    });
  }

  /** Publie d'un coup les brouillons restants, apres relecture. */
  protected publishAll(): void {
    const drafts = this.drafts();
    if (!drafts.length) {
      return;
    }
    this.busy.set('all');
    forkJoin(drafts.map((q) => this.api.changeStatus(q.id, 'PUBLISHED'))).subscribe({
      next: (updated) => {
        this.busy.set(null);
        updated.forEach((q) => this.replace(q));
        this.messages.add({ severity: 'success', summary: `${updated.length} question(s) publiee(s)` });
      },
      error: (error) => this.fail(error),
    });
  }

  private loadStatus(): void {
    this.api.aiStatus().subscribe({
      next: (status) => {
        this.status.set(status);
        this.count = Math.min(this.count, status.maxQuestionsPerRequest);
      },
      error: (error) => this.statusError.set(errorMessage(error)),
    });
  }

  private replace(question: Question): void {
    this.questions.update((list) => list.map((q) => (q.id === question.id ? question : q)));
  }

  private fail(error: unknown): void {
    this.busy.set(null);
    this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error), life: 8000 });
  }
}
