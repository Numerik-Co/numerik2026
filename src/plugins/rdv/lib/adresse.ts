/**
 * Adresse de la page publique du plugin RDV (`adresse:` de
 * `src/content/rdv.yaml`). Module pur : partagé par `plugin.ts` (config
 * Astro, qui lit le fichier sans `?raw`) et `config.ts` (validation au build).
 */
export const ADRESSE_DEFAUT = '/rendez-vous';

/** `/rendez-vous`, `/services/rdv`… : minuscules, chiffres, tirets, sans « / » final. */
export const ADRESSE_RE = /^(\/[a-z0-9]+(-[a-z0-9]+)*)+$/;
