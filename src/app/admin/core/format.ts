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
