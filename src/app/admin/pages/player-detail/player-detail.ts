import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { Subject, debounceTime } from 'rxjs';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { CreditsPipe, HaitiDatePipe, HtgPipe } from '../../core/format';
import { Severity, TRANSACTION_TYPE, WITHDRAWAL_STATUS, providerLabel, withdrawalStatus } from '../../core/labels';
import { PAGE_SIZE_OPTIONS, TableState } from '../../core/table-state';
import {
  AdminWithdrawal,
  AntiFraudOverview,
  BalanceType,
  FraudProfile,
  FraudSuspect,
  FirstSoloOfferStatus,
  LinkedAccount,
  PlayerSummary,
  RetentionReason,
  TopUpRetentionView,
  WalletTransaction,
  WithdrawalStatus,
} from '../../core/models';

const RETENTION_REASON: Record<RetentionReason, string> = {
  KEPT: 'Reste d\'une recharge',
  USED: 'Reprise par une recharge',
  ADJUSTMENT: 'Correction',
};

/** « 3712 3456 » -> « +50937123456 » ; un numero deja international est garde. */
function normalizePhone(raw: string): string {
  const compact = raw.replace(/[\s().-]/g, '');
  if (compact.startsWith('+')) {
    return compact;
  }
  if (compact.startsWith('00')) {
    return '+' + compact.slice(2);
  }
  if (compact.startsWith('509') && compact.length === 11) {
    return '+' + compact;
  }
  return '+509' + compact;
}

const PAGE_SIZE = 15;

