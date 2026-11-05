/**
 * Une annonce de la bannière (groupes `redacteur` / `admin`) :
 *  - PUT    : `{ annonce }` → modifiée en place (l'identifiant ne change pas),
 *             site reconstruit, fichier d'origine remis si échec ;
 *  - DELETE : `{ confirm: <id> }` → retirée du fichier.
 */
import type { APIRoute } from 'astro';
import { jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../../lib/admin-publish';
import { deleteAnnonce, readAnnonceInput, saveAnnonce } from '../../../../lib/annonce-writer';

export const prerender = false;

export const PUT: APIRoute = withErrors(async ({ params, request, locals }) => {
	const id = String(params.id ?? '');
	const blocked = await publishBlocked(request);
	if (blocked) return blocked;
	const body = (await readJson(request)) ?? {};
	const result = await saveAnnonce(readAnnonceInput(body.annonce), id);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		request,
		user: locals.user!,
		action: 'annonce.modification',
		subject: result.title!,
		label: `Annonce : ${result.title}`,
		applied: result.applied,
	});
});

export const DELETE: APIRoute = withErrors(async ({ params, request, locals }) => {
	const id = String(params.id ?? '');
	const blocked = await publishBlocked(request);
	if (blocked) return blocked;
	const body = await readJson(request);
	if (body?.confirm !== id) return jsonError('Confirmation manquante.');
	const result = await deleteAnnonce(id);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		request,
		user: locals.user!,
		action: 'annonce.suppression',
		subject: result.title!,
		label: `Suppression de l'annonce : ${result.title}`,
		message: id,
		applied: result.applied,
	});
});
