import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { CreditsPipe, HaitiDatePipe, HtgPipe } from '../../core/format';
import { QUIZ_STATUS } from '../../core/labels';
import { Dashboard as DashboardData } from '../../core/models';

@Component({
  selector: 'admin-dashboard',
  imports: [RouterLink, ButtonModule, MessageModule, SkeletonModule, TagModule, HtgPipe, CreditsPipe, HaitiDatePipe],
  templateUrl: './dashboard.html',
})
export default class Dashboard implements OnInit {
  private readonly api = inject(AdminApi);
  protected readonly auth = inject(AuthService);

  protected readonly data = signal<DashboardData | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);

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

  protected load(): void {
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
