/**
 * Une catégorie d'activités (groupes `redacteur` / `admin`) :
 *  - PUT    : `{ category: { label, icon, description } }` → modifiée en place
 *             (l'adresse ne change pas), site reconstruit, sauvegarde remise si échec ;
 *  - DELETE : `{ confirm: <slug> }` → retirée si elle ne contient aucune fiche.
 */
import type { APIRoute } from 'astro';
import { jsonError, readJson, withErrors } from '../../../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../../../lib/admin-publish';
import { deleteCategory, readCategoryInput, saveCategory } from '../../../../../lib/category-writer';

export const prerender = false;

export const PUT: APIRoute = withErrors(async ({ params, request, locals }) => {
	const slug = String(params.slug ?? '');
	const blocked = await publishBlocked();
	if (blocked) return blocked;
	const body = (await readJson(request)) ?? {};
	const result = await saveCategory(readCategoryInput(body.category), slug);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		user: locals.user!,
		action: 'categorie.modification',
		subject: result.label!,
		label: `Catégorie : ${result.label}`,
		href: `/activites/${slug}`,
		applied: result.applied,
	});
});

export const DELETE: APIRoute = withErrors(async ({ params, request, locals }) => {
	const slug = String(params.slug ?? '');
	const blocked = await publishBlocked();
	if (blocked) return blocked;
	const body = await readJson(request);
	if (body?.confirm !== slug) return jsonError('Confirmation manquante.');

	const result = await deleteCategory(slug);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		user: locals.user!,
		action: 'categorie.suppression',
		subject: result.label!,
		label: `Suppression de la catégorie : ${result.label}`,
		message: slug,
		applied: result.applied,
	});
});
