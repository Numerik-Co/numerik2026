/**
 * Ordre de défilement des annonces (glisser-déposer ou flèches ↑/↓ du module
 * « Annonces », groupes `redacteur` / `admin`) :
 *  - PUT : `{ order: [ids…] }` → `annonces.yaml` réordonné, puis reconstruction.
 * Route statique : prioritaire sur `[id].ts` (l'identifiant `ordre` n'est
 * jamais attribué à une annonce).
 */
import type { APIRoute } from 'astro';
import { jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../../lib/admin-publish';
import { saveAnnonceOrder } from '../../../../lib/annonce-writer';

export const prerender = false;

export const PUT: APIRoute = withErrors(async ({ request, locals }) => {
	const blocked = await publishBlocked(request);
	if (blocked) return blocked;
	const body = (await readJson(request)) ?? {};
	const order = Array.isArray(body.order) ? body.order.map(String) : [];
	const result = await saveAnnonceOrder(order);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		request,
		user: locals.user!,
		action: 'annonce.ordre',
		subject: 'Ordre des annonces',
		label: 'Nouvel ordre des annonces',
		applied: result.applied,
	});
});
