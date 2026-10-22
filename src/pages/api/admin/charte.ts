/**
 * Charte graphique (module « Association », onglet « Charte graphique »,
 * bureau seul, garde dans `src/middleware.ts`) :
 *  - GET : couleurs du thème (sources : `reglages.yaml` fusionné avec les
 *          défauts du modèle), défauts, aperçus du logo et des icônes d'onglet ;
 *  - PUT : `{ colors, logo?: { type, data (base64) }, favicon?: { … } }` →
 *          `saveBrand()`, puis reconstruction du site (annulée si le build échoue).
 */
import type { APIRoute } from 'astro';
import { json, jsonError, readJson, withErrors } from '../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../lib/admin-publish';
import { readBrandInput, readBrandSource, saveBrand } from '../../../lib/brand-writer';

export const prerender = false;

export const GET: APIRoute = withErrors(async () => json(await readBrandSource()));

export const PUT: APIRoute = withErrors(async ({ request, locals }) => {
	const blocked = await publishBlocked(request);
	if (blocked) return blocked;
	const input = readBrandInput(await readJson(request));
	if ('error' in input) return jsonError(input.error, 422);
	const result = await saveBrand(input);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		request,
		user: locals.user!,
		action: 'charte.modification',
		subject: result.changes.join(', '),
		label: 'Charte graphique',
		message: result.changes.join(', '),
		applied: result.applied,
	});
});
