import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL, Page } from './api';
import {
  AdminWithdrawal,
  BalanceType,
  Dashboard,
  PlayerSummary,
  Wallet,
  WalletTransaction,
  Withdrawal,
  WithdrawalStatus,
} from './models';

/** Appels du back-office au backend (endpoints /api/admin). */
@Injectable()
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/api/admin`;

  // --- Tableau de bord et joueurs ---------------------------------------------

  dashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.base}/dashboard`);
  }

  searchPlayers(query: string, page = 0, size = 20): Observable<Page<PlayerSummary>> {
    const params = new HttpParams().set('query', query).set('page', page).set('size', size);
    return this.http.get<Page<PlayerSummary>>(`${this.base}/players`, { params });
  }

  player(id: number): Observable<PlayerSummary> {
    return this.http.get<PlayerSummary>(`${this.base}/players/${id}`);
  }

  // --- Portefeuille -------------------------------------------------------------

  wallet(userId: number): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.base}/wallet/users/${userId}`);
  }

  transactions(userId: number, page = 0, size = 20): Observable<Page<WalletTransaction>> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'createdAt,desc');
    return this.http.get<Page<WalletTransaction>>(`${this.base}/wallet/users/${userId}/transactions`, {
      params,
    });
  }

  manualTopUp(userId: number, amountHtg: number, reference: string, note: string | null): Observable<unknown> {
    return this.http.post(`${this.base}/wallet/topups/manual`, { userId, amountHtg, reference, note });
  }

  adjust(userId: number, balanceType: BalanceType, amountCredits: number, reason: string): Observable<unknown> {
    return this.http.post(`${this.base}/wallet/users/${userId}/adjust`, {
      balanceType,
      amountCredits,
      reason,
    });
  }

  // --- Retraits -------------------------------------------------------------------

  withdrawals(status: WithdrawalStatus, page = 0, size = 20): Observable<Page<AdminWithdrawal>> {
    const params = new HttpParams().set('status', status).set('page', page).set('size', size);
    return this.http.get<Page<AdminWithdrawal>>(`${this.base}/wallet/withdrawals`, { params });
  }

  playerWithdrawals(userId: number, page = 0, size = 20): Observable<Page<AdminWithdrawal>> {
    const params = new HttpParams().set('userId', userId).set('page', page).set('size', size);
    return this.http.get<Page<AdminWithdrawal>>(`${this.base}/wallet/withdrawals`, { params });
  }

  approve(id: number): Observable<Withdrawal> {
    return this.http.post<Withdrawal>(`${this.base}/wallet/withdrawals/${id}/approve`, {});
  }

  reject(id: number, reason: string): Observable<Withdrawal> {
    return this.http.post<Withdrawal>(`${this.base}/wallet/withdrawals/${id}/reject`, { reason });
  }

  sendPickupCode(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/wallet/withdrawals/${id}/pickup-code`, {});
  }

  markPaid(id: number, payoutReference: string | null, pickupCode: string | null): Observable<Withdrawal> {
    return this.http.post<Withdrawal>(`${this.base}/wallet/withdrawals/${id}/paid`, {
      payoutReference,
      pickupCode,
    });
  }

  // --- Retrait au guichet ------------------------------------------------------------

  initiateCounterWithdrawal(userId: number, amountHtg: number, note: string | null): Observable<Withdrawal> {
    return this.http.post<Withdrawal>(`${this.base}/wallet/users/${userId}/counter-withdrawals`, {
      amountHtg,
      note,
    });
  }

  confirmCounterWithdrawal(id: number, otpCode: string, receiptReference: string | null): Observable<Withdrawal> {
    return this.http.post<Withdrawal>(`${this.base}/wallet/counter-withdrawals/${id}/confirm`, {
      otpCode,
      receiptReference,
    });
  }

  cancelCounterWithdrawal(id: number): Observable<Withdrawal> {
    return this.http.post<Withdrawal>(`${this.base}/wallet/counter-withdrawals/${id}/cancel`, {});
  }
}
