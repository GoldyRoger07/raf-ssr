import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { Observable, Subject, debounceTime } from 'rxjs';

import { DifficultyMixEditor } from '../../components/difficulty-mix-editor/difficulty-mix-editor';
import { SoloEconomicsPanel } from '../../components/solo-economics/solo-economics';
import { errorMessage } from '../../core/api';
import { CreditsPipe, HaitiDatePipe, HtgPipe } from '../../core/format';
import { PLAY_MODE, quizStatus } from '../../core/labels';
import { DEFAULT_DIFFICULTY_MIX, describeSplit, formatMix, mixValid, splitMix } from '../../core/difficulty-mix';
import { Difficulty, DifficultyMix, Economics, Leaderboard, Quiz, RewardTier, SoloEconomics } from '../../core/models';
import { QuestionApi } from '../../core/question-api.service';
import { QuizApi } from '../../core/quiz-api.service';
import { DURATION_UNITS, DurationUnit, MAX_DURATION_MINUTES, formatDuration, fromMinutes, toMinutes } from '../../core/duration';
import { PAGE_SIZE_OPTIONS, TableState } from '../../core/table-state';

interface TierRow {
  rankFrom: number | null;
  rankTo: number | null;
  amountHtg: number | null;
  label: string;
}

/**
 * Fiche d'un quiz : resume, recompenses et bilan financier, puis l'action qui
 * correspond a son etat (publier, arreter le vote, demarrer, figer le classement).
 *
 * Un quiz solo n'a ni recompenses par rang, ni calendrier de groupe : il s'ouvre
 * a la publication et se ferme a la main.
 */
