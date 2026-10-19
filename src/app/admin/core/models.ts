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
