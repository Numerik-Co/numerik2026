/**
 * Ordre des catégories et des activités dans leurs catégories (flèches ↑/↓
 * du module « Activités », groupes `redacteur` / `admin`) :
 *  - PUT : `{ levels?: { <catégorie>: [slugs…] }, categories?: [slugs…] }`
 *          → `order` des fiches renuméroté et/ou `_categories.yaml` réordonné
 *          (`saveCatalogOrder()`), puis une seule reconstruction du site.
 * Route statique : prioritaire sur `[slug].ts` (l'adresse `ordre` est refusée
 * à la création d'une fiche).
 */
import type { APIRoute } from 'astro';
import { jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../../lib/admin-publish';
import { saveCatalogOrder } from '../../../../lib/category-writer';

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
	const categoryOrder = Array.isArray(body.categories) ? body.categories.map(String) : null;
	const result = await saveCatalogOrder(levels, categoryOrder);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		user: locals.user!,
		action: 'activite.ordre',
		subject: result.categoriesMoved ? 'Ordre des catégories et des activités' : 'Ordre des activités',
		label: result.categoriesMoved ? 'Nouvel ordre des catégories et des activités' : 'Nouvel ordre des activités',
		applied: result.applied,
	});
});
