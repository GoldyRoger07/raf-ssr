import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { of, switchMap } from 'rxjs';

import { MediaPicker } from '../../components/media-picker/media-picker';
import { errorMessage } from '../../core/api';
import { questionStatus } from '../../core/labels';
import { Category, Difficulty, Question, QuestionInput, QuestionStatus, QuestionType } from '../../core/models';
import { QuestionApi } from '../../core/question-api.service';

const TRUE_FALSE = ['Vrai', 'Faux'];

/** Creation et modification d'une question. La bonne reponse est unique. */
@Component({
  selector: 'admin-question-form',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    MessageModule,
    RadioButtonModule,
    SelectModule,
    SelectButtonModule,
    TagModule,
    TextareaModule,
    MediaPicker,
  ],
  templateUrl: './question-form.html',
})
export default class QuestionForm implements OnInit {
  private readonly api = inject(QuestionApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messages = inject(MessageService);

  protected readonly questionStatus = questionStatus;
  protected readonly typeOptions = [
    { label: 'Choix unique', value: 'SINGLE_CHOICE' },
    { label: 'Vrai / faux', value: 'TRUE_FALSE' },
  ];
  protected readonly difficultyOptions = [
    { label: 'Facile', value: 'EASY' },
    { label: 'Moyen', value: 'MEDIUM' },
    { label: 'Difficile', value: 'HARD' },
  ];

  protected readonly existing = signal<Question | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loadError = signal<string | null>(null);

  protected categoryId: number | null = Number(this.route.snapshot.queryParamMap.get('categorie')) || null;
  protected text = '';
  protected type: QuestionType = 'SINGLE_CHOICE';
  protected difficulty: Difficulty = 'MEDIUM';
  protected explanation = '';
  protected choices: string[] = ['', '', '', ''];
  /**
   * Image de chaque proposition, alignee sur {@link choices}. L'ecran ne permet
   * pas encore d'en choisir : on renvoie celles qui existent pour ne pas les
   * effacer en enregistrant.
   */
  private choiceMediaIds: (number | null)[] = [null, null, null, null];
  protected mediaId: number | null = null;
  protected correctIndex = 0;

  ngOnInit(): void {
    this.api.categories().subscribe((categories) => this.categories.set(categories));
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.api.get(Number(id)).subscribe({
        next: (question) => this.fill(question),
        error: (error) => this.loadError.set(errorMessage(error)),
      });
    }
  }

  protected onTypeChange(): void {
    if (this.type === 'TRUE_FALSE') {
      this.choices = [...TRUE_FALSE];
      this.correctIndex = Math.min(this.correctIndex, 1);
    } else if (this.choices.length < 4) {
      this.choices = [...this.choices.filter((c) => !TRUE_FALSE.includes(c)), '', '', '', ''].slice(0, 4);
    }
    // Les propositions ont change de nature : leurs images ne leur correspondent plus.
    this.choiceMediaIds = this.choices.map(() => null);
  }

  protected addChoice(): void {
    if (this.choices.length < 6) {
      this.choices.push('');
      this.choiceMediaIds.push(null);
    }
  }

  protected removeChoice(index: number): void {
    if (this.choices.length > 2) {
      this.choices.splice(index, 1);
      this.choiceMediaIds.splice(index, 1);
      if (this.correctIndex >= this.choices.length) {
        this.correctIndex = 0;
      } else if (index < this.correctIndex) {
        this.correctIndex--;
      }
    }
  }

  /** ngFor sur des chaines : on suit l'index, sinon chaque frappe recree le champ. */
  protected trackIndex(index: number): number {
    return index;
  }

  protected save(publish: boolean): void {
    const problem = this.validate();
    if (problem) {
      this.error.set(problem);
      return;
    }

    const input: QuestionInput = {
      categoryId: this.categoryId!,
      text: this.text.trim(),
      type: this.type,
      difficulty: this.difficulty,
      explanation: this.explanation.trim() || null,
      mediaId: this.mediaId,
      choices: this.choices.map((text, i) => ({
        text: text.trim(),
        correct: i === this.correctIndex,
        mediaId: this.choiceMediaIds[i] ?? null,
      })),
    };

    this.saving.set(true);
    this.error.set(null);
    const current = this.existing();
    (current ? this.api.update(current.id, input) : this.api.create(input))
      .pipe(switchMap((q) => (publish && q.status !== 'PUBLISHED' ? this.api.changeStatus(q.id, 'PUBLISHED') : of(q))))
      .subscribe({
        next: (q) => {
          this.saving.set(false);
          this.messages.add({
            severity: 'success',
            summary: current ? 'Question enregistree' : 'Question creee',
            detail: q.status === 'PUBLISHED' ? 'Elle entre dans le vivier des quiz.' : 'Elle reste en brouillon.',
          });
          if (current) {
            this.fill(q);
          } else {
            this.router.navigate(['/admin/questions'], { queryParams: { categorie: q.categoryId } });
          }
        },
        error: (error) => {
          this.saving.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }

  protected setStatus(status: QuestionStatus): void {
    const current = this.existing();
    if (!current) {
      return;
    }
    this.api.changeStatus(current.id, status).subscribe({
      next: (q) => {
        this.fill(q);
        this.messages.add({ severity: 'success', summary: questionStatus(status).label });
      },
      error: (error) => this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) }),
    });
  }

  private validate(): string | null {
    if (!this.categoryId) {
      return 'Choisissez une categorie.';
    }
    if (!this.text.trim()) {
      return "L'enonce est obligatoire.";
    }
    if (this.choices.some((c) => !c.trim())) {
      return 'Chaque proposition doit avoir un texte.';
    }
    const normalized = this.choices.map((c) => c.trim().toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      return 'Deux propositions sont identiques.';
    }
    return null;
  }

  private fill(question: Question): void {
    this.existing.set(question);
    this.categoryId = question.categoryId;
    this.text = question.text;
    this.type = question.type;
    this.difficulty = question.difficulty;
    this.explanation = question.explanation ?? '';
    const sorted = [...question.choices].sort((a, b) => a.position - b.position);
    this.choices = sorted.map((c) => c.text);
    this.choiceMediaIds = sorted.map((c) => c.mediaId ?? null);
    this.mediaId = question.mediaId ?? null;
    this.correctIndex = Math.max(0, sorted.findIndex((c) => c.correct));
  }
}
