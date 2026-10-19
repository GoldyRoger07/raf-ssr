import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { CreditsPipe, HaitiDatePipe, HtgPipe } from '../../core/format';
import { runStatus } from '../../core/labels';
import { ReconciliationRun } from '../../core/models';

/** Detail d'un rapprochement : chaque ecart, avec ce qui etait attendu et ce qui est enregistre. */
@Component({
  selector: 'admin-reconciliation-detail',
  imports: [RouterLink, MessageModule, TableModule, TagModule, CreditsPipe, HaitiDatePipe, HtgPipe],
  templateUrl: './reconciliation-detail.html',
})
export default class ReconciliationDetail {
  private readonly api = inject(AdminApi);

  protected readonly runStatus = runStatus;
  protected readonly run = signal<ReconciliationRun | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    const id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
    this.api.reconciliationRun(id).subscribe({
      next: (run) => this.run.set(run),
      error: (error) => this.error.set(errorMessage(error)),
    });
  }
}
