import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule, TablePageEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { MediaPicker } from '../../components/media-picker/media-picker';
import { errorMessage } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { Category, CategoryInput, GameMode } from '../../core/models';
import { QuestionApi } from '../../core/question-api.service';

/** Une ligne du tableau : la categorie et le nom de sa parente, pour l'afficher et trier dessus. */
type CategoryRow = Category & { parentName: string };

type SortField = 'name' | 'parentName' | 'active' | 'groupEnabled' | 'soloEnabled';
interface CategorySort {
  field: SortField;
  direction: 'asc' | 'desc';
}

/** Filtre sur la parente : sans parente, ou une categorie precise. */
type ParentFilter = 'ROOT' | number;

const SORT_FIELDS: SortField[] = ['name', 'parentName', 'active', 'groupEnabled', 'soloEnabled'];
const PAGE_SIZES = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

interface Option<T> {
  label: string;
  value: T;
}

/** Minuscules sans accents : « Societe » trouve « Société ». */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

@Component({
  selector: 'admin-categories',
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
    TableModule,
    TagModule,
    TextareaModule,
    ToggleSwitchModule,
    MediaPicker,
  ],
  templateUrl: './categories.html',
})
export default class Categories {
  private readonly api = inject(QuestionApi);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  /**
   * Suppression et disponibilite par mode de jeu sont reservees aux
   * administrateurs (cote backend aussi) : les modes engagent de l'argent.
   */
  protected readonly isAdmin = inject(AuthService).isAdmin;

  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly editOpen = signal(false);
  protected readonly editing = signal<Category | null>(null);
  protected readonly busy = signal(false);
  protected name = '';
  protected description = '';
  protected parentId: number | null = null;
  protected mediaId: number | null = null;
  protected active = true;

  /** Une categorie ne peut pas etre sa propre parente. */
  protected readonly parentOptions = computed(() =>
    this.categories().filter((c) => c.id !== this.editing()?.id),
  );

