import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { SITE } from '../site';
import { IconComponent } from '../ui/icon';
import { pageDescription } from '../ui/page';
import { Device, HelpLink, HelpNode, UI, findTopic } from './help-content';
import { HelpPrefs } from './help-prefs';
import { LangSwitch } from './lang-switch';

const DEVICE_NAMES: Record<Device, string> = { android: 'Android', iphone: 'iPhone' };

/**
 * /aide/:sujet : parcours pas a pas d'un sujet (voir help-content.ts).
 * L'historique des etapes permet de revenir en arriere ; « contact » mene a un agent
 * sur WhatsApp, avec un message qui resume le sujet, le telephone et l'etape bloquante.
 */
@Component({
  selector: 'raf-help-guide',
  imports: [NgTemplateOutlet, RouterLink, IconComponent, LangSwitch],
  template: `
    @if (topic(); as topic) {
      <section class="hero sunburst">
        <div class="inner">
          <span class="badge"><raf-icon [name]="topic.icon" [size]="56" /></span>
          <h1 class="title-stroke">{{ prefs.t(topic.title) }}</h1>
          <help-lang-switch />
        </div>
      </section>

      <section class="guide">
        @if (node(); as node) {
          <article class="card-raf panel" [attr.aria-live]="'polite'">
            @switch (node.kind) {
              @case ('question') {
                <h2>{{ prefs.t(node.title) }}</h2>
                @if (node.hint; as hint) {
                  <p class="hint">{{ prefs.t(hint) }}</p>
                }
                @if (node.image; as image) {
                  <img class="shot" [src]="image" alt="" loading="lazy" />
                }
                <div class="choices">
                  @for (option of node.options; track option.next) {
                    <button class="btn3d light block" type="button" (click)="go(option.next, option.device)">
                      {{ prefs.t(option.label) }}
                    </button>
                  }
                </div>
              }
              @case ('steps') {
                <h2>{{ prefs.t(node.title) }}</h2>
                @if (node.hint; as hint) {
                  <p class="hint">{{ prefs.t(hint) }}</p>
                }
                <ol class="steps">
                  @for (step of node.steps; track $index) {
                    <li>
                      <span class="num">{{ $index + 1 }}</span>
                      <div class="grow">
                        <p>{{ prefs.t(step.text) }}</p>
                        @if (step.image; as image) {
                          <img class="shot" [src]="image" alt="" loading="lazy" />
                        }
                      </div>
                    </li>
                  }
                </ol>
                @if (node.link; as link) {
                  <ng-container [ngTemplateOutlet]="linkButton" [ngTemplateOutletContext]="{ $implicit: link }" />
                }
                <div class="worked">
                  <p>{{ prefs.t(ui.worked) }}</p>
                  <button class="btn3d green block" type="button" (click)="go(node.ok)">
                    {{ prefs.t(node.okLabel ?? ui.yes) }}
                  </button>
                  <button class="btn3d block" type="button" (click)="go(node.ko)">
                    {{ prefs.t(node.koLabel ?? ui.no) }}
                  </button>
                </div>
              }
              @case ('done') {
                <div class="done">
                  <raf-icon name="check" [size]="72" />
                  <h2>{{ prefs.t(node.title) }}</h2>
                  <p class="hint">{{ prefs.t(node.text) }}</p>
                  @if (node.image; as image) {
                    <img class="shot" [src]="image" alt="" loading="lazy" />
                  }
                  @if (node.link; as link) {
                    <ng-container [ngTemplateOutlet]="linkButton" [ngTemplateOutletContext]="{ $implicit: link }" />
                  }
                </div>
              }
            }
          </article>
        } @else {
          <article class="card-raf panel">
            <div class="done">
              <raf-icon name="users" [size]="72" />
              <h2>{{ prefs.t(ui.contactTitle) }}</h2>
              <p class="hint">{{ prefs.t(ui.contactText) }}</p>
              <a class="btn3d green block" [href]="whatsappHref()" target="_blank" rel="noopener">{{ prefs.t(ui.whatsapp) }}</a>
              <a class="btn3d light block" [href]="site.phoneHref">{{ prefs.t(ui.call) }} {{ site.phone }}</a>
            </div>
          </article>
        }

        <nav class="nav">
          @if (history().length > 1) {
            <button class="btn3d light sm" type="button" (click)="back()">‹ {{ prefs.t(ui.back) }}</button>
            <button class="btn3d light sm" type="button" (click)="restart()">{{ prefs.t(ui.restart) }}</button>
          } @else if (wrongDevicePossible()) {
            <button class="btn3d light sm" type="button" (click)="go('device')">{{ prefs.t(ui.otherPhone) }}</button>
          }
          <a class="btn3d light sm" routerLink="/aide" queryParamsHandling="preserve">{{ prefs.t(ui.allTopics) }}</a>
        </nav>
      </section>
    } @else {
      <section class="hero sunburst">
        <div class="inner">
          <h1 class="title-stroke">{{ prefs.t(ui.pageTitle) }}</h1>
          <a class="btn3d" routerLink="/aide">{{ prefs.t(ui.allTopics) }}</a>
        </div>
      </section>
    }

    <ng-template #linkButton let-link>
      @if (link.to === 'app') {
        <a class="btn3d block extra" [href]="site.playerAppUrl">{{ prefs.t(link.label) }}</a>
      } @else {
        <a class="btn3d block extra" [routerLink]="link.to" [queryParams]="linkQuery()">{{ prefs.t(link.label) }}</a>
      }
    </ng-template>
  `,
  styleUrl: './help.css',
  styles: `
    .guide { max-width: 40rem; margin: 0 auto; padding: 28px 16px 72px; scroll-margin-top: 72px; }
    .panel { padding: 24px 20px; }
    h2 { font-family: var(--raf-font-display); font-weight: 400; font-size: 1.6rem; line-height: 1.2; margin-bottom: 10px; }
    .hint { font-weight: 700; color: var(--raf-ink-soft); line-height: 1.55; margin-bottom: 18px; }
    .block { display: flex; width: 100%; }
    .choices { display: grid; gap: 14px; margin-top: 8px; }
    .steps { display: grid; gap: 16px; margin: 8px 0 20px; }
    .steps li { display: flex; gap: 12px; align-items: flex-start; }
    .steps p { font-weight: 800; font-size: 1.08rem; line-height: 1.5; padding-top: 4px; }
    /* Le texte de l'etape decrit deja l'image : alt vide pour ne pas le lire deux fois. */
    .shot {
      display: block;
      width: 100%;
      max-width: 300px;
      height: auto;
      margin: 10px auto 4px;
      border-radius: 18px;
      border: 3px solid var(--raf-p200);
      background: #fff;
    }
    .choices, .done .shot { margin-top: 8px; }
    .grow { flex: 1; min-width: 0; }
    .num {
      flex: none;
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(180deg, #ffc078, var(--raf-primary));
      border: 3px solid #fff;
      box-shadow: 0 3px 0 var(--raf-edge-dark);
      color: #fff;
      font-family: var(--raf-font-display);
      font-size: 1.1rem;
    }
    .extra { margin-bottom: 8px; }
    .worked { display: grid; gap: 14px; margin-top: 18px; padding-top: 18px; border-top: 3px dashed var(--raf-p100); }
    .worked p { text-align: center; font-weight: 900; font-size: 1.15rem; }
    .done { display: grid; justify-items: center; gap: 10px; text-align: center; }
    .done .btn3d { margin-top: 6px; }
    .nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 28px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HelpGuidePage {
  protected readonly prefs = inject(HelpPrefs);
  protected readonly site = SITE;
  protected readonly ui = UI;

  private readonly route = inject(ActivatedRoute);
  private readonly sujet = toSignal(this.route.paramMap.pipe(map((p) => p.get('sujet'))), {
    initialValue: this.route.snapshot.paramMap.get('sujet'),
  });
  protected readonly topic = computed(() => findTopic(this.sujet()));

  /** Telephone choisi en repondant a la question ; sinon celui de l'URL ou detecte. */
  private readonly chosenDevice = signal<Device | null>(null);
  private readonly device = computed(() => this.chosenDevice() ?? this.prefs.device());

  /** Premiere etape : directement celle du telephone quand il est connu. */
  private readonly startNode = computed(() => {
    const topic = this.topic();
    const known = this.prefs.device();
    return topic ? (known && topic.startByDevice?.[known]) || topic.start : '';
  });

  /** Etapes parcourues ; repart du debut quand le sujet change. */
  protected readonly history = linkedSignal(() => [this.startNode()]);
  private readonly currentId = computed(() => this.history()[this.history().length - 1]);
  /** Etape affichee ; undefined = « contact » (un agent prend le relais). */
  protected readonly node = computed<HelpNode | undefined>(() => this.topic()?.nodes[this.currentId()]);

  /** Telephone detecte automatiquement : laisser le joueur le changer s'il s'est trompe. */
  protected readonly wrongDevicePossible = computed(
    () => !!this.prefs.device() && !!this.topic()?.startByDevice && this.currentId() !== 'device',
  );

  protected readonly linkQuery = computed(() => {
    const device = this.device();
    return { lang: this.prefs.lang(), ...(device ? { appareil: device } : {}) };
  });

  protected readonly whatsappHref = computed(() => {
    const topic = this.topic();
    const lang = this.prefs.lang();
    const history = this.history();
    // Derniere vraie etape avant « contact » : la ou le joueur est reste bloque.
    const stuck = topic?.nodes[history[history.length - 2]];
    const device = this.device();
    const lines = [
      UI.hello[lang],
      topic ? `${UI.topicLabel[lang]} : ${topic.title[lang]}` : '',
      device ? `${UI.deviceLabel[lang]} : ${DEVICE_NAMES[device]}` : '',
      stuck ? `${UI.stuckLabel[lang]} : ${stuck.title[lang]}` : '',
    ].filter(Boolean);
    return `${SITE.whatsappHref}?text=${encodeURIComponent(lines.join('\n'))}`;
  });

  constructor() {
    pageDescription('Guide pas à pas RAF, en français et en créole : email, installation, notifications, mot de passe.');
    afterNextRender(() => this.prefs.initFromBrowser(this.route.snapshot.queryParamMap));

    const title = inject(Title);
    effect(() => {
      const topic = this.topic();
      title.setTitle(`${topic ? this.prefs.t(topic.title) : this.prefs.t(UI.pageTitle)} — RAF`);
    });
  }

  protected go(next: string, device?: Device): void {
    if (device) {
      this.chosenDevice.set(device);
    }
    this.history.update((h) => [...h, next]);
    this.scrollTop();
  }

  protected back(): void {
    this.history.update((h) => (h.length > 1 ? h.slice(0, -1) : h));
    this.scrollTop();
  }

  protected restart(): void {
    this.chosenDevice.set(null);
    this.history.set([this.startNode()]);
    this.scrollTop();
  }

  /** Haut de l'etape, pas de la page : sur telephone, le bandeau de titre prend tout l'ecran. */
  private scrollTop(): void {
    document.querySelector('.guide')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
