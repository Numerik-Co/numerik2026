import type { APIRoute } from 'astro';
import { rechercherBeneficiaires } from '../../../lib/rdv/beneficiaires';
import { GristError } from '../../../lib/rdv/grist';
import { json } from '../../../lib/adhesion/http';

export const prerender = false;

/**
 * Parcours « J'ai déjà rencontré le·la conseiller·ère » : fiches dont le prénom et
 * le nom correspondent exactement, avec un indice masqué pour départager.
 */
export const GET: APIRoute = async ({ url }) => {
	const prenom = (url.searchParams.get('prenom') ?? '').trim();
	const nom = (url.searchParams.get('nom') ?? '').trim();
	if (!prenom || !nom) return json([]);

	try {
		return json(await rechercherBeneficiaires(prenom, nom));
	} catch (err) {
		const status = err instanceof GristError ? err.status : 500;
		console.error('[api/rdv/beneficiaires]', err);
		return json({ error: 'Recherche impossible pour le moment.' }, status);
	}
};
