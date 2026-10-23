import type { APIRoute } from 'astro';
import { GristError } from '../lib/grist';
import { fetchListes } from '../lib/listes';
import { json } from '../../../lib/adhesion/http';

export const prerender = false;

/** Listes de choix du formulaire (thématiques, genre, tranche d'âge, statut), lues dans le document Grist. */
export const GET: APIRoute = async () => {
	try {
		return json(await fetchListes());
	} catch (err) {
		const status = err instanceof GristError ? err.status : 500;
		console.error('[api/rdv/listes]', err);
		return json({ error: 'Impossible de charger les listes du formulaire.' }, status);
	}
};
