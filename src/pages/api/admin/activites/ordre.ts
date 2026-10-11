/**
 * Ordre des activités dans leurs catégories (flèches ↑/↓ du module
 * « Activités », groupes `redacteur` / `admin`) :
 *  - PUT : `{ levels: { <catégorie>: [slugs…] } }` → `order` renuméroté
 *          (`saveActivityOrder()`), puis reconstruction du site.
 * Route statique : prioritaire sur `[slug].ts` (l'adresse `ordre` est refusée
 * à la création d'une fiche).
 */
import type { APIRoute } from 'astro';
import { jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../../lib/admin-publish';
import { saveActivityOrder } from '../../../../lib/activity-writer';

export const prerender = false;

export const PUT: APIRoute = withErrors(async ({ request, locals }) => {
	const blocked = await publishBlocked();
	if (blocked) return blocked;
	const body = (await readJson(request)) ?? {};
	const raw = body.levels && typeof body.levels === 'object' ? (body.levels as Record<string, unknown>) : {};
	const levels: Record<string, string[]> = {};
	for (const [category, slugs] of Object.entries(raw)) {
		if (Array.isArray(slugs)) levels[category] = slugs.map(String);
	}
	const result = await saveActivityOrder(levels);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		user: locals.user!,
		action: 'activite.ordre',
		subject: 'Ordre des activités',
		label: 'Nouvel ordre des activités',
		applied: result.applied,
	});
});
