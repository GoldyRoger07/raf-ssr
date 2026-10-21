import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL, Page } from './api';
import {
  AdminGameSession,
  AdminWithdrawal,
  AppSetting,
  AuditEntry,
  AuditFilters,
  GameProfit,
  GameReview,
  ReconciliationRun,
  RoleName,
  SocialLinks,
  UserResponse,
  UserStatus,
  BalanceType,
  Dashboard,
  PlayerSummary,
  ProfitPeriod,
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

  profit(period: ProfitPeriod): Observable<GameProfit> {
    return this.http.get<GameProfit>(`${this.base}/dashboard/profit`, { params: { period } });
  }

  // --- Parametres (super-administrateur) ------------------------------------------

  settings(): Observable<AppSetting[]> {
    return this.http.get<AppSetting[]>(`${this.base}/settings`);
  }

  updateSetting(key: string, value: number): Observable<AppSetting> {
    return this.http.put<AppSetting>(`${this.base}/settings/${encodeURIComponent(key)}`, { value: String(value) });
  }

  social(): Observable<SocialLinks> {
    return this.http.get<SocialLinks>(`${this.base}/social`);
  }

  /** `instagramAccount` : adresse du profil, nom d'utilisateur ou @nom ; vide pour retirer le compte. */
  updateSocial(instagramEnabled: boolean, instagramAccount: string | null): Observable<SocialLinks> {
    return this.http.put<SocialLinks>(`${this.base}/social`, { instagramEnabled, instagramAccount });
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

  adjust(userId: number, balanceType: BalanceType, amount: number, reason: string): Observable<unknown> {
    return this.http.post(`${this.base}/wallet/users/${userId}/adjust`, {
      balanceType,
      amount,
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

  // --- Parties signalees ------------------------------------------------------------

  flaggedSessions(page = 0, size = 50): Observable<Page<AdminGameSession>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<AdminGameSession>>(`${this.base}/game/sessions/flagged`, { params });
  }

  quizSessions(quizId: number, flaggedOnly: boolean, page = 0, size = 50): Observable<Page<AdminGameSession>> {
    const params = new HttpParams().set('flagged', flaggedOnly).set('page', page).set('size', size);
    return this.http.get<Page<AdminGameSession>>(`${this.base}/quizzes/${quizId}/sessions`, { params });
  }

  sessionReview(sessionId: number): Observable<GameReview> {
    return this.http.get<GameReview>(`${this.base}/game/sessions/${sessionId}/review`);
  }

  invalidateSession(sessionId: number, reason: string): Observable<AdminGameSession> {
    return this.http.post<AdminGameSession>(`${this.base}/game/sessions/${sessionId}/invalidate`, { reason });
  }

  // --- Rapprochement comptable -------------------------------------------------------

  reconciliationRuns(page = 0, size = 20): Observable<Page<ReconciliationRun>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<ReconciliationRun>>(`${this.base}/reconciliation/runs`, { params });
  }

  reconciliationRun(id: number): Observable<ReconciliationRun> {
    return this.http.get<ReconciliationRun>(`${this.base}/reconciliation/runs/${id}`);
  }

  runReconciliation(): Observable<ReconciliationRun> {
    return this.http.post<ReconciliationRun>(`${this.base}/reconciliation/runs`, {});
  }

  // --- Journal d'audit ------------------------------------------------------------------

  audit(
    filters: { action?: string | null; entityType?: string | null; entityId?: string | null; actorId?: number | null },
    page = 0,
    size = 50,
  ): Observable<Page<AuditEntry>> {
    let params = new HttpParams().set('page', page).set('size', size);
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && `${value}`.trim() !== '') {
        params = params.set(key, `${value}`.trim());
      }
    }
    return this.http.get<Page<AuditEntry>>(`${this.base}/audit`, { params });
  }

  auditFilters(): Observable<AuditFilters> {
    return this.http.get<AuditFilters>(`${this.base}/audit/filters`);
  }

  // --- Comptes et roles (super-administrateur) --------------------------------------------

  users(query: string, staffOnly: boolean, page = 0, size = 20): Observable<Page<UserResponse>> {
    const params = new HttpParams()
      .set('query', query)
      .set('staffOnly', staffOnly)
      .set('page', page)
      .set('size', size)
      .set('sort', 'createdAt,desc');
    return this.http.get<Page<UserResponse>>(`${this.base}/users`, { params });
  }

  setRoles(userId: number, roles: RoleName[]): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.base}/users/${userId}/roles`, roles);
  }

  setStatus(userId: number, status: UserStatus): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.base}/users/${userId}/status`, JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
