/**
 * Suppression d'une actualité (groupes `redacteur` / `admin`, garde dans
 * `src/middleware.ts`) : `DELETE` avec `{ confirm: <slug> }`. Le dossier est
 * mis de côté puis le site reconstruit (`src/lib/site-build.ts`) ; il n'est
 * effacé qu'une fois la nouvelle version en ligne, et remis en place si la
 * reconstruction échoue.
 */
import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { json, jsonError, readJson } from '../../../../lib/auth/api';
import { setAsideNews } from '../../../../lib/news-writer';
import { canPublish, isPublishing, publish } from '../../../../lib/site-build';

export const prerender = false;

export const DELETE: APIRoute = async ({ params, request }) => {
	const slug = String(params.slug ?? '');
	const availability = await canPublish();
	if (!availability.ok) return jsonError(availability.reason!, 503);
	if (isPublishing()) return jsonError('Une publication est déjà en cours, réessayez dans une minute.', 409);

	const body = await readJson(request);
	if (body?.confirm !== slug) return jsonError('Confirmation manquante.');

	const title = (await getEntry('news', slug))?.data.title ?? slug;
	const aside = await setAsideNews(slug);
	if (!aside) return jsonError('Actualité introuvable dans les sources (déjà supprimée ?).', 404);

	const started = await publish({
		label: `Suppression : ${title}`,
		onFailure: aside.restore,
		onSuccess: aside.purge,
	});
	if (!started.started) {
		await aside.restore();
		return jsonError(started.reason!, 409);
	}
	return json({ ok: true }, 202);
};
