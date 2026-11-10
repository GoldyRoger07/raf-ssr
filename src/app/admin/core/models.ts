/** Types des reponses du backend utilisees par le back-office. */

import type { Page } from './api';

export type RoleName = 'PLAYER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN' | 'LEADER';

export interface UserResponse {
  id: number;
  test: boolean;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  emailVerified: boolean;
  phoneVerified: boolean;
  roles: RoleName[];
  createdAt: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserResponse;
}

export type ProfitPeriod = 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME';

/**
 * Resultat du jeu sur une periode (GameProfitResponse), en HTG :
 * resultHtg = salesHtg - refundsHtg - prizesHtg - leaderCommissionsHtg - inviteBonusesHtg + withdrawalFeesHtg.
 */
export interface GameProfit {
  period: ProfitPeriod;
  /** Absent pour « depuis le lancement ». */
  from?: string | null;
  to: string;
  htgRate: number;
  salesCredits: number;
  salesHtg: number;
  refundsCredits: number;
  refundsHtg: number;
  prizesHtg: number;
  /** Commissions versees aux leaders sur les parties perdues de leurs joueurs. */
  leaderCommissionsHtg: number;
  /** Credits offerts aux joueurs inscrits avec le lien d'un leader, et leur valeur en HTG. */
  inviteBonusesCredits: number;
  inviteBonusesHtg: number;
  withdrawalFeesHtg: number;
  resultHtg: number;
  ticketsSold: number;
  soloGames: number;
}

export interface Dashboard {
  generatedAt: string;
  htgRate: number;
  players: { total: number; newLast7Days: number; phoneVerified: number };
  quizzesByStatus: Record<string, number>;
  balances: {
    creditBalance: number;
    creditBalanceHtg: number;
    winningsBalanceHtg: number;
  };
  last30Days: {
    ticketSalesCredits: number;
    ticketSalesHtg: number;
    ticketsSold: number;
    prizesPaidHtg: number;
    topUpsCredits: number;
    topUpsHtg: number;
    withdrawalsPaidHtg: number;
  };
  pending: {
    withdrawalsToReview: number;
    withdrawalsToReviewHtg: number;
    withdrawalsToPay: number;
    flaggedSessions: number;
    topUpsPending: number;
  };
  lastReconciliation: { id: number; status: string; startedAt: string; findingCount: number } | null;
}

/** Chiffres d'une journee d'Haiti, hors quiz et comptes de test (montants en HTG). */
export interface DayStats {
  /** AAAA-MM-JJ */
  date: string;
  newPlayers: number;
  activePlayers: number;
  ticketsSold: number;
  soloGames: number;
  salesHtg: number;
  prizesHtg: number;
  resultHtg: number;
  topUpsHtg: number;
  withdrawalsPaidHtg: number;
}

export interface DailyStats {
  generatedAt: string;
  htgRate: number;
  /** De minuit a maintenant. */
  today: DayStats;
  /** Hier, journee entiere. */
  yesterday: DayStats;
  /** Hier, de minuit a la meme heure qu'aujourd'hui. */
  yesterdaySameTime: DayStats;
  /** Du plus ancien jour a aujourd'hui inclus. */
  days: DayStats[];
}

export interface PlayerSummary {
  id: number;
  /** Compte de test : son activite est exclue du tableau de bord. */
  test: boolean;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  creditBalance: number;
  winningsBalanceHtg: number;
  createdAt: string;
}

/** Filtres de la liste des joueurs ; une valeur absente ou nulle ne filtre pas. */
export interface PlayerFilters {
  emailVerified?: boolean | null;
  phoneVerified?: boolean | null;
  /** true : solde de credits > 0 ; false : a zero. */
  hasCredit?: boolean | null;
  /** true : gains a retirer > 0 ; false : a zero. */
  hasWinnings?: boolean | null;
  status?: UserStatus | 'DELETED' | null;
  /** true : comptes de test seulement ; false : hors comptes de test. */
  test?: boolean | null;
  /** Jour d'inscription (AAAA-MM-JJ, jour d'Haiti), bornes incluses. */
  createdFrom?: string | null;
  createdTo?: string | null;
  /** true : au moins une recharge confirmee ; false : aucune. */
  hasToppedUp?: boolean | null;
  activity?: PlayerActivity | null;
}

