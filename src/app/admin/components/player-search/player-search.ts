import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';

import { AdminApi } from '../../core/admin-api.service';
import { HtgPipe } from '../../core/format';
import { PlayerSummary } from '../../core/models';

/** Recherche d'un joueur par telephone, email ou nom ; emet le joueur choisi. */
@Component({
  selector: 'player-search',
  imports: [FormsModule, IconFieldModule, InputIconModule, InputTextModule, HtgPipe],
  templateUrl: './player-search.html',
})
export class PlayerSearch {
  private readonly api = inject(AdminApi);

  readonly selected = output<PlayerSummary>();

  protected query = '';
  protected readonly results = signal<PlayerSummary[]>([]);
  protected readonly searching = signal(false);
  protected readonly searched = signal(false);
  private readonly queries = new Subject<string>();

  constructor() {
    this.queries
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.trim().length < 3) {
            this.searched.set(false);
            return of(null);
          }
          this.searching.set(true);
          return this.api.searchPlayers(query.trim(), 0, 8).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((page) => {
        this.searching.set(false);
        this.results.set(page?.content ?? []);
        this.searched.set(page !== null);
      });
  }

  protected onInput(): void {
    this.queries.next(this.query);
  }

  protected choose(player: PlayerSummary): void {
    this.selected.emit(player);
    this.query = '';
    this.results.set([]);
    this.searched.set(false);
  }
}
