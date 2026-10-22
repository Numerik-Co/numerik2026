/**
 * Informations de l'association (module « Association », bureau seul, garde
 * dans `src/middleware.ts`) :
 *  - GET : contenu de `src/content/association.yaml` (sources), état de la
 *          dernière publication, disponibilité de la publication ;
 *  - PUT : `{ association }` → `association.yaml` modifié en place
 *          (`saveAssociation()`), puis reconstruction du site (annulée si
 *          le build échoue).
 */
import type { APIRoute } from 'astro';
import { json, jsonError, readJson, withErrors } from '../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../lib/admin-publish';
import { readAssociationInput, readAssociationSource, saveAssociation } from '../../../lib/association-writer';
import { canPublish, readStatus } from '../../../lib/site-build';

export const prerender = false;

/** Au-delà, le résultat de la dernière publication n'est plus rappelé dans le module. */
const STATUS_RECALL_MS = 24 * 60 * 60 * 1000;

export const GET: APIRoute = withErrors(async () => {
	const status = await readStatus();
	const finished = status.finishedAt ? Date.parse(status.finishedAt) : 0;
	const recent = status.state === 'running' || status.state === 'idle' || Date.now() - finished < STATUS_RECALL_MS;
	return json({
		association: await readAssociationSource(),
		status: recent ? status : { state: 'idle' },
		availability: await canPublish(),
	});
});

export const PUT: APIRoute = withErrors(async ({ request, locals }) => {
	const blocked = await publishBlocked(request);
	if (blocked) return blocked;
	const body = (await readJson(request)) ?? {};
	const result = await saveAssociation(readAssociationInput(body.association));
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		request,
		user: locals.user!,
		action: 'association.modification',
		subject: result.name!,
		label: "Informations de l'association",
		applied: result.applied,
	});
});