/** Activite de jeu, d'apres les parties commencees. */
export type PlayerActivity = 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'INACTIVE_30_DAYS' | 'NEVER';

/** Colonnes triables de la liste des joueurs. */
export type PlayerSortField = 'name' | 'email' | 'creditBalance' | 'winningsBalanceHtg' | 'createdAt';

export interface PlayerSort {
  field: PlayerSortField;
  direction: 'asc' | 'desc';
}

// --- Actualites -------------------------------------------------------------------

/** Actualite de l'onglet Actualite de l'app joueur. */
export interface News {
  id: number;
  title: string;
  body: string;
  mediaId: number | null;
  imageUrl: string | null;
  pinned: boolean;
  published: boolean;
  /** Premiere publication, null pour un brouillon jamais publie. */
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsRequest {
  title: string;
  body: string;
  mediaId: number | null;
  pinned: boolean;
  published: boolean;
}

// --- Leaders ---------------------------------------------------------------------

/** Un leader : commission en pourcentage (chaine decimale, ex. "2.50") et ce qu'il a touche. */
export interface LeaderSummary {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  commissionPercent: number;
  /** Credits offerts a chaque joueur inscrit avec son lien, des qu'il confirme son email. */
  signupBonusCredits: number;
  playerCount: number;
  commissionsLast30DaysHtg: number;
  commissionsTotalHtg: number;
  /** Credits envoyes par le leader a ses joueurs (recharges). */
  transfersLast30DaysCredits: number;
  transfersTotalCredits: number;
}

/** Joueur rattache a un leader. */
export interface LeaderPlayer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  test: boolean;
  addedAt: string;
  /** Inscrit avec le lien d'invitation du leader (et non ajoute par un administrateur). */
  viaInvite: boolean;
  /** Bonus promis a l'inscription, 0 si aucun. */
  signupBonusCredits: number;
  /** Versement du bonus, null tant que l'email n'est pas confirme. */
  bonusPaidAt?: string | null;
  /** Commissions que ce joueur a rapportees a ce leader. */
  commissionsHtg: number;
  lastPlayedAt?: string | null;
}

/** Recharge d'un joueur par son leader, avec les credits du leader. */
export interface LeaderTransfer {
  id: number;
  playerId: number;
  playerFirstName: string;
  playerLastName: string;
  credits: number;
  createdAt: string;
  /** Solde de credits du leader juste apres la recharge. */
  leaderBalanceAfter: number;
}

/** Commission versee, une ligne par joueur et par quiz (ou partie solo). */
export interface LeaderCommission {
  id: number;
  playerId: number;
  playerFirstName: string;
  playerLastName: string;
  source: 'QUIZ' | 'SOLO';
  quizId: number;
  quizTitle: string;
  sessionId?: number | null;
  baseCredits: number;
  htgRate: number;
  commissionPercent: number;
  amountHtg: number;
  createdAt: string;
}

export type BalanceType = 'CREDIT' | 'WINNINGS';
/** WINNINGS : recharge payee par le joueur avec ses gains ; jamais un moyen de retrait. */
export type PaymentProvider = 'MONCASH' | 'NATCASH' | 'MANUAL' | 'WINNINGS';

/** Criteres de la file des retraits, en plus du statut ; tous facultatifs. */
export interface WithdrawalFilters {
  /** Nom, email, telephone, numero de destination ou numero de demande (42 ou #42). */
  q: string;
  provider: PaymentProvider | null;
  /** true : saisis au guichet, false : demandes des joueurs. */
  counter: boolean | null;
  /** Jours d'Haiti, AAAA-MM-JJ, bornes incluses. */
  from: string | null;
  to: string | null;
}

