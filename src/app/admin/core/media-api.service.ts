import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL, Page } from './api';
import { MediaFile } from './models';

/** Images du projet : televersement, liste, suppression (moderateurs et administrateurs). */
@Injectable()
export class MediaApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/api/media`;

  list(folder: string | null, page = 0, size = 24): Observable<Page<MediaFile>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (folder) {
      params = params.set('folder', folder);
    }
    return this.http.get<Page<MediaFile>>(this.base, { params });
  }

  get(id: number): Observable<MediaFile> {
    return this.http.get<MediaFile>(`${this.base}/${id}`);
  }

  folders(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/folders`);
  }

  /** Le serveur verifie, reduit et reencode l'image avant de l'enregistrer. */
  upload(file: File, folder: string): Observable<MediaFile> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<MediaFile>(`${this.base}/upload`, form, { params: new HttpParams().set('folder', folder) });
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
