/** Types des reponses du backend utilisees par le back-office. */

export type RoleName = 'PLAYER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';

export interface UserResponse {
  id: number;
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

export interface Dashboard {
  generatedAt: string;
  htgRate: number;
  players: { total: number; newLast7Days: number; phoneVerified: number };
  quizzesByStatus: Record<string, number>;
  balances: {
    creditBalance: number;
    creditBalanceHtg: number;
    winningsBalance: number;
    winningsBalanceHtg: number;
  };
  last30Days: {
    ticketSalesCredits: number;
    ticketSalesHtg: number;
    ticketsSold: number;
    prizesPaidCredits: number;
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

export interface PlayerSummary {
  id: number;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  creditBalance: number;
  winningsBalance: number;
  winningsBalanceHtg: number;
  createdAt: string;
}

export type BalanceType = 'CREDIT' | 'WINNINGS';
export type PaymentProvider = 'MONCASH' | 'NATCASH' | 'MANUAL';
export type WithdrawalStatus =
  | 'AWAITING_OTP'
  | 'PENDING'
  | 'APPROVED'
  | 'PAID'
  | 'REJECTED'
  | 'CANCELLED';

export interface Withdrawal {
  id: number;
  userId: number;
  amountCredits: number;
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
  winningsBalance: number;
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

export interface RewardView {
  rankFrom: number;
  rankTo: number;
  amountCredits: number;
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
  slug: string;
  description?: string;
  themeLabel?: string;
  bannerUrl?: string;
  status: QuizStatus;
  topicMode: TopicMode;
  selectedCategoryId?: number;
  selectedCategoryName?: string;
  ticketPriceCredits: number;
  ticketPriceHtg: number;
  minPlayers: number;
  maxTicketsTotal?: number;
  maxTicketsPerPlayer?: number;
  gameDurationSeconds: number;
  questionsPerGame: number;
  pointsPerCorrect: number;
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
  ticketPriceCredits: number;
  minPlayers: number;
  maxTicketsTotal: number | null;
  maxTicketsPerPlayer: number | null;
  startDelayMinutes: number;
  gameDurationSeconds: number;
  questionsPerGame: number;
  pointsPerCorrect: number;
  minScoreThreshold: number;
  closingCountdownMinutes: number;
}

export interface RewardTier {
  rankFrom: number;
  rankTo: number;
  amountCredits: number;
  label?: string | null;
}

export interface Economics {
  totalRewardsCredits: number;
  ticketPriceCredits: number;
  minPlayers: number;
  breakEvenPlayers: number;
  minRevenueCredits: number;
  marginAtMinPlayers: number;
  profitableAtMinPlayers: boolean;
  rewardedPlaces: number;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  score: number;
  rewardCredits: number;
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

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  imageUrl?: string;
  active: boolean;
}

export interface CategoryInput {
  name: string;
  description: string | null;
  parentId: number | null;
  mediaId: null;
  active: boolean;
}

export interface Choice {
  id: number;
  text: string;
  correct: boolean;
  position: number;
  imageUrl?: string;
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
  timesServed: number;
  timesCorrect: number;
  successRate?: number;
  choices: Choice[];
  createdAt: string;
}

export interface QuestionInput {
  categoryId: number;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  explanation: string | null;
  mediaId: null;
  choices: { text: string; correct: boolean; mediaId: null }[];
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