export type WithdrawalSortField = 'createdAt' | 'player' | 'netHtg' | 'provider';

export interface WithdrawalSort {
  field: WithdrawalSortField;
  direction: 'asc' | 'desc';
}
export type WithdrawalStatus =
  | 'AWAITING_OTP'
  | 'PENDING'
  | 'APPROVED'
  | 'SENDING'
  | 'PAID'
  | 'REJECTED'
  | 'CANCELLED';

export interface Withdrawal {
  id: number;
  userId: number;
  amountHtg: number;
  feeHtg: number;
  netHtg: number;
  provider: PaymentProvider;
  destinationNumber?: string;
  status: WithdrawalStatus;
  rejectionReason?: string;
  payoutReference?: string;
  createdAt: string;
  reviewedAt?: string;
  paidAt?: string;
  initiatedByAdminId?: number;
  note?: string;
  /** Frais au pourcentage de la passerelle : envoi automatique a l'approbation. */
  automaticPayout?: boolean;
  /** Raison du dernier echec d'envoi automatique. */
  payoutError?: string | null;
  payoutAttempts?: number;
}

/** Envoi automatique des retraits MonCash / NatCash (payouts Tranzak). */
export interface PayoutConfig {
  enabled: boolean;
  feeBps: number;
}

export interface AdminWithdrawal {
  withdrawal: Withdrawal;
  playerId: number;
  playerName: string;
  playerEmail: string;
  playerPhone: string;
}

