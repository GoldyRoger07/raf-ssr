import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Subject, debounceTime } from 'rxjs';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { CreditsPipe, HaitiDatePipe, HtgPipe } from '../../core/format';
import { PlayerSummary } from '../../core/models';

const PAGE_SIZE = 20;

@Component({
  selector: 'admin-players',
  imports: [
    FormsModule,
    RouterLink,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    TableModule,
    TagModule,
    CreditsPipe,
    HtgPipe,
    HaitiDatePipe,
  ],
  templateUrl: './players.html',
})
export default class Players {
  private readonly api = inject(AdminApi);

  protected readonly pageSize = PAGE_SIZE;
  protected query = '';
  protected readonly rows = signal<PlayerSummary[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  private page = 0;
  private readonly typed = new Subject<void>();

  constructor() {
    this.typed.pipe(debounceTime(300), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      this.page = 0;
      this.load();
    });
    this.load();
  }

  protected onInput(): void {
    this.typed.next();
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const page = Math.floor((event.first ?? 0) / PAGE_SIZE);
    if (page !== this.page) {
      this.page = page;
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.searchPlayers(this.query.trim(), this.page, PAGE_SIZE).subscribe({
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
