/**
 * Modifications enregistrées sans publier (lot en attente, cf.
 * `src/lib/publication-lot.ts`), groupes `redacteur` / `admin` :
 *  - GET    : `{ changes }`, de la plus ancienne à la plus récente ;
 *  - POST   : publie tout le lot en une reconstruction du site ; si elle
 *             échoue, le site en ligne ne change pas et le lot reste en
 *             attente (rien n'est défait) ;
 *  - DELETE : `{ confirm: true }` → défait toutes les modifications du lot
 *             (sources remises dans l'état de la copie de secours).
 */
import type { APIRoute } from 'astro';
import { json, jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { logEvent } from '../../../../lib/journal';
import { cancelLot, readLot } from '../../../../lib/publication-lot';
import { canPublish, isPublishing, publish } from '../../../../lib/site-build';

export const prerender = false;

export const GET: APIRoute = withErrors(async () => json({ changes: await readLot() }));

export const POST: APIRoute = withErrors(async ({ locals }) => {
	const availability = await canPublish();
	if (!availability.ok) return jsonError(availability.reason!, 503);
	if (isPublishing()) return jsonError('Une publication est déjà en cours, réessayez dans une minute.', 409);
	const changes = await readLot();
	if (changes.length === 0) return jsonError('Aucune modification en attente de publication.', 409);
	const label = changes.length === 1 ? changes[0].label : `${changes.length} modifications en attente`;
	const started = await publish({ label, href: changes.length === 1 ? changes[0].href : undefined, by: locals.user! });
	if (!started.started) return jsonError(started.reason!, 409);
	return json({ ok: true, label }, 202);
});

export const DELETE: APIRoute = withErrors(async ({ request, locals }) => {
	const body = await readJson(request);
	if (body?.confirm !== true) return jsonError('Confirmation manquante.');
	if (isPublishing()) return jsonError('Une publication est en cours, réessayez dans une minute.', 409);
	const changes = await readLot();
	if (changes.length === 0) return json({ ok: true });
	await cancelLot();
	await logEvent({
		by: locals.user,
		action: 'publication.lot-annule',
		label: changes.length === 1 ? changes[0].label : `${changes.length} modifications`,
		message: changes.map((c) => c.label).join(' · '),
	});
	return json({ ok: true });
});
