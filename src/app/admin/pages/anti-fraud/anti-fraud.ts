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
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { PlayerSearch } from '../../components/player-search/player-search';
import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { HaitiDatePipe } from '../../core/format';
import { AntiFraudOverview, AntiFraudTarget, PlayerSummary } from '../../core/models';

/**
 * Anti-fraude : un joueur vise ne peut pas faire de sans-faute en solo. S'il repond juste
 * a tout, 1 a 3 bonnes reponses sont comptees fausses a la correction. Par joueur (ce
 * compte seul) ou pour tous les joueurs ; le staff n'est jamais touche, les comptes de
 * test oui. Parties qui demarrent ensuite seulement.
 */
@Component({
  selector: 'admin-anti-fraud',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    TableModule,
    TagModule,
    ToggleSwitchModule,
    PlayerSearch,
    HaitiDatePipe,
  ],
  templateUrl: './anti-fraud.html',
})
export default class AntiFraud {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly overview = signal<AntiFraudOverview | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly targetOpen = signal(false);
  protected readonly candidate = signal<{ id: number; name: string } | null>(null);
  protected note = '';

  /** Ajout automatique : valeurs en cours de saisie, enregistrees par saveAuto. */
  protected autoEnabled = false;
  protected autoThreshold: number | null = 3;

  constructor() {
    this.api.antiFraud().subscribe({
      next: (view) => this.show(view),
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  protected setAllPlayers(enabled: boolean): void {
    this.confirmation.confirm({
      header: enabled ? 'Anti-fraude pour tous' : 'Couper pour tous',
      message: enabled
        ? 'Plus aucun joueur ne pourra faire de sans-faute en solo, comptes de test compris (staff exclu), a partir de sa prochaine partie. Continuer ?'
        : 'Seuls les joueurs de la liste resteront vises, a partir de leur prochaine partie. Continuer ?',
      acceptLabel: enabled ? 'Activer' : 'Couper',
      rejectLabel: 'Annuler',
      accept: () => {
        this.busy.set(true);
        this.api.setAntiFraudAllPlayers(enabled).subscribe({
          next: (view) => {
            this.overview.set(view);
            this.done(enabled ? 'Anti-fraude active pour tous' : 'Anti-fraude coupe pour tous',
              'Parties qui demarrent ensuite seulement.');
          },
          error: (error) => this.fail(error),
        });
      },
      // Refus : l'interrupteur revient a l'etat enregistre. ngModel ne se reecrit que si la
      // valeur liee change : on passe par la valeur cliquee avant de revenir.
      reject: () => {
        const view = this.overview();
        if (view) {
          this.overview.set({ ...view, allPlayers: enabled });
          setTimeout(() => this.overview.set(view));
        }
      },
    });
  }

  protected autoChanged(view: AntiFraudOverview): boolean {
    return this.autoEnabled !== view.autoEnabled || this.autoThreshold !== view.autoThreshold;
  }

  protected saveAuto(): void {
    const view = this.overview();
    const enabled = this.autoEnabled;
    const threshold = this.autoThreshold;
    if (!view || !threshold) {
      return;
    }
    const save = () => {
      this.busy.set(true);
      this.api.setAntiFraudAuto(enabled, threshold).subscribe({
        next: (result) => {
          this.show(result.overview);
          this.done(enabled ? 'Ajout automatique active' : 'Ajout automatique coupe',
            enabled
              ? `Apres ${threshold} sans-faute payant(s). ${result.added} joueur(s) ajoute(s) tout de suite.`
              : 'Plus aucun joueur ne sera ajoute automatiquement.');
        },
        error: (error) => this.fail(error),
      });
    };
    if (!enabled) {
      save();
      return;
    }
    this.confirmation.confirm({
      header: 'Ajout automatique',
      message: `Les joueurs qui ont deja ${threshold} sans-faute en solo payant (depuis leur dernier retrait de la liste) `
        + 'seront ajoutes tout de suite, puis chaque joueur qui les atteint. Continuer ?',
      acceptLabel: 'Enregistrer',
      rejectLabel: 'Annuler',
      accept: save,
    });
  }

  protected newTarget(): void {
    this.candidate.set(null);
    this.note = '';
    this.targetOpen.set(true);
  }

  protected editTarget(target: AntiFraudTarget): void {
    this.candidate.set({ id: target.playerId, name: target.playerName });
    this.note = target.note;
    this.targetOpen.set(true);
  }

  protected choose(player: PlayerSummary): void {
    this.candidate.set({ id: player.id, name: `${player.firstName} ${player.lastName}` });
  }

  protected saveTarget(): void {
    const candidate = this.candidate();
    if (!candidate || !this.note.trim()) {
      return;
    }
    this.busy.set(true);
    this.api.addAntiFraudTarget(candidate.id, this.note.trim()).subscribe({
      next: (view) => {
        this.overview.set(view);
        this.targetOpen.set(false);
        this.done('Joueur enregistre', `${candidate.name} : plus de sans-faute possible a sa prochaine partie solo.`);
      },
      error: (error) => this.fail(error),
    });
  }

  protected removeTarget(target: AntiFraudTarget): void {
    this.confirmation.confirm({
      header: 'Retirer de la liste',
      message: `${target.playerName} sera corrige normalement a sa prochaine partie solo. Son compteur de `
        + 'sans-faute pour l\'ajout automatique repart de zero.',
      acceptLabel: 'Retirer',
      rejectLabel: 'Annuler',
      accept: () => {
        this.busy.set(true);
        this.api.removeAntiFraudTarget(target.playerId).subscribe({
          next: (view) => {
            this.overview.set(view);
            this.done('Retire de la liste', target.playerName);
          },
          error: (error) => this.fail(error),
        });
      },
    });
  }

  /** Ecran a jour ; la saisie de l'ajout automatique reprend les valeurs enregistrees. */
  private show(view: AntiFraudOverview): void {
    this.overview.set(view);
    this.autoEnabled = view.autoEnabled;
    this.autoThreshold = view.autoThreshold;
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
