import { PaymentProvider, ReconciliationRun, WithdrawalStatus } from './models';

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
  SOLO_ENTRY: 'Partie solo',
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

export const GAME_MODE: Record<string, string> = {
  GROUP: 'En groupe',
  SOLO: 'Solo',
};

export const PLAY_MODE: Record<string, { label: string; hint: string }> = {
  SEQUENTIAL: {
    label: 'Question par question',
    hint: 'Le serveur envoie une question a la fois et impose le chrono : le joueur ne voit jamais une question avant son tour.',
  },
  BATCH: {
    label: 'Tirage complet',
    hint: 'Toutes les questions partent au demarrage et les reponses reviennent d\'un bloc. Plus leger, mais le chrono reste tenu par l\'appareil du joueur.',
  },
};

/** Libelle et couleur d'un statut de retrait (repli neutre pour un statut inconnu). */
export function withdrawalStatus(status: string): { label: string; severity: Severity } {
  return WITHDRAWAL_STATUS[status as WithdrawalStatus] ?? { label: status, severity: 'secondary' };
}

export function providerLabel(provider: string): string {
  return PROVIDER[provider as PaymentProvider] ?? provider;
}

const QUIZ_STATUS_TAG: Record<string, { label: string; severity: Severity }> = {
  DRAFT: { label: 'Brouillon', severity: 'secondary' },
  REGISTRATION: { label: 'Inscriptions', severity: 'info' },
  SCHEDULED: { label: 'Programme', severity: 'info' },
  RUNNING: { label: 'En cours', severity: 'success' },
  CLOSING: { label: 'En cloture', severity: 'warn' },
  COMPUTING: { label: 'Calcul du classement', severity: 'warn' },
  FINISHED: { label: 'Termine', severity: 'contrast' },
  CANCELLED: { label: 'Annule', severity: 'danger' },
};

/** En Solo, RUNNING et FINISHED se lisent "ouvert" et "ferme". */
const SOLO_STATUS_TAG: Record<string, { label: string; severity: Severity }> = {
  RUNNING: { label: 'Ouvert', severity: 'success' },
  FINISHED: { label: 'Ferme', severity: 'contrast' },
};

export function quizStatus(status: string, mode: string = 'GROUP'): { label: string; severity: Severity } {
  return (mode === 'SOLO' ? SOLO_STATUS_TAG[status] : undefined)
    ?? QUIZ_STATUS_TAG[status]
    ?? { label: status, severity: 'secondary' };
}

const QUESTION_STATUS_TAG: Record<string, { label: string; severity: Severity }> = {
  DRAFT: { label: 'Brouillon', severity: 'secondary' },
  PUBLISHED: { label: 'Publiee', severity: 'success' },
  ARCHIVED: { label: 'Archivee', severity: 'contrast' },
};

export function questionStatus(status: string): { label: string; severity: Severity } {
  return QUESTION_STATUS_TAG[status] ?? { label: status, severity: 'secondary' };
}

export const DIFFICULTY: Record<string, string> = {
  EASY: 'Facile',
  MEDIUM: 'Moyen',
  HARD: 'Difficile',
};

export function difficultyLabel(difficulty: string): string {
  return DIFFICULTY[difficulty] ?? difficulty;
}

/** Resultat d'un rapprochement, pour un p-tag. */
export function runStatus(run: ReconciliationRun): { label: string; severity: Severity } {
  switch (run.status) {
    case 'OK':
      return { label: 'Aucun ecart', severity: 'success' };
    case 'DISCREPANCIES':
      return { label: `${run.findingCount} ecart(s)`, severity: 'danger' };
    default:
      return { label: 'Echec du controle', severity: 'warn' };
  }
}
