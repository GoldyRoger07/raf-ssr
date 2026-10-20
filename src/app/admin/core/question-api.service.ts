import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL, Page } from './api';
import {
  AiStatus,
  Category,
  CategoryInput,
  GenerateInput,
  GenerationReport,
  ImportReport,
  PoolStatus,
  Question,
  QuestionInput,
  QuestionSource,
  QuestionStatus,
} from './models';

/** Banque de questions et categories (moderateurs et administrateurs). */
@Injectable()
export class QuestionApi {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_BASE_URL);
  private readonly base = `${this.apiUrl}/api/admin/questions`;

  // --- Questions ------------------------------------------------------------------

  list(status: QuestionStatus, categoryId: number | null, page = 0, size = 20, source: QuestionSource | null = null): Observable<Page<Question>> {
    let params = new HttpParams()
      .set('status', status)
      .set('page', page)
      .set('size', size)
      .set('sort', 'createdAt,desc');
    if (categoryId) {
      params = params.set('categoryId', categoryId);
    }
    if (source) {
      params = params.set('source', source);
    }
    return this.http.get<Page<Question>>(this.base, { params });
  }

  search(term: string, page = 0, size = 20): Observable<Page<Question>> {
    const params = new HttpParams().set('q', term).set('page', page).set('size', size);
    return this.http.get<Page<Question>>(`${this.base}/search`, { params });
  }

  get(id: number): Observable<Question> {
    return this.http.get<Question>(`${this.base}/${id}`);
  }

  create(input: QuestionInput): Observable<Question> {
    return this.http.post<Question>(this.base, input);
  }

  update(id: number, input: QuestionInput): Observable<Question> {
    return this.http.put<Question>(`${this.base}/${id}`, input);
  }

  changeStatus(id: number, status: QuestionStatus): Observable<Question> {
    const params = new HttpParams().set('status', status);
    return this.http.post<Question>(`${this.base}/${id}/status`, {}, { params });
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }

  importCsv(categoryId: number, file: File, publishDirectly: boolean): Observable<ImportReport> {
    const form = new FormData();
    form.append('file', file);
    const params = new HttpParams().set('categoryId', categoryId).set('publishDirectly', publishDirectly);
    return this.http.post<ImportReport>(`${this.base}/import`, form, { params });
  }

  aiStatus(): Observable<AiStatus> {
    return this.http.get<AiStatus>(`${this.base}/ai/status`);
  }

  /** Les questions generees arrivent en brouillon. La reponse peut prendre une minute. */
  generate(input: GenerateInput): Observable<GenerationReport> {
    return this.http.post<GenerationReport>(`${this.base}/ai/generate`, input);
  }

  poolStatus(categoryId: number, questionsPerGame: number): Observable<PoolStatus> {
    const params = new HttpParams().set('categoryId', categoryId).set('questionsPerGame', questionsPerGame);
    return this.http.get<PoolStatus>(`${this.base}/pool-status`, { params });
  }

  // --- Categories -------------------------------------------------------------------

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/api/categories/all`);
  }

  createCategory(input: CategoryInput): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/api/categories`, input);
  }

  updateCategory(id: number, input: CategoryInput): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/api/categories/${id}`, input);
  }

  /** Interrupteurs En groupe / Solo (administrateurs). Un champ absent reste inchange. */
  configureCategoryModes(id: number, modes: { groupEnabled?: boolean; soloEnabled?: boolean }): Observable<Category> {
    return this.http.patch<Category>(`${this.apiUrl}/api/categories/${id}/modes`, modes);
  }

  deleteCategory(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/api/categories/${id}`);
  }
}
