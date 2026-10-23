import type { APIRoute } from 'astro';
import { rechercherParNomComplet } from '../../../lib/rdv/beneficiaires';
import { GristError } from '../../../lib/rdv/grist';
import { json } from '../../../lib/adhesion/http';

export const prerender = false;

/**
 * Parcours « J'ai déjà rencontré le·la conseiller·ère » : `?q=<prénom nom>`
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
