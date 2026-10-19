import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

import { AuthService } from '../core/auth.service';
import { ThemeService } from '../../theme/theme.service';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  /** Titre de section affiche au-dessus de l'entree. */
  section?: string;
}

/** Cadre du back-office : barre laterale, barre du haut, zone de contenu. */
@Component({
  selector: 'admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, ToastModule],
  templateUrl: './admin-layout.html',
})
export default class AdminLayout {
  private readonly auth = inject(AuthService);
  private readonly themeService = inject(ThemeService);

  protected readonly user = this.auth.user;
  protected readonly theme = this.themeService.theme;
  protected readonly menuOpen = signal(false);

  private readonly items: NavItem[] = [
    { label: 'Tableau de bord', icon: 'pi pi-home', link: '/admin', exact: true },
    { label: 'Retraits', icon: 'pi pi-wallet', link: '/admin/retraits', adminOnly: true },
    { label: 'Guichet', icon: 'pi pi-money-bill', link: '/admin/guichet', adminOnly: true },
    { label: 'Joueurs', icon: 'pi pi-users', link: '/admin/joueurs', adminOnly: true },
    { label: 'Quiz', icon: 'pi pi-trophy', link: '/admin/quiz', adminOnly: true, section: 'Jeu' },
    { label: 'Parties signalees', icon: 'pi pi-flag', link: '/admin/parties', adminOnly: true },
    { label: 'Questions', icon: 'pi pi-question-circle', link: '/admin/questions', section: 'Contenu' },
    { label: 'Categories', icon: 'pi pi-tags', link: '/admin/categories' },
    { label: 'Import CSV', icon: 'pi pi-upload', link: '/admin/import' },
    { label: 'Rapprochement', icon: 'pi pi-calculator', link: '/admin/rapprochement', adminOnly: true, section: 'Controle' },
    { label: "Journal d'audit", icon: 'pi pi-history', link: '/admin/journal', adminOnly: true },
    { label: 'Comptes et roles', icon: 'pi pi-shield', link: '/admin/comptes', superAdminOnly: true },
  ];

  protected readonly nav = computed(() =>
    this.items.filter(
      (item) =>
        (!item.adminOnly || this.auth.isAdmin()) && (!item.superAdminOnly || this.auth.isSuperAdmin()),
    ),
  );

  protected readonly initials = computed(() => {
    const user = this.user();
    return user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : '';
  });

  protected toggleTheme(): void {
    this.themeService.toggle();
  }

  protected logout(): void {
    this.auth.logout();
  }
}