  // Recherche, filtres, tri et pagination : tout se fait dans le navigateur, la liste
  // complete etant chargee d'un coup. L'etat vit dans l'URL pour garder la vue au retour.
  protected readonly query = signal('');
  protected readonly state = signal<boolean | null>(null);
  protected readonly parent = signal<ParentFilter | null>(null);
  protected readonly group = signal<boolean | null>(null);
  protected readonly solo = signal<boolean | null>(null);
  protected readonly sort = signal<CategorySort | null>(null);
  protected readonly first = signal(0);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);

  protected readonly stateOptions: Option<boolean>[] = [
    { label: 'Active', value: true },
    { label: 'Desactivee', value: false },
  ];
  protected readonly modeOptions: Option<boolean>[] = [
    { label: 'Propose', value: true },
    { label: 'Non propose', value: false },
  ];

  /** « Sans parente », puis les categories qui ont au moins une sous-categorie. */
  protected readonly parentFilterOptions = computed<Option<ParentFilter>[]>(() => {
    const parentIds = new Set(this.categories().map((c) => c.parentId).filter((id) => id != null));
    return [
      { label: 'Sans parente', value: 'ROOT' },
      ...this.categories()
        .filter((c) => parentIds.has(c.id))
        .map((c) => ({ label: c.name, value: c.id })),
    ];
  });

  protected readonly activeCount = computed(
    () =>
      [this.state(), this.parent(), this.group(), this.solo()].filter((v) => v !== null).length +
      (this.query().trim() ? 1 : 0),
  );

  protected readonly rows = computed<CategoryRow[]>(() => {
    const names = new Map(this.categories().map((c) => [c.id, c.name]));
    const needle = fold(this.query().trim());
    const [state, parent, group, solo] = [this.state(), this.parent(), this.group(), this.solo()];
    const rows = this.categories()
      .map((c) => ({ ...c, parentName: c.parentId ? (names.get(c.parentId) ?? '') : '' }))
      .filter(
        (c) =>
          (!needle || fold(`${c.name} ${c.description ?? ''} ${c.slug}`).includes(needle)) &&
          (state === null || c.active === state) &&
          (parent === null || (parent === 'ROOT' ? !c.parentId : c.parentId === parent)) &&
          (group === null || c.groupEnabled === group) &&
          (solo === null || c.soloEnabled === solo),
      );
    const sort = this.sort();
    if (sort) {
      const sign = sort.direction === 'desc' ? -1 : 1;
      rows.sort((a, b) => {
        const x = a[sort.field];
        const y = b[sort.field];
        const byField =
          typeof x === 'string' && typeof y === 'string'
            ? x.localeCompare(y, 'fr', { sensitivity: 'base' })
            : Number(x) - Number(y);
        // A egalite, ordre alphabetique, pour un resultat stable.
        return sign * byField || a.name.localeCompare(b.name, 'fr');
      });
    }
    return rows;
  });

  constructor() {
    this.readUrl(this.route.snapshot.queryParams);
    this.load();
  }

  /** Un critere a change : retour a la premiere page. */
  protected apply(): void {
    this.first.set(0);
    this.writeUrl();
  }

  /** Efface recherche, filtres et tri : retour a l'ordre alphabetique. */
  protected reset(): void {
    this.query.set('');
    this.state.set(null);
    this.parent.set(null);
    this.group.set(null);
    this.solo.set(null);
    this.sort.set(null);
    this.apply();
  }

  protected onSort(event: { field: string; order: number }): void {
    if (!SORT_FIELDS.includes(event.field as SortField)) {
      return;
    }
    const next: CategorySort = { field: event.field as SortField, direction: event.order === -1 ? 'desc' : 'asc' };
    const current = this.sort();
    if (current?.field !== next.field || current?.direction !== next.direction) {
      this.sort.set(next);
      this.apply();
    }
  }

  /**
   * Le tableau est en tri personnalise : `rows` arrive deja trie (sans accents, a la
   * francaise), le tableau ne doit donc pas le retrier lui-meme.
   */
  protected keepComputedOrder(): void {}

  protected onPage(event: TablePageEvent): void {
    this.first.set(event.first);
    this.pageSize.set(event.rows);
    this.writeUrl();
  }

  /** Restaure la vue depuis l'URL ; une valeur inconnue est ignoree. */
  private readUrl(params: Params): void {
    const bool = (value: unknown) => (value === 'true' ? true : value === 'false' ? false : null);
    this.query.set(params['query'] ?? '');
    this.state.set(bool(params['active']));
    this.group.set(bool(params['group']));
    this.solo.set(bool(params['solo']));
    const parent = params['parent'];
    this.parent.set(parent === 'ROOT' ? 'ROOT' : Number(parent) > 0 ? Number(parent) : null);
    const [field, direction] = `${params['sort'] ?? ''}`.split(',');
    this.sort.set(
      SORT_FIELDS.includes(field as SortField)
        ? { field: field as SortField, direction: direction === 'desc' ? 'desc' : 'asc' }
        : null,
    );
    const size = Number(params['size']);
    this.pageSize.set(PAGE_SIZES.includes(size) ? size : DEFAULT_PAGE_SIZE);
    this.first.set(Math.max(0, Number(params['page']) || 0) * this.pageSize());
  }

  private writeUrl(): void {
    const queryParams: Params = {};
    if (this.query().trim()) {
      queryParams['query'] = this.query().trim();
    }
    for (const [key, value] of [
      ['active', this.state()],
      ['parent', this.parent()],
      ['group', this.group()],
      ['solo', this.solo()],
    ] as const) {
      if (value !== null) {
        queryParams[key] = `${value}`;
      }
    }
    const sort = this.sort();
    if (sort) {
      queryParams['sort'] = `${sort.field},${sort.direction}`;
    }
    const page = Math.floor(this.first() / this.pageSize());
    if (page > 0) {
      queryParams['page'] = page;
    }
    if (this.pageSize() !== DEFAULT_PAGE_SIZE) {
      queryParams['size'] = this.pageSize();
    }
    this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.name = '';
    this.description = '';
    this.parentId = null;
    this.mediaId = null;
    this.active = true;
    this.editOpen.set(true);
  }

  protected openEdit(category: Category): void {
    this.editing.set(category);
    this.name = category.name;
    this.description = category.description ?? '';
    this.parentId = category.parentId ?? null;
    this.mediaId = category.mediaId ?? null;
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
      mediaId: this.mediaId,
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

  /**
   * Interrupteur En groupe / Solo. Applique tout de suite dans la liste, puis
   * remplace par la reponse du serveur, ou retabli en cas d'erreur.
   */
  protected toggleMode(category: Category, mode: GameMode, enabled: boolean): void {
    const field = mode === 'SOLO' ? 'soloEnabled' : 'groupEnabled';
    this.replace({ ...category, [field]: enabled });
    this.api.configureCategoryModes(category.id, { [field]: enabled }).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.messages.add({
          severity: 'success',
          summary: `${category.name} : ${enabled ? 'propose' : 'retire'} en mode ${mode === 'SOLO' ? 'Solo' : 'En groupe'}`,
        });
      },
      error: (error) => {
        this.replace(category);
        this.messages.add({ severity: 'error', summary: 'Modification impossible', detail: errorMessage(error) });
      },
    });
  }

  private replace(category: Category): void {
    this.categories.update((list) => list.map((c) => (c.id === category.id ? category : c)));
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
