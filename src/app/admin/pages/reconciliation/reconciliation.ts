import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Subject, debounceTime } from 'rxjs';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { HaitiDatePipe, HtgPipe } from '../../core/format';
import { runStatus } from '../../core/labels';
import { ReconciliationRun } from '../../core/models';
import { PAGE_SIZE_OPTIONS, TableState } from '../../core/table-state';

const PAGE_SIZE = 20;

/** Historique du rapprochement comptable, et lancement a la demande. */
@Component({
  selector: 'admin-reconciliation',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TagModule,
    HaitiDatePipe,
    HtgPipe,
  ],
  templateUrl: './reconciliation.html',
})
export default class Reconciliation {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  protected readonly table = new TableState(
    ['startedAt', 'status', 'findingCount', 'walletsChecked', 'totalWinningsBalance', 'totalCreditBalance'],
    PAGE_SIZE,
  );
  protected readonly pageSizes = PAGE_SIZE_OPTIONS;
  protected filters: { q: string; status: string | null; trigger: string | null; from: string | null; to: string | null } = {
    q: '',
    status: null,
    trigger: null,
    from: null,
    to: null,
  };
  protected readonly statusOptions = [
    { label: 'Aucun ecart', value: 'OK' },
    { label: 'Avec ecarts', value: 'DISCREPANCIES' },
    { label: 'Echec du controle', value: 'FAILED' },
  ];
  protected readonly triggerOptions = [
    { label: 'Planifie', value: 'SCHEDULED' },
    { label: 'Manuel', value: 'MANUAL' },
  ];
  private readonly typed = new Subject<void>();
  protected readonly runStatus = runStatus;
  protected readonly rows = signal<ReconciliationRun[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly running = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.typed.pipe(debounceTime(300), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.apply());
    this.load();
  }

  protected get filtered(): boolean {
    const f = this.filters;
    return !!f.q.trim() || !!f.status || !!f.trigger || !!f.from || !!f.to;
  }

  protected onInput(): void {
    this.typed.next();
  }

  protected apply(): void {
    this.table.restart();
    this.load();
  }

  protected reset(): void {
    this.filters = { q: '', status: null, trigger: null, from: null, to: null };
    this.table.reset();
    this.load();
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    if (this.table.onLazyLoad(event)) {
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
          this.table.restart();
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
    this.api.reconciliationRuns(this.table.page, this.table.pageSize, this.filters, this.table.sort ?? undefined).subscribe({
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
