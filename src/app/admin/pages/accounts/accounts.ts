import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Subject, debounceTime } from 'rxjs';

import { AdminApi } from '../../core/admin-api.service';
import { errorMessage } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { HaitiDatePipe } from '../../core/format';
import { RoleName, UserResponse, UserStatus } from '../../core/models';

const PAGE_SIZE = 20;

const ROLES: { value: RoleName; label: string; description: string }[] = [
  { value: 'PLAYER', label: 'Joueur', description: 'Achete des tickets et joue' },
  { value: 'MODERATOR', label: 'Moderateur', description: 'Gere la banque de questions et les categories' },
  { value: 'ADMIN', label: 'Administrateur', description: 'Quiz, retraits, guichet, recharges : acces a l\'argent' },
  { value: 'SUPER_ADMIN', label: 'Super-administrateur', description: 'Tout, y compris les comptes et les roles' },
];

/**
 * Comptes et roles. Un changement de role ou de statut ferme toutes les sessions
 * du compte vise (les roles sont portes par le jeton). On ne modifie pas son
 * propre compte ici.
 */
@Component({
  selector: 'admin-accounts',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    SelectButtonModule,
    TableModule,
    TagModule,
    ToggleSwitchModule,
    HaitiDatePipe,
  ],
  templateUrl: './accounts.html',
})
export default class Accounts {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);
  protected readonly me = inject(AuthService).user;

  protected readonly pageSize = PAGE_SIZE;
  protected readonly roles = ROLES;
  protected readonly statusOptions = [
    { label: 'Actif', value: 'ACTIVE' },
    { label: 'Suspendu', value: 'SUSPENDED' },
    { label: 'Banni', value: 'BANNED' },
  ];

  protected query = '';
  protected staffOnly = true;
  protected readonly rows = signal<UserResponse[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  private page = 0;
  private readonly typed = new Subject<void>();

  // Edition
  protected readonly editOpen = signal(false);
  protected readonly editing = signal<UserResponse | null>(null);
  protected selectedRoles: RoleName[] = [];
  protected status: UserStatus = 'ACTIVE';
  protected readonly busy = signal(false);
  protected readonly editError = signal<string | null>(null);

  constructor() {
    this.typed.pipe(debounceTime(300), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.reload());
    this.load();
  }

  protected roleLabel(role: string): string {
    return ROLES.find((r) => r.value === role)?.label ?? role;
  }

  protected onSearch(): void {
    this.typed.next();
  }

  protected reload(): void {
    this.page = 0;
    this.load();
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const page = Math.floor((event.first ?? 0) / PAGE_SIZE);
    if (page !== this.page) {
      this.page = page;
      this.load();
    }
  }

  protected isMe(user: UserResponse): boolean {
    return user.id === this.me()?.id;
  }

  protected openEdit(user: UserResponse): void {
    this.editing.set(user);
    this.selectedRoles = [...user.roles];
    this.status = user.status;
    this.editError.set(null);
    this.editOpen.set(true);
  }

  /** Roles puis statut, seulement ce qui a change : chaque changement est trace a part. */
  protected save(): void {
    const user = this.editing();
    if (!user) {
      return;
    }
    if (!this.selectedRoles.length) {
      this.editError.set('Un compte doit garder au moins un role.');
      return;
    }
    const rolesChanged =
      [...this.selectedRoles].sort().join() !== [...user.roles].sort().join();
    const statusChanged = this.status !== user.status;
    if (!rolesChanged && !statusChanged) {
      this.editOpen.set(false);
      return;
    }

    this.busy.set(true);
    this.editError.set(null);
    const finish = () => {
      this.busy.set(false);
      this.editOpen.set(false);
      this.messages.add({
        severity: 'success',
        summary: 'Compte mis a jour',
        detail: 'Ses sessions ont ete fermees : les nouveaux droits valent a sa prochaine connexion.',
      });
      this.load();
    };
    const fail = (error: unknown) => {
      this.busy.set(false);
      this.editError.set(errorMessage(error));
    };
    const applyStatus = () =>
      statusChanged ? this.api.setStatus(user.id, this.status).subscribe({ next: finish, error: fail }) : finish();

    if (rolesChanged) {
      this.api.setRoles(user.id, this.selectedRoles).subscribe({ next: applyStatus, error: fail });
    } else {
      applyStatus();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.users(this.query.trim(), this.staffOnly, this.page, PAGE_SIZE).subscribe({
      next: (page) => {
        this.rows.set(page.content);
        this.total.set(page.totalElements);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }
}
