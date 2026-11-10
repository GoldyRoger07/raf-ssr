import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL, Page } from './api';
import {
  Economics,
  GameMode,
  Leaderboard,
  Quiz,
  QuizInput,
  QuizStatus,
  RewardTier,
  SoloEconomics,
  SoloQuizInput,
  SoloQuizStats,
  SoloStatsFilters,
  GroupQuizFilters,
  GroupQuizSort,
} from './models';

/** Quiz : configuration et cycle de vie (administrateurs). */
@Injectable()
export class QuizApi {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_BASE_URL);
  private readonly base = `${this.apiUrl}/api/admin/quizzes`;

  /** Quiz d'un statut et d'un mode, recherche et filtres facultatifs ; sans tri, les plus recents. */
  list(status: QuizStatus, mode: GameMode, page = 0, size = 20, filters?: GroupQuizFilters, sort?: GroupQuizSort): Observable<Page<Quiz>> {
    let params = new HttpParams().set('status', status).set('mode', mode).set('page', page).set('size', size);
    if (filters?.q.trim()) {
      params = params.set('q', filters.q.trim());
    }
    if (filters?.categoryId != null) {
      params = params.set('categoryId', filters.categoryId);
    }
    if (filters?.free != null) {
      params = params.set('free', filters.free);
    }
    if (filters?.test != null) {
      params = params.set('test', filters.test);
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
    return this.http.get<Page<Quiz>>(this.base, { params });
  }

  /** Activite des quiz solo d'un statut, filtree et triee (comptes de test exclus). */
  soloStats(status: QuizStatus, filters: SoloStatsFilters, page = 0, size = 20): Observable<SoloQuizStats> {
    let params = new HttpParams()
      .set('status', status)
      .set('period', filters.period)
      .set('perfect', filters.perfect)
      .set('result', filters.result)
      .set('sort', filters.sort)
      .set('page', page)
      .set('size', size);
    if (filters.q.trim()) {
      params = params.set('q', filters.q.trim());
    }
    if (filters.categoryId != null) {
      params = params.set('categoryId', filters.categoryId);
    }
    return this.http.get<SoloQuizStats>(`${this.base}/solo/stats`, { params });
  }

  get(id: number): Observable<Quiz> {
    return this.http.get<Quiz>(`${this.base}/${id}`);
  }

  create(input: QuizInput): Observable<Quiz> {
    return this.http.post<Quiz>(this.base, input);
  }

  update(id: number, input: QuizInput): Observable<Quiz> {
    return this.http.put<Quiz>(`${this.base}/${id}`, input);
  }

  createSolo(input: SoloQuizInput): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.base}/solo`, input);
  }

  updateSolo(id: number, input: SoloQuizInput): Observable<Quiz> {
    return this.http.put<Quiz>(`${this.base}/solo/${id}`, input);
  }

  /** Copie le quiz (quel que soit son etat) dans un nouveau brouillon. */
  duplicate(id: number): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.base}/${id}/duplicate`, {});
  }

  /** Marque (ou demarque) un quiz de test : invisible des joueurs, hors resultat du jeu. */
  setTest(id: number, test: boolean): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.base}/${id}/test`, { test });
  }

  /** Solo : plus aucune partie ne peut etre lancee. */
  close(id: number): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.base}/${id}/close`, {});
  }

  /** Solo ouvert : ajoute au vivier les questions publiees depuis l'ouverture, sans rien retirer. */
  addNewQuestions(id: number): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.base}/${id}/pool/add-new`, {});
  }

  configureTopics(id: number, categoryIds: number[]): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.base}/${id}/topics`, categoryIds);
  }

  configureRewards(id: number, tiers: RewardTier[]): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.base}/${id}/rewards`, tiers);
  }

  economics(id: number): Observable<Economics> {
    return this.http.get<Economics>(`${this.base}/${id}/economics`);
  }

  soloEconomics(id: number): Observable<SoloEconomics> {
    return this.http.get<SoloEconomics>(`${this.base}/${id}/solo-economics`);
  }

  /** Simulation pendant la saisie : rien n'est enregistre. */
  previewSoloEconomics(
    categoryId: number,
    entryPriceCredits: number,
    prizeHtg: number,
    questionsPerGame: number,
  ): Observable<SoloEconomics> {
    const params = new HttpParams()
      .set('categoryId', categoryId)
      .set('entryPriceCredits', entryPriceCredits)
      .set('prizeHtg', prizeHtg)
      .set('questionsPerGame', questionsPerGame);
    return this.http.get<SoloEconomics>(`${this.base}/solo/economics`, { params });
  }

  publish(id: number, voteDurationMinutes: number | null): Observable<Quiz> {
    let params = new HttpParams();
    if (voteDurationMinutes) {
      params = params.set('voteDurationMinutes', voteDurationMinutes);
    }
    return this.http.post<Quiz>(`${this.base}/${id}/publish`, {}, { params });
  }

  closeVote(id: number, overrideTopicId: number | null): Observable<Quiz> {
    let params = new HttpParams();
    if (overrideTopicId) {
      params = params.set('overrideTopicId', overrideTopicId);
    }
    return this.http.post<Quiz>(`${this.base}/${id}/close-vote`, {}, { params });
  }

  start(id: number): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.base}/${id}/start`, {});
  }

  cancel(id: number, reason: string): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.base}/${id}/cancel`, { reason });
  }

  /** Fige le classement et verse les gains sans attendre l'ordonnanceur. */
  finalize(id: number): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.apiUrl}/api/admin/quizzes/${id}/finalize`, {});
  }

  /**
   * Classement final vu du back-office. Tris : rank, player, score, reward ; sans tri, le rang.
   * `rewarded` : avec (true) ou sans (false) gain.
   */
  leaderboard(
    id: number,
    page = 0,
    size = 50,
    filters: { q?: string; rewarded?: boolean | null } = {},
    sort?: { field: string; direction: 'asc' | 'desc' },
  ): Observable<Leaderboard> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters.q?.trim()) {
      params = params.set('q', filters.q.trim());
    }
    if (filters.rewarded != null) {
      params = params.set('rewarded', filters.rewarded);
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
    return this.http.get<Leaderboard>(`${this.base}/${id}/leaderboard`, { params });
  }
}
