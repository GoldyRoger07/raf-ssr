import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { debounceTime, map, of, startWith, switchMap } from 'rxjs';

import { MediaPicker } from '../../components/media-picker/media-picker';
import { SoloEconomicsPanel } from '../../components/solo-economics/solo-economics';
import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { HtgPipe } from '../../core/format';
import { Category, PoolStatus, Quiz, SoloEconomics, SoloQuizInput } from '../../core/models';
import { QuestionApi } from '../../core/question-api.service';
import { QuizApi } from '../../core/quiz-api.service';

/**
 * Quiz solo : un sujet, un prix par partie, un prix pour un sans-faute. Toujours
 * joue question par question ; pas de tickets, de seuil ni de classement.
 */
@Component({
  selector: 'admin-solo-quiz-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    HtgPipe,
    SoloEconomicsPanel,
    MediaPicker,
  ],
  templateUrl: './solo-quiz-form.html',
})
export default class SoloQuizForm implements OnInit {
  private readonly quizApi = inject(QuizApi);
  private readonly questionApi = inject(QuestionApi);
  private readonly adminApi = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthService);

  protected readonly quizId = signal<number | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly notDraft = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly htgRate = signal<number | null>(null);
  protected readonly pool = signal<PoolStatus | null>(null);
  /** Questions par partie pour lesquelles le vivier a ete calcule (requis = ce nombre x game.pool_ratio_min). */
  protected readonly poolPerGame = signal<number | null>(null);
  /** Simulation du bilan sur les questions publiees du sujet, recalculee a la saisie. */
  protected readonly economics = signal<SoloEconomics | null>(null);

  protected readonly form = inject(FormBuilder).group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    description: ['', Validators.maxLength(1000)],
    categoryId: [null as number | null, Validators.required],
    bannerMediaId: [null as number | null],
    /** Gratuit : la partie ne coute rien (prix a 0). */
    free: [false],
    entryPriceCredits: [10, [Validators.required, Validators.min(1)]],
    prizeHtg: [200, [Validators.required, Validators.min(1)]],
    questionsPerGame: [10, [Validators.required, Validators.min(1)]],
    questionDurationSeconds: [5, [Validators.required, Validators.min(3), Validators.max(300)]],
  });

  private readonly values = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue()), map(() => this.form.getRawValue())),
    { requireSync: true },
  );

  protected readonly free = computed(() => !!this.values().free);
  protected readonly entryHtg = computed(() => this.toHtg(this.values().entryPriceCredits));
  protected readonly prizeHtg = computed(() => this.values().prizeHtg ?? null);
  protected readonly maxDurationSeconds = computed(
    () => (this.values().questionsPerGame ?? 0) * (this.values().questionDurationSeconds ?? 0),
  );

  /**
   * Taux de sans-faute au-dela duquel le quiz perd de l'argent : chaque partie
   * rapporte son prix, chaque sans-faute coute le prix gagne.
   */
  protected readonly breakEvenWinRate = computed(() => {
    const entry = (this.values().entryPriceCredits ?? 0) * (this.htgRate() ?? 0);
    const prize = this.values().prizeHtg ?? 0;
    return prize > 0 ? (entry / prize) * 100 : null;
  });

  ngOnInit(): void {
    // Gratuit : le prix est impose, son champ se fige.
    const { free, entryPriceCredits } = this.form.controls;
    free.valueChanges.pipe(startWith(free.value), takeUntilDestroyed(this.destroyRef)).subscribe((isFree) => {
      if (isFree) {
        entryPriceCredits.disable({ emitEvent: false });
      } else {
        entryPriceCredits.enable({ emitEvent: false });
      }
    });

    this.adminApi.dashboard().subscribe({ next: (d) => this.htgRate.set(d.htgRate), error: () => undefined });
    this.questionApi.categories().subscribe({
      // Seuls les sujets proposes en Solo (le backend refuse les autres).
      next: (categories) => this.categories.set(categories.filter((c) => c.active && c.soloEnabled)),
      error: (error) => this.loadError.set(errorMessage(error)),
    });

    this.form.valueChanges
      .pipe(
        startWith(null),
        debounceTime(400),
        map(() => this.form.getRawValue()),
        switchMap((v) =>
          v.categoryId && (v.questionsPerGame ?? 0) >= 1
            ? this.questionApi
                .poolStatus(v.categoryId, v.questionsPerGame!)
                .pipe(map((pool) => ({ pool, perGame: v.questionsPerGame! })))
            : of(null),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.pool.set(result?.pool ?? null);
          this.poolPerGame.set(result?.perGame ?? null);
        },
        error: () => this.pool.set(null),
      });

    this.form.valueChanges
      .pipe(
        startWith(null),
        debounceTime(400),
        map(() => this.form.getRawValue()),
        switchMap((v) =>
          v.categoryId && (v.questionsPerGame ?? 0) >= 1 && (v.prizeHtg ?? 0) >= 1
            ? this.quizApi.previewSoloEconomics(
                v.categoryId,
                v.free ? 0 : (v.entryPriceCredits ?? 0),
                v.prizeHtg!,
                v.questionsPerGame!,
              )
            : of(null),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (economics) => this.economics.set(economics), error: () => this.economics.set(null) });

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
    const input: SoloQuizInput = {
      title: v.title!.trim(),
      description: v.description?.trim() || null,
      categoryId: v.categoryId!,
      bannerMediaId: v.bannerMediaId ?? null,
      entryPriceCredits: v.free ? 0 : v.entryPriceCredits!,
      prizeHtg: v.prizeHtg!,
      questionsPerGame: v.questionsPerGame!,
      questionDurationSeconds: v.questionDurationSeconds!,
    };

    this.saving.set(true);
    this.error.set(null);
    const id = this.quizId();
    (id ? this.quizApi.updateSolo(id, input) : this.quizApi.createSolo(input)).subscribe({
      next: (quiz) => {
        this.messages.add({
          severity: 'success',
          summary: id ? 'Quiz solo enregistre' : 'Quiz solo cree',
          detail: 'Publiez-le pour l\'ouvrir aux joueurs.',
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

  private toHtg(credits: number | null | undefined): number | null {
    const rate = this.htgRate();
    return rate === null ? null : (credits ?? 0) * rate;
  }

  private fill(quiz: Quiz): void {
    if (quiz.gameMode !== 'SOLO') {
      this.router.navigate(['/admin/quiz', quiz.id, 'modifier'], { replaceUrl: true });
      return;
    }
    if (quiz.status !== 'DRAFT') {
      this.notDraft.set(true);
      return;
    }
    this.form.patchValue({
      title: quiz.title,
      description: quiz.description ?? '',
      categoryId: quiz.selectedCategoryId ?? null,
      bannerMediaId: quiz.bannerMediaId ?? null,
      free: quiz.free,
      entryPriceCredits: quiz.free ? 10 : quiz.ticketPriceCredits,
      prizeHtg: quiz.soloPrizeHtg ?? null,
      questionsPerGame: quiz.questionsPerGame,
      questionDurationSeconds: quiz.questionDurationSeconds,
    });
  }
}
