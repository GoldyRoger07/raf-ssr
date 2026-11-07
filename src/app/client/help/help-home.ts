import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { SITE } from '../site';
import { IconComponent } from '../ui/icon';
import { pageDescription } from '../ui/page';
import { HELP_TOPICS, UI } from './help-content';
import { HelpPrefs } from './help-prefs';
import { LangSwitch } from './lang-switch';

/** /aide : choix du probleme, en grandes tuiles faciles a toucher. */
@Component({
  selector: 'raf-help-home',
  imports: [RouterLink, IconComponent, LangSwitch],
  template: `
    <section class="hero sunburst">
      <div class="inner">
        <span class="badge"><raf-icon name="question" [size]="56" /></span>
        <h1 class="title-stroke">{{ prefs.t(ui.pageTitle) }}</h1>
        <p class="lead">{{ prefs.t(ui.pageLead) }}</p>
        <help-lang-switch />
      </div>
    </section>

    <section class="topics">
      @for (topic of topics; track topic.id) {
        <a class="topic card-raf" [routerLink]="['/aide', topic.id]" queryParamsHandling="preserve">
          <span class="icon"><raf-icon [name]="topic.icon" [size]="44" /></span>
          <span class="text">
            <strong>{{ prefs.t(topic.title) }}</strong>
            <span>{{ prefs.t(topic.summary) }}</span>
          </span>
          <span class="arrow" aria-hidden="true">›</span>
        </a>
      }
      <a class="topic card-raf other" [href]="site.whatsappHref" target="_blank" rel="noopener">
        <span class="icon"><raf-icon name="users" [size]="44" /></span>
        <span class="text">
          <strong>{{ prefs.t(ui.otherTitle) }}</strong>
          <span>{{ prefs.t(ui.otherSummary) }}</span>
        </span>
        <span class="arrow" aria-hidden="true">›</span>
      </a>
    </section>
  `,
  styleUrl: './help.css',
  styles: `
    .topics { max-width: 40rem; margin: 0 auto; padding: 36px 16px 72px; display: grid; gap: 14px; }
    .topic { display: flex; align-items: center; gap: 14px; padding: 18px; color: inherit; text-decoration: none; }
    .topic:active { transform: translateY(3px); }
    .icon {
      flex: none;
      display: grid;
      place-items: center;
      width: 64px;
      height: 64px;
      border-radius: 20px;
      background: var(--raf-p50);
      border: 3px solid var(--raf-p200);
    }
    .text { flex: 1; min-width: 0; display: grid; gap: 4px; }
    .text strong { font-weight: 900; font-size: 1.12rem; line-height: 1.3; }
    .text span { font-weight: 700; color: var(--raf-ink-soft); line-height: 1.4; }
    .arrow { font-family: var(--raf-font-display); font-size: 2.2rem; color: var(--raf-primary); }
    .other { border-color: #c9f0b4; box-shadow: 0 6px 0 #a9e58e; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HelpHomePage {
  protected readonly prefs = inject(HelpPrefs);
  protected readonly site = SITE;
  protected readonly ui = UI;
  protected readonly topics = HELP_TOPICS;

  constructor() {
    pageDescription('Aide RAF : confirmer son email, installer l’app, activer les notifications. Guide pas à pas en français et en créole.');
    const route = inject(ActivatedRoute);
    afterNextRender(() => this.prefs.initFromBrowser(route.snapshot.queryParamMap));
  }
}
