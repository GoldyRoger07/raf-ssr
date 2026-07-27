import { Component, HostListener, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from '../../theme/theme.service';
import { Container } from "../container/container";
import { My3dButton } from "../buttons/my3d-button/my3d-button";

interface NavItem {
  label: string;
  link: string;
}

@Component({
  selector: 'my-header',
  imports: [ Container, My3dButton],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly themeService = inject(ThemeService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly theme = this.themeService.theme;
  protected readonly menuOpen = signal(false);

  /** Vrai quand le header doit être masqué (scroll vers le bas). */
  protected readonly hidden = signal(false);
  private lastScrollY = 0;

  protected readonly navItems: NavItem[] = [
    { label: 'Comment ça marche', link: '#' },
    { label: 'Tarifs', link: '#' },
    { label: 'A Propos', link: '#' },
    { label: 'Blog', link: '#' },    
    { label: 'Contact', link: '#' },
  ];

  @HostListener('window:scroll')
  protected onScroll(): void {
    if (!this.isBrowser) {
      return;
    }
    const current = window.scrollY;

    // On garde le header visible tant que le menu mobile est ouvert.
    if (this.menuOpen()) {
      this.lastScrollY = current;
      return;
    }

    // Masque au scroll vers le bas (au-delà d'un petit seuil), réaffiche
    // dès qu'on remonte.
    if (current > this.lastScrollY && current > 80) {
      this.hidden.set(true);
    } else if (current < this.lastScrollY) {
      this.hidden.set(false);
    }

    this.lastScrollY = current;
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected toggleTheme(): void {
    this.themeService.toggle();
  }
}
