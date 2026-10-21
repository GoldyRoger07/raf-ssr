import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { CreditsPipe, HaitiDatePipe, HtgPipe } from '../../core/format';
import { QUIZ_STATUS } from '../../core/labels';
import { Dashboard as DashboardData, GameProfit, ProfitPeriod } from '../../core/models';

@Component({
  selector: 'admin-dashboard',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    MessageModule,
    SelectButtonModule,
    SkeletonModule,
    TagModule,
    HtgPipe,
    CreditsPipe,
    HaitiDatePipe,
  ],
  templateUrl: './dashboard.html',
})
export default class Dashboard implements OnInit {
  private readonly api = inject(AdminApi);
  protected readonly auth = inject(AuthService);

  protected readonly data = signal<DashboardData | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);

  // Resultat du jeu
  protected readonly periodOptions: { label: string; value: ProfitPeriod }[] = [
    { label: '7 jours', value: 'LAST_7_DAYS' },
    { label: '30 jours', value: 'LAST_30_DAYS' },
    { label: 'Ce mois-ci', value: 'THIS_MONTH' },
    { label: 'Mois dernier', value: 'LAST_MONTH' },
    { label: 'Depuis le lancement', value: 'ALL_TIME' },
  ];
  protected readonly period = signal<ProfitPeriod>('LAST_30_DAYS');
  protected readonly profit = signal<GameProfit | null>(null);
  protected readonly profitError = signal<string | null>(null);
  protected readonly profitLoading = signal(false);

  /** Quiz par statut, dans l'ordre du cycle de vie, sans les statuts vides. */
  protected readonly quizzes = computed(() => {
    const counts = this.data()?.quizzesByStatus ?? {};
    return Object.entries(QUIZ_STATUS).map(([status, label]) => ({
      status,
      label,
      count: counts[status] ?? 0,
    }));
  });

  ngOnInit(): void {
    if (this.auth.isAdmin()) {
      this.load();
    }
  }

  protected changePeriod(period: ProfitPeriod | null): void {
    // SelectButton renvoie null quand on reclique l'option active : on la garde.
    if (period && period !== this.period()) {
      this.period.set(period);
      this.loadProfit();
    }
  }

  protected loadProfit(): void {
    this.profitLoading.set(true);
    this.profitError.set(null);
    this.api.profit(this.period()).subscribe({
      next: (profit) => {
        this.profit.set(profit);
        this.profitLoading.set(false);
      },
      error: (error) => {
        this.profitError.set(errorMessage(error));
        this.profitLoading.set(false);
      },
    });
  }

  protected load(): void {
    this.loadProfit();
    this.loading.set(true);
    this.error.set(null);
    this.api.dashboard().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }
}
