import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Subject, Subscription, debounceTime, interval } from 'rxjs';

import { PlayerSearch } from '../../components/player-search/player-search';
import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { HaitiDatePipe, formatNumber, haitiLocalToIso, isoToHaitiLocal } from '../../core/format';
import {
  Announcement,
  AnnouncementAudience,
  AnnouncementAudienceCount,
  AnnouncementRequest,
  AnnouncementStatus,
  PlayerSummary,
} from '../../core/models';

const PAGE_SIZE = 10;
const PAGE_SIZES = [10, 20, 50];
const HISTORY_SORT_FIELDS = ['scheduledAt', 'title', 'audience', 'status'];
const FIRST_NAME = '{prenom}';
const LINK_PATTERN = /^\/(?![/\\])\S*$/;

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/**
 * Messages aux joueurs : a un joueur ou a tous (super-administrateur), tout de
 * suite ou programmes, par popup dans l'app (bouton « J'ai compris »), push et/ou
 * email. L'historique en dessous suit l'envoi : remis, push, emails, popups vus.
 */
@Component({
  selector: 'admin-announcements',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SelectButtonModule,
    TableModule,
    TagModule,
    TextareaModule,
    ToggleSwitchModule,
    PlayerSearch,
    HaitiDatePipe,
  ],
  templateUrl: './announcements.html',
})
export default class Announcements {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly auth = inject(AuthService);

  protected readonly superAdmin = this.auth.isSuperAdmin;
  protected readonly firstNameVariable = FIRST_NAME;
  protected readonly format = formatNumber;

  // --- Formulaire -------------------------------------------------------------

  protected readonly audience = signal<AnnouncementAudience>('ONE_PLAYER');
  protected readonly audienceOptions = computed(() => [
    { label: 'Un joueur', value: 'ONE_PLAYER', disabled: false },
    { label: 'Tous les joueurs', value: 'ALL_PLAYERS', disabled: !this.superAdmin() },
  ]);
  protected readonly target = signal<PlayerSummary | null>(null);
  protected readonly includeTest = signal(false);

  protected readonly popup = signal(true);
  protected readonly push = signal(true);
  protected readonly email = signal(false);
  protected readonly important = signal(false);

  protected readonly title = signal('');
  protected readonly content = signal('');
  protected readonly linkPath = signal('');

  protected readonly when = signal<'now' | 'later'>('now');
  protected readonly whenOptions = [
    { label: 'Maintenant', value: 'now' },
    { label: 'Programmer', value: 'later' },
  ];
  protected readonly scheduledLocal = signal('');
  protected readonly popupExpiresLocal = signal('');

  protected readonly counts = signal<AnnouncementAudienceCount | null>(null);
  protected readonly countsLoading = signal(false);

  protected readonly sending = signal(false);
  protected readonly testing = signal(false);
  protected readonly confirmOpen = signal(false);
  protected confirmTyped = '';

  protected readonly minLocal = signal(isoToHaitiLocal(Date.now()));

  protected readonly linkInvalid = computed(() => {
    const link = this.linkPath().trim();
    return link.length > 0 && !LINK_PATTERN.test(link);
  });

  /** Prenom d'exemple pour l'apercu : celui du destinataire choisi, sinon un prenom type. */
  private readonly sampleName = computed(() => this.target()?.firstName ?? 'Jean');
  protected readonly previewTitle = computed(() => this.title().trim().replaceAll(FIRST_NAME, this.sampleName()) || 'Titre du message');
  protected readonly previewBody = computed(
    () => this.content().trim().replaceAll(FIRST_NAME, this.sampleName()) || 'Le texte de votre message apparaitra ici.',
  );

  /** Ce qui manque pour pouvoir envoyer, ou null. */
  protected readonly problem = computed<string | null>(() => {
    if (this.audience() === 'ONE_PLAYER' && !this.target()) {
      return 'Choisissez le joueur destinataire.';
    }
    if (!this.popup() && !this.push() && !this.email()) {
      return "Choisissez au moins un moyen d'envoi.";
    }
    if (!this.title().trim()) {
      return 'Le titre est obligatoire.';
    }
    if (!this.content().trim()) {
      return 'Le message est obligatoire.';
    }
    if (this.linkInvalid()) {
      return 'Le lien doit etre un chemin de l’app commencant par / (ex. /quiz/12).';
    }
    if (this.when() === 'later' && !this.scheduledLocal()) {
      return "Indiquez la date et l'heure d'envoi.";
    }
    return null;
  });

  protected readonly confirmReady = computed(() => this.audience() === 'ONE_PLAYER' || this.counts() !== null);

  // --- Historique -------------------------------------------------------------

