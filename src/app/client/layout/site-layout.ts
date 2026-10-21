import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { IconDefsComponent } from '../ui/icon';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

/** Cadre commun des pages publiques : en-tete, contenu, pied de page. */
@Component({
  selector: 'site-layout',
  imports: [RouterOutlet, SiteHeader, SiteFooter, IconDefsComponent],
  template: `
    <div class="site">
      <raf-icon-defs />
      <site-header />
      <main>
        <router-outlet />
      </main>
      <site-footer />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SiteLayout {}
