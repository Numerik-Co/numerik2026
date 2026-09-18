import type { APIRoute } from 'astro';
import { fetchDemarches } from '../../../lib/rdv/demarches';
import { GristError } from '../../../lib/rdv/grist';
import { json } from '../../../lib/adhesion/http';

export const prerender = false;

/** Catalogue des démarches proposées au bloc 1 (table Grist `Demarches`). */
export const GET: APIRoute = async () => {
	try {
		const demarches = await fetchDemarches();
		return json(demarches);
	} catch (err) {
		const status = err instanceof GristError ? err.status : 500;
		console.error('[api/rdv/demarches]', err);
		return json({ error: 'Impossible de charger les démarches proposées.' }, status);
	}
};
