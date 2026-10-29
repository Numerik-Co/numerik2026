/**
 * Ce que le plugin adhésion fournit au reste du site — toujours à travers ce
 * fichier ou `pluginActif('adhesion')`, pour qu'un plugin inactif n'y laisse
 * aucune trace (planning Grist, liens « Adhérer » et « Je participe »).
 */
import type { AgendaSession } from '../../lib/agenda';
import { pluginActif } from '..';
import { fetchPlanningAgenda } from './lib/planning';

/** Pages publiques du plugin (liens du site, plan du site). */
export const ADHESION_HREF = '/adherer';
export const FORMULAIRE_HREF = '/adherer/formulaire';
export const PRESENCE_HREF = '/je-participe';

/**
 * Séances de la semaine lues dans la table Grist `Activite` (planning de
 * `/activites`) : aucune si le plugin est inactif. Grist injoignable : erreur
 * (la page affiche alors un avertissement).
 */
export async function planningActivites(): Promise<AgendaSession[]> {
	return pluginActif('adhesion') ? fetchPlanningAgenda() : [];
}

/**
 * Lien du site qui mène à une page du plugin (`/adherer…`, `/je-participe`)
 * ou du plugin inscription (`/inscription`, qui le requiert) : à masquer
 * quand il est inactif (404).
 */
export function lienAdhesionIndisponible(href: string): boolean {
	const chemin = href.split(/[?#]/)[0].replace(/\/+$/, '');
	const vers = (p: string) => chemin === p || chemin.startsWith(`${p}/`);
	if (vers('/inscription')) return !pluginActif('inscription');
	return !pluginActif('adhesion') && [ADHESION_HREF, PRESENCE_HREF].some(vers);
}
