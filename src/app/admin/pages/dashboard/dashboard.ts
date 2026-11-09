import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import { ChartSeries, TrendChart } from '../../components/trend-chart/trend-chart';
import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { CreditsPipe, HaitiDatePipe, HtgPipe, formatNumber } from '../../core/format';
import { QUIZ_STATUS } from '../../core/labels';
import { DailyStats, Dashboard as DashboardData, DayStats, GameProfit, ProfitPeriod } from '../../core/models';

type DayMetric = Exclude<keyof DayStats, 'date'>;

/** Chiffres compares a hier. higherIsBetter : sens d'une progression (les sorties d'argent s'inversent). */
const COMPARED: { key: DayMetric; label: string; htg: boolean; higherIsBetter: boolean }[] = [
  { key: 'salesHtg', label: 'Ventes de jeu', htg: true, higherIsBetter: true },
  { key: 'resultHtg', label: 'Resultat du jeu', htg: true, higherIsBetter: true },
  { key: 'activePlayers', label: 'Joueurs actifs', htg: false, higherIsBetter: true },
  { key: 'newPlayers', label: 'Nouveaux joueurs', htg: false, higherIsBetter: true },
  { key: 'ticketsSold', label: 'Tickets vendus', htg: false, higherIsBetter: true },
  { key: 'soloGames', label: 'Parties solo', htg: false, higherIsBetter: true },
  { key: 'topUpsHtg', label: 'Recharges', htg: true, higherIsBetter: true },
  { key: 'prizesHtg', label: 'Gains verses', htg: true, higherIsBetter: false },
  { key: 'withdrawalsPaidHtg', label: 'Retraits verses', htg: true, higherIsBetter: false },
];

export interface Comparison {
  key: DayMetric;
  label: string;
  today: string;
  reference: string;
  /** « +12 % » ; null si hier etait a zero. */
  percent: string | null;
  /** « +1 200 HTG » */
  difference: string;
  trend: 'up' | 'down' | 'flat';
  tone: 'good' | 'bad' | 'neutral';
}

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
    TrendChart,
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

  // Aujourd'hui compare a hier, et tendances jour par jour
  protected readonly daily = signal<DailyStats | null>(null);
  protected readonly dailyError = signal<string | null>(null);
  protected readonly dailyLoading = signal(false);
  protected readonly compareOptions = [
    { label: 'Hier a la meme heure', value: 'sameTime' },
    { label: 'Hier, journee entiere', value: 'fullDay' },
  ];
  protected readonly compareTo = signal<'sameTime' | 'fullDay'>('sameTime');
  protected readonly rangeOptions = [
    { label: '7 jours', value: 7 },
    { label: '14 jours', value: 14 },
    { label: '30 jours', value: 30 },
    { label: '90 jours', value: 90 },
  ];
  protected readonly range = signal(30);

  /** Pastille de tendance : vert en progression, rouge en recul (avec fleche et texte). */
  protected readonly toneClass: Record<Comparison['tone'], string> = {
    good: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
    bad: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };

  protected readonly comparisons = computed<Comparison[]>(() => {
    const d = this.daily();
    if (!d) return [];
    const reference = this.compareTo() === 'sameTime' ? d.yesterdaySameTime : d.yesterday;
    return COMPARED.map(({ key, label, htg, higherIsBetter }) => {
      const now = d.today[key];
      const before = reference[key];
      const diff = now - before;
      const show = (v: number) => (htg ? `${formatNumber(v)} HTG` : formatNumber(v));
      const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
      const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
      return {
        key,
        label,
        today: show(now),
        reference: show(before),
        percent:
          before === 0 ? null : `${sign}${formatNumber(Math.round((Math.abs(diff) / Math.abs(before)) * 100))} %`,
        difference: `${sign}${show(Math.abs(diff))}`,
        trend,
        tone: trend === 'flat' ? 'neutral' : (trend === 'up') === higherIsBetter ? 'good' : 'bad',
      };
    });
  });

  /** Nombre de chiffres en progression (dans le bon sens) et en recul. */
  protected readonly balance = computed(() => {
    const c = this.comparisons();
    return { good: c.filter((x) => x.tone === 'good').length, bad: c.filter((x) => x.tone === 'bad').length };
  });

  protected readonly dates = computed(() => this.daily()?.days.map((d) => d.date) ?? []);

  private serie(label: string, color: ChartSeries['color'], key: DayMetric): ChartSeries {
    return { label, color, values: this.daily()?.days.map((d) => d[key]) ?? [] };
  }

  protected readonly salesChart = computed(() => [
    this.serie('Ventes de jeu', 'blue', 'salesHtg'),
    this.serie('Gains verses', 'orange', 'prizesHtg'),
  ]);
  protected readonly resultChart = computed(() => [this.serie('Resultat du jeu', 'blue', 'resultHtg')]);
  protected readonly playersChart = computed(() => [
    this.serie('Joueurs actifs', 'blue', 'activePlayers'),
    this.serie('Nouveaux joueurs', 'orange', 'newPlayers'),
  ]);
  protected readonly cashChart = computed(() => [
    this.serie('Recharges', 'blue', 'topUpsHtg'),
    this.serie('Retraits verses', 'orange', 'withdrawalsPaidHtg'),
  ]);

  protected changeRange(days: number | null): void {
    if (days && days !== this.range()) {
      this.range.set(days);
      this.loadDaily();
    }
  }

  protected loadDaily(): void {
    this.dailyLoading.set(true);
    this.dailyError.set(null);
    this.api.daily(this.range()).subscribe({
      next: (daily) => {
        this.daily.set(daily);
        this.dailyLoading.set(false);
      },
      error: (error) => {
        this.dailyError.set(errorMessage(error));
        this.dailyLoading.set(false);
      },
    });
  }

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
    this.loadDaily();
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
