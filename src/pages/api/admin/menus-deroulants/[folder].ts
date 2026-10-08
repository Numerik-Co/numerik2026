/**
 * Un menu déroulant (groupes `redacteur` / `admin`) :
 *  - PUT    : `{ label }` (l'adresse et la position ne changent pas ici) ;
 *  - DELETE : `{ confirm: <dossier> }` — menu déroulant vide seulement.
 */
import type { APIRoute } from 'astro';
import { jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../../lib/admin-publish';
import { deleteDropdown, saveDropdown } from '../../../../lib/page-writer';

export const prerender = false;

export const PUT: APIRoute = withErrors(async ({ params, request, locals }) => {
	const folder = String(params.folder ?? '');
	const blocked = await publishBlocked();
	if (blocked) return blocked;
	const body = (await readJson(request)) ?? {};
	const label = String(body.label ?? '');
	const result = await saveDropdown({ label, folder }, folder);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		user: locals.user!,
		action: 'menu-deroulant.modification',
		subject: label.trim(),
		label: `Menu déroulant : ${label.trim()}`,
		message: `/${folder}`,
		applied: result.applied,
	});
});

export const DELETE: APIRoute = withErrors(async ({ params, request, locals }) => {
	const folder = String(params.folder ?? '');
	const blocked = await publishBlocked();
	if (blocked) return blocked;
	const body = await readJson(request);
	if (body?.confirm !== folder) return jsonError('Confirmation manquante.');
	const result = await deleteDropdown(folder);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		user: locals.user!,
		action: 'menu-deroulant.suppression',
		subject: result.label!,
		label: `Suppression du menu déroulant : ${result.label}`,
		message: `/${folder}`,
		applied: result.applied,
	});
});
