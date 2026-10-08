/**
 * Un menu déroulant (groupes `redacteur` / `admin`) :
 *  - PUT    : `{ label, order }` (l'adresse du menu ne change pas) ;
 *  - DELETE : `{ confirm: <dossier> }` — menu vide seulement.
 */
import type { APIRoute } from 'astro';
import { jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../../lib/admin-publish';
import { deleteMenu, saveMenu } from '../../../../lib/page-writer';

export const prerender = false;

export const PUT: APIRoute = withErrors(async ({ params, request, locals }) => {
	const folder = String(params.folder ?? '');
	const blocked = await publishBlocked();
	if (blocked) return blocked;
	const body = (await readJson(request)) ?? {};
	const label = String(body.label ?? '');
	const result = await saveMenu({ label, folder, order: Number(body.order ?? 50) }, folder);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		user: locals.user!,
		action: 'menu.modification',
		subject: label.trim(),
		label: `Menu : ${label.trim()}`,
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
	const result = await deleteMenu(folder);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		user: locals.user!,
		action: 'menu.suppression',
		subject: result.label!,
		label: `Suppression du menu : ${result.label}`,
		message: `/${folder}`,
		applied: result.applied,
	});
});
