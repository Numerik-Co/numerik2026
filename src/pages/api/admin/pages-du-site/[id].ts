/**
 * Page du site (bibliothèque `src/lib/site-pages.ts` : Accueil, Activités…),
 * groupes `redacteur` / `admin` :
 *  - PUT : `{ label, show, active, textes, modules? }` (modules : accueil) → `src/content/pages/_pages-site.md`
 *          (cf. `saveSitePage()`), puis reconstruction du site.
 */
import type { APIRoute } from 'astro';
import { jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { publishBlocked, publishChange } from '../../../../lib/admin-publish';
import { saveSitePage } from '../../../../lib/page-writer';

export const prerender = false;

export const PUT: APIRoute = withErrors(async ({ params, request, locals }) => {
	const id = String(params.id ?? '');
	const blocked = await publishBlocked();
	if (blocked) return blocked;
	const body = (await readJson(request)) ?? {};
	const raw = body.textes && typeof body.textes === 'object' ? (body.textes as Record<string, unknown>) : {};
	const textes = Object.fromEntries(Object.entries(raw).map(([name, value]) => [name, typeof value === 'string' ? value : '']));
	const active = body.active !== false;
	const modules = Array.isArray(body.modules) ? (body.modules as unknown[]) : undefined;
	const result = await saveSitePage(id, { label: String(body.label ?? ''), show: body.show !== false, active, textes, modules });
	if (!result.applied) return jsonError(result.errors.join(' '), 422);
	return publishChange({
		user: locals.user!,
		action: 'page-site.modification',
		subject: result.label!,
		label: `Page du site : ${result.label}`,
		message: active ? (body.show === false ? 'masquée du menu' : undefined) : 'désactivée',
		applied: result.applied,
	});
});
