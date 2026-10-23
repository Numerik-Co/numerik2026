import type { APIRoute } from 'astro';
import { fetchCreneauxDisponibles } from '../../../lib/rdv/creneaux';
import { GristError } from '../../../lib/rdv/grist';
import { json } from '../../../lib/adhesion/http';

export const prerender = false;

/**
 * Créneaux de la fenêtre de réservation glissante, disponibles ou déjà pris ;
 * créneaux d'urgence réservables seulement avec une session de l'espace bénévoles.
 */
export const GET: APIRoute = async ({ locals }) => {
	try {
		const creneaux = await fetchCreneauxDisponibles(Boolean(locals.user));
		return json(creneaux);
	} catch (err) {
		const status = err instanceof GristError ? err.status : 500;
		console.error('[api/rdv/creneaux]', err);
		return json({ error: 'Impossible de charger les créneaux disponibles.' }, status);
	}
};
