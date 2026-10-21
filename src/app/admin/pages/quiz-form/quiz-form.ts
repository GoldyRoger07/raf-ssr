import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { debounceTime, forkJoin, map, of, startWith, switchMap } from 'rxjs';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { HtgPipe } from '../../core/format';
import { PLAY_MODE } from '../../core/labels';
import { Category, PlayMode, PoolStatus, Quiz, QuizInput, TopicMode } from '../../core/models';
import { QuestionApi } from '../../core/question-api.service';
import { QuizApi } from '../../core/quiz-api.service';

@Component({
  selector: 'admin-quiz-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    MultiSelectModule,
    SelectModule,
    SelectButtonModule,
    TextareaModule,
    ToggleSwitchModule,
    HtgPipe,
  ],
  templateUrl: './quiz-form.html',
})
export default class QuizForm implements OnInit {
  private readonly quizApi = inject(QuizApi);
  private readonly questionApi = inject(QuestionApi);
  private readonly adminApi = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly quizId = signal<number | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly notDraft = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly categories = signal<Category[]>([]);
  /** Taux du credit en gourdes (reglage du backend), pour l'equivalent affiche pendant la saisie. */
  protected readonly htgRate = signal<number | null>(null);

  protected readonly modeOptions = [
    { label: 'Sujet choisi par l\'admin', value: 'ADMIN' },
    { label: 'Sujet vote par les joueurs', value: 'VOTE' },
  ];

  protected readonly playModeOptions = [
    { label: PLAY_MODE['SEQUENTIAL'].label, value: 'SEQUENTIAL' },
    { label: PLAY_MODE['BATCH'].label, value: 'BATCH' },
  ];

