/**
 * Module « Annonces » (groupes `redacteur` / `admin`, garde dans `src/middleware.ts`) :
 *  - GET  : annonces des sources (`src/content/annonces.yaml`, brouillons
 *           compris), état de la dernière publication, disponibilité ;
 *  - POST : `{ annonce }` → ajoutée en dernier, puis reconstruction du site
 *           (annulée si le build échoue).
 */
import type { APIRoute } from 'astro';
import { json, jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../../lib/admin-publish';
import { readAnnonceInput, readAnnonceSources, saveAnnonce } from '../../../../lib/annonce-writer';
import { canPublish, readStatus } from '../../../../lib/site-build';

export const prerender = false;

/** Au-delà, le résultat de la dernière publication n'est plus rappelé dans le module. */
const STATUS_RECALL_MS = 24 * 60 * 60 * 1000;

export const GET: APIRoute = withErrors(async () => {
	const status = await readStatus();
	const finished = status.finishedAt ? Date.parse(status.finishedAt) : 0;
	const recent = status.state === 'running' || status.state === 'idle' || Date.now() - finished < STATUS_RECALL_MS;
	return json({
		annonces: await readAnnonceSources(),
		status: recent ? status : { state: 'idle' },
		availability: await canPublish(),
	});
});

export const POST: APIRoute = withErrors(async ({ request, locals }) => {
	const blocked = await publishBlocked(request);
	if (blocked) return blocked;
	const body = (await readJson(request)) ?? {};
	const result = await saveAnnonce(readAnnonceInput(body.annonce), null);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		request,
		user: locals.user!,
		action: 'annonce.ajout',
		subject: result.title!,
		label: `Annonce : ${result.title}`,
		applied: result.applied,
	});
});
