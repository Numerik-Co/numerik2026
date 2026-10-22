/**
 * Catégories d'activités (module « Activités », groupes `redacteur` / `admin`,
 * garde `/api/admin/activites` dans `src/middleware.ts`) :
 *  - POST : `{ category: { label, slug?, icon, description } }` → ajoutée en
 *           dernier dans `src/content/activites/_categories.yaml`, puis
 *           reconstruction du site (annulée si le build échoue).
 * Liste : `GET /api/admin/activites`. Route statique : prioritaire sur
 * `[slug].ts` (l'adresse `categories` est refusée à la création d'une fiche).
 */
import type { APIRoute } from 'astro';
import { jsonError, readJson, withErrors } from '../../../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../../../lib/admin-publish';
import { readCategoryInput, saveCategory } from '../../../../../lib/category-writer';

export const prerender = false;

export const POST: APIRoute = withErrors(async ({ request, locals }) => {
	const blocked = await publishBlocked(request);
	if (blocked) return blocked;
	const body = (await readJson(request)) ?? {};
	const result = await saveCategory(readCategoryInput(body.category), null);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		request,
		user: locals.user!,
		action: 'categorie.ajout',
		subject: result.label!,
		label: `Catégorie : ${result.label}`,
		href: `/activites/${result.slug}`,
		applied: result.applied,
	});
});
