import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { Observable } from 'rxjs';

import { errorMessage } from '../../core/api';
import { CreditsPipe, HaitiDatePipe, HtgPipe } from '../../core/format';
import { PLAY_MODE, quizStatus } from '../../core/labels';
import { Economics, Leaderboard, Quiz, RewardTier } from '../../core/models';
import { QuizApi } from '../../core/quiz-api.service';

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
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
    CreditsPipe,
    HtgPipe,
    HaitiDatePipe,
  ],
  templateUrl: './quiz-detail.html',
})
export default class QuizDetail implements OnInit {
  private readonly api = inject(QuizApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly quizStatus = quizStatus;
  protected readonly playModes = PLAY_MODE;

  protected readonly quiz = signal<Quiz | null>(null);
  protected readonly economics = signal<Economics | null>(null);
  protected readonly leaderboard = signal<Leaderboard | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  /** Taux du credit, deduit du quiz (prix en credits et en gourdes). */
  protected readonly htgRate = computed(() => {
    const q = this.quiz();
    return q && q.ticketPriceCredits ? q.ticketPriceHtg / q.ticketPriceCredits : 0;
  });

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
    const price = q.ticketPriceCredits;
    const minRevenue = price * q.minPlayers;
    return {
      total,
      breakEven: price > 0 ? Math.ceil(total / price) : 0,
      margin: minRevenue - total,
    };
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  protected load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.get(id).subscribe({
      next: (quiz) => {
        this.quiz.set(quiz);
        this.economics.set(null);
        this.leaderboard.set(null);
        if (quiz.gameMode === 'GROUP' && quiz.rewards.length) {
          this.api.economics(id).subscribe((e) => this.economics.set(e));
        }
        if (quiz.gameMode === 'GROUP' && quiz.status === 'FINISHED') {
          this.api.leaderboard(id).subscribe((board) => this.leaderboard.set(board));
        }
      },
      error: (error) => this.error.set(errorMessage(error)),
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