@Component({
  selector: 'admin-player-detail',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SelectButtonModule,
    TableModule,
    TabsModule,
    TagModule,
    CreditsPipe,
    HtgPipe,
    HaitiDatePipe,
  ],
  templateUrl: './player-detail.html',
})
export default class PlayerDetail implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);

  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** Parametre de route :id. Suivi en continu : passer d'une fiche a l'autre reutilise le composant. */
  protected readonly id = signal(0);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly pageSizes = PAGE_SIZE_OPTIONS;

  // Recherche, filtres et tri des onglets Mouvements et Retraits (cote serveur).
  protected readonly transactionsTable = new TableState(['createdAt', 'type', 'balanceType', 'amount'], PAGE_SIZE);
  protected readonly withdrawalsTable = new TableState(['createdAt', 'netHtg', 'provider', 'status'], PAGE_SIZE);
  protected transactionFilters: { q: string; type: string | null; balanceType: string | null; from: string | null; to: string | null } = {
    q: '',
    type: null,
    balanceType: null,
    from: null,
    to: null,
  };
  protected withdrawalFilters: { status: WithdrawalStatus | null; provider: string | null } = { status: null, provider: null };
  protected readonly transactionTypeOptions = Object.entries(TRANSACTION_TYPE).map(([value, label]) => ({ value, label }));
  protected readonly balanceTypeOptions = [
    { label: 'Credits', value: 'CREDIT' },
    { label: 'Gains', value: 'WINNINGS' },
  ];
  protected readonly withdrawalStatusOptions = Object.entries(WITHDRAWAL_STATUS).map(([value, s]) => ({ value, label: s.label }));
  protected readonly providerOptions = ['MONCASH', 'NATCASH', 'MANUAL'].map((value) => ({ value, label: providerLabel(value) }));
  private readonly typedTransactions = new Subject<void>();

  // Retenue : liste courte, filtree et triee dans le navigateur.
  protected readonly retentionReasonOptions = Object.entries(RETENTION_REASON).map(([value, label]) => ({ value, label }));
  protected readonly retentionReason$ = signal<string | null>(null);
  protected readonly retentionRows = computed(() => {
    const reason = this.retentionReason$();
    return (this.retention()?.entries ?? []).filter((e) => !reason || e.reason === reason);
  });
  protected readonly typeLabels = TRANSACTION_TYPE;

  /** Mouvement d'une partie solo (entree payee ou gain du sans-faute) : son corrige est consultable. */
  protected hasGame(t: WalletTransaction): boolean {
    return t.type === 'SOLO_ENTRY' || (t.type === 'PRIZE' && t.referenceType === 'GameSession');
  }
  protected readonly withdrawalStatus = withdrawalStatus;
  protected readonly providerLabel = providerLabel;

  protected readonly player = signal<PlayerSummary | null>(null);
  protected readonly testBusy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly transactions = signal<WalletTransaction[]>([]);
  protected readonly transactionsTotal = signal(0);
  protected readonly withdrawals = signal<AdminWithdrawal[]>([]);
  protected readonly withdrawalsTotal = signal(0);
  protected readonly linkedAccounts = signal<LinkedAccount[]>([]);
  protected readonly firstSoloOffer = signal<FirstSoloOfferStatus | null>(null);

  /** Etiquette de la premiere partie offerte : libelle court, explication au survol. */
  protected readonly firstSoloOfferTag = computed(() => {
    const o = this.firstSoloOffer();
    if (!o) {
      return null;
    }
    const other = o.linkedPlayerName || 'un compte lie';
    const tags: Record<FirstSoloOfferStatus['reason'], { value: string; severity: Severity; title: string }> = {
      ELIGIBLE: { value: '1re partie offerte : a droit', severity: 'success', title: 'Sa prochaine partie solo payante sera offerte' },
      RECEIVED: { value: '1re partie offerte : deja recue', severity: 'info', title: o.sessionId ? 'Voir le corrige de la partie offerte' : 'Offre deja utilisee' },
      DISABLED: { value: '1re partie offerte : coupee', severity: 'secondary', title: "L'interrupteur de l'ecran App joueur est coupe : personne n'y a droit" },
      TEST: { value: '1re partie offerte : non (test)', severity: 'secondary', title: 'Compte de test : il joue deja gratuitement' },
      FRAUD: { value: '1re partie offerte : non (fraudeur)', severity: 'danger', title: 'Lui ou un compte lie est liste comme fraudeur' },
      PAID: { value: '1re partie offerte : non (deja paye)', severity: 'warn', title: 'Il a deja paye une partie solo' },
      LINKED_RECEIVED: { value: '1re partie offerte : non (compte lie)', severity: 'warn', title: `${other} l'a deja recue, sur un appareil partage` },
      LINKED_PAID: { value: '1re partie offerte : non (compte lie)', severity: 'warn', title: `${other} a deja paye une partie solo, sur un appareil partage` },
    };
    return tags[o.reason];
  });
  protected readonly loadingWithdrawals = signal(false);
  protected readonly loadingTransactions = signal(false);

  // Recharge manuelle
  protected readonly topUpOpen = signal(false);
  protected topUpAmount: number | null = null;
  protected topUpReference = '';
  protected topUpNote = '';

  // Ajustement
  protected readonly phoneOpen = signal(false);
  protected readonly phoneError = signal<string | null>(null);
  protected newPhone = '';
  protected readonly emailOpen = signal(false);
  protected readonly emailError = signal<string | null>(null);
  protected newEmail = '';
  protected readonly adjustOpen = signal(false);
  protected readonly balanceOptions = [
    { label: 'Credits', value: 'CREDIT' },
    { label: 'Gains', value: 'WINNINGS' },
  ];
  protected adjustBalance: BalanceType = 'CREDIT';
  protected adjustAmount: number | null = null;
  protected adjustReason = '';

  // Retenue de recharge : gourdes qui ne formaient pas un credit entier.
  protected readonly retention = signal<TopUpRetentionView | null>(null);
  protected retentionLabel(reason: string): string {
    return RETENTION_REASON[reason as RetentionReason] ?? reason;
  }
  protected readonly retentionOpen = signal(false);
  protected retentionAmount: number | null = null;
  protected retentionReason = '';

  protected readonly busy = signal(false);

  ngOnInit(): void {
    this.typedTransactions.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.applyTransactions());
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.id.set(Number(params.get('id')));
      this.player.set(null);
      this.error.set(null);
      this.transactionsTable.restart();
      this.withdrawalsTable.restart();
      this.reload();
    });
  }

  // Cas de retrait particulier : retraits par tranches, accord avant le solo.
  protected readonly specialOpen = signal(false);
  protected readonly specialBusy = signal(false);
  protected specialNote = '';

  protected toggleSpecialCase(): void {
    const p = this.player();
    if (!p) {
      return;
    }
    if (!p.payoutSpecialCase) {
      this.specialNote = '';
      this.specialOpen.set(true);
      return;
    }
    this.specialBusy.set(true);
    this.api.removeSpecialCase(p.id).subscribe({
      next: () => {
        this.specialBusy.set(false);
        this.player.set({ ...p, payoutSpecialCase: false, payoutSpecialCaseNote: null });
        this.messages.add({ severity: 'success', summary: 'Retire des cas particuliers', detail: 'Ses prochains retraits seront payes en une fois.' });
      },
      error: (error) => {
        this.specialBusy.set(false);
        this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) });
      },
    });
  }

  protected addSpecialCase(): void {
    const p = this.player();
    if (!p) {
      return;
    }
    const note = this.specialNote.trim() || null;
    this.specialBusy.set(true);
    this.api.addSpecialCase(p.id, note).subscribe({
      next: () => {
        this.specialBusy.set(false);
        this.specialOpen.set(false);
        this.player.set({ ...p, payoutSpecialCase: true, payoutSpecialCaseNote: note });
        this.messages.add({ severity: 'success', summary: 'Cas particulier ajoute', detail: 'Il verra l\u2019accord avant sa prochaine partie solo.' });
      },
      error: (error) => {
        this.specialBusy.set(false);
        this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) });
      },
    });
  }

  /** Compte de test : son activite sort du tableau de bord, il voit les quiz de test. */
  protected toggleTest(): void {
    const p = this.player();
    if (!p) {
      return;
    }
    const test = !p.test;
    this.testBusy.set(true);
    this.api.setUserTest(p.id, test).subscribe({
      next: () => {
        this.testBusy.set(false);
        this.player.set({ ...p, test });
        this.messages.add({
          severity: 'success',
          summary: test ? 'Compte marque comme test' : 'Compte de nouveau reel',
          detail: test ? 'Il joue gratuitement et sans gain ; son activite ne compte plus.' : undefined,
        });
      },
      error: (error) => {
        this.testBusy.set(false);
        this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) });
      },
    });
  }

  protected reload(): void {
    this.api.player(this.id()).subscribe({
      next: (player) => this.player.set(player),
      error: (error) => this.error.set(errorMessage(error)),
    });
    this.loadTransactions();
    this.loadWithdrawals();
    this.loadRetention();
    this.loadLinkedAccounts();
    this.loadFirstSoloOffer();
    this.loadFraud();
    this.loadAntiFraud();
  }

  // Fraudeurs : profil applique a ce joueur (et a ses comptes lies), ajout depuis la fiche
  // ou depuis l'onglet Comptes lies.
  protected readonly fraudProfiles = signal<FraudProfile[]>([]);
  protected readonly fraudSuspects = signal<FraudSuspect[]>([]);
  protected readonly fraudEntry = computed(() => this.fraudSuspects().find((s) => s.playerId === this.id()) ?? null);
  /** Comptes lies listes comme fraudeurs : leur profil touche aussi ce joueur. */
  protected readonly fraudViaLinked = computed(() => {
    const linked = new Set(this.linkedAccounts().map((a) => a.playerId));
    return this.fraudSuspects().filter((s) => linked.has(s.playerId));
  });
  protected readonly fraudOpen = signal(false);
  protected readonly fraudBusy = signal(false);
  protected readonly fraudTarget = signal<{ id: number; name: string } | null>(null);
  protected fraudProfileId: number | null = null;
  protected fraudNote = '';

  protected isSuspect(playerId: number): boolean {
    return this.fraudSuspects().some((s) => s.playerId === playerId);
  }

  private loadFraud(): void {
    this.api.fraudProfiles().subscribe({ next: (list) => this.fraudProfiles.set(list) });
    this.api.fraudSuspects().subscribe({ next: (list) => this.fraudSuspects.set(list) });
  }

  protected openFraud(target: { id: number; name: string }): void {
    const existing = this.fraudSuspects().find((s) => s.playerId === target.id);
    this.fraudTarget.set(target);
    this.fraudProfileId = existing?.profileId ?? this.fraudProfiles()[0]?.id ?? null;
    this.fraudNote = existing?.note ?? '';
    this.fraudOpen.set(true);
  }

  protected openFraudForPlayer(): void {
    const p = this.player();
    if (p) {
      this.openFraud({ id: p.id, name: `${p.firstName} ${p.lastName}` });
    }
  }

  protected saveFraud(): void {
    const target = this.fraudTarget();
    if (!target || this.fraudProfileId == null || !this.fraudNote.trim()) {
      return;
    }
    this.fraudBusy.set(true);
    this.api.addFraudSuspect(target.id, this.fraudProfileId, this.fraudNote.trim()).subscribe({
      next: (list) => {
        this.fraudBusy.set(false);
        this.fraudOpen.set(false);
        this.fraudSuspects.set(list);
        this.messages.add({ severity: 'success', summary: 'Liste des fraudeurs', detail: `${target.name} : ses prochaines parties solo suivent le profil.` });
      },
      error: (error) => {
        this.fraudBusy.set(false);
        this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) });
      },
    });
  }

  protected removeFraud(): void {
    const target = this.fraudTarget();
    if (!target) {
      return;
    }
    this.fraudBusy.set(true);
    this.api.removeFraudSuspect(target.id).subscribe({
      next: (list) => {
        this.fraudBusy.set(false);
        this.fraudOpen.set(false);
        this.fraudSuspects.set(list);
        this.messages.add({ severity: 'success', summary: 'Retire de la liste', detail: `${target.name} retrouvera les valeurs normales.` });
      },
      error: (error) => {
        this.fraudBusy.set(false);
        this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) });
      },
    });
  }

  // Anti-fraude : pas de sans-faute en solo pour ce compte (ses comptes lies non compris).
  protected readonly antiFraud = signal<AntiFraudOverview | null>(null);
  protected readonly antiFraudEntry = computed(
    () => this.antiFraud()?.targets.find((t) => t.playerId === this.id()) ?? null,
  );
  protected readonly antiFraudOpen = signal(false);
  protected readonly antiFraudBusy = signal(false);
  protected antiFraudNote = '';

  private loadAntiFraud(): void {
    this.api.antiFraud().subscribe({ next: (view) => this.antiFraud.set(view) });
  }

  protected openAntiFraud(): void {
    this.antiFraudNote = this.antiFraudEntry()?.note ?? '';
    this.antiFraudOpen.set(true);
  }

  protected saveAntiFraud(): void {
    const p = this.player();
    if (!p || !this.antiFraudNote.trim()) {
      return;
    }
    this.antiFraudBusy.set(true);
    this.api.addAntiFraudTarget(p.id, this.antiFraudNote.trim()).subscribe({
      next: (view) => this.antiFraudDone(view, 'Anti-fraude active', 'Plus de sans-faute possible a sa prochaine partie solo.'),
      error: (error) => this.antiFraudFailed(error),
    });
  }

  protected removeAntiFraud(): void {
    const p = this.player();
    if (!p) {
      return;
    }
    this.antiFraudBusy.set(true);
    this.api.removeAntiFraudTarget(p.id).subscribe({
      next: (view) => this.antiFraudDone(view, "Retire de l'anti-fraude", 'Corrige normalement a sa prochaine partie solo.'),
      error: (error) => this.antiFraudFailed(error),
    });
  }

  private antiFraudDone(view: AntiFraudOverview, summary: string, detail: string): void {
    this.antiFraudBusy.set(false);
    this.antiFraudOpen.set(false);
    this.antiFraud.set(view);
    this.messages.add({ severity: 'success', summary, detail });
  }

  private antiFraudFailed(error: unknown): void {
    this.antiFraudBusy.set(false);
    this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) });
  }

  private loadFirstSoloOffer(): void {
    this.firstSoloOffer.set(null);
    this.api.firstSoloOffer(this.id()).subscribe({ next: (status) => this.firstSoloOffer.set(status) });
  }

  private loadLinkedAccounts(): void {
    this.linkedAccounts.set([]);
    this.api.linkedAccounts(this.id()).subscribe({ next: (accounts) => this.linkedAccounts.set(accounts) });
  }

  private loadRetention(): void {
    this.api.retention(this.id()).subscribe({ next: (view) => this.retention.set(view) });
  }

  /** Apercu de la recharge en cours de saisie : credits et reste, retenue actuelle comprise. */
  protected topUpPreview(): { credits: number; kept: number; used: number } | null {
    const view = this.retention();
    if (!view || !this.topUpAmount || this.topUpAmount <= 0) {
      return null;
    }
    const total = this.topUpAmount + view.balanceHtg;
    return { credits: Math.floor(total / view.htgRate), kept: total % view.htgRate, used: view.balanceHtg };
  }

  protected openRetention(): void {
    this.retentionAmount = null;
    this.retentionReason = '';
    this.retentionOpen.set(true);
  }

  protected adjustRetention(): void {
    if (!this.retentionAmount || !this.retentionReason.trim()) {
      return;
    }
    this.busy.set(true);
    this.api.adjustRetention(this.id(), this.retentionAmount, this.retentionReason.trim()).subscribe({
      next: (view) => {
        this.retention.set(view);
        this.retentionOpen.set(false);
        this.done('Retenue corrigee', `Nouvelle retenue : ${view.balanceHtg} HTG. La correction est tracee dans le journal d'audit.`);
      },
      error: (error) => this.fail(error),
    });
  }

  protected onWithdrawalsPage(event: TableLazyLoadEvent): void {
    if (this.withdrawalsTable.onLazyLoad(event)) {
      this.loadWithdrawals();
    }
  }

  protected get transactionsFiltered(): boolean {
    const f = this.transactionFilters;
    return !!f.q.trim() || !!f.type || !!f.balanceType || !!f.from || !!f.to;
  }

  protected get withdrawalsFiltered(): boolean {
    return !!this.withdrawalFilters.status || !!this.withdrawalFilters.provider;
  }

  protected onTransactionsInput(): void {
    this.typedTransactions.next();
  }

  protected applyTransactions(): void {
    this.transactionsTable.restart();
    this.loadTransactions();
  }

  protected resetTransactions(): void {
    this.transactionFilters = { q: '', type: null, balanceType: null, from: null, to: null };
    this.transactionsTable.reset();
    this.loadTransactions();
  }

  protected applyWithdrawals(): void {
    this.withdrawalsTable.restart();
    this.loadWithdrawals();
  }

  protected resetWithdrawals(): void {
    this.withdrawalFilters = { status: null, provider: null };
    this.withdrawalsTable.reset();
    this.loadWithdrawals();
  }

  private loadWithdrawals(): void {
    this.loadingWithdrawals.set(true);
    const t = this.withdrawalsTable;
    this.api.playerWithdrawals(this.id(), t.page, t.pageSize, this.withdrawalFilters, t.sort ?? undefined).subscribe({
      next: (page) => {
        this.withdrawals.set(page.content);
        this.withdrawalsTotal.set(page.totalElements);
        this.loadingWithdrawals.set(false);
      },
      error: () => {
        this.withdrawals.set([]);
        this.withdrawalsTotal.set(0);
        this.loadingWithdrawals.set(false);
      },
    });
  }

  protected onTransactionsPage(event: TableLazyLoadEvent): void {
    if (this.transactionsTable.onLazyLoad(event)) {
      this.loadTransactions();
    }
  }

  protected openTopUp(): void {
    this.topUpAmount = null;
    // Reference proposee : unique, mais l'agent peut la remplacer par le numero du recu.
    this.topUpReference = `GUICHET-${Date.now()}`;
    this.topUpNote = '';
    this.topUpOpen.set(true);
  }

  protected topUp(): void {
    if (!this.topUpAmount || !this.topUpReference.trim()) {
      return;
    }
    this.busy.set(true);
    this.api.manualTopUp(this.id(), this.topUpAmount, this.topUpReference.trim(), this.topUpNote.trim() || null).subscribe({
      next: (result) => {
        this.topUpOpen.set(false);
        const parts = [`${result.amountHtg} HTG recus : ${result.credits} credit(s) ajoute(s).`];
        if (result.retentionUsedHtg > 0) {
          parts.push(`${result.retentionUsedHtg} HTG de retenue repris.`);
        }
        if (result.retentionKeptHtg > 0) {
          parts.push(`${result.retentionKeptHtg} HTG gardes pour la prochaine recharge.`);
        }
        this.done('Recharge enregistree', parts.join(' '));
      },
      error: (error) => this.fail(error),
    });
  }

  protected openPhone(): void {
    this.newPhone = this.player()?.phone ?? '';
    this.phoneError.set(null);
    this.phoneOpen.set(true);
  }

  protected changePhone(): void {
    const p = this.player();
    const phone = normalizePhone(this.newPhone);
    if (!p) {
      return;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      this.phoneError.set('Numero invalide : 8 chiffres (Haiti) ou format international, ex. +50937123456.');
      return;
    }
    this.busy.set(true);
    this.phoneError.set(null);
    this.api.changePlayerPhone(p.id, phone).subscribe({
      next: (user) => {
        this.busy.set(false);
        this.phoneOpen.set(false);
        this.player.set({ ...p, phone: user.phone, phoneVerified: user.phoneVerified });
        this.messages.add({ severity: 'success', summary: 'Numero modifie', detail: `${user.phone}, a verifier par le joueur.` });
      },
      error: (error) => {
        this.busy.set(false);
        this.phoneError.set(errorMessage(error));
      },
    });
  }

  protected openEmail(): void {
    this.newEmail = this.player()?.email ?? '';
    this.emailError.set(null);
    this.emailOpen.set(true);
  }

  protected changeEmail(): void {
    const p = this.player();
    const email = this.newEmail.trim();
    if (!p || !email) {
      return;
    }
    this.busy.set(true);
    this.emailError.set(null);
    this.api.changePlayerEmail(p.id, email).subscribe({
      next: (user) => {
        this.busy.set(false);
        this.emailOpen.set(false);
        this.player.set({ ...p, email: user.email, emailVerified: user.emailVerified });
        this.messages.add({ severity: 'success', summary: 'Email modifie', detail: `Lien de confirmation envoye a ${user.email}.` });
      },
      error: (error) => {
        this.busy.set(false);
        this.emailError.set(errorMessage(error));
      },
    });
  }

  protected openAdjust(): void {
    this.adjustBalance = 'CREDIT';
    this.adjustAmount = null;
    this.adjustReason = '';
    this.adjustOpen.set(true);
  }

  protected adjust(): void {
    if (!this.adjustAmount || !this.adjustReason.trim()) {
      return;
    }
    this.busy.set(true);
    this.api.adjust(this.id(), this.adjustBalance, this.adjustAmount, this.adjustReason.trim()).subscribe({
      next: () => {
        this.adjustOpen.set(false);
        this.done('Solde ajuste', 'La correction est tracee dans le journal d\'audit.');
      },
      error: (error) => this.fail(error),
    });
  }

  private loadTransactions(): void {
    this.loadingTransactions.set(true);
    const t = this.transactionsTable;
    this.api.transactions(this.id(), t.page, t.pageSize, this.transactionFilters, t.sort ?? undefined).subscribe({
      next: (page) => {
        this.transactions.set(page.content);
        this.transactionsTotal.set(page.totalElements);
        this.loadingTransactions.set(false);
      },
      error: () => this.loadingTransactions.set(false),
    });
  }

  private done(summary: string, detail: string): void {
    this.busy.set(false);
    this.messages.add({ severity: 'success', summary, detail });
    this.transactionsTable.restart();
    this.reload();
  }

  private fail(error: unknown): void {
    this.busy.set(false);
    this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) });
  }
}
