/**
 * Module « Activités » (groupes `redacteur` / `admin`, garde dans `src/middleware.ts`) :
 *  - GET  : fiches des sources (brouillons compris) + vignettes, catégories
 *           des sources (`_categories.yaml`),
 *           état de la dernière publication, disponibilité de la publication ;
 *  - POST : `{ activity, cover?: { type, data (base64) } }` → crée
 *           `src/content/activites/<slug>/` (en dernier de sa catégorie) puis
 *           reconstruit le site (annulé si le build échoue).
 */
import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';
import { json, jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../../lib/admin-publish';
import { readCover } from '../../../../lib/admin-cover';
import { listActivitySources, readActivityInput, saveActivity } from '../../../../lib/activity-writer';
import { readCategorySources } from '../../../../lib/category-writer';
import { canPublish, readStatus } from '../../../../lib/site-build';

export const prerender = false;

/** Au-delà, le résultat de la dernière publication n'est plus rappelé dans le module. */
const STATUS_RECALL_MS = 24 * 60 * 60 * 1000;

export const GET: APIRoute = withErrors(async () => {
	// Vignettes : photos du site construit (une fiche toute neuve n'en a pas encore).
	const built = new Map((await getCollection('activites')).map((e) => [e.id, e.data.cover]));
	const activities = await Promise.all(
		(await listActivitySources()).map(async ({ body: _body, ...source }) => {
			const cover = built.get(source.slug);
			return {
				...source,
				href: `/activites/${source.category}/${source.slug}`,
				thumbnail: cover ? (await getImage({ src: cover, width: 128, height: 80, fit: 'cover' })).src : null,
			};
		}),
	);
	const status = await readStatus();
	const finished = status.finishedAt ? Date.parse(status.finishedAt) : 0;
	const recent = status.state === 'running' || status.state === 'idle' || Date.now() - finished < STATUS_RECALL_MS;
	return json({
		activities,
		categories: await readCategorySources(),
		status: recent ? status : { state: 'idle' },
		availability: await canPublish(),
	});
});

export const POST: APIRoute = withErrors(async ({ request, locals }) => {
	const blocked = await publishBlocked();
	if (blocked) return blocked;
	const body = (await readJson(request)) ?? {};
	const cover = readCover(body.cover);
	if (cover.error) return jsonError(cover.error);

	const input = readActivityInput(body.activity);
	const result = await saveActivity(input, null, cover.data ? { action: 'replace', data: cover.data } : { action: 'keep' });
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		user: locals.user!,
		action: 'activite.ajout',
		subject: result.title!,
		label: `Activité : ${result.title}`,
		href: input.isPublish ? result.href : undefined,
		message: input.isPublish ? undefined : 'brouillon',
		applied: result.applied,
	});
});
