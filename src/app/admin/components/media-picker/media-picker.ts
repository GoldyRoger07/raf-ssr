import { Component, computed, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';

import { errorMessage } from '../../core/api';
import { MediaApi } from '../../core/media-api.service';
import { MediaFile } from '../../core/models';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PAGE_SIZE = 18;

/**
 * Choix d'une image de la bibliotheque, ou envoi d'une nouvelle.
 *
 * <p>La valeur est l'identifiant du media (ou null) : c'est ce qu'attendent les
 * champs {@code mediaId} / {@code bannerMediaId} de l'API. Fonctionne avec
 * {@code formControlName} comme avec {@code ngModel}.
 *
 * <pre>
 *   &lt;media-picker formControlName="bannerMediaId" folder="quiz" /&gt;
 *   &lt;media-picker [(ngModel)]="mediaId" folder="categories" /&gt;
 * </pre>
 */
@Component({
  selector: 'media-picker',
  imports: [FormsModule, ButtonModule, DialogModule, PaginatorModule, SelectModule],
  templateUrl: './media-picker.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MediaPicker), multi: true }],
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
export class MediaPicker implements ControlValueAccessor {
  private readonly api = inject(MediaApi);
  private readonly messages = inject(MessageService);

  /** Dossier des images envoyees depuis ce champ, et filtre propose a l'ouverture. */
  readonly folder = input('raf');
  /** Indication sous l'apercu (format conseille, usage). */
  readonly hint = input<string | null>(null);
  /** Rapport largeur / hauteur de l'apercu, ex. '16 / 9' pour une banniere. */
  readonly aspect = input('16 / 9');

  protected readonly accept = ACCEPTED_TYPES.join(',');
  protected readonly pageSize = PAGE_SIZE;

  /** Image choisie ; null = aucune. */
  protected readonly selected = signal<MediaFile | null>(null);
  protected readonly disabled = signal(false);
  /** Identifiant recu mais introuvable (image supprimee entre-temps). */
  protected readonly missing = signal(false);

  protected readonly dialogOpen = signal(false);
  protected readonly items = signal<MediaFile[]>([]);
  protected readonly total = signal(0);
  protected readonly first = signal(0);
  protected readonly loading = signal(false);
  protected readonly uploading = signal(false);
  protected readonly folders = signal<string[]>([]);
  protected filter: string | null = null;
  protected readonly folderOptions = computed(() => [
    { label: 'Tous les dossiers', value: null as string | null },
    ...this.folders().map((folder) => ({ label: folder, value: folder as string | null })),
  ]);

  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  // --- ControlValueAccessor ---------------------------------------------------------

  writeValue(value: number | null): void {
    this.missing.set(false);
    if (value == null) {
      this.selected.set(null);
      return;
    }
    if (this.selected()?.id === value) {
      return;
    }
    // Le formulaire ne connait que l'identifiant : l'apercu vient du serveur.
    this.api.get(value).subscribe({
      next: (media) => this.selected.set(media),
      error: () => {
        this.selected.set(null);
        this.missing.set(true);
      },
    });
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  // --- Actions --------------------------------------------------------------------------

  protected openLibrary(): void {
    this.filter = null;
    this.first.set(0);
    this.dialogOpen.set(true);
    this.load();
    this.api.folders().subscribe({ next: (folders) => this.folders.set(folders), error: () => undefined });
  }

  protected choose(media: MediaFile): void {
    this.selected.set(media);
    this.missing.set(false);
    this.dialogOpen.set(false);
    this.onChange(media.id);
    this.onTouched();
  }

  protected clear(): void {
    this.selected.set(null);
    this.missing.set(false);
    this.onChange(null);
    this.onTouched();
  }

  protected onFilter(): void {
    this.first.set(0);
    this.load();
  }

  protected onPage(state: PaginatorState): void {
    this.first.set(state.first ?? 0);
    this.load();
  }

  /** Une image envoyee d'ici est aussitot choisie : c'est pour ce champ qu'on l'ajoute. */
  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_SIZE_BYTES) {
      this.messages.add({
        severity: 'warn',
        summary: file.name,
        detail: 'JPEG, PNG, WebP ou GIF, 5 Mo au plus.',
      });
      return;
    }
    this.uploading.set(true);
    this.api.upload(file, this.folder()).subscribe({
      next: (media) => {
        this.uploading.set(false);
        this.messages.add({ severity: 'success', summary: 'Image ajoutee', detail: `Dossier « ${this.folder()} »` });
        this.choose(media);
      },
      error: (error) => {
        this.uploading.set(false);
        this.messages.add({ severity: 'error', summary: 'Envoi impossible', detail: errorMessage(error) });
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.list(this.filter, this.first() / PAGE_SIZE, PAGE_SIZE).subscribe({
      next: (page) => {
        this.items.set(page.content);
        this.total.set(page.totalElements);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Bibliotheque indisponible', detail: errorMessage(error) });
      },
    });
  }
}
