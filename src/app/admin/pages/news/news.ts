import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Subject, debounceTime } from 'rxjs';

import { MediaPicker } from '../../components/media-picker/media-picker';
import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { HaitiDatePipe } from '../../core/format';
import { News } from '../../core/models';
import { PAGE_SIZE_OPTIONS, TableState } from '../../core/table-state';

const PAGE_SIZE = 20;

/**
 * Actualites affichees dans l'onglet Actualite de l'app joueur : ecrire, publier
 * ou garder en brouillon, epingler en tete du fil, supprimer. Chaque operation est
 * tracee au journal d'audit.
 */
@Component({
  selector: 'admin-news',
  imports: [
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
    ToggleSwitchModule,
    MediaPicker,
    HaitiDatePipe,
  ],
  templateUrl: './news.html',
})
export default class NewsPage {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly table = new TableState(['title', 'published', 'publishedAt', 'updatedAt'], PAGE_SIZE);
  protected readonly pageSizes = PAGE_SIZE_OPTIONS;
  protected filters: { q: string; published: boolean | null; pinned: boolean | null } = { q: '', published: null, pinned: null };
  protected readonly publishedOptions = [
    { label: 'Publiees', value: true },
    { label: 'Brouillons', value: false },
  ];
  protected readonly pinnedOptions = [
    { label: 'Epinglees', value: true },
    { label: 'Non epinglees', value: false },
  ];
  private readonly typed = new Subject<void>();
  protected readonly rows = signal<News[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  // Formulaire (creation ou modification)
  protected readonly editorOpen = signal(false);
  protected readonly editing = signal<News | null>(null);
  protected newsTitle = '';
  protected newsBody = '';
  protected mediaId: number | null = null;
  protected pinned = false;
  protected published = true;
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  constructor() {
    this.typed.pipe(debounceTime(300), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.apply());
    this.load();
  }

  protected get filtered(): boolean {
    return !!this.filters.q.trim() || this.filters.published !== null || this.filters.pinned !== null;
  }

  protected onInput(): void {
    this.typed.next();
  }

  protected apply(): void {
    this.table.restart();
    this.load();
  }

  protected reset(): void {
    this.filters = { q: '', published: null, pinned: null };
    this.table.reset();
    this.load();
  }

  protected create(): void {
    this.editing.set(null);
    this.newsTitle = '';
    this.newsBody = '';
    this.mediaId = null;
    this.pinned = false;
    this.published = true;
    this.formError.set(null);
    this.editorOpen.set(true);
  }

  protected edit(news: News): void {
    this.editing.set(news);
    this.newsTitle = news.title;
    this.newsBody = news.body;
    this.mediaId = news.mediaId;
    this.pinned = news.pinned;
    this.published = news.published;
    this.formError.set(null);
    this.editorOpen.set(true);
  }

  protected save(): void {
    if (!this.newsTitle.trim() || !this.newsBody.trim()) {
      this.formError.set('Le titre et le texte sont obligatoires.');
      return;
    }
    const request = {
      title: this.newsTitle.trim(),
      body: this.newsBody.trim(),
      mediaId: this.mediaId,
      pinned: this.pinned,
      published: this.published,
    };
    const current = this.editing();
    this.saving.set(true);
    this.formError.set(null);
    (current ? this.api.updateNews(current.id, request) : this.api.createNews(request)).subscribe({
      next: (news) => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.messages.add({
          severity: 'success',
          summary: current ? 'Actualite modifiee' : 'Actualite creee',
          detail: news.published ? 'Visible dans l\'app joueur.' : 'Brouillon : invisible des joueurs.',
        });
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.formError.set(errorMessage(error));
      },
    });
  }

  /** Publier ou repasser en brouillon, sans ouvrir le formulaire. */
  protected togglePublished(news: News): void {
    this.api
      .updateNews(news.id, {
        title: news.title,
        body: news.body,
        mediaId: news.mediaId,
        pinned: news.pinned,
        published: !news.published,
      })
      .subscribe({
        next: (updated) => {
          this.messages.add({
            severity: 'success',
            summary: updated.published ? 'Actualite publiee' : 'Actualite repassee en brouillon',
          });
          this.load();
        },
        error: (error) =>
          this.messages.add({ severity: 'error', summary: 'Operation impossible', detail: errorMessage(error) }),
      });
  }

  protected remove(news: News): void {
    this.confirmation.confirm({
      header: "Supprimer l'actualite",
      message: `Supprimer « ${news.title} » ? Elle disparait de l'app joueur, sans retour possible.`,
      acceptLabel: 'Supprimer',
      rejectLabel: 'Garder',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () =>
        this.api.deleteNews(news.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Actualite supprimee' });
            this.load();
          },
          error: (error) =>
            this.messages.add({ severity: 'error', summary: 'Suppression impossible', detail: errorMessage(error) }),
        }),
    });
  }

  protected onPage(event: TableLazyLoadEvent): void {
    if (this.table.onLazyLoad(event)) {
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.api.newsList(this.table.page, this.table.pageSize, this.filters, this.table.sort ?? undefined).subscribe({
      next: (page) => {
        this.rows.set(page.content);
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
}
