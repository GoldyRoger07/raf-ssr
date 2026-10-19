import { Component, effect, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputOtpModule } from 'primeng/inputotp';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { AdminApi } from '../../core/admin-api.service';
import { errorCode, errorMessage } from '../../core/api';
import { HtgPipe } from '../../core/format';
import { AdminWithdrawal } from '../../core/models';

/**
 * Remise en especes d'un retrait demande par le joueur : l'agent envoie un code
 * au joueur present, le joueur le lui donne, l'agent valide la remise.
 */
@Component({
  selector: 'cash-pickup-dialog',
  imports: [FormsModule, ButtonModule, DialogModule, InputOtpModule, InputTextModule, MessageModule, HtgPipe],
  templateUrl: './cash-pickup-dialog.html',
})
export class CashPickupDialog {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);

  readonly withdrawal = input<AdminWithdrawal | null>(null);
  readonly visible = model(false);
  readonly paid = output<void>();

  protected readonly codeSent = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected code = '';
  protected receipt = '';

  constructor() {
    // Chaque ouverture repart de la premiere etape.
    effect(() => {
      if (this.visible()) {
        this.codeSent.set(false);
        this.error.set(null);
        this.code = '';
        this.receipt = '';
      }
    });
  }

  protected sendCode(): void {
    const w = this.withdrawal();
    if (!w) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api.sendPickupCode(w.withdrawal.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.codeSent.set(true);
      },
      error: (error) => {
        this.busy.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }

  protected confirm(): void {
    const w = this.withdrawal();
    if (!w || this.code.length < 4) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api.markPaid(w.withdrawal.id, this.receipt.trim() || null, this.code).subscribe({
      next: () => {
        this.busy.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Especes remises',
          detail: `${w.playerName} : retrait marque comme verse.`,
        });
        this.visible.set(false);
        this.paid.emit();
      },
      error: (error) => {
        this.busy.set(false);
        if (errorCode(error) === 'OTP_INVALID') {
          this.code = '';
        }
        this.error.set(errorMessage(error));
      },
    });
  }
}
