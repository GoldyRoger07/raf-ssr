import { PaymentProvider, WithdrawalStatus } from './models';

/** Severites des p-tag PrimeNG. */
export type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

export const WITHDRAWAL_STATUS: Record<WithdrawalStatus, { label: string; severity: Severity }> = {
  AWAITING_OTP: { label: 'Code attendu', severity: 'secondary' },
  PENDING: { label: 'A examiner', severity: 'warn' },
  APPROVED: { label: 'A verser', severity: 'info' },
  PAID: { label: 'Verse', severity: 'success' },
  REJECTED: { label: 'Refuse', severity: 'danger' },
  CANCELLED: { label: 'Annule', severity: 'secondary' },
};

export const PROVIDER: Record<PaymentProvider, string> = {
  MONCASH: 'MonCash',
  NATCASH: 'NatCash',
  MANUAL: 'Especes (guichet)',
};

export const TRANSACTION_TYPE: Record<string, string> = {
  TOPUP: 'Recharge',
  TICKET_PURCHASE: 'Achat de ticket',
  PRIZE: 'Gain',
  WITHDRAWAL: 'Retrait',
  REFUND: 'Remboursement',
  ADJUSTMENT: 'Ajustement',
};

export const QUIZ_STATUS: Record<string, string> = {
  DRAFT: 'Brouillons',
  REGISTRATION: 'Inscriptions',
  SCHEDULED: 'Programmes',
  RUNNING: 'En cours',
  CLOSING: 'En cloture',
  COMPUTING: 'Calcul',
  FINISHED: 'Termines',
  CANCELLED: 'Annules',
};

/** Libelle et couleur d'un statut de retrait (repli neutre pour un statut inconnu). */
export function withdrawalStatus(status: string): { label: string; severity: Severity } {
  return WITHDRAWAL_STATUS[status as WithdrawalStatus] ?? { label: status, severity: 'secondary' };
}

export function providerLabel(provider: string): string {
  return PROVIDER[provider as PaymentProvider] ?? provider;
}
