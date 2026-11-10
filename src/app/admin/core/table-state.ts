import { TableLazyLoadEvent } from 'primeng/table';

/** Tri d'un tableau pagine cote serveur, envoye au backend sous la forme `sort=champ,sens`. */
export interface TableSort {
  field: string;
  direction: 'asc' | 'desc';
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * Valeurs distinctes d'une colonne, triees, pour le filtre d'un tableau charge en entier
 * (rapport d'import, ecarts d'un rapprochement...).
 */
export function distinctOptions<T>(rows: readonly T[] | null | undefined, key: keyof T): { label: string; value: string }[] {
  const values = new Set<string>();
  for (const row of rows ?? []) {
    const value = row[key];
    if (value !== null && value !== undefined && `${value}` !== '') {
      values.add(`${value}`);
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'fr')).map((value) => ({ label: value, value }));
}

/**
 * Page, taille de page et tri d'un tableau PrimeNG en mode lazy. `onLazyLoad` traduit
 * l'evenement du tableau et dit s'il faut recharger : un changement de tri ou de taille
 * ramene a la premiere page. Seuls les champs de `sortFields` sont acceptes, les memes
 * que la liste blanche du backend.
 */
export class TableState {
  page = 0;
  sort: TableSort | null = null;

  constructor(
    private readonly sortFields: readonly string[],
    public pageSize = 20,
  ) {}

  get first(): number {
    return this.page * this.pageSize;
  }

  /** Valeur de `[sortOrder]` du tableau. */
  get sortOrder(): number {
    return this.sort?.direction === 'desc' ? -1 : 1;
  }

  onLazyLoad(event: TableLazyLoadEvent): boolean {
    const rows = event.rows ?? this.pageSize;
    const page = Math.floor((event.first ?? 0) / rows);
    const field = typeof event.sortField === 'string' && this.sortFields.includes(event.sortField) ? event.sortField : null;
    const sort: TableSort | null = field ? { field, direction: event.sortOrder === -1 ? 'desc' : 'asc' } : null;
    const sortChanged = sort?.field !== this.sort?.field || sort?.direction !== this.sort?.direction;
    if (page === this.page && rows === this.pageSize && !sortChanged) {
      return false;
    }
    this.page = sortChanged || rows !== this.pageSize ? 0 : page;
    this.pageSize = rows;
    this.sort = sort;
    return true;
  }

  /** Un filtre a change : premiere page, tri conserve. */
  restart(): void {
    this.page = 0;
  }

  reset(): void {
    this.page = 0;
    this.sort = null;
  }
}
