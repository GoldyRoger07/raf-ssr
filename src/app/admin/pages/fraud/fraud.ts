import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { PlayerSearch } from '../../components/player-search/player-search';
import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { HaitiDatePipe } from '../../core/format';
import { FraudProfile, FraudProfileInput, FraudSuspect, PlayerSummary } from '../../core/models';

/** Bornes du backend (SoloAdjustment). */
export const FRAUD_LIMITS = { price: 200, duration: 80, questions: 100 } as const;

/** « +50 % prix, -30 % temps, +20 % questions » ; « aucun effet » si tout est a 0. */
export function fraudEffect(p: FraudProfileInput): string {
  const parts: string[] = [];
  if (p.priceIncreasePercent) parts.push(`prix +${p.priceIncreasePercent} %`);
  if (p.durationDecreasePercent) parts.push(`temps -${p.durationDecreasePercent} %`);
  if (p.questionsIncreasePercent) parts.push(`questions +${p.questionsIncreasePercent} %`);
  return parts.length ? parts.join(', ') : 'aucun effet';
}

/**
 * Fraudeurs : profils de durcissement des parties solo et joueurs suspectes. Un joueur
 * liste, et ses comptes lies par appareil, voient et jouent les valeurs de son profil ;
 * le gain du sans-faute ne change pas et il n'a plus de premiere partie offerte.
 */
@Component({
  selector: 'admin-fraud',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TagModule,
    PlayerSearch,
    HaitiDatePipe,
  ],
  templateUrl: './fraud.html',
})
export default class Fraud {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly limits = FRAUD_LIMITS;
  protected readonly effect = fraudEffect;
  protected readonly profiles = signal<FraudProfile[]>([]);
  protected readonly suspects = signal<FraudSuspect[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  // Edition d'un profil (id null : creation).
  protected readonly profileOpen = signal(false);
  protected editingId: number | null = null;
  protected draft: FraudProfileInput = Fraud.emptyDraft();

  // Ajout ou modification d'un joueur suspecte.
  protected readonly suspectOpen = signal(false);
  protected readonly candidate = signal<{ id: number; name: string } | null>(null);
  protected suspectProfileId: number | null = null;
  protected suspectNote = '';

  constructor() {
    this.api.fraudProfiles().subscribe({
      next: (list) => this.profiles.set(list),
      error: (error) => this.error.set(errorMessage(error)),
    });
    this.api.fraudSuspects().subscribe({
      next: (list) => this.suspects.set(list),
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  private static emptyDraft(): FraudProfileInput {
    return { name: '', priceIncreasePercent: 0, durationDecreasePercent: 0, questionsIncreasePercent: 0 };
  }

  // --- Profils -------------------------------------------------------------------

  protected newProfile(): void {
    this.editingId = null;
    this.draft = Fraud.emptyDraft();
    this.profileOpen.set(true);
  }

  protected editProfile(profile: FraudProfile): void {
    this.editingId = profile.id;
    this.draft = {
      name: profile.name,
      priceIncreasePercent: profile.priceIncreasePercent,
      durationDecreasePercent: profile.durationDecreasePercent,
      questionsIncreasePercent: profile.questionsIncreasePercent,
    };
    this.profileOpen.set(true);
  }

  /** Meme calcul que le backend (SoloAdjustment), sur un quiz type. */
  protected preview(): string {
    const price = Math.ceil((5 * (100 + (this.draft.priceIncreasePercent || 0))) / 100);
    const seconds = Math.max(1, Math.floor((20 * (100 - (this.draft.durationDecreasePercent || 0))) / 100));
    const questions = Math.ceil((10 * (100 + (this.draft.questionsIncreasePercent || 0))) / 100);
    return `${price} credits, ${seconds} s, ${questions} questions`;
  }

  protected saveProfile(): void {
    const input: FraudProfileInput = {
      name: this.draft.name.trim(),
      priceIncreasePercent: this.draft.priceIncreasePercent ?? 0,
      durationDecreasePercent: this.draft.durationDecreasePercent ?? 0,
      questionsIncreasePercent: this.draft.questionsIncreasePercent ?? 0,
    };
    const request = this.editingId == null
      ? this.api.createFraudProfile(input)
      : this.api.updateFraudProfile(this.editingId, input);
    this.busy.set(true);
    request.subscribe({
      next: (list) => {
        this.profiles.set(list);
        this.profileOpen.set(false);
        this.refreshSuspects();
        this.done(this.editingId == null ? 'Profil cree' : 'Profil modifie',
          this.editingId == null ? input.name : 'Les parties en cours gardent leurs valeurs.');
      },
      error: (error) => this.fail(error),
    });
  }

  protected deleteProfile(profile: FraudProfile): void {
    this.confirmation.confirm({
      header: 'Supprimer le profil',
      message: `Supprimer le profil « ${profile.name} » ?`,
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      accept: () => {
        this.busy.set(true);
        this.api.deleteFraudProfile(profile.id).subscribe({
          next: (list) => {
            this.profiles.set(list);
            this.done('Profil supprime', profile.name);
          },
          error: (error) => this.fail(error),
        });
      },
    });
  }

  // --- Joueurs -------------------------------------------------------------------

  protected newSuspect(): void {
    this.candidate.set(null);
    this.suspectProfileId = this.profiles()[0]?.id ?? null;
    this.suspectNote = '';
    this.suspectOpen.set(true);
  }

  protected editSuspect(suspect: FraudSuspect): void {
    this.candidate.set({ id: suspect.playerId, name: suspect.playerName });
    this.suspectProfileId = suspect.profileId;
    this.suspectNote = suspect.note;
    this.suspectOpen.set(true);
  }

  protected choose(player: PlayerSummary): void {
    this.candidate.set({ id: player.id, name: `${player.firstName} ${player.lastName}` });
  }

  protected saveSuspect(): void {
    const candidate = this.candidate();
    if (!candidate || this.suspectProfileId == null || !this.suspectNote.trim()) {
      return;
    }
    this.busy.set(true);
    this.api.addFraudSuspect(candidate.id, this.suspectProfileId, this.suspectNote.trim()).subscribe({
      next: (list) => {
        this.suspects.set(list);
        this.suspectOpen.set(false);
        this.refreshProfiles();
        this.done('Joueur enregistre', `${candidate.name} : ses prochaines parties solo suivent le profil.`);
      },
      error: (error) => this.fail(error),
    });
  }

  protected removeSuspect(suspect: FraudSuspect): void {
    this.confirmation.confirm({
      header: 'Retirer de la liste',
      message: `${suspect.playerName} et ses comptes lies retrouveront les valeurs normales a leur prochaine partie solo.`,
      acceptLabel: 'Retirer',
      rejectLabel: 'Annuler',
      accept: () => {
        this.busy.set(true);
        this.api.removeFraudSuspect(suspect.playerId).subscribe({
          next: (list) => {
            this.suspects.set(list);
            this.refreshProfiles();
            this.done('Retire de la liste', suspect.playerName);
          },
          error: (error) => this.fail(error),
        });
      },
    });
  }

  private refreshProfiles(): void {
    this.api.fraudProfiles().subscribe({ next: (list) => this.profiles.set(list) });
  }

  private refreshSuspects(): void {
    this.api.fraudSuspects().subscribe({ next: (list) => this.suspects.set(list) });
  }

  private done(summary: string, detail: string): void {
    this.busy.set(false);
    this.messages.add({ severity: 'success', summary, detail });
  }

  private fail(error: unknown): void {
    this.busy.set(false);
    this.messages.add({ severity: 'error', summary: 'Action impossible', detail: errorMessage(error) });
  }
}
