import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats d'affichage du back-office. Intl directement, sans enregistrer de
 * locale Angular : les heures sont toujours celles d'Haiti, quel que soit le
 * fuseau du poste de l'agent.
 */
const HAITI = 'America/Port-au-Prince';

const number = new Intl.NumberFormat('fr-FR');
const dateTime = new Intl.DateTimeFormat('fr-FR', {
  timeZone: HAITI,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** 1975 -> « 1 975 HTG » */
@Pipe({ name: 'htg' })
export class HtgPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return value == null ? '—' : `${number.format(value)} HTG`;
  }
}

/** 120 -> « 120 cr. » ; signe explicite si demande (+120 cr.). */
@Pipe({ name: 'credits' })
export class CreditsPipe implements PipeTransform {
  transform(value: number | null | undefined, signed = false): string {
    if (value == null) {
      return '—';
    }
    const sign = signed && value > 0 ? '+' : '';
    return `${sign}${number.format(value)} cr.`;
  }
}

/** Date et heure d'Haiti. */
@Pipe({ name: 'haitiDate' })
export class HaitiDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? dateTime.format(new Date(value)) : '—';
  }
}

export function formatNumber(value: number): string {
  return number.format(value);
}

/** Decalage d'Haiti par rapport a UTC a cet instant, en millisecondes (heure d'ete comprise). */
function haitiOffsetMs(timestamp: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: HAITI,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(timestamp));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return wall - Math.floor(timestamp / 1000) * 1000;
}

/**
 * Valeur d'un champ datetime-local (« 2026-11-04T20:00 ») lue en heure d'Haiti,
 * quel que soit le fuseau du poste, convertie en instant ISO pour le backend.
 */
export function haitiLocalToIso(value: string): string {
  const [date, time] = value.split('T');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  // Deux passes : le decalage depend de l'instant vise (changement d'heure).
  const first = wall - haitiOffsetMs(wall);
  return new Date(wall - haitiOffsetMs(first)).toISOString();
}

/** Instant -> valeur de champ datetime-local en heure d'Haiti. */
export function isoToHaitiLocal(value: string | number | Date): string {
  const timestamp = new Date(value).getTime();
  return new Date(timestamp + haitiOffsetMs(timestamp)).toISOString().slice(0, 16);
}
