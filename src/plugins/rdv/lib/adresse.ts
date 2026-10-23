/**
 * Adresse de la page publique du plugin RDV (`adresse:` de
 * `src/content/rdv.yaml`). Module pur : partagé par `plugin.ts` (config
 * Astro, qui lit le fichier sans `?raw`), `config.ts` (validation au build)
 * et le catalogue (module « Plugins »).
 */
export { ADRESSE_RE } from '../../champs';

export const ADRESSE_DEFAUT = '/rendez-vous';
