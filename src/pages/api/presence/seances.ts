import type { APIRoute } from 'astro';
import { fetchSeancesCourantes } from '../../../lib/adhesion/presence';
import { GristError } from '../../../lib/adhesion/grist';
import { json } from '../../../lib/adhesion/http';

export const prerender = false;

/** Séance(s) en cours (0, 1 ou plusieurs) pour le dispositif « Je participe ». */
export const GET: APIRoute = async () => {
	try {
		const seances = await fetchSeancesCourantes();
		return json(seances);
	} catch (err) {
		const status = err instanceof GristError ? err.status : 500;
		console.error('[api/presence/seances]', err);
		return json({ error: 'Impossible de déterminer la séance en cours.' }, status);
	}
};
