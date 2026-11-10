/** Unite de saisie d'une duree en minutes (delai d'un quiz solo apres un sans-faute). */
export type DurationUnit = 'MINUTES' | 'HOURS' | 'DAYS';

export const DURATION_UNITS: { label: string; value: DurationUnit; minutes: number }[] = [
  { label: 'minutes', value: 'MINUTES', minutes: 1 },
  { label: 'heures', value: 'HOURS', minutes: 60 },
  { label: 'jours', value: 'DAYS', minutes: 1440 },
];

/** Plafond accepte par le backend : un an. */
export const MAX_DURATION_MINUTES = 525_600;

export function toMinutes(value: number, unit: DurationUnit): number {
  return value * (DURATION_UNITS.find((u) => u.value === unit)?.minutes ?? 1);
}

/** Plus grande unite qui tombe juste : 2880 -> 2 jours, 90 -> 90 minutes. */
export function fromMinutes(minutes: number): { value: number; unit: DurationUnit } {
  if (minutes % 1440 === 0) {
    return { value: minutes / 1440, unit: 'DAYS' };
  }
  if (minutes % 60 === 0) {
    return { value: minutes / 60, unit: 'HOURS' };
  }
  return { value: minutes, unit: 'MINUTES' };
}

/** « 3 jours », « 1 heure », « 45 minutes ». */
export function formatDuration(minutes: number): string {
  const { value, unit } = fromMinutes(minutes);
  const word = unit === 'DAYS' ? 'jour' : unit === 'HOURS' ? 'heure' : 'minute';
  return `${value} ${word}${value > 1 ? 's' : ''}`;
}
