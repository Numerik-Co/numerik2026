/**
 * Création d'un menu déroulant (groupes `redacteur` / `admin`) :
 * `{ label, folder? }` → `src/content/pages/<folder>/_group.md`, en dernière position.
 * Un menu déroulant sans page n'apparaît pas encore sur le site.
 */
import type { APIRoute } from 'astro';
import { jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../../lib/admin-publish';
import { saveDropdown } from '../../../../lib/page-writer';

export const prerender = false;

export const POST: APIRoute = withErrors(async ({ request, locals }) => {
	const blocked = await publishBlocked();
	if (blocked) return blocked;
	const body = (await readJson(request)) ?? {};
	const label = String(body.label ?? '');
	const result = await saveDropdown({ label, folder: String(body.folder ?? '') }, null);
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		user: locals.user!,
		action: 'menu-deroulant.ajout',
		subject: label.trim(),
		label: `Menu déroulant : ${label.trim()}`,
		message: `/${result.folder}`,
		applied: result.applied,
	});
});
