import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { concatMap, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { errorMessage } from '../../core/api';
import { HaitiDatePipe } from '../../core/format';
import { MediaApi } from '../../core/media-api.service';
import { MediaFile } from '../../core/models';

/** Memes limites que le serveur : un refus immediat vaut mieux qu'un envoi inutile. */
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PAGE_SIZE = 24;

/** Un dossier est une etiquette de classement : minuscules, chiffres et tirets. */
const FOLDER_PATTERN = /^[a-z0-9-]{1,40}$/;

/**
 * Bibliotheque d'images du projet. Le serveur verifie chaque image, la reduit,
 * la reencode (sans metadonnees) et en tire une miniature : l'ecran se contente
 * d'envoyer, d'afficher et de supprimer.
 */
@Component({
  selector: 'admin-media',
  imports: [
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    PaginatorModule,
    SelectModule,
    TagModule,
    HaitiDatePipe,
  ],
  templateUrl: './media.html',
  // Damier sous les images : une zone transparente se distingue d'un fond blanc.
  styles: `
    .checkerboard {
      background-color: #f1f5f9;
      background-image:
        linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
        linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
        linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0;
    }
    :host-context(.app-dark) .checkerboard {
      background-color: #1e293b;
      background-image:
        linear-gradient(45deg, #334155 25%, transparent 25%),
        linear-gradient(-45deg, #334155 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #334155 75%),
        linear-gradient(-45deg, transparent 75%, #334155 75%);
    }
  `,
})
export default class Media {
  private readonly api = inject(MediaApi);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly accept = ACCEPTED_TYPES.join(',');

  protected readonly items = signal<MediaFile[]>([]);
  protected readonly total = signal(0);
  protected readonly first = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly folders = signal<string[]>([]);
  protected readonly folderOptions = computed(() => [
    { label: 'Tous les dossiers', value: null as string | null },
    ...this.folders().map((folder) => ({ label: folder, value: folder as string | null })),
  ]);
  /** Filtre de la liste ; null = tous les dossiers. */
  protected filter: string | null = null;
  /** Dossier dans lequel ranger les prochains envois. */
  protected uploadFolder = 'raf';

  protected readonly dragging = signal(false);
  protected readonly progress = signal<{ done: number; total: number } | null>(null);

  protected readonly selected = signal<MediaFile | null>(null);
  protected detailOpen = false;

  constructor() {
    this.load();
    this.loadFolders();
  }

  // --- Liste --------------------------------------------------------------------

  protected onFilter(): void {
    this.first.set(0);
    this.load();
  }

  protected onPage(state: PaginatorState): void {
    this.first.set(state.first ?? 0);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.api.list(this.filter, this.first() / PAGE_SIZE, PAGE_SIZE).subscribe({
      next: (page) => {
        this.items.set(page.content);
        this.total.set(page.totalElements);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }

  private loadFolders(): void {
    this.api.folders().subscribe({ next: (folders) => this.folders.set(folders), error: () => undefined });
  }

  // --- Televersement -----------------------------------------------------------------

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.upload(Array.from(input.files ?? []));
    // Permet de renvoyer le meme fichier apres une erreur.
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.upload(Array.from(event.dataTransfer?.files ?? []));
  }

  /** Un fichier apres l'autre : l'ordre d'envoi est celui de la liste, et un refus n'arrete pas les suivants. */
  private upload(files: File[]): void {
    if (!files.length || this.progress()) {
      return;
    }
    const folder = this.uploadFolder.trim();
    if (!FOLDER_PATTERN.test(folder)) {
      this.messages.add({
        severity: 'warn',
        summary: 'Dossier invalide',
        detail: 'Lettres minuscules, chiffres et tirets uniquement (40 au plus).',
      });
      return;
    }

    const valid = files.filter((file) => {
      const problem = !ACCEPTED_TYPES.includes(file.type)
        ? 'type non accepte (JPEG, PNG, WebP ou GIF)'
        : file.size > MAX_SIZE_BYTES
          ? 'plus de 5 Mo'
          : null;
      if (problem) {
        this.messages.add({ severity: 'warn', summary: file.name, detail: `Ignore : ${problem}.` });
      }
      return !problem;
    });
    if (!valid.length) {
      return;
    }

    let succeeded = 0;
    this.progress.set({ done: 0, total: valid.length });
    from(valid)
      .pipe(
        concatMap((file) =>
          this.api.upload(file, folder).pipe(
            map(() => true),
            catchError((error) => {
              this.messages.add({ severity: 'error', summary: file.name, detail: errorMessage(error) });
              return of(false);
            }),
          ),
        ),
      )
      .subscribe({
        next: (ok) => {
          if (ok) {
            succeeded++;
          }
          this.progress.update((p) => (p ? { ...p, done: p.done + 1 } : p));
        },
        complete: () => {
          this.progress.set(null);
          if (succeeded) {
            this.messages.add({
              severity: 'success',
              summary: succeeded > 1 ? `${succeeded} images ajoutees` : 'Image ajoutee',
              detail: `Dossier « ${folder} »`,
            });
          }
          // Les nouvelles images arrivent en tete : on y retourne.
          this.filter = this.filter === folder ? folder : null;
          this.first.set(0);
          this.load();
          this.loadFolders();
        },
      });
  }

  // --- Detail ------------------------------------------------------------------------

  protected open(media: MediaFile): void {
    this.selected.set(media);
    this.detailOpen = true;
  }

  protected copy(text: string, what: string): void {
    navigator.clipboard.writeText(text).then(
      () => this.messages.add({ severity: 'success', summary: `${what} copie` }),
      () => this.messages.add({ severity: 'error', summary: 'Copie impossible', detail: text }),
    );
  }

  protected remove(media: MediaFile): void {
    const warning = media.usages
      ? `Elle est utilisee ${media.usages} fois : ces elements perdront leur image, sans etre supprimes.`
      : 'Elle n\'est utilisee nulle part.';
    this.confirmation.confirm({
      header: 'Supprimer l\'image',
      message: `${warning} Le fichier sera efface du serveur. Continuer ?`,
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () =>
        this.api.delete(media.id).subscribe({
          next: () => {
            this.detailOpen = false;
            this.messages.add({ severity: 'success', summary: 'Image supprimee' });
            // Derniere image d'une page : on recule d'une page plutot que d'afficher une page vide.
            if (this.items().length === 1 && this.first() > 0) {
              this.first.update((f) => f - PAGE_SIZE);
            }
            this.load();
            this.loadFolders();
          },
          error: (error) =>
            this.messages.add({ severity: 'error', summary: 'Suppression impossible', detail: errorMessage(error) }),
        }),
    });
  }

  protected size(bytes: number | null): string {
    if (bytes == null) {
      return '—';
    }
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
      : `${(bytes / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
  }

  protected format(mimeType: string | null): string {
    return mimeType === 'image/png' ? 'PNG' : mimeType === 'image/jpeg' ? 'JPEG' : (mimeType ?? '—');
  }
}
