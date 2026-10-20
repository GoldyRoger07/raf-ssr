import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { HaitiDatePipe, HtgPipe } from '../../core/format';
import { AppSetting, Dashboard } from '../../core/models';

interface SettingMeta {
  group: string;
  label: string;
  unit: string;
}

/** Libelles lisibles des parametres connus ; un parametre inconnu s'affiche sous sa cle. */
const META: Record<string, SettingMeta> = {
  'credit.htg_rate': { group: 'Argent', label: "Valeur d'un credit", unit: 'HTG' },
  'withdrawal.min_htg': { group: 'Retraits', label: 'Retrait minimum', unit: 'HTG' },
  'withdrawal.max_htg_per_day': { group: 'Retraits', label: 'Plafond de retrait par jour', unit: 'HTG' },
  'withdrawal.fee_htg': { group: 'Retraits', label: 'Frais de retrait MonCash / NatCash', unit: 'HTG' },
  'withdrawal.counter_fee_htg': { group: 'Retraits', label: 'Frais de retrait au guichet', unit: 'HTG' },
  'game.network_grace_seconds': { group: 'Jeu', label: 'Marge reseau en fin de partie', unit: 's' },
  'game.question_grace_ms': { group: 'Jeu', label: 'Marge par question (question par question)', unit: 'ms' },
  'game.min_answer_ms': { group: 'Jeu', label: 'Reponse jugee trop rapide en dessous de', unit: 'ms' },
  'game.fast_answer_flag_count': { group: 'Jeu', label: 'Reponses trop rapides avant signalement', unit: 'reponses' },
  'game.pool_ratio_min': { group: 'Jeu', label: 'Taille minimale du vivier', unit: '× questions par partie' },
  'question.import_max_rows': { group: 'Contenu', label: 'Lignes maximum par import CSV', unit: 'lignes' },
  'ai.max_questions_per_request': { group: 'Contenu', label: 'Questions maximum par generation IA', unit: 'questions' },
  'ai.max_requests_per_day': { group: 'Contenu', label: 'Generations IA maximum par jour', unit: 'demandes' },
};
const GROUP_ORDER = ['Argent', 'Retraits', 'Jeu', 'Contenu', 'Autres'];
const CREDIT_RATE = 'credit.htg_rate';

interface Row {
  setting: AppSetting;
  meta: SettingMeta;
  /** Valeur saisie, pas encore enregistree. */
  draft: number | null;
}

/**
 * Parametres applicatifs (super-administrateur). Chaque modification est tracee
 * au journal d'audit par le backend. La valeur du credit a sa confirmation :
 * la changer reevalue d'un coup tous les soldes en circulation.
 */
@Component({
  selector: 'admin-settings',
  imports: [FormsModule, ButtonModule, DialogModule, InputNumberModule, MessageModule, HtgPipe, HaitiDatePipe],
  templateUrl: './settings.html',
})
export default class Settings {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);

  protected readonly rows = signal<Row[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal<string | null>(null);

  protected readonly groups = computed(() => {
    const byGroup = new Map<string, Row[]>();
    for (const row of this.rows()) {
      byGroup.set(row.meta.group, [...(byGroup.get(row.meta.group) ?? []), row]);
    }
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ name: g, rows: byGroup.get(g)! }));
  });

  // Confirmation du changement de valeur du credit.
  protected readonly rateOpen = signal(false);
  protected readonly rateRow = signal<Row | null>(null);
  protected readonly dashboard = signal<Dashboard | null>(null);
  protected readonly impact = computed(() => {
    const row = this.rateRow();
    const d = this.dashboard();
    if (!row || !d || row.draft == null) {
      return null;
    }
    const before = Number(row.setting.value);
    const after = row.draft;
    const winnings = d.balances.winningsBalanceHtg;
    const credits = d.balances.creditBalance;
    return {
      before,
      after,
      winningsBefore: winnings,
      winningsAfter: winnings,
      creditsBefore: credits * before,
      creditsAfter: credits * after,
    };
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.api.settings().subscribe({
      next: (settings) => {
        this.rows.set(
          settings.map((setting) => ({
            setting,
            meta: META[setting.key] ?? { group: 'Autres', label: setting.key, unit: '' },
            draft: Number(setting.value),
          })),
        );
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected changed(row: Row): boolean {
    return row.draft != null && row.draft !== Number(row.setting.value);
  }

  protected reset(row: Row): void {
    this.patch(row.setting.key, { draft: Number(row.setting.value) });
  }

  protected setDraft(row: Row, value: number | null): void {
    this.patch(row.setting.key, { draft: value });
  }

  protected save(row: Row): void {
    if (!this.changed(row)) {
      return;
    }
    if (row.setting.key === CREDIT_RATE) {
      this.rateRow.set(row);
      this.dashboard.set(null);
      this.rateOpen.set(true);
      this.api.dashboard().subscribe({ next: (d) => this.dashboard.set(d), error: () => this.dashboard.set(null) });
      return;
    }
    this.persist(row);
  }

  protected confirmRate(): void {
    const row = this.rateRow();
    if (row) {
      this.persist(row, () => this.rateOpen.set(false));
    }
  }

  private persist(row: Row, after?: () => void): void {
    this.saving.set(row.setting.key);
    this.api.updateSetting(row.setting.key, row.draft!).subscribe({
      next: (setting) => {
        this.saving.set(null);
        this.patch(setting.key, { setting, draft: Number(setting.value) });
        after?.();
        this.messages.add({ severity: 'success', summary: 'Parametre enregistre', detail: `${row.meta.label} : ${setting.value} ${row.meta.unit}` });
      },
      error: (error) => {
        this.saving.set(null);
        this.messages.add({ severity: 'error', summary: 'Enregistrement impossible', detail: errorMessage(error), life: 8000 });
      },
    });
  }

  private patch(key: string, changes: Partial<Row>): void {
    this.rows.update((rows) => rows.map((r) => (r.setting.key === key ? { ...r, ...changes } : r)));
  }
}
