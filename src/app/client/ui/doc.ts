import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { LEGAL_NAV, SITE } from '../site';
import { PageHero } from './page';
import { RevealDirective } from './reveal';

export interface DocSection {
  /** Ancre de la section (id du h2 correspondant dans le texte). */
  id: string;
  label: string;
}

/**
 * Gabarit des pages d'information (regles, conditions, confidentialite...) :
 * sommaire collant a gauche sur grand ecran, texte a droite. Le texte est
 * projete ; chacun de ses h2 porte l'id annonce dans `sections`.
 */
@Component({
  selector: 'doc-page',
  imports: [RouterLink, RouterLinkActive, PageHero, RevealDirective],
  template: `
    <page-hero [icon]="icon()" kicker="Informations" [title]="title()" [lead]="lead()" />

    <div class="container">
      <div class="doc">
        <nav reveal="left" class="toc card-raf" aria-label="Sommaire">
          <h2>Sommaire</h2>
          @for (s of sections(); track s.id) {
            <a routerLink="." [fragment]="s.id">{{ s.label }}</a>
          }
          <div class="others">
            <h2>Voir aussi</h2>
            @for (l of legalNav; track l.path) {
              <a [routerLink]="l.path" routerLinkActive="current">{{ l.label }}</a>
            }
          </div>
        </nav>

        <article reveal class="doc-body card-raf prose-raf">
          <p class="updated">Dernière mise à jour : {{ site.legalUpdatedAt }}</p>
          <ng-content />
        </article>
      </div>
    </div>
  `,
  styleUrl: '../pages/content.css',
  styles: `
    /* Sur petit ecran, ces liens sont deja dans le pied de page : le texte remonte. */
    .others { display: none; margin-top: 18px; }
    .others a.current { display: none; }
    .doc { padding-bottom: 80px; }
    @media (min-width: 1024px) {
      .others { display: block; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocPage {
  protected readonly site = SITE;
  protected readonly legalNav = LEGAL_NAV;

  readonly title = input.required<string>();
  readonly lead = input<string | null>(null);
  readonly icon = input<string | null>(null);
  readonly sections = input<DocSection[]>([]);
}
