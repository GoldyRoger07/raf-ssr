import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL, Page } from './api';
import { Economics, GameMode, Leaderboard, Quiz, QuizInput, QuizStatus, RewardTier, SoloEconomics, SoloQuizInput } from './models';

/** Quiz : configuration et cycle de vie (administrateurs). */
@Injectable()
export class QuizApi {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_BASE_URL);
  private readonly base = `${this.apiUrl}/api/admin/quizzes`;

  list(status: QuizStatus, mode: GameMode, page = 0, size = 20): Observable<Page<Quiz>> {
    const params = new HttpParams().set('status', status).set('mode', mode).set('page', page).set('size', size);
    return this.http.get<Page<Quiz>>(this.base, { params });
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

  /** Solo : plus aucune partie ne peut etre lancee. */
  close(id: number): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.base}/${id}/close`, {});
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

  leaderboard(id: number, page = 0, size = 50): Observable<Leaderboard> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Leaderboard>(`${this.apiUrl}/api/quizzes/${id}/leaderboard`, { params });
  }
}
