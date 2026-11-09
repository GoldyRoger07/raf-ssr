import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { formatNumber } from '../../core/format';

/** Couleur d'une serie : emplacements 1 et 2 de la palette categorielle. */
export type SeriesColor = 'blue' | 'orange';

export interface ChartSeries {
  label: string;
  color: SeriesColor;
  values: number[];
}

const PAD = { top: 12, right: 12, bottom: 26, left: 64 };
const HEIGHT = 220;

/** Pas « rond » (1, 2, 5 x 10^n) pour environ quatre graduations. */
function niceStep(range: number): number {
  const raw = range / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const ratio = raw / magnitude;
  return (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * magnitude;
}

/** 12500 -> « 12,5 k » : les graduations restent courtes. */
function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${formatNumber(+(value / 1_000_000).toFixed(1))} M`;
  if (abs >= 10_000) return `${formatNumber(+(value / 1000).toFixed(1))} k`;
  return formatNumber(value);
}

/** « 2026-11-09 » -> « 09/11 » */
function shortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

/** « 2026-11-09 » -> « lun. 9 nov. » (date calendaire, sans fuseau). */
const longDateFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
function longDate(iso: string): string {
  return longDateFormat.format(new Date(`${iso}T00:00:00Z`));
}

/**
 * Courbe ou barres d'une serie jour par jour, en SVG, sans dependance.
 * Lignes : un reticule suit le pointeur et le tooltip liste toutes les series.
 * Barres : une seule serie signee, bleue au-dessus de zero, rouge en dessous.
 * Les fleches du clavier deplacent la selection ; un tableau reprend les valeurs.
 */
@Component({
  selector: 'admin-trend-chart',
  templateUrl: './trend-chart.html',
  styles: `
    :host {
      display: block;
      --viz-grid: #e7e5e0;
      --viz-axis: #c3c2b7;
      --viz-text: #6b6a65;
      --viz-blue: #2a78d6;
      --viz-orange: #eb6834;
      --viz-negative: #e34948;
      --viz-surface: #ffffff;
    }
    :host-context(.app-dark) {
      --viz-grid: #2c2c2a;
      --viz-axis: #4a4a46;
      --viz-text: #a3a29b;
      --viz-blue: #3987e5;
      --viz-orange: #d95926;
      --viz-negative: #e66767;
      --viz-surface: #0f172a;
    }
    .s-blue { stroke: var(--viz-blue); fill: var(--viz-blue); }
    .s-orange { stroke: var(--viz-orange); fill: var(--viz-orange); }
    .k-blue { background: var(--viz-blue); }
    .k-orange { background: var(--viz-orange); }
    .k-negative { background: var(--viz-negative); }
    .bar-pos { fill: var(--viz-blue); }
    .bar-neg { fill: var(--viz-negative); }
    .bar-dim { opacity: 0.55; }
  `,
})
export class TrendChart {
  readonly dates = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly kind = input<'line' | 'bar'>('line');
  /** Unite affichee dans le tooltip et le tableau. */
  readonly unit = input<'htg' | 'count'>('count');
  readonly label = input('Graphique');

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('frame');
  protected readonly width = signal(640);
  protected readonly height = HEIGHT;
  protected readonly pad = PAD;
  protected readonly active = signal<number | null>(null);

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Le SVG se redessine a la largeur reelle de sa carte (navigateur seulement).
    afterNextRender(() => {
      const element = this.host().nativeElement;
      const observer = new ResizeObserver(([entry]) => {
        this.width.set(Math.max(280, Math.round(entry.contentRect.width)));
      });
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  private readonly plotWidth = computed(() => this.width() - PAD.left - PAD.right);
  private readonly plotHeight = HEIGHT - PAD.top - PAD.bottom;

  /** Bornes et graduations de l'axe Y, zero toujours inclus. */
  protected readonly scale = computed(() => {
    const all = this.series().flatMap((s) => s.values);
    let min = Math.min(0, ...all);
    let max = Math.max(0, ...all);
    if (min === max) max = 1;
    const step = niceStep(max - min);
    min = Math.floor(min / step) * step;
    max = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
    return { min, max, ticks };
  });

  protected y(value: number): number {
    const { min, max } = this.scale();
    return PAD.top + this.plotHeight * (1 - (value - min) / (max - min));
  }

  /** Centre du jour i : une bande par jour, barres et points au milieu. */
  protected x(i: number): number {
    return PAD.left + this.band() * (i + 0.5);
  }

  protected readonly band = computed(() => this.plotWidth() / Math.max(1, this.dates().length));

  protected readonly barWidth = computed(() => Math.max(2, Math.min(28, this.band() - 2)));

  protected readonly paths = computed(() =>
    this.series().map((s) => ({
      color: s.color,
      d: s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${this.x(i).toFixed(1)},${this.y(v).toFixed(1)}`).join(''),
    })),
  );

  /** Barres arrondies cote donnee (4px), ancrees a zero. */
  protected readonly bars = computed(() => {
    const values = this.series()[0]?.values ?? [];
    const zero = this.y(0);
    const w = this.barWidth();
    return values.map((v, i) => {
      const top = this.y(v);
      const h = Math.abs(zero - top);
      const r = Math.min(4, h, w / 2);
      const x0 = this.x(i) - w / 2;
      const x1 = x0 + w;
      // Coins arrondis seulement a l'extremite opposee a la ligne de zero.
      const d =
        v >= 0
          ? `M${x0},${zero}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top + r}V${zero}Z`
          : `M${x0},${zero}V${top - r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top - r}V${zero}Z`;
      return { d, negative: v < 0 };
    });
  });

  /** Environ six dates sous l'axe, dont toujours la derniere (aujourd'hui). */
  protected readonly xTicks = computed(() => {
    const n = this.dates().length;
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(this.plotWidth() / 70))));
    const ticks: { i: number; label: string }[] = [];
    for (let i = n - 1; i >= 0; i -= every) ticks.unshift({ i, label: shortDate(this.dates()[i]) });
    return ticks;
  });

  protected readonly tooltip = computed(() => {
    const i = this.active();
    if (i == null || i >= this.dates().length) return null;
    const left = this.x(i);
    return {
      date: longDate(this.dates()[i]),
      rows: this.series().map((s) => ({
        label: s.label,
        color: this.kind() === 'bar' && s.values[i] < 0 ? 'negative' : s.color,
        value: this.format(s.values[i]),
      })),
      // Le tooltip passe de l'autre cote du reticule dans la moitie droite.
      style: left > this.width() / 2 ? { right: `${this.width() - left + 10}px` } : { left: `${left + 10}px` },
    };
  });

  protected readonly rows = computed(() =>
    this.dates().map((date, i) => ({
      date: longDate(date),
      values: this.series().map((s) => this.format(s.values[i])),
    })),
  );

  protected compact = compact;

  protected format(value: number): string {
    return this.unit() === 'htg' ? `${formatNumber(value)} HTG` : formatNumber(value);
  }

  protected onPointer(event: PointerEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * this.width();
    const i = Math.floor((px - PAD.left) / this.band());
    this.active.set(Math.min(this.dates().length - 1, Math.max(0, i)));
  }

  protected onKey(event: KeyboardEvent): void {
    const n = this.dates().length;
    const current = this.active() ?? n - 1;
    if (event.key === 'ArrowLeft') this.active.set(Math.max(0, current - 1));
    else if (event.key === 'ArrowRight') this.active.set(Math.min(n - 1, current + 1));
    else if (event.key === 'Escape') this.active.set(null);
    else return;
    event.preventDefault();
  }
}
