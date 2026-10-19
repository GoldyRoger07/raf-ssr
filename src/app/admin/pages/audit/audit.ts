import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { HaitiDatePipe } from '../../core/format';
import { AuditEntry } from '../../core/models';

const PAGE_SIZE = 50;

/**
 * Journal d'audit, en lecture seule. Filtrable par action, type d'objet et
 * identifiant : ?entityType=User&entityId=12 donne l'historique d'un compte.
 */
@Component({
  selector: 'admin-audit',
  imports: [FormsModule, ButtonModule, InputTextModule, MessageModule, SelectModule, TableModule, HaitiDatePipe],
  templateUrl: './audit.html',
})
export default class Audit {
  private readonly api = inject(AdminApi);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly pageSize = PAGE_SIZE;
  protected action: string | null = this.query.get('action');
  protected entityType: string | null = this.query.get('entityType');
  protected entityId = this.query.get('entityId') ?? '';
  protected actorId: number | null = Number(this.query.get('actorId')) || null;

  protected readonly actions = signal<string[]>([]);
  protected readonly entityTypes = signal<string[]>([]);
  protected readonly rows = signal<AuditEntry[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly expanded = signal<number | null>(null);
  private page = 0;

  constructor() {
    this.api.auditFilters().subscribe((filters) => {
      this.actions.set(filters.actions);
      this.entityTypes.set(filters.entityTypes);
    });
    this.load();
  }

  protected apply(): void {
    this.page = 0;
    this.load();
  }

  protected reset(): void {
    this.action = null;
    this.entityType = null;
    this.entityId = '';
    this.actorId = null;
    this.apply();
  }

  /** Filtre sur l'auteur d'une ligne : « tout ce qu'a fait cette personne ». */
  protected byActor(entry: AuditEntry): void {
    this.actorId = entry.actorUserId ?? null;
    this.apply();
  }

  protected toggle(entry: AuditEntry): void {
    this.expanded.update((id) => (id === entry.id ? null : entry.id));
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
    this.api
      .audit(
        { action: this.action, entityType: this.entityType, entityId: this.entityId, actorId: this.actorId },
        this.page,
        PAGE_SIZE,
      )
      .subscribe({
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
