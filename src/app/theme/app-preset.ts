import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Preset de thème de l'application.
 * Couleur primaire du site : #ff9800 (orange).
 */
export const AppPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff3e0',
      100: '#ffe0b2',
      200: '#ffcc80',
      300: '#ffb74d',
      400: '#ffa726',
      500: '#ff9800',
      600: '#fb8c00',
      700: '#f57c00',
      800: '#ef6c00',
      900: '#e65100',
      950: '#b23c00',
    },
  },
});
