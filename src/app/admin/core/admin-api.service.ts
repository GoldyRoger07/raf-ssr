import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL, Page } from './api';
import {
  Announcement,
  AnnouncementAudience,
  AnnouncementAudienceCount,
  AnnouncementRequest,
  AnnouncementTestResult,
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
  PlayerAppConfig,
  UserResponse,
  UserStatus,
  BalanceType,
  Dashboard,
  DepositNumbers,
  LeaderCommission,
  LeaderPlayer,
  LeaderSummary,
  PlayerFilters,
  PlayerSort,
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

  playerApp(): Observable<PlayerAppConfig> {
    return this.http.get<PlayerAppConfig>(`${this.base}/player-app`);
  }

  updatePlayerApp(config: PlayerAppConfig): Observable<PlayerAppConfig> {
    return this.http.put<PlayerAppConfig>(`${this.base}/player-app`, config);
  }

  social(): Observable<SocialLinks> {
    return this.http.get<SocialLinks>(`${this.base}/social`);
  }

  /** `instagramAccount` : adresse du profil, nom d'utilisateur ou @nom ; vide pour retirer le compte. */
  updateSocial(instagramEnabled: boolean, instagramAccount: string | null): Observable<SocialLinks> {
    return this.http.put<SocialLinks>(`${this.base}/social`, { instagramEnabled, instagramAccount });
  }

  depositNumbers(): Observable<DepositNumbers> {
    return this.http.get<DepositNumbers>(`${this.base}/deposit-numbers`);
  }

  /** Numeros vides pour les retirer ; le backend les ramene au format +509XXXXXXXX. */
  updateDepositNumbers(numbers: DepositNumbers): Observable<DepositNumbers> {
    return this.http.put<DepositNumbers>(`${this.base}/deposit-numbers`, numbers);
  }

  searchPlayers(
    query: string,
    page = 0,
    size = 20,
    filters: PlayerFilters = {},
    sort?: PlayerSort,
  ): Observable<Page<PlayerSummary>> {
    let params = new HttpParams().set('query', query).set('page', page).set('size', size);
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && `${value}` !== '') {
        params = params.set(key, `${value}`);
      }
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
    return this.http.get<Page<PlayerSummary>>(`${this.base}/players`, { params });
  }

  // --- Leaders (super-administrateur) ---------------------------------------------

  leaders(query: string, page = 0, size = 20): Observable<Page<LeaderSummary>> {
    const params = new HttpParams().set('query', query).set('page', page).set('size', size);
    return this.http.get<Page<LeaderSummary>>(`${this.base}/leaders`, { params });
  }

  leader(id: number): Observable<LeaderSummary> {
    return this.http.get<LeaderSummary>(`${this.base}/leaders/${id}`);
  }

  /** Nomme leader un compte joueur. */
  promoteLeader(userId: number, commissionPercent: number): Observable<LeaderSummary> {
    return this.http.post<LeaderSummary>(`${this.base}/leaders`, { userId, commissionPercent });
  }

  /** Retire le role leader : ses joueurs sont detaches. */
  demoteLeader(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/leaders/${id}`);
  }

  setLeaderCommission(id: number, commissionPercent: number): Observable<LeaderSummary> {
    return this.http.put<LeaderSummary>(`${this.base}/leaders/${id}/commission`, { commissionPercent });
  }

  /** Bonus offert aux joueurs qui s'inscriront avec le lien de ce leader. */
  setLeaderSignupBonus(id: number, signupBonusCredits: number): Observable<LeaderSummary> {
    return this.http.put<LeaderSummary>(`${this.base}/leaders/${id}/signup-bonus`, { signupBonusCredits });
  }

  leaderPlayers(id: number, page = 0, size = 20): Observable<Page<LeaderPlayer>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<LeaderPlayer>>(`${this.base}/leaders/${id}/players`, { params });
  }

  addLeaderPlayer(id: number, playerId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/leaders/${id}/players`, { playerId });
  }

  removeLeaderPlayer(id: number, playerId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/leaders/${id}/players/${playerId}`);
  }

  leaderCommissions(id: number, page = 0, size = 20): Observable<Page<LeaderCommission>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<LeaderCommission>>(`${this.base}/leaders/${id}/commissions`, { params });
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

  /** Marque (ou demarque) un compte de test : son activite sort du tableau de bord. */
  setUserTest(userId: number, test: boolean): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.base}/players/${userId}/test`, { test });
  }

  /** Corrige le numero d'un joueur : il repasse non verifie. */
  changePlayerPhone(userId: number, phone: string): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.base}/players/${userId}/phone`, { phone });
  }

  /** Corrige l'email d'un joueur : il repasse non verifie et un nouveau lien part. */
  changePlayerEmail(userId: number, email: string): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.base}/players/${userId}/email`, { email });
  }

  setStatus(userId: number, status: UserStatus): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.base}/users/${userId}/status`, JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- Messages aux joueurs ------------------------------------------------------

  announcements(page = 0, size = 20): Observable<Page<Announcement>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Announcement>>(`${this.base}/announcements`, { params });
  }

  announcementAudience(
    audience: AnnouncementAudience,
    targetUserId: number | null,
    includeTest: boolean,
  ): Observable<AnnouncementAudienceCount> {
    let params = new HttpParams().set('audience', audience).set('includeTest', includeTest);
    if (targetUserId !== null) {
      params = params.set('targetUserId', targetUserId);
    }
    return this.http.get<AnnouncementAudienceCount>(`${this.base}/announcements/audience`, { params });
  }

  createAnnouncement(request: AnnouncementRequest): Observable<Announcement> {
    return this.http.post<Announcement>(`${this.base}/announcements`, request);
  }

  cancelAnnouncement(id: number): Observable<Announcement> {
    return this.http.post<Announcement>(`${this.base}/announcements/${id}/cancel`, {});
  }

  /** Envoie le message au compte connecte, pour verifier son rendu. */
  testAnnouncement(request: {
    popup: boolean;
    push: boolean;
    email: boolean;
    title: string;
    body: string;
    linkPath: string | null;
  }): Observable<AnnouncementTestResult> {
    return this.http.post<AnnouncementTestResult>(`${this.base}/announcements/test`, request);
  }
}
