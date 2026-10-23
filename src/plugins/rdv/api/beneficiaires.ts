import type { APIRoute } from 'astro';
import { rechercherParNomComplet } from '../lib/beneficiaires';
import { GristError } from '../lib/grist';
import { json } from '../../../lib/adhesion/http';

export const prerender = false;

/**
 * Parcours « déjà venu·e » : `?q=<prénom nom>`
 * (dans un ordre ou l'autre) → fiches qui correspondent exactement, avec un
 * indice masqué pour départager.
 */
export const GET: APIRoute = async ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').trim();
	if (!q) return json([]);

	try {
		return json(await rechercherParNomComplet(q));
	} catch (err) {
		const status = err instanceof GristError ? err.status : 500;
		console.error('[api/rdv/beneficiaires]', err);
		return json({ error: 'Recherche impossible pour le moment.' }, status);
	}
};
