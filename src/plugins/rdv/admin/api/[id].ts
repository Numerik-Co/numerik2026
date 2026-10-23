import type { APIRoute } from 'astro';
import { json, jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { logEvent } from '../../../../lib/journal';
import { GristError } from '../../lib/grist';
import { lireModification, modifierRdv } from '../gestion';

export const prerender = false;

/** Modifie un RDV (créneau, démarche, commentaire, statut), directement dans Grist. */
export const PUT: APIRoute = withErrors(async ({ params, request, locals }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) return jsonError('Rendez-vous inconnu.', 404);
	const modification = lireModification(await readJson(request));
	if (!modification) return jsonError('Requête invalide.', 400);
	try {
		const resultat = await modifierRdv(id, modification);
		if (!resultat.ok) return jsonError(resultat.erreur, resultat.status);
		await logEvent({ by: locals.user, action: 'rdv.modification', label: `RDV n°${id}`, message: resultat.changements.join(', ') });
		return json({ ok: true });
	} catch (err) {
		if (err instanceof GristError) {
			console.error('[api/admin/rdv]', err);
			return jsonError('Grist injoignable : modification non enregistrée.', err.status);
		}
		throw err;
	}
});