  protected pageSize = PAGE_SIZE;
  protected readonly pageSizes = PAGE_SIZES;
  protected page = 0;
  protected historyFilters: {
    q: string;
    status: AnnouncementStatus | null;
    audience: AnnouncementAudience | null;
    important: boolean | null;
  } = { q: '', status: null, audience: null, important: null };
  protected historySort: { field: string; direction: 'asc' | 'desc' } | null = null;
  protected readonly historyStatusOptions: { label: string; value: AnnouncementStatus }[] = [
    { label: 'Programmes', value: 'SCHEDULED' },
    { label: 'En cours', value: 'SENDING' },
    { label: 'Envoyes', value: 'SENT' },
    { label: 'Annules', value: 'CANCELLED' },
  ];
  protected readonly historyAudienceOptions: { label: string; value: AnnouncementAudience }[] = [
    { label: 'Un joueur', value: 'ONE_PLAYER' },
    { label: 'Tous les joueurs', value: 'ALL_PLAYERS' },
  ];
  protected readonly importantOptions = [
    { label: 'Importants', value: true },
    { label: 'Non importants', value: false },
  ];
  private readonly historyTyped = new Subject<void>();
  protected readonly rows = signal<Announcement[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);

  constructor() {
    this.historyTyped.pipe(debounceTime(300), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.applyHistory());
    // Portee de l'envoi, recalculee quand les destinataires changent.
    let countSubscription: Subscription | undefined;
    effect(() => {
      const audience = this.audience();
      const target = this.target();
      const includeTest = this.includeTest();
      countSubscription?.unsubscribe();
      this.counts.set(null);
      if (audience === 'ONE_PLAYER' && !target) {
        return;
      }
      this.countsLoading.set(true);
      countSubscription = this.api.announcementAudience(audience, target?.id ?? null, includeTest).subscribe({
        next: (counts) => {
          this.counts.set(counts);
          this.countsLoading.set(false);
        },
        error: () => this.countsLoading.set(false),
      });
    });

    // Suivi en direct tant qu'un envoi est en cours ou sur le point de partir.
    interval(5000)
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => {
        this.minLocal.set(isoToHaitiLocal(Date.now()));
        const now = Date.now();
        if (this.rows().some((a) => a.status === 'SENDING' || (a.status === 'SCHEDULED' && Date.parse(a.scheduledAt) <= now))) {
          this.load(false);
        }
      });
  }

  protected chooseAudience(value: AnnouncementAudience | null): void {
    if (value) {
      this.audience.set(value);
    }
  }

  protected chooseWhen(value: 'now' | 'later' | null): void {
    if (value) {
      this.when.set(value);
    }
  }

  protected insertFirstName(): void {
    this.content.update((body) => (body.endsWith(' ') || !body ? body : body + ' ') + FIRST_NAME);
  }

  protected audienceLabel(): string {
    if (this.audience() === 'ALL_PLAYERS') {
      const counts = this.counts();
      return counts ? `tous les joueurs (${formatNumber(counts.total)})` : 'tous les joueurs';
    }
    const target = this.target();
    return target ? `${target.firstName} ${target.lastName}` : '';
  }

  protected channelsLabel(a: { popup: boolean; push: boolean; email: boolean }): string {
    return [a.popup ? 'popup' : null, a.push ? 'push' : null, a.email ? 'email' : null].filter(Boolean).join(', ');
  }

  protected whenLabel(): string {
    return this.when() === 'now' ? 'tout de suite' : `le ${this.scheduledLocal().replace('T', ' a ')} (heure d'Haiti)`;
  }

  // --- Envoi --------------------------------------------------------------------

  protected openConfirm(): void {
    const problem = this.problem();
    if (problem) {
      this.messages.add({ severity: 'warn', summary: 'Message incomplet', detail: problem });
      return;
    }
    this.confirmTyped = '';
    this.confirmOpen.set(true);
  }

  /** Envoi a tous : il faut retaper le nombre de destinataires. */
  protected confirmMatches(): boolean {
    if (this.audience() === 'ONE_PLAYER') {
      return true;
    }
    const counts = this.counts();
    return counts !== null && this.confirmTyped.replace(/\s/g, '') === String(counts.total);
  }

  protected send(): void {
    if (!this.confirmMatches()) {
      return;
    }
    const request: AnnouncementRequest = {
      audience: this.audience(),
      targetUserId: this.audience() === 'ONE_PLAYER' ? (this.target()?.id ?? null) : null,
      includeTest: this.audience() === 'ALL_PLAYERS' && this.includeTest(),
      important: this.important(),
      popup: this.popup(),
      push: this.push(),
      email: this.email(),
      title: this.title().trim(),
      body: this.content().trim(),
      linkPath: this.linkPath().trim() || null,
      scheduledAt: this.when() === 'later' && this.scheduledLocal() ? haitiLocalToIso(this.scheduledLocal()) : null,
      popupExpiresAt: this.popup() && this.popupExpiresLocal() ? haitiLocalToIso(this.popupExpiresLocal()) : null,
    };
    this.sending.set(true);
    this.api.createAnnouncement(request).subscribe({
      next: (created) => {
        this.sending.set(false);
        this.confirmOpen.set(false);
        this.messages.add({
          severity: 'success',
          summary: created.status === 'SCHEDULED' && Date.parse(created.scheduledAt) > Date.now() ? 'Message programme' : 'Envoi lance',
          detail: created.title,
        });
        this.resetForm();
        this.page = 0;
        this.load(true);
      },
      error: (error) => {
        this.sending.set(false);
        this.messages.add({ severity: 'error', summary: 'Envoi impossible', detail: errorMessage(error), life: 8000 });
      },
    });
  }

  protected sendTest(): void {
    if (!this.popup() && !this.push() && !this.email()) {
      this.messages.add({ severity: 'warn', summary: 'Message incomplet', detail: "Choisissez au moins un moyen d'envoi." });
      return;
    }
    if (!this.title().trim() || !this.content().trim() || this.linkInvalid()) {
      this.messages.add({ severity: 'warn', summary: 'Message incomplet', detail: 'Renseignez le titre, le message et un lien valide.' });
      return;
    }
    this.testing.set(true);
    this.api
      .testAnnouncement({
        popup: this.popup(),
        push: this.push(),
        email: this.email(),
        title: this.title().trim(),
        body: this.content().trim(),
        linkPath: this.linkPath().trim() || null,
      })
      .subscribe({
        next: (result) => {
          this.testing.set(false);
          const sent = [
            result.popup ? "popup (ouvrez l'app avec votre compte)" : null,
            this.push() ? (result.pushSent ? 'push' : 'push non recu : aucun appareil abonne sur votre compte') : null,
            result.emailSent ? `email a ${result.email}` : null,
          ].filter(Boolean);
          this.messages.add({ severity: 'success', summary: 'Test envoye sur votre compte', detail: sent.join(' · '), life: 8000 });
        },
        error: (error) => {
          this.testing.set(false);
          this.messages.add({ severity: 'error', summary: 'Test impossible', detail: errorMessage(error) });
        },
      });
  }

  protected cancel(a: Announcement): void {
    this.confirmation.confirm({
      header: 'Annuler le message',
      message: `Annuler « ${a.title} », programme le ${new HaitiDatePipe().transform(a.scheduledAt)} ? Il ne partira pas.`,
      acceptLabel: 'Annuler le message',
      rejectLabel: 'Garder',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () =>
        this.api.cancelAnnouncement(a.id).subscribe({
          next: (updated) => {
            this.rows.update((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
            this.messages.add({ severity: 'success', summary: 'Message annule' });
          },
          error: (error) => {
            this.messages.add({ severity: 'error', summary: 'Annulation impossible', detail: errorMessage(error) });
            this.load(false);
          },
        }),
    });
  }

  protected canCancel(a: Announcement): boolean {
    return a.status === 'SCHEDULED' && (a.audience === 'ONE_PLAYER' || this.superAdmin());
  }

  private resetForm(): void {
    this.title.set('');
    this.content.set('');
    this.linkPath.set('');
    this.important.set(false);
    this.when.set('now');
    this.scheduledLocal.set('');
    this.popupExpiresLocal.set('');
    this.confirmTyped = '';
  }

  // --- Historique ---------------------------------------------------------------

  protected get historyFiltersActive(): boolean {
    const f = this.historyFilters;
    return f.q.trim() !== '' || f.status !== null || f.audience !== null || f.important !== null || this.historySort !== null;
  }

  protected onHistoryInput(): void {
    this.historyTyped.next();
  }

  protected applyHistory(): void {
    this.page = 0;
    this.load(true);
  }

  protected resetHistory(): void {
    this.historyFilters = { q: '', status: null, audience: null, important: null };
    this.historySort = null;
    this.applyHistory();
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize;
    const field = typeof event.sortField === 'string' && HISTORY_SORT_FIELDS.includes(event.sortField) ? event.sortField : null;
    const sort = field ? { field, direction: event.sortOrder === -1 ? ('desc' as const) : ('asc' as const) } : null;
    const sortChanged = sort?.field !== this.historySort?.field || sort?.direction !== this.historySort?.direction;
    this.page = sortChanged || rows !== this.pageSize ? 0 : Math.floor((event.first ?? 0) / rows);
    this.pageSize = rows;
    this.historySort = sort;
    this.load(true);
  }

  private load(showLoading: boolean): void {
    if (showLoading) {
      this.loading.set(true);
    }
    this.api.announcements(this.page, this.pageSize, this.historyFilters, this.historySort ?? undefined).subscribe({
      next: (page) => {
        this.rows.set(page.content);
        this.total.set(page.totalElements);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Chargement impossible', detail: errorMessage(error) });
      },
    });
  }

  protected statusLabel(status: AnnouncementStatus, a: Announcement): string {
    switch (status) {
      case 'SCHEDULED':
        return Date.parse(a.scheduledAt) <= Date.now() ? 'Au depart' : 'Programme';
      case 'SENDING':
        return 'En cours';
      case 'SENT':
        return 'Envoye';
      case 'CANCELLED':
        return 'Annule';
    }
  }

  protected statusSeverity(status: AnnouncementStatus): Severity {
    switch (status) {
      case 'SCHEDULED':
        return 'info';
      case 'SENDING':
        return 'warn';
      case 'SENT':
        return 'success';
      case 'CANCELLED':
        return 'secondary';
    }
  }
}
