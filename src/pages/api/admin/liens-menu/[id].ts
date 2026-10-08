/**
 * Lien du menu de navigation vers une page applicative (`site.builtinNav` :
 * Accueil, Activités…), groupes `redacteur` / `admin` :
 *  - PUT : `{ label, show }` → `src/content/pages/_navigation.md`
 *          (cf. `src/lib/builtin-nav.ts`), puis reconstruction du site.
 */
import type { APIRoute } from 'astro';
import { jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../../lib/admin-publish';
import { saveBuiltinLink } from '../../../../lib/page-writer';

export const prerender = false;

export const PUT: APIRoute = withErrors(async ({ params, request, locals }) => {
	const id = String(params.id ?? '');
	const blocked = await publishBlocked();
	if (blocked) return blocked;
	const body = (await readJson(request)) ?? {};
	const result = await saveBuiltinLink(id, {
		label: String(body.label ?? ''),
		show: body.show !== false,
	});
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		user: locals.user!,
		action: 'lien-menu.modification',
		subject: result.label!,
		label: `Lien du menu : ${result.label}`,
		message: body.show === false ? 'masqué du menu' : undefined,
		applied: result.applied,
	});
});
