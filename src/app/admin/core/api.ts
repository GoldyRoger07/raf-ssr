import { HttpErrorResponse } from '@angular/common/http';
import { InjectionToken } from '@angular/core';

/** Adresse du backend. En dev, le backend tourne sur le port 8081. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:8081',
});

/** Page Spring Data, telle que serialisee par le backend. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** Corps d'erreur unique du backend (ApiError). */
export interface ApiError {
  status: number;
  code: string;
  message: string;
  fieldErrors?: { field: string; message: string }[];
}

/** Message lisible a afficher pour une erreur d'appel au backend. */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Le serveur est injoignable. Verifiez votre connexion.';
    }
    const body = error.error as Partial<ApiError> | null;
    if (body?.fieldErrors?.length) {
      return body.fieldErrors.map((f) => f.message).join(' ');
    }
    if (body?.message) {
      return body.message;
    }
  }
  return 'Une erreur inattendue est survenue.';
}

/** Code d'erreur stable du backend (ex. OTP_INVALID), ou null. */
export function errorCode(error: unknown): string | null {
  if (error instanceof HttpErrorResponse) {
    return (error.error as Partial<ApiError> | null)?.code ?? null;
  }
  return null;
}