  protected readonly form = inject(FormBuilder).group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    description: ['', Validators.maxLength(1000)],
    themeLabel: ['', Validators.maxLength(160)],
    topicMode: ['ADMIN' as TopicMode, Validators.required],
    categoryId: [null as number | null],
    topicCategoryIds: [[] as number[]],
    /** Gratuit : prix a 0 et un seul ticket par joueur (impose par le backend). */
    free: [false],
    ticketPriceCredits: [20, [Validators.required, Validators.min(1)]],
    minPlayers: [10, [Validators.required, Validators.min(1)]],
    maxTicketsTotal: [null as number | null, Validators.min(1)],
    maxTicketsPerPlayer: [null as number | null, Validators.min(1)],
    startDelayMinutes: [30, [Validators.required, Validators.min(0)]],
    playMode: ['SEQUENTIAL' as PlayMode, Validators.required],
    questionDurationSeconds: [5, [Validators.required, Validators.min(3), Validators.max(300)]],
    questionsPerGame: [40, [Validators.required, Validators.min(1)]],
    pointsPerCorrect: [10, [Validators.required, Validators.min(1)]],
    minScoreThreshold: [200, [Validators.required, Validators.min(1)]],
    closingCountdownMinutes: [120, [Validators.required, Validators.min(1)]],
  });

  private readonly values = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue()), map(() => this.form.getRawValue())),
    { requireSync: true },
  );

  protected readonly mode = computed(() => this.values().topicMode);
  protected readonly free = computed(() => !!this.values().free);
  protected readonly priceHtg = computed(() => {
    const rate = this.htgRate();
    return rate === null ? null : (this.values().ticketPriceCredits ?? 0) * rate;
  });
  protected readonly maxScore = computed(
    () => (this.values().questionsPerGame ?? 0) * (this.values().pointsPerCorrect ?? 0),
  );
  protected readonly playModeHint = computed(() => PLAY_MODE[this.values().playMode ?? 'SEQUENTIAL'].hint);
  /** Duree maximale d'une partie : chaque question consomme au plus son chrono. */
  protected readonly maxDurationSeconds = computed(
    () => (this.values().questionsPerGame ?? 0) * (this.values().questionDurationSeconds ?? 0),
  );

  /** Etat du vivier de chaque categorie concernee, pour le nombre de questions par partie choisi. */
  protected readonly pools = signal<(PoolStatus & { name: string })[]>([]);

  ngOnInit(): void {
    // Gratuit : le prix et le plafond par joueur sont imposes, leurs champs se figent.
    const { free, ticketPriceCredits, maxTicketsPerPlayer } = this.form.controls;
    free.valueChanges.pipe(startWith(free.value), takeUntilDestroyed(this.destroyRef)).subscribe((isFree) => {
      for (const control of [ticketPriceCredits, maxTicketsPerPlayer]) {
        if (isFree) {
          control.disable({ emitEvent: false });
        } else {
          control.enable({ emitEvent: false });
        }
      }
    });

    this.adminApi.dashboard().subscribe({ next: (d) => this.htgRate.set(d.htgRate), error: () => undefined });
    this.questionApi.categories().subscribe({
      // Seuls les sujets proposes en mode En groupe (le backend refuse les autres).
      next: (categories) => this.categories.set(categories.filter((c) => c.active && c.groupEnabled)),
      error: (error) => this.loadError.set(errorMessage(error)),
    });

    this.form.valueChanges
      .pipe(
        startWith(null),
        debounceTime(400),
        map(() => this.form.getRawValue()),
        switchMap((v) => {
          const ids = v.topicMode === 'VOTE' ? (v.topicCategoryIds ?? []) : v.categoryId ? [v.categoryId] : [];
          const perGame = v.questionsPerGame ?? 0;
          if (!ids.length || perGame < 1) {
            return of([]);
          }
          return forkJoin(ids.map((id) => this.questionApi.poolStatus(id, perGame)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pools) =>
          this.pools.set(
            pools.map((p) => ({ ...p, name: this.categories().find((c) => c.id === p.categoryId)?.name ?? '' })),
          ),
        error: () => this.pools.set([]),
      });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.quizId.set(Number(id));
      this.quizApi.get(Number(id)).subscribe({
        next: (quiz) => this.fill(quiz),
        error: (error) => this.loadError.set(errorMessage(error)),
      });
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (v.topicMode === 'ADMIN' && !v.categoryId) {
      this.error.set('Choisissez la categorie du quiz.');
      return;
    }
    if (v.topicMode === 'VOTE' && (v.topicCategoryIds ?? []).length < 2) {
      this.error.set('Proposez au moins deux sujets au vote.');
      return;
    }

    const input: QuizInput = {
      title: v.title!.trim(),
      description: v.description?.trim() || null,
      themeLabel: v.themeLabel?.trim() || null,
      topicMode: v.topicMode!,
      categoryId: v.topicMode === 'ADMIN' ? v.categoryId : null,
      bannerMediaId: null,
      ticketPriceCredits: v.free ? 0 : v.ticketPriceCredits!,
      minPlayers: v.minPlayers!,
      maxTicketsTotal: v.maxTicketsTotal || null,
      maxTicketsPerPlayer: v.free ? 1 : v.maxTicketsPerPlayer || null,
      startDelayMinutes: v.startDelayMinutes!,
      playMode: v.playMode!,
      questionDurationSeconds: v.questionDurationSeconds!,
      questionsPerGame: v.questionsPerGame!,
      pointsPerCorrect: v.pointsPerCorrect!,
      minScoreThreshold: v.minScoreThreshold!,
      closingCountdownMinutes: v.closingCountdownMinutes!,
    };

    this.saving.set(true);
    this.error.set(null);
    const id = this.quizId();
    const save$ = id ? this.quizApi.update(id, input) : this.quizApi.create(input);

    save$
      .pipe(
        switchMap((quiz) =>
          v.topicMode === 'VOTE' ? this.quizApi.configureTopics(quiz.id, v.topicCategoryIds ?? []) : of(quiz),
        ),
      )
      .subscribe({
        next: (quiz) => {
          this.messages.add({
            severity: 'success',
            summary: id ? 'Quiz enregistre' : 'Quiz cree',
            detail: 'Definissez maintenant les recompenses, puis publiez.',
          });
          this.router.navigate(['/admin/quiz', quiz.id]);
        },
        error: (error) => {
          this.saving.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }

  protected invalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && control.touched;
  }

  private fill(quiz: Quiz): void {
    if (quiz.gameMode === 'SOLO') {
      this.router.navigate(['/admin/quiz/solo', quiz.id, 'modifier'], { replaceUrl: true });
      return;
    }
    if (quiz.status !== 'DRAFT') {
      this.notDraft.set(true);
      return;
    }
    this.form.patchValue({
      title: quiz.title,
      description: quiz.description ?? '',
      themeLabel: quiz.themeLabel ?? '',
      topicMode: quiz.topicMode,
      categoryId: quiz.selectedCategoryId ?? null,
      topicCategoryIds: quiz.topics.map((t) => t.categoryId),
      free: quiz.free,
      ticketPriceCredits: quiz.free ? 20 : quiz.ticketPriceCredits,
      minPlayers: quiz.minPlayers,
      maxTicketsTotal: quiz.maxTicketsTotal ?? null,
      maxTicketsPerPlayer: quiz.maxTicketsPerPlayer ?? null,
      startDelayMinutes: quiz.startDelayMinutes,
      playMode: quiz.playMode,
      questionDurationSeconds: quiz.questionDurationSeconds,
      questionsPerGame: quiz.questionsPerGame,
      pointsPerCorrect: quiz.pointsPerCorrect,
      minScoreThreshold: quiz.minScoreThreshold,
      closingCountdownMinutes: quiz.closingCountdownMinutes,
    });
  }
}