@Component({
  selector: 'admin-quiz-detail',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
    ToggleSwitchModule,
    TooltipModule,
    CreditsPipe,
    HtgPipe,
    HaitiDatePipe,
    SoloEconomicsPanel,
    DifficultyMixEditor,
  ],
  templateUrl: './quiz-detail.html',
})
export default class QuizDetail implements OnInit {
  private readonly api = inject(QuizApi);
  private readonly questionApi = inject(QuestionApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly quizStatus = quizStatus;
  protected readonly playModes = PLAY_MODE;

  protected readonly quiz = signal<Quiz | null>(null);
  protected readonly economics = signal<Economics | null>(null);
  protected readonly soloEconomics = signal<SoloEconomics | null>(null);
  protected readonly leaderboard = signal<Leaderboard | null>(null);
  protected readonly leaderboardTable = new TableState(['rank', 'player', 'score', 'reward'], 50);
  protected readonly pageSizes = PAGE_SIZE_OPTIONS;
  protected leaderboardFilters: { q: string; rewarded: boolean | null } = { q: '', rewarded: null };
  protected readonly rewardedOptions = [
    { label: 'Avec un gain', value: true },
    { label: 'Sans gain', value: false },
  ];
  private readonly leaderboardTyped = new Subject<void>();
  protected readonly loadingLeaderboard = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  // Recompenses
  protected readonly rewardsOpen = signal(false);
  protected tiers: TierRow[] = [];
  protected readonly tiersVersion = signal(0);

  // Publication, vote, annulation
  protected readonly publishOpen = signal(false);
  protected voteDurationMinutes = 1440;
  protected readonly voteOpen = signal(false);
  protected overrideTopicId: number | null = null;
  protected readonly cancelOpen = signal(false);
  protected cancelReason = '';

  /** Solo : taux de sans-faute au-dela duquel le quiz perd de l'argent. */
  protected readonly breakEvenWinRate = computed(() => {
    const q = this.quiz();
    return q?.soloPrizeHtg ? (q.ticketPriceHtg / q.soloPrizeHtg) * 100 : null;
  });

  /** Bilan en direct pendant la saisie des tranches (meme calcul que le backend). */
  protected readonly preview = computed(() => {
    this.tiersVersion();
    const q = this.quiz();
    if (!q) {
      return null;
    }
    const total = this.tiers.reduce(
      (sum, t) => sum + Math.max(0, (t.rankTo ?? 0) - (t.rankFrom ?? 0) + 1) * (t.amountHtg ?? 0),
      0,
    );
    // En gourdes, comme les recompenses. Gratuit : pas de point d'equilibre (null).
    const price = q.ticketPriceHtg;
    const minRevenue = price * q.minPlayers;
    return {
      total,
      breakEven: price > 0 ? Math.ceil(total / price) : null,
      margin: minRevenue - total,
    };
  });

  ngOnInit(): void {
    this.leaderboardTyped.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.applyLeaderboard());
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  protected load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.get(id).subscribe({
      next: (quiz) => {
        this.quiz.set(quiz);
        this.economics.set(null);
        this.soloEconomics.set(null);
        this.leaderboard.set(null);
        this.leaderboardTable.restart();
        if (quiz.gameMode === 'GROUP' && quiz.rewards.length) {
          this.api.economics(id).subscribe((e) => this.economics.set(e));
        }
        if (quiz.gameMode === 'SOLO') {
          this.api.soloEconomics(id).subscribe({ next: (e) => this.soloEconomics.set(e), error: () => undefined });
        }
        if (quiz.gameMode === 'GROUP' && quiz.status === 'FINISHED') {
          this.loadLeaderboard(id);
        }
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  protected onLeaderboardPage(event: TableLazyLoadEvent): void {
    const quiz = this.quiz();
    if (quiz && this.leaderboardTable.onLazyLoad(event)) {
      this.loadLeaderboard(quiz.id);
    }
  }

  protected get leaderboardFiltered(): boolean {
    return !!this.leaderboardFilters.q.trim() || this.leaderboardFilters.rewarded !== null;
  }

  protected onLeaderboardInput(): void {
    this.leaderboardTyped.next();
  }

  protected applyLeaderboard(): void {
    const quiz = this.quiz();
    if (quiz) {
      this.leaderboardTable.restart();
      this.loadLeaderboard(quiz.id);
    }
  }

  protected resetLeaderboard(): void {
    this.leaderboardFilters = { q: '', rewarded: null };
    this.leaderboardTable.reset();
    this.applyLeaderboard();
  }

  private loadLeaderboard(id: number): void {
    this.loadingLeaderboard.set(true);
    const t = this.leaderboardTable;
    this.api.leaderboard(id, t.page, t.pageSize, this.leaderboardFilters, t.sort ?? undefined).subscribe({
      next: (board) => {
        this.leaderboard.set(board);
        this.loadingLeaderboard.set(false);
      },
      error: () => this.loadingLeaderboard.set(false),
    });
  }

  // --- Recompenses -----------------------------------------------------------------

  protected openRewards(): void {
    const q = this.quiz();
    this.tiers = q?.rewards.length
      ? q.rewards.map((r) => ({ rankFrom: r.rankFrom, rankTo: r.rankTo, amountHtg: r.amountHtg, label: r.label ?? '' }))
      : [{ rankFrom: 1, rankTo: 1, amountHtg: null, label: '1er' }];
    this.touchTiers();
    this.rewardsOpen.set(true);
  }

  /** La tranche suivante commence la ou la precedente s'arrete : pas de trou possible par defaut. */
  protected addTier(): void {
    const last = this.tiers[this.tiers.length - 1];
    const next = (last?.rankTo ?? 0) + 1;
    this.tiers.push({ rankFrom: next, rankTo: next, amountHtg: null, label: '' });
    this.touchTiers();
  }

  protected removeTier(index: number): void {
    this.tiers.splice(index, 1);
    this.touchTiers();
  }

  protected touchTiers(): void {
    this.tiersVersion.update((v) => v + 1);
  }

  protected saveRewards(): void {
    const q = this.quiz();
    if (!q) {
      return;
    }
    const tiers: RewardTier[] = this.tiers.map((t) => ({
      rankFrom: t.rankFrom ?? 0,
      rankTo: t.rankTo ?? 0,
      amountHtg: t.amountHtg ?? 0,
      label: t.label.trim() || null,
    }));
    this.run(this.api.configureRewards(q.id, tiers), 'Recompenses enregistrees', () => this.rewardsOpen.set(false));
  }

  // --- Cycle de vie ---------------------------------------------------------------

  protected publish(): void {
    const q = this.quiz();
    if (q) {
      this.run(
        this.api.publish(q.id, q.topicMode === 'VOTE' ? this.voteDurationMinutes : null),
        q.gameMode === 'SOLO' ? 'Quiz solo ouvert aux joueurs' : 'Quiz publie : les tickets sont en vente',
        () => this.publishOpen.set(false),
      );
    }
  }

  protected closeVote(): void {
    const q = this.quiz();
    if (q) {
      this.run(this.api.closeVote(q.id, this.overrideTopicId), 'Sujet arrete', () => this.voteOpen.set(false));
    }
  }

  protected start(): void {
    const q = this.quiz();
    if (!q) {
      return;
    }
    this.confirmation.confirm({
      header: 'Demarrer maintenant',
      message: 'Le vivier de questions sera fige et les joueurs pourront lancer leur partie. Continuer ?',
      acceptLabel: 'Demarrer',
      rejectLabel: 'Annuler',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.run(this.api.start(q.id), 'Quiz demarre'),
    });
  }

  /**
   * Copie ce quiz dans un nouveau brouillon (memes regles, recompenses et sujets)
   * et l'ouvre : on corrige ce qui doit l'etre, puis on publie. L'original garde
   * son historique.
   */
  /** Marque ou demarque le quiz comme test, apres confirmation. */
  protected toggleTest(): void {
    const q = this.quiz();
    if (!q) {
      return;
    }
    const test = !q.test;
    this.confirmation.confirm({
      header: test ? 'Marquer comme quiz de test' : 'Ce quiz n\'est plus un test',
      message: test
        ? 'Le quiz disparait de l\'app pour les joueurs (seuls le staff et les comptes de test le voient), '
          + 'et ses ventes, remboursements et gains sortent du resultat du jeu. Impossible si de vrais joueurs y ont deja un ticket ou une partie.'
        : 'Le quiz redevient visible de tous les joueurs, et son activite compte de nouveau dans le resultat du jeu.',
      acceptLabel: test ? 'Marquer comme test' : 'Confirmer',
      rejectLabel: 'Annuler',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => {
        this.busy.set(true);
        this.api.setTest(q.id, test).subscribe({
          next: (updated) => {
            this.busy.set(false);
            this.quiz.set(updated);
            this.messages.add({ severity: 'success', summary: test ? 'Quiz marque comme test' : 'Quiz de nouveau reel' });
          },
          error: (error) => {
            this.busy.set(false);
            this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) });
          },
        });
      },
    });
  }

  // --- Solo : repartition des questions par difficulte ---------------------------------
  protected readonly mixOpen = signal(false);
  protected readonly mixEnabled = signal(false);
  protected readonly mixDraft = signal<DifficultyMix>({ ...DEFAULT_DIFFICULTY_MIX });
  /** Questions publiees du sujet par niveau, et taille minimale du vivier (multiple d'une partie). */
  protected readonly mixAvailable = signal<Record<Difficulty, number> | null>(null);
  protected readonly mixPoolRatio = signal<number | null>(null);
  protected readonly mixInvalid = computed(() => this.mixEnabled() && !mixValid(this.mixDraft()));

  /** « 40 / 40 / 20 % (4 faciles, 4 moyennes, 2 difficiles) ». */
  protected mixSummary(q: Quiz): string {
    const mix = q.difficultyMix!;
    return `${formatMix(mix)} (${describeSplit(splitMix(mix, q.questionsPerGame))} par partie)`;
  }

  protected openMix(): void {
    const q = this.quiz();
    if (!q) {
      return;
    }
    this.mixEnabled.set(q.difficultyMix != null);
    this.mixDraft.set({ ...(q.difficultyMix ?? DEFAULT_DIFFICULTY_MIX) });
    this.mixAvailable.set(null);
    this.mixPoolRatio.set(null);
    if (q.selectedCategoryId) {
      this.questionApi.poolStatus(q.selectedCategoryId, q.questionsPerGame).subscribe({
        next: (p) => {
          this.mixAvailable.set({ EASY: p.easy, MEDIUM: p.medium, HARD: p.hard });
          this.mixPoolRatio.set(p.required / q.questionsPerGame);
        },
        error: () => undefined,
      });
    }
    this.mixOpen.set(true);
  }

  protected saveMix(): void {
    const q = this.quiz();
    if (!q || this.mixInvalid()) {
      return;
    }
    const mix = this.mixEnabled() ? this.mixDraft() : null;
    this.busy.set(true);
    this.api.setDifficultyMix(q.id, mix).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.quiz.set(updated);
        this.mixOpen.set(false);
        // Le sans-faute estime depend de la repartition.
        this.api.soloEconomics(q.id).subscribe({ next: (e) => this.soloEconomics.set(e), error: () => undefined });
        this.messages.add({
          severity: 'success',
          summary: mix ? `Repartition ${formatMix(mix)}` : 'Tirage libre retabli',
          detail: q.status === 'DRAFT' ? undefined : 'S\'applique aux prochaines parties.',
        });
      },
      error: (error) => {
        this.busy.set(false);
        this.messages.add({ severity: 'error', summary: 'Enregistrement impossible', detail: errorMessage(error) });
      },
    });
  }

  // --- Solo : cacher le quiz au joueur apres son sans-faute ---------------------------
  protected readonly formatDuration = formatDuration;
  protected readonly durationUnits = DURATION_UNITS;
  protected readonly cooldownOpen = signal(false);
  protected cooldownEnabled = false;
  protected cooldownValue: number | null = 1;
  protected cooldownUnit: DurationUnit = 'DAYS';

  protected get cooldownInvalid(): boolean {
    if (!this.cooldownEnabled) {
      return false;
    }
    const minutes = toMinutes(this.cooldownValue ?? 0, this.cooldownUnit);
    return !Number.isInteger(minutes) || minutes < 1 || minutes > MAX_DURATION_MINUTES;
  }

  protected openCooldown(): void {
    const minutes = this.quiz()?.perfectCooldownMinutes ?? null;
    this.cooldownEnabled = minutes != null;
    const current = minutes != null ? fromMinutes(minutes) : { value: 1, unit: 'DAYS' as DurationUnit };
    this.cooldownValue = current.value;
    this.cooldownUnit = current.unit;
    this.cooldownOpen.set(true);
  }

  protected saveCooldown(): void {
    const q = this.quiz();
    if (!q || this.cooldownInvalid) {
      return;
    }
    const minutes = this.cooldownEnabled ? toMinutes(this.cooldownValue ?? 0, this.cooldownUnit) : null;
    this.busy.set(true);
    this.api.setPerfectCooldown(q.id, minutes).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.quiz.set(updated);
        this.cooldownOpen.set(false);
        this.messages.add({
          severity: 'success',
          summary: minutes ? `Cache ${formatDuration(minutes)} apres un sans-faute` : 'Regle desactivee',
        });
      },
      error: (error) => {
        this.busy.set(false);
        this.messages.add({ severity: 'error', summary: 'Enregistrement impossible', detail: errorMessage(error) });
      },
    });
  }

  /** Solo : active ou coupe l'anti-fraude sur ce quiz. Les parties deja lancees gardent leur etat. */
  protected toggleAntiFraud(): void {
    const q = this.quiz();
    if (!q) {
      return;
    }
    const enabled = q.antiFraud !== true;
    this.confirmation.confirm({
      header: enabled ? 'Activer l\'anti-fraude sur ce quiz' : 'Couper l\'anti-fraude sur ce quiz',
      message: enabled
        ? 'Aucun joueur (hors staff) ne pourra plus faire de sans-faute sur ce quiz, meme hors de la liste '
          + 'anti-fraude. Seules les parties lancees ensuite sont concernees.'
        : 'Les joueurs hors de la liste anti-fraude pourront de nouveau faire un sans-faute sur ce quiz. Ceux de la '
          + 'liste restent vises (et tous si l\'interrupteur « pour tous » est active). Les parties deja lancees '
          + 'gardent leur etat.',
      acceptLabel: enabled ? 'Activer' : 'Couper',
      rejectLabel: 'Annuler',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => {
        this.busy.set(true);
        this.api.setAntiFraud(q.id, enabled).subscribe({
          next: (updated) => {
            this.busy.set(false);
            this.quiz.set(updated);
            this.messages.add({
              severity: 'success',
              summary: enabled ? 'Anti-fraude active sur ce quiz' : 'Anti-fraude coupe sur ce quiz',
            });
          },
          error: (error) => {
            this.busy.set(false);
            this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) });
          },
        });
      },
    });
  }

  /** Masque ou demasque le quiz aux joueurs : le statut, les tickets et les parties ne changent pas. */
  protected toggleHidden(): void {
    const q = this.quiz();
    if (!q) {
      return;
    }
    const hidden = !q.hidden;
    const entries = q.gameMode === 'SOLO' ? 'aucune nouvelle partie ne peut etre lancee' : 'plus aucun ticket ne peut etre achete';
    this.confirmation.confirm({
      header: hidden ? 'Masquer le quiz aux joueurs' : 'Rendre le quiz visible',
      message: hidden
        ? `Le quiz disparait des listes de l'app et ${entries}. Ceux qui ont deja un ticket le voient toujours et jouent `
          + 'normalement. Son statut ne change pas.'
        : 'Le quiz revient dans les listes de l\'app et accepte de nouveau les joueurs.',
      acceptLabel: hidden ? 'Masquer' : 'Rendre visible',
      rejectLabel: 'Annuler',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => {
        this.busy.set(true);
        this.api.setHidden(q.id, hidden).subscribe({
          next: (updated) => {
            this.busy.set(false);
            this.quiz.set(updated);
            this.messages.add({ severity: 'success', summary: hidden ? 'Quiz masque aux joueurs' : 'Quiz de nouveau visible' });
          },
          error: (error) => {
            this.busy.set(false);
            this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) });
          },
        });
      },
    });
  }

  protected duplicate(): void {
    const q = this.quiz();
    if (!q) {
      return;
    }
    this.busy.set(true);
    this.api.duplicate(q.id).subscribe({
      next: (copy) => {
        this.busy.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Copie creee en brouillon',
          detail: 'Ajustez ce qui doit changer, puis publiez.',
        });
        void this.router.navigate(['/admin/quiz', copy.id]);
      },
      error: (error) => {
        this.busy.set(false);
        this.messages.add({ severity: 'error', summary: 'Duplication impossible', detail: errorMessage(error), life: 8000 });
      },
    });
  }

  /** Solo : plus aucune partie ne peut etre lancee ; le corrige devient consultable. */
  protected close(): void {
    const q = this.quiz();
    if (!q) {
      return;
    }
    this.confirmation.confirm({
      header: 'Fermer le quiz solo',
      message: 'Plus aucune partie ne pourra etre lancee. Les parties en cours vont a leur terme. Cette action est definitive.',
      acceptLabel: 'Fermer',
      rejectLabel: 'Annuler',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.run(this.api.close(q.id), 'Quiz solo ferme'),
    });
  }

  /** Solo ouvert : les questions publiees depuis l'ouverture rejoignent le vivier. */
  protected addNewQuestions(): void {
    const q = this.quiz();
    if (!q) {
      return;
    }
    const before = q.poolSize;
    this.busy.set(true);
    this.api.addNewQuestions(q.id).subscribe({
      next: (updated) => {
        this.busy.set(false);
        const added = updated.poolSize - before;
        this.messages.add(
          added > 0
            ? { severity: 'success', summary: `${added} question(s) ajoutee(s)`, detail: `Le vivier compte desormais ${updated.poolSize} questions.` }
            : { severity: 'info', summary: 'Aucune nouvelle question', detail: 'Toutes les questions publiees du sujet sont deja dans le vivier.' },
        );
        this.load();
      },
      error: (error) => {
        this.busy.set(false);
        this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error), life: 8000 });
      },
    });
  }

  protected finalize(): void {
    const q = this.quiz();
    if (!q) {
      return;
    }
    this.confirmation.confirm({
      header: 'Figer le classement',
      message: 'Le classement sera fige et les gains verses aux gagnants. Cette action est definitive.',
      acceptLabel: 'Figer et verser',
      rejectLabel: 'Annuler',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.run(this.api.finalize(q.id), 'Classement fige, gains verses'),
    });
  }

  protected cancel(): void {
    const q = this.quiz();
    if (q && this.cancelReason.trim()) {
      this.run(this.api.cancel(q.id, this.cancelReason.trim()), q.gameMode === 'SOLO' ? 'Quiz annule' : 'Quiz annule, tickets rembourses', () =>
        this.cancelOpen.set(false),
      );
    }
  }

  private run(action: Observable<unknown>, success: string, after?: () => void): void {
    this.busy.set(true);
    action.subscribe({
      next: () => {
        this.busy.set(false);
        after?.();
        this.messages.add({ severity: 'success', summary: success });
        this.load();
      },
      error: (error) => {
        this.busy.set(false);
        this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error), life: 8000 });
      },
    });
  }
}
