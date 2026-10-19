import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { HaitiDatePipe, HtgPipe } from '../../core/format';
import { runStatus } from '../../core/labels';
import { ReconciliationRun } from '../../core/models';

const PAGE_SIZE = 20;

/** Historique du rapprochement comptable, et lancement a la demande. */
@Component({
  selector: 'admin-reconciliation',
  imports: [RouterLink, ButtonModule, MessageModule, TableModule, TagModule, HaitiDatePipe, HtgPipe],
  templateUrl: './reconciliation.html',
})
export default class Reconciliation {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly runStatus = runStatus;
  protected readonly rows = signal<ReconciliationRun[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly running = signal(false);
  protected readonly error = signal<string | null>(null);
  private page = 0;

  constructor() {
    this.load();
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const page = Math.floor((event.first ?? 0) / PAGE_SIZE);
    if (page !== this.page) {
      this.page = page;
      this.load();
    }
  }

  protected run(): void {
    this.running.set(true);
    this.api.runReconciliation().subscribe({
      next: (run) => {
        this.running.set(false);
        const status = runStatus(run);
        this.messages.add({
          severity: run.status === 'OK' ? 'success' : 'error',
          summary: 'Rapprochement termine',
          detail: status.label,
        });
        if (run.status === 'OK') {
          this.page = 0;
          this.load();
        } else {
          this.router.navigate(['/admin/rapprochement', run.id]);
        }
      },
      error: (error) => {
        this.running.set(false);
        this.messages.add({ severity: 'error', summary: 'Rapprochement impossible', detail: errorMessage(error) });
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.reconciliationRuns(this.page, PAGE_SIZE).subscribe({
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
