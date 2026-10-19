import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { errorMessage } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { Category, CategoryInput } from '../../core/models';
import { QuestionApi } from '../../core/question-api.service';

@Component({
  selector: 'admin-categories',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
    ToggleSwitchModule,
  ],
  templateUrl: './categories.html',
})
export default class Categories {
  private readonly api = inject(QuestionApi);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  /** La suppression est reservee aux administrateurs (cote backend aussi). */
  protected readonly canDelete = inject(AuthService).isAdmin;

  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly editOpen = signal(false);
  protected readonly editing = signal<Category | null>(null);
  protected readonly busy = signal(false);
  protected name = '';
  protected description = '';
  protected parentId: number | null = null;
  protected active = true;

  /** Une categorie ne peut pas etre sa propre parente. */
  protected readonly parentOptions = computed(() =>
    this.categories().filter((c) => c.id !== this.editing()?.id),
  );

  constructor() {
    this.load();
  }

  protected parentName(id: number | undefined): string {
    return id ? (this.categories().find((c) => c.id === id)?.name ?? '') : '';
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.name = '';
    this.description = '';
    this.parentId = null;
    this.active = true;
    this.editOpen.set(true);
  }

  protected openEdit(category: Category): void {
    this.editing.set(category);
    this.name = category.name;
    this.description = category.description ?? '';
    this.parentId = category.parentId ?? null;
    this.active = category.active;
    this.editOpen.set(true);
  }

  protected save(): void {
    if (!this.name.trim()) {
      return;
    }
    const input: CategoryInput = {
      name: this.name.trim(),
      description: this.description.trim() || null,
      parentId: this.parentId,
      mediaId: null,
      active: this.active,
    };
    const current = this.editing();
    this.busy.set(true);
    (current ? this.api.updateCategory(current.id, input) : this.api.createCategory(input)).subscribe({
      next: () => {
        this.busy.set(false);
        this.editOpen.set(false);
        this.messages.add({ severity: 'success', summary: current ? 'Categorie modifiee' : 'Categorie creee' });
        this.load();
      },
      error: (error) => {
        this.busy.set(false);
        this.messages.add({ severity: 'error', summary: 'Enregistrement impossible', detail: errorMessage(error) });
      },
    });
  }

  protected remove(category: Category): void {
    this.confirmation.confirm({
      header: 'Supprimer la categorie',
      message: `Supprimer « ${category.name} » ? Une categorie qui contient des questions ne peut pas l'etre : desactivez-la plutot.`,
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () =>
        this.api.deleteCategory(category.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Categorie supprimee' });
            this.load();
          },
          error: (error) =>
            this.messages.add({ severity: 'error', summary: 'Suppression impossible', detail: errorMessage(error) }),
        }),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.categories().subscribe({
      next: (categories) => {
        this.categories.set([...categories].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }
}
