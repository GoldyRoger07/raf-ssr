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
  DailyStats,
  Dashboard,
  DepositNumbers,
  LeaderCommission,
  LeaderTransfer,
  LinkedAccount,
  News,
  NewsRequest,
  LeaderPlayer,
  LeaderSummary,
  PlayerFilters,
  PlayerSort,
  PlayerSummary,
  ProfitPeriod,
  TopUpResult,
  TopUpRetentionView,
  Wallet,
  WalletTransaction,
  Withdrawal,
  WithdrawalInstallment,
  WithdrawalStatus,
  PayoutConfig,
  PayoutSpecialCase,
  WithdrawalFilters,
  WithdrawalSort,
  AnnouncementStatus,
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

  daily(days: number): Observable<DailyStats> {
    return this.http.get<DailyStats>(`${this.base}/dashboard/daily`, { params: { days } });
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

  // --- Actualites de l'app joueur --------------------------------------------------

  /** Tris : title, published, publishedAt, updatedAt ; sans tri, epinglees puis plus recentes. */
  newsList(
    page = 0,
    size = 20,
    filters: { q?: string; published?: boolean | null; pinned?: boolean | null } = {},
    sort?: { field: string; direction: 'asc' | 'desc' },
  ): Observable<Page<News>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters.q?.trim()) {
      params = params.set('q', filters.q.trim());
    }
    for (const key of ['published', 'pinned'] as const) {
      const value = filters[key];
      if (value !== null && value !== undefined) {
        params = params.set(key, value);
      }
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
    return this.http.get<Page<News>>(`${this.base}/news`, { params });
  }

  createNews(request: NewsRequest): Observable<News> {
    return this.http.post<News>(`${this.base}/news`, request);
  }

  updateNews(id: number, request: NewsRequest): Observable<News> {
    return this.http.put<News>(`${this.base}/news/${id}`, request);
  }

  deleteNews(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/news/${id}`);
  }

  // --- Leaders (super-administrateur) ---------------------------------------------

  /** Tris : name, commission, players, last30Days, total ; sans tri, l'ordre alphabetique. */
  leaders(query: string, page = 0, size = 20, status: UserStatus | null = null, sort?: { field: string; direction: 'asc' | 'desc' }): Observable<Page<LeaderSummary>> {
    let params = new HttpParams().set('query', query).set('page', page).set('size', size);
    if (status) {
      params = params.set('status', status);
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
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

  /** Tris : name, addedAt, lastPlayed, commissions ; sans tri, le dernier rattache d'abord. */
  leaderPlayers(
    id: number,
    page = 0,
    size = 20,
    filters: { q?: string; viaInvite?: boolean | null } = {},
    sort?: { field: string; direction: 'asc' | 'desc' },
  ): Observable<Page<LeaderPlayer>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters.q?.trim()) {
      params = params.set('q', filters.q.trim());
    }
    if (filters.viaInvite != null) {
      params = params.set('viaInvite', filters.viaInvite);
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
    return this.http.get<Page<LeaderPlayer>>(`${this.base}/leaders/${id}/players`, { params });
  }

  addLeaderPlayer(id: number, playerId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/leaders/${id}/players`, { playerId });
  }

  removeLeaderPlayer(id: number, playerId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/leaders/${id}/players/${playerId}`);
  }

  /** Tris : createdAt, player, quiz, baseCredits, amount ; sans tri, la plus recente d'abord. */
  leaderCommissions(
    id: number,
    page = 0,
    size = 20,
    filters: { q?: string; source?: 'QUIZ' | 'SOLO' | null; from?: string | null; to?: string | null } = {},
    sort?: { field: string; direction: 'asc' | 'desc' },
  ): Observable<Page<LeaderCommission>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters.q?.trim()) {
      params = params.set('q', filters.q.trim());
    }
    for (const key of ['source', 'from', 'to'] as const) {
      const value = filters[key];
      if (value) {
        params = params.set(key, value);
      }
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
    return this.http.get<Page<LeaderCommission>>(`${this.base}/leaders/${id}/commissions`, { params });
  }

  /** Tris : createdAt, player, credits ; sans tri, la plus recente d'abord. */
  leaderTransfers(id: number, page = 0, size = 20, q = '', sort?: { field: string; direction: 'asc' | 'desc' }): Observable<Page<LeaderTransfer>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q.trim()) {
      params = params.set('q', q.trim());
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
    return this.http.get<Page<LeaderTransfer>>(`${this.base}/leaders/${id}/transfers`, { params });
  }

  player(id: number): Observable<PlayerSummary> {
    return this.http.get<PlayerSummary>(`${this.base}/players/${id}`);
  }

  /** Comptes vus sur un appareil du joueur : ils partagent la limite solo du jour. */
  linkedAccounts(id: number): Observable<LinkedAccount[]> {
    return this.http.get<LinkedAccount[]>(`${this.base}/players/${id}/linked-accounts`);
  }

  // --- Portefeuille -------------------------------------------------------------

  wallet(userId: number): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.base}/wallet/users/${userId}`);
  }

  /** Mouvements d'un joueur. Tris : createdAt, type, balanceType, amount ; sans tri, le plus recent d'abord. */
  transactions(
    userId: number,
    page = 0,
    size = 20,
    filters: { q?: string; type?: string | null; balanceType?: string | null; from?: string | null; to?: string | null } = {},
    sort?: { field: string; direction: 'asc' | 'desc' },
  ): Observable<Page<WalletTransaction>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters.q?.trim()) {
      params = params.set('q', filters.q.trim());
    }
    for (const key of ['type', 'balanceType', 'from', 'to'] as const) {
      const value = filters[key];
      if (value) {
        params = params.set(key, value);
      }
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
    return this.http.get<Page<WalletTransaction>>(`${this.base}/wallet/users/${userId}/transactions`, {
      params,
    });
  }

  manualTopUp(userId: number, amountHtg: number, reference: string, note: string | null): Observable<TopUpResult> {
    return this.http.post<TopUpResult>(`${this.base}/wallet/topups/manual`, { userId, amountHtg, reference, note });
  }

  /** Retenue de recharge d'un joueur : solde et derniers mouvements. */
  retention(userId: number): Observable<TopUpRetentionView> {
    return this.http.get<TopUpRetentionView>(`${this.base}/wallet/users/${userId}/retention`);
  }

  /** Correction tracee de la retenue : montant signe en HTG, motif obligatoire. */
  adjustRetention(userId: number, amountHtg: number, reason: string): Observable<TopUpRetentionView> {
    return this.http.post<TopUpRetentionView>(`${this.base}/wallet/users/${userId}/retention/adjust`, {
      amountHtg,
      reason,
    });
  }

  adjust(userId: number, balanceType: BalanceType, amount: number, reason: string): Observable<unknown> {
    return this.http.post(`${this.base}/wallet/users/${userId}/adjust`, {
      balanceType,
      amount,
      reason,
    });
  }

  // --- Retraits -------------------------------------------------------------------

  /** File d'un statut ; sans tri, la plus ancienne demande d'abord. */
  withdrawals(status: WithdrawalStatus, page = 0, size = 20, filters?: WithdrawalFilters, sort?: WithdrawalSort): Observable<Page<AdminWithdrawal>> {
    let params = new HttpParams().set('status', status).set('page', page).set('size', size);
    if (filters?.q.trim()) {
      params = params.set('q', filters.q.trim());
    }
    for (const key of ['provider', 'counter', 'from', 'to'] as const) {
      const value = filters?.[key];
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, `${value}`);
      }
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
    return this.http.get<Page<AdminWithdrawal>>(`${this.base}/wallet/withdrawals`, { params });
  }

  /** Retraits d'un joueur, tous statuts sauf filtre. Tris : createdAt, netHtg, provider, status. */
  playerWithdrawals(
    userId: number,
    page = 0,
    size = 20,
    filters: { status?: WithdrawalStatus | null; provider?: string | null } = {},
    sort?: { field: string; direction: 'asc' | 'desc' },
  ): Observable<Page<AdminWithdrawal>> {
    let params = new HttpParams().set('userId', userId).set('page', page).set('size', size);
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.provider) {
      params = params.set('provider', filters.provider);
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
    return this.http.get<Page<AdminWithdrawal>>(`${this.base}/wallet/withdrawals`, { params });
  }

  approve(id: number): Observable<Withdrawal> {
    return this.http.post<Withdrawal>(`${this.base}/wallet/withdrawals/${id}/approve`, {});
  }

  /** Relance l'envoi automatique d'un retrait approuve, apres un echec. */
  sendPayout(id: number): Observable<Withdrawal> {
    return this.http.post<Withdrawal>(`${this.base}/wallet/withdrawals/${id}/send`, {});
  }

  payoutConfig(): Observable<PayoutConfig> {
    return this.http.get<PayoutConfig>(`${this.base}/wallet/payouts/config`);
  }

  reject(id: number, reason: string): Observable<Withdrawal> {
    return this.http.post<Withdrawal>(`${this.base}/wallet/withdrawals/${id}/reject`, { reason });
  }

  /** Verse une tranche (montant net) d'un retrait MonCash / NatCash approuve. */
  payInstallment(id: number, amountHtg: number, payoutReference: string): Observable<Withdrawal> {
    return this.http.post<Withdrawal>(`${this.base}/wallet/withdrawals/${id}/installments`, { amountHtg, payoutReference });
  }

  installments(id: number): Observable<WithdrawalInstallment[]> {
    return this.http.get<WithdrawalInstallment[]>(`${this.base}/wallet/withdrawals/${id}/installments`);
  }

  /** Cas de retrait particuliers, le plus recemment ajoute d'abord. */
  specialCases(): Observable<PayoutSpecialCase[]> {
    return this.http.get<PayoutSpecialCase[]>(`${this.base}/wallet/payout-special-cases`);
  }

  /** Ajoute un joueur (deja present : note mise a jour) ; renvoie la liste a jour. */
  addSpecialCase(userId: number, note: string | null): Observable<PayoutSpecialCase[]> {
    return this.http.post<PayoutSpecialCase[]>(`${this.base}/wallet/payout-special-cases`, { userId, note });
  }

  removeSpecialCase(userId: number): Observable<PayoutSpecialCase[]> {
    return this.http.delete<PayoutSpecialCase[]>(`${this.base}/wallet/payout-special-cases/${userId}`);
  }

  /** Clot un retrait verse en partie : le reste non verse revient dans les gains du joueur. */
  closeWithdrawal(id: number, reason: string): Observable<Withdrawal> {
    return this.http.post<Withdrawal>(`${this.base}/wallet/withdrawals/${id}/close`, { reason });
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

  /** Tris des parties : startedAt, player, quiz, score, status ; sans tri, la plus recente d'abord. */
  flaggedSessions(page = 0, size = 50, q = '', sort?: { field: string; direction: 'asc' | 'desc' }): Observable<Page<AdminGameSession>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q.trim()) {
      params = params.set('q', q.trim());
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
    return this.http.get<Page<AdminGameSession>>(`${this.base}/game/sessions/flagged`, { params });
  }

  quizSessions(
    quizId: number,
    flaggedOnly: boolean,
    page = 0,
    size = 50,
    q = '',
    status: string | null = null,
    sort?: { field: string; direction: 'asc' | 'desc' },
  ): Observable<Page<AdminGameSession>> {
    let params = new HttpParams().set('flagged', flaggedOnly).set('page', page).set('size', size);
    if (q.trim()) {
      params = params.set('q', q.trim());
    }
    if (status) {
      params = params.set('status', status);
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
    return this.http.get<Page<AdminGameSession>>(`${this.base}/quizzes/${quizId}/sessions`, { params });
  }

  sessionReview(sessionId: number): Observable<GameReview> {
    return this.http.get<GameReview>(`${this.base}/game/sessions/${sessionId}/review`);
  }

  invalidateSession(sessionId: number, reason: string): Observable<AdminGameSession> {
    return this.http.post<AdminGameSession>(`${this.base}/game/sessions/${sessionId}/invalidate`, { reason });
  }

  // --- Rapprochement comptable -------------------------------------------------------

  /**
   * Historique des rapprochements. Tris : startedAt, status, findingCount, walletsChecked,
   * totalWinningsBalance, totalCreditBalance ; sans tri, le plus recent d'abord.
   */
  reconciliationRuns(
    page = 0,
    size = 20,
    filters: { q?: string; status?: string | null; trigger?: string | null; from?: string | null; to?: string | null } = {},
    sort?: { field: string; direction: 'asc' | 'desc' },
  ): Observable<Page<ReconciliationRun>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters.q?.trim()) {
      params = params.set('q', filters.q.trim());
    }
    for (const key of ['status', 'trigger', 'from', 'to'] as const) {
      const value = filters[key];
      if (value) {
        params = params.set(key, value);
      }
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
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
    filters: {
      q?: string | null;
      action?: string | null;
      entityType?: string | null;
      entityId?: string | null;
      actorId?: number | null;
      /** Jours d'Haiti, AAAA-MM-JJ, bornes incluses. */
      from?: string | null;
      to?: string | null;
      /** createdAt, action ou entityType, suivi de ,asc ou ,desc. */
      sort?: string | null;
    },
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

  /**
   * Comptes : recherche, personnel seulement, role et statut facultatifs.
   * Tris : name, email, status, createdAt ; sans tri, les derniers crees.
   */
  users(
    query: string,
    staffOnly: boolean,
    page = 0,
    size = 20,
    filters: { role?: RoleName | null; status?: UserStatus | null } = {},
    sort?: { field: 'name' | 'email' | 'status' | 'createdAt'; direction: 'asc' | 'desc' },
  ): Observable<Page<UserResponse>> {
    let params = new HttpParams().set('query', query).set('staffOnly', staffOnly).set('page', page).set('size', size);
    if (filters.role) {
      params = params.set('role', filters.role);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
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

  /**
   * Historique des messages, criteres facultatifs. Tris : scheduledAt, title, audience,
   * status ; sans tri, le plus recent d'abord.
   */
  announcements(
    page = 0,
    size = 20,
    filters: { q?: string; status?: AnnouncementStatus | null; audience?: AnnouncementAudience | null; important?: boolean | null } = {},
    sort?: { field: string; direction: 'asc' | 'desc' },
  ): Observable<Page<Announcement>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters.q?.trim()) {
      params = params.set('q', filters.q.trim());
    }
    for (const key of ['status', 'audience', 'important'] as const) {
      const value = filters[key];
      if (value !== null && value !== undefined) {
        params = params.set(key, `${value}`);
      }
    }
    if (sort) {
      params = params.set('sort', `${sort.field},${sort.direction}`);
    }
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
