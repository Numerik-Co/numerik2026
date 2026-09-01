import type { APIRoute } from 'astro';
import { COLS, GristError, TABLES, updateRecord } from '../../../lib/adhesion/grist';
import { json } from '../../../lib/adhesion/http';

export const prerender = false;

/**
 * Renouvellement — met à jour les préférences (newsletter, droit à l'image) de la
 * fiche retrouvée à l'étape 1. N'écrit que ces deux colonnes.
 */
export const POST: APIRoute = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return json({ error: 'Requête invalide.' }, 400);
	}
	const { membreId, newsletter, droitImage } = body as Record<string, unknown>;
	if (typeof membreId !== 'number') {
		return json({ error: 'membreId requis.' }, 400);
	}

	try {
		await updateRecord(TABLES.membres, membreId, {
			[COLS.membre.newsletter]: newsletter === true,
			[COLS.membre.droitImage]: droitImage === true,
		});
		return json({ ok: true });
	} catch (err) {
		const status = err instanceof GristError ? err.status : 500;
		console.error('[api/adhesion/preferences]', err);
		return json({ error: 'Échec de la mise à jour des préférences.' }, status);
	}
};
