import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { DepositNumbers as Numbers } from '../../core/models';

interface Channel {
  key: 'moncash' | 'natcash';
  label: string;
  enabled: ReturnType<typeof signal<boolean>>;
  number: ReturnType<typeof signal<string>>;
}

/** « +50937123456 » -> « +509 3712 3456 ». */
export function formatHaitiNumber(value: string | null | undefined): string {
  const match = value?.match(/^\+509(\d{4})(\d{4})$/);
  return match ? `+509 ${match[1]} ${match[2]}` : (value ?? '');
}

/**
 * Numeros MonCash et NatCash ou les joueurs envoient leurs recharges a distance.
 * Le joueur envoie depuis le telephone de son compte RAF ; l'agent reconnait le
 * numero de l'expediteur et credite le montant recu depuis la fiche du joueur.
 * Chaque modification est tracee au journal d'audit.
 */
@Component({
  selector: 'admin-deposit-numbers',
  imports: [FormsModule, ButtonModule, InputTextModule, MessageModule, ToggleSwitchModule],
  templateUrl: './deposit-numbers.html',
})
export default class DepositNumbers {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);

  protected readonly saved = signal<Numbers | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly channels: Channel[] = [
    { key: 'moncash', label: 'MonCash', enabled: signal(false), number: signal('') },
    { key: 'natcash', label: 'NatCash', enabled: signal(false), number: signal('') },
  ];

  protected readonly format = formatHaitiNumber;

  protected readonly changed = computed(() => {
    const s = this.saved();
    return (
      !!s &&
      this.channels.some(
        (c) => this.savedEnabled(s, c) !== c.enabled() || formatHaitiNumber(this.savedNumber(s, c)) !== c.number().trim(),
      )
    );
  });

  constructor() {
    this.api.depositNumbers().subscribe({
      next: (numbers) => {
        this.apply(numbers);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected reset(): void {
    const s = this.saved();
    if (s) {
      this.apply(s);
    }
  }

  protected save(): void {
    const missing = this.channels.find((c) => c.enabled() && !c.number().trim());
    if (missing) {
      this.messages.add({
        severity: 'warn',
        summary: 'Numero manquant',
        detail: `Indiquez le numero ${missing.label} avant de l'activer.`,
      });
      return;
    }
    const [moncash, natcash] = this.channels;
    this.saving.set(true);
    this.api
      .updateDepositNumbers({
        moncashEnabled: moncash.enabled(),
        moncashNumber: moncash.number().trim() || null,
        natcashEnabled: natcash.enabled(),
        natcashNumber: natcash.number().trim() || null,
      })
      .subscribe({
        next: (numbers) => {
          this.saving.set(false);
          this.apply(numbers);
          this.messages.add({ severity: 'success', summary: 'Numeros enregistres' });
        },
        error: (error) => {
          this.saving.set(false);
          this.messages.add({ severity: 'error', summary: 'Enregistrement impossible', detail: errorMessage(error), life: 8000 });
        },
      });
  }

  private apply(numbers: Numbers): void {
    this.saved.set(numbers);
    for (const c of this.channels) {
      c.enabled.set(this.savedEnabled(numbers, c));
      c.number.set(formatHaitiNumber(this.savedNumber(numbers, c)));
    }
  }

  private savedEnabled(n: Numbers, c: Channel): boolean {
    return c.key === 'moncash' ? n.moncashEnabled : n.natcashEnabled;
  }

  private savedNumber(n: Numbers, c: Channel): string | null | undefined {
    return c.key === 'moncash' ? n.moncashNumber : n.natcashNumber;
  }
}
