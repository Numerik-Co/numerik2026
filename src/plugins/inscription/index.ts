/**
 * Ce que le plugin inscription fournit au reste du site — toujours à travers
 * ce fichier ou `pluginActif('inscription')` (faux aussi si le plugin
 * adhésion, requis, est inactif).
 */
import { pluginActif } from '..';

/** Page publique du plugin (liens du site, plan du site). */
export const INSCRIPTION_HREF = '/inscription';

/** Bouton « S'inscrire » des fiches d'activité et réglages d'inscription du module « Activités ». */
export function inscriptionEnLigne(): boolean {
	return pluginActif('inscription');
}