export interface WalletTransaction {
  id: number;
  type: string;
  balanceType: BalanceType;
  amount: number;
  balanceAfter: number;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

export interface Wallet {
  creditBalance: number;
  creditBalanceHtg: number;
  winningsBalanceHtg: number;
  htgRate: number;
}

// --- Quiz -------------------------------------------------------------------------

export type QuizStatus =
  | 'DRAFT'
  | 'REGISTRATION'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'CLOSING'
  | 'COMPUTING'
  | 'FINISHED'
  | 'CANCELLED';

export type TopicMode = 'ADMIN' | 'VOTE';

/** En groupe (tickets, classement) ou Solo (partie payee, prix pour un sans-faute). */
export type GameMode = 'GROUP' | 'SOLO';

/** Tirage complet et soumission groupee, ou une question a la fois imposee par le serveur. */
export type PlayMode = 'BATCH' | 'SEQUENTIAL';

export interface RewardView {
  rankFrom: number;
  rankTo: number;
  amountHtg: number;
  label?: string;
}

export interface TopicView {
  id: number;
  categoryId: number;
  label: string;
  imageUrl?: string;
  voteCount: number;
}

export interface Quiz {
  id: number;
  title: string;
  /** Quiz de test : invisible des joueurs, exclu du resultat du jeu. */
  test: boolean;
  slug: string;
  description?: string;
  themeLabel?: string;
  bannerUrl?: string;
  bannerMediaId?: number;
  status: QuizStatus;
  gameMode: GameMode;
  topicMode: TopicMode;
  selectedCategoryId?: number;
  selectedCategoryName?: string;
  ticketPriceCredits: number;
  ticketPriceHtg: number;
  /** Ticket ou partie offerts (prix a 0). */
  free: boolean;
  minPlayers: number;
  maxTicketsTotal?: number;
  maxTicketsPerPlayer?: number;
  playMode: PlayMode;
  questionDurationSeconds: number;
  questionsPerGame: number;
  pointsPerCorrect: number;
  /** Solo : prix d'un sans-faute (ticketPrice* = prix d'une partie). */
  soloPrizeHtg?: number;
  /** Solo : le quiz se ferme de lui-meme au premier sans-faute. */
  closeOnPerfect: boolean;
  minScoreThreshold: number;
  closingCountdownMinutes: number;
  startDelayMinutes: number;
  voteOpensAt?: string;
  voteClosesAt?: string;
  voteOpen: boolean;
  thresholdReachedAt?: string;
  scheduledStartAt?: string;
  startedAt?: string;
  endsAt?: string;
  finishedAt?: string;
  cancellationReason?: string;
  playersRegistered: number;
  ticketsSold: number;
  poolSize: number;
  rewards: RewardView[];
  topics: TopicView[];
}

/** Corps de creation / modification d'un quiz (QuizDto). */
export interface QuizInput {
  title: string;
  description: string | null;
  themeLabel: string | null;
  topicMode: TopicMode;
  categoryId: number | null;
  bannerMediaId: number | null;
  /** 0 pour un quiz gratuit. */
  ticketPriceCredits: number;
  minPlayers: number;
  maxTicketsTotal: number | null;
  maxTicketsPerPlayer: number | null;
  startDelayMinutes: number;
  playMode: PlayMode;
  questionDurationSeconds: number;
  questionsPerGame: number;
  pointsPerCorrect: number;
  minScoreThreshold: number;
  closingCountdownMinutes: number;
}

/** Corps de creation / modification d'un quiz solo (SoloQuizDto). */
export interface SoloQuizInput {
  title: string;
  description: string | null;
  categoryId: number;
  bannerMediaId: number | null;
  /** 0 pour un quiz gratuit. */
  entryPriceCredits: number;
  prizeHtg: number;
  questionsPerGame: number;
  questionDurationSeconds: number;
  /** Fermer le quiz des le premier sans-faute. */
  closeOnPerfect: boolean;
}

export interface RewardTier {
  amountHtg: number;
  rankFrom: number;
  rankTo: number;
  label?: string | null;
}

export interface Economics {
  totalRewardsHtg: number;
  ticketPriceHtg: number;
  ticketPriceCredits: number;
  minPlayers: number;
  breakEvenPlayers: number;
  minRevenueHtg: number;
  marginAtMinPlayersHtg: number;
  profitableAtMinPlayers: boolean;
  rewardedPlaces: number;
}

/**
 * Bilan d'un quiz solo. Les taux sont des fractions (0.05 = 5 %). Les champs
 * observes restent null tant que le quiz est en brouillon.
 */
export interface SoloEconomics {
  entryPriceCredits: number;
  entryPriceHtg: number;
  prizeHtg: number;
  questionsPerGame: number;
  breakEvenWinRate: number;
  poolQuestions: number;
  questionsWithStats: number;
  estimatedAccuracy: number;
  estimatedWinRate: number;
  expectedMarginPerGameHtg: number;
  breakEvenPrizeHtg: number;
  profitable: boolean;
  gamesPlayed: number | null;
  gamesWon: number | null;
  observedWinRate: number | null;
  observedMarginHtg: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  score: number;
  rewardHtg: number;
}

export interface Leaderboard {
  quizId: number;
  quizTitle: string;
  finishedAt?: string;
  totalRanked: number;
  entries: LeaderboardEntry[];
}

// --- Banque de questions -----------------------------------------------------------

export type QuestionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type QuestionType = 'SINGLE_CHOICE' | 'TRUE_FALSE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
/** Origine d'une question : saisie, import CSV ou generation par IA. */
export type QuestionSource = 'MANUAL' | 'IMPORT' | 'AI';

/** Frequence de service d'une question ; SUSPICIOUS : 20 services ou plus et 95 % de reussite ou plus. */
export type QuestionUsage = 'NEVER_SERVED' | 'SERVED' | 'SUSPICIOUS';

/** Criteres de la liste des questions, tous facultatifs et cumulables. */
export interface QuestionFilters {
  query?: string;
  status?: QuestionStatus | null;
  categoryId?: number | null;
  source?: QuestionSource | null;
  difficulty?: Difficulty | null;
  type?: QuestionType | null;
  usage?: QuestionUsage | null;
}

export type QuestionSortField = 'text' | 'category' | 'difficulty' | 'successRate' | 'status' | 'createdAt';

export interface QuestionSort {
  field: QuestionSortField;
  direction: 'asc' | 'desc';
}

// --- Retenue de recharge ---------------------------------------------------------

/** KEPT : reste d'une recharge ; USED : reprise par une recharge ; ADJUSTMENT : correction. */
export type RetentionReason = 'KEPT' | 'USED' | 'ADJUSTMENT';

export interface TopUpRetentionEntry {
  id: number;
  /** Signe : positif mis de cote, negatif repris ou retire. */
  amountHtg: number;
  balanceAfterHtg: number;
  reason: RetentionReason;
  topUpRequestId: number | null;
  adminId: number | null;
  note: string | null;
  createdAt: string;
}

/** Gourdes de recharge d'un joueur qui ne formaient pas un credit entier. */
export interface TopUpRetentionView {
  balanceHtg: number;
  htgRate: number;
  entries: TopUpRetentionEntry[];
}

/** Recharge enregistree, avec le detail de la conversion. */
export interface TopUpResult {
  id: number;
  amountHtg: number;
  credits: number;
  htgRate: number | null;
  retentionUsedHtg: number;
  retentionKeptHtg: number;
}

// --- Activite des quiz solo ------------------------------------------------------

export type SoloStatsPeriod = 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL_TIME';
export type SoloPerfectFilter = 'ALL' | 'WITH' | 'WITHOUT' | 'NEVER_PLAYED';
export type SoloResultFilter = 'ALL' | 'PROFIT' | 'LOSS';
export type SoloStatsSort = 'RECENT' | 'MOST_PLAYED' | 'MOST_PERFECT' | 'BEST_RESULT' | 'WORST_RESULT' | 'LAST_PLAYED';

/** Criteres de la liste des quiz de groupe, en plus du statut ; tous facultatifs. */
export interface GroupQuizFilters {
  q: string;
  categoryId: number | null;
  /** true : gratuits, false : payants. */
  free: boolean | null;
  /** true : quiz de test seulement, false : hors quiz de test. */
  test: boolean | null;
}

export type GroupQuizSortField = 'title' | 'category' | 'ticketPrice' | 'players' | 'deadline' | 'createdAt';

export interface GroupQuizSort {
  field: GroupQuizSortField;
  direction: 'asc' | 'desc';
}

export interface SoloStatsFilters {
  period: SoloStatsPeriod;
  q: string;
  categoryId: number | null;
  perfect: SoloPerfectFilter;
  result: SoloResultFilter;
  sort: SoloStatsSort;
}

/** Un quiz solo et son activite sur la periode (comptes de test exclus). */
export interface SoloQuizStatsRow {
  id: number;
  title: string;
  test: boolean;
  status: QuizStatus;
  categoryId: number | null;
  categoryName: string | null;
  entryCredits: number;
  entryHtg: number;
  prizeHtg: number;
  questionsPerGame: number;
  questionDurationSeconds: number;
  games: number;
  players: number;
  perfectGames: number;
  /** En pourcentage, une decimale. */
  perfectRate: number;
  averageCorrect: number | null;
  revenueHtg: number;
  prizesPaidHtg: number;
  resultHtg: number;
  lastPlayedAt: string | null;
}

export interface SoloQuizStatsSummary {
  quizzes: number;
  games: number;
  perfectGames: number;
  revenueHtg: number;
  prizesPaidHtg: number;
  resultHtg: number;
}

export interface SoloQuizStats {
  summary: SoloQuizStatsSummary;
  page: Page<SoloQuizStatsRow>;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  imageUrl?: string;
  mediaId?: number;
  active: boolean;
  /** Le sujet est propose en mode En groupe. */
  groupEnabled: boolean;
  /** Le sujet est propose en mode Solo. */
  soloEnabled: boolean;
}

export interface CategoryInput {
  name: string;
  description: string | null;
  parentId: number | null;
  mediaId: number | null;
  active: boolean;
}

export interface Choice {
  id: number;
  text: string;
  correct: boolean;
  position: number;
  imageUrl?: string;
  mediaId?: number;
}

/** Voisines d'une question dans la liste (meme categorie, meme statut, recentes d'abord). */
export interface QuestionNeighbors {
  previousId: number | null;
  nextId: number | null;
  position: number;
  total: number;
}

export interface Question {
  id: number;
  categoryId: number;
  categoryName: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  status: QuestionStatus;
  explanation?: string;
  imageUrl?: string;
  mediaId?: number;
  timesServed: number;
  timesCorrect: number;
  successRate?: number;
  choices: Choice[];
  createdAt: string;
  source: QuestionSource;
  /** Modele qui a genere la question (source AI). */
  aiModel?: string;
}

// --- Generation par IA ---------------------------------------------------------------

export interface AiStatus {
  enabled: boolean;
  provider: string;
  model: string;
  maxQuestionsPerRequest: number;
  maxRequestsPerDay: number;
  requestsToday: number;
}

export interface GenerateInput {
  categoryId: number;
  count: number;
  /** null = melange */
  difficulty: Difficulty | null;
  /** null = surtout des QCM, quelques vrai / faux */
  type: QuestionType | null;
  instructions: string | null;
}

export interface GenerationReport {
  provider: string;
  model: string;
  requested: number;
  created: number;
  duplicates: number;
  rejected: number;
  rejections: { excerpt?: string; reason: string }[];
  questions: Question[];
}

export interface QuestionInput {
  categoryId: number;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  explanation: string | null;
  mediaId: number | null;
  choices: { text: string; correct: boolean; mediaId: number | null }[];
}

export interface PoolStatus {
  categoryId: number;
  available: number;
  required: number;
  sufficient: boolean;
  easy: number;
  medium: number;
  hard: number;
}

export interface ImportReport {
  imported: number;
  skipped: number;
  failed: number;
  errors: { line: number; reason: string; excerpt?: string }[];
}

// --- Phase 3 : parties, rapprochement, audit, comptes -------------------------------

export type GameSessionStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'INVALIDATED';

export interface AdminGameSession {
  id: number;
  quizId: number;
  quizTitle: string;
  userId: number;
  userEmail: string;
  playerName: string;
  /** Absent en Solo : la partie est payee a son lancement. */
  ticketId?: number;
  status: GameSessionStatus;
  gameMode: GameMode;
  playMode: PlayMode;
  startedAt: string;
  serverDeadlineAt: string;
  submittedAt?: string;
  clientDurationMs?: number;
  score?: number;
  correctCount?: number;
  answeredCount?: number;
  /** Solo : sans-faute, prix verse. */
  won: boolean;
  flagged: boolean;
  flagReason?: string;
  invalidationReason?: string;
  ip?: string;
  userAgent?: string;
}

export interface GameReviewItem {
  position: number;
  questionId: number;
  text: string;
  explanation?: string;
  choices: { id: number; text: string }[];
  correctChoiceId: number;
  chosenChoiceId?: number;
  correct: boolean;
  elapsedMs?: number;
}

export interface GameReview {
  sessionId: number;
  quizId: number;
  status: GameSessionStatus;
  score?: number;
  correctCount?: number;
  answeredCount?: number;
  items: GameReviewItem[];
}

export interface ReconciliationFinding {
  check: string;
  checkDescription: string;
  userId?: number;
  walletId?: number;
  referenceType?: string;
  referenceId?: number;
  expectedValue?: number;
  actualValue?: number;
  detail?: string;
}

export interface ReconciliationRun {
  id: number;
  trigger: 'SCHEDULED' | 'MANUAL';
  triggeredBy?: number;
  status: 'OK' | 'DISCREPANCIES' | 'FAILED';
  startedAt: string;
  finishedAt?: string;
  walletsChecked: number;
  transactionsChecked: number;
  findingCount: number;
  totalCreditBalance: number;
  totalCreditBalanceHtg: number;
  totalWinningsBalanceHtg: number;
  errorMessage?: string;
  findings?: ReconciliationFinding[];
}

export interface AuditEntry {
  id: number;
  createdAt: string;
  actorUserId?: number;
  actorName?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  beforeState?: string;
  afterState?: string;
  ipAddress?: string;
}

export interface AuditFilters {
  actions: string[];
  entityTypes: string[];
}

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

/** Parametre applicatif (valeur entiere). */
export interface AppSetting {
  key: string;
  value: string;
  description?: string;
  minValue: number;
  updatedAt?: string;
}

/** Lien Instagram affiche dans l'app joueur et sur le site (SocialService.Social). */
/** Numeros MonCash / NatCash ou les joueurs envoient leurs recharges a distance (+509XXXXXXXX). */
export interface DepositNumbers {
  moncashEnabled: boolean;
  moncashNumber?: string | null;
  natcashEnabled: boolean;
  natcashNumber?: string | null;
}

export interface SocialLinks {
  instagramEnabled: boolean;
  instagramUrl?: string | null;
  instagramHandle?: string | null;
}

/** Image stockee sur le serveur (voir /api/media). */
export interface MediaFile {
  id: number;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  folder: string | null;
  /** Sujets, questions, choix, bannieres, sujets de vote et avatars qui l'affichent. */
  usages: number;
  createdAt: string;
}


// --- Messages aux joueurs (annonces) ---------------------------------------------

export type AnnouncementAudience = 'ONE_PLAYER' | 'ALL_PLAYERS';
export type AnnouncementStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED';

export interface AnnouncementRequest {
  audience: AnnouncementAudience;
  targetUserId: number | null;
  includeTest: boolean;
  /** Message de service : passe outre les preferences email / push du joueur. */
  important: boolean;
  popup: boolean;
  push: boolean;
  email: boolean;
  title: string;
  body: string;
  linkPath: string | null;
  /** Vide : envoi immediat. */
  scheduledAt: string | null;
  /** Vide : 7 jours apres l'envoi. */
  popupExpiresAt: string | null;
}

export interface AnnouncementPerson {
  id: number;
  name: string | null;
  email: string | null;
}

export interface AnnouncementStats {
  total: number;
  pending: number;
  delivered: number;
  failed: number;
  skipped: number;
  emailSent: number;
  pushSent: number;
  acknowledged: number;
  opened: number;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  linkPath: string | null;
  audience: AnnouncementAudience;
  target: AnnouncementPerson | null;
  includeTest: boolean;
  important: boolean;
  popup: boolean;
  push: boolean;
  email: boolean;
  status: AnnouncementStatus;
  scheduledAt: string;
  popupExpiresAt: string | null;
  createdBy: AnnouncementPerson | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  stats: AnnouncementStats;
}

/** Portee d'un envoi : destinataires, dont email verifie et abonnes au push. */
export interface AnnouncementAudienceCount {
  total: number;
  withEmail: number;
  withPush: number;
}

export interface AnnouncementTestResult {
  popup: boolean;
  emailSent: boolean;
  pushSent: boolean;
  email: string;
}

/** Comportements de l'app joueur pilotes depuis le back-office (PlayerAppService). */
export interface PlayerAppConfig {
  /** Fenetre de rappel de confirmation de l'email, toutes les 10 secondes. */
  emailReminderEnabled: boolean;
  /** Bouton « Recharger un joueur » des leaders, dans le Tresor. */
  leaderTransferEnabled: boolean;
  /** Bouton « Recharger avec mes gains » de l'ecran Recharger. */
  winningsConversionEnabled: boolean;
  /** Paiement en ligne MonCash / NatCash (passerelle Tranzak) de l'ecran Recharger. */
  onlineTopUpEnabled: boolean;
  /** Envoi automatique des retraits MonCash / NatCash a l'approbation (payouts Tranzak). */
  autoPayoutEnabled: boolean;
}
