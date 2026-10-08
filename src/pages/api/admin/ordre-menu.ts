/**
 * Ordre du menu de navigation (flèches ↑/↓ du module « Pages », groupes
 * `redacteur` / `admin`) :
 *  - PUT : `{ levels: { racine?: [clés], 'dropdown:<dossier>'?: [clés] } }`
 *          (clés `builtin:<id>`, `page:<chemin>`, `dropdown:<dossier>`),
 *          cf. `saveMenuOrder()` ; puis reconstruction du site.
 */
import type { APIRoute } from 'astro';
import { jsonError, readJson, withErrors } from '../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../lib/admin-publish';
import { saveMenuOrder } from '../../../lib/page-writer';

export const prerender = false;

export const PUT: APIRoute = withErrors(async ({ request, locals }) => {
	const blocked = await publishBlocked();
	if (blocked) return blocked;
	const body = (await readJson(request)) ?? {};
	const raw = body.levels && typeof body.levels === 'object' ? (body.levels as Record<string, unknown>) : {};
	const levels: Record<string, string[]> = {};
	for (const [level, keys] of Object.entries(raw)) {
		if (Array.isArray(keys)) levels[level] = keys.map(String);
	}
	const result = await saveMenuOrder(levels);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		user: locals.user!,
		action: 'ordre-menu.modification',
		subject: 'Ordre du menu de navigation',
		label: 'Nouvel ordre du menu',
		applied: result.applied,
	});
});
