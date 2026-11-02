import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Subscription, catchError, filter, fromEvent, merge, of, switchMap, timer } from 'rxjs';

import { API_BASE_URL } from './api';

const PREF_KEY = 'raf-admin-topup-available';

/** Intervalle des signaux ; le backend compte un agent hors ligne apres 120 s sans signal. */
const HEARTBEAT_MS = 30_000;

interface AgentStatus {
  online: boolean;
  available: boolean;
}

/**
 * Interrupteur « Disponible pour les recharges ». Tant qu'il est active, un signal
 * part toutes les 30 s (et aussitot que l'onglet redevient visible) : les joueurs
 * voient alors un agent en ligne dans l'app.
 *
 * Le choix survit a un rechargement de page, pas a une deconnexion. Fourni par la
 * mise en page du back-office : il s'arrete avec elle.
 */
@Injectable()
export class TopUpPresence {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly base = `${inject(API_BASE_URL)}/api/admin/topup-availability`;

  /** Choix de l'agent. */
  readonly enabled = signal(false);
  /** Confirme par le backend au dernier signal. */
  readonly online = signal(false);
  /** Le dernier signal a echoue (reseau, serveur). */
  readonly failing = signal(false);

  private beats: Subscription | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopBeats());
  }

  /** Reprend le choix fait avant un rechargement de page (administrateurs seulement). */
  restore(): void {
    if (localStorage.getItem(PREF_KEY) === '1') {
      this.setEnabled(true);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled.set(enabled);
    if (enabled) {
      localStorage.setItem(PREF_KEY, '1');
      this.startBeats();
    } else {
      localStorage.removeItem(PREF_KEY);
      this.stopBeats();
      this.online.set(false);
      this.failing.set(false);
      this.http.delete<AgentStatus>(`${this.base}/heartbeat`).subscribe({ error: () => undefined });
    }
  }

  /** A appeler avant la deconnexion, tant que le jeton est encore valable. */
  signOff(): void {
    if (this.enabled()) {
      this.setEnabled(false);
    }
  }

  private startBeats(): void {
    this.stopBeats();
    const visible = fromEvent(this.document, 'visibilitychange').pipe(
      filter(() => this.document.visibilityState === 'visible'),
    );
    this.beats = merge(timer(0, HEARTBEAT_MS), visible)
      .pipe(
        switchMap(() =>
          this.http.post<AgentStatus>(`${this.base}/heartbeat`, null).pipe(catchError(() => of(null))),
        ),
      )
      .subscribe((status) => {
        this.failing.set(status === null);
        this.online.set(status?.online ?? false);
      });
  }

  private stopBeats(): void {
    this.beats?.unsubscribe();
    this.beats = null;
  }
}
