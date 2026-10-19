import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputOtpModule } from 'primeng/inputotp';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';

import { CashPickupDialog } from '../../components/cash-pickup-dialog/cash-pickup-dialog';
import { PlayerSearch } from '../../components/player-search/player-search';
import { AdminApi } from '../../core/admin-api.service';
import { errorCode, errorMessage } from '../../core/api';
import { HaitiDatePipe, HtgPipe } from '../../core/format';
import { AdminWithdrawal, PlayerSummary, Withdrawal } from '../../core/models';

/**
 * Guichet : l'agent retrouve le joueur present, puis lui remet en especes soit un
 * retrait deja demande et approuve, soit un retrait qu'il saisit sur place. Dans
 * les deux cas, le code recu par le joueur est exige.
 */
@Component({
  selector: 'admin-counter',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    InputNumberModule,
    InputOtpModule,
    InputTextModule,
    MessageModule,
    TagModule,
    CashPickupDialog,
    PlayerSearch,
    HtgPipe,
    HaitiDatePipe,
  ],
  templateUrl: './counter.html',
})
export default class Counter {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);

  protected readonly player = signal<PlayerSummary | null>(null);
  protected readonly pickups = signal<AdminWithdrawal[]>([]);

  // Retrait saisi sur place
  protected amountHtg: number | null = null;
  protected note = '';
  protected otpCode = '';
  protected receipt = '';
  protected readonly pending = signal<Withdrawal | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  // Remise d'un retrait deja demande
  protected readonly pickupTarget = signal<AdminWithdrawal | null>(null);
  protected readonly pickupOpen = signal(false);

  protected readonly canWithdraw = computed(() => {
    const p = this.player();
    return !!p && p.phoneVerified && p.status === 'ACTIVE';
  });

  protected select(player: PlayerSummary): void {
    this.reset();
    this.player.set(player);
    this.loadPickups();
  }

  protected clear(): void {
    this.reset();
    this.player.set(null);
    this.pickups.set([]);
  }

  protected openPickup(row: AdminWithdrawal): void {
    this.pickupTarget.set(row);
    this.pickupOpen.set(true);
  }

  protected afterPickup(): void {
    this.refreshPlayer();
    this.loadPickups();
  }

  /** Etape 1 : controles, demande creee sans debit, SMS au joueur. */
  protected initiate(): void {
    const p = this.player();
    if (!p || !this.amountHtg) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api.initiateCounterWithdrawal(p.id, this.amountHtg, this.note.trim() || null).subscribe({
      next: (withdrawal) => {
        this.busy.set(false);
        this.pending.set(withdrawal);
        this.otpCode = '';
      },
      error: (error) => {
        this.busy.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }

  /** Etape 2 : code du joueur, debit des gains, especes remises. */
  protected confirm(): void {
    const withdrawal = this.pending();
    if (!withdrawal || this.otpCode.length < 6) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api.confirmCounterWithdrawal(withdrawal.id, this.otpCode, this.receipt.trim() || null).subscribe({
      next: (paid) => {
        this.busy.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Retrait effectue',
          detail: `Remettez ${paid.netHtg} HTG au joueur.`,
        });
        this.reset();
        this.refreshPlayer();
      },
      error: (error) => {
        this.busy.set(false);
        const invalid = errorCode(error) === 'OTP_INVALID';
        if (invalid) {
          // Les cases sont videes : l'agent ressaisit sans effacer chiffre par chiffre.
          this.otpCode = '';
        }
        this.error.set(
          invalid ? 'Code incorrect. Verifiez avec le joueur le dernier code recu.' : errorMessage(error),
        );
      },
    });
  }

  protected cancel(): void {
    const withdrawal = this.pending();
    if (!withdrawal) {
      return;
    }
    this.busy.set(true);
    this.api.cancelCounterWithdrawal(withdrawal.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.reset();
      },
      error: (error) => {
        this.busy.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }

  private loadPickups(): void {
    const p = this.player();
    if (!p) {
      return;
    }
    // Retraits demandes par le joueur en especes, approuves, en attente de remise.
    this.api.playerWithdrawals(p.id, 0, 50).subscribe({
      next: (page) =>
        this.pickups.set(
          page.content.filter(
            (row) =>
              row.withdrawal.status === 'APPROVED' &&
              row.withdrawal.provider === 'MANUAL' &&
              !row.withdrawal.initiatedByAdminId,
          ),
        ),
      error: () => this.pickups.set([]),
    });
  }

  private refreshPlayer(): void {
    const p = this.player();
    if (p) {
      this.api.player(p.id).subscribe((fresh) => this.player.set(fresh));
    }
  }

  private reset(): void {
    this.pending.set(null);
    this.amountHtg = null;
    this.note = '';
    this.otpCode = '';
    this.receipt = '';
    this.error.set(null);
  }
}
