/**
 * Une actualité (groupes `redacteur` / `admin`, garde dans `src/middleware.ts`) :
 *  - GET    : contenu tel qu'il est dans les sources (formulaire d'édition) ;
 *  - PUT    : `{ fields, body, cover }` → nouvelle version du même dossier
 *             (l'URL ne change pas), site reconstruit ; sauvegarde remise en
 *             place si la reconstruction échoue ;
 *  - DELETE : `{ confirm: <slug> }` → dossier mis de côté, site reconstruit,
 *             dossier effacé une fois la nouvelle version en ligne (remis en
 *             place si échec).
 * Toute modification passe par `src/lib/site-build.ts` (une à la fois).
 */
import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { getEntry } from 'astro:content';
import { stringify as stringifyYaml } from 'yaml';
import { json, jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import {
	COVER_MAX_BYTES,
	MARKDOWN_MAX_BYTES,
	readNewsSource,
	setAsideNews,
	updateNews,
	type CoverChange,
} from '../../../../lib/news-writer';
import { logEvent } from '../../../../lib/journal';
import { canPublish, isPublishing, publish } from '../../../../lib/site-build';

export const prerender = false;

const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const GET: APIRoute = withErrors(async ({ params }) => {
	const source = await readNewsSource(String(params.slug ?? ''));
	if (!source) return jsonError('Actualité introuvable dans les sources.', 404);
	// Aperçu de la photo actuelle : celle du site construit (la source n'est pas servie).
	const entry = await getEntry('news', source.slug);
	const coverUrl = entry?.data.cover
		? (await getImage({ src: entry.data.cover, width: 640, height: 360, fit: 'cover' })).src
		: null;
	return json({ ...source, coverUrl });
});

/** Champs du formulaire → fichier Markdown, validé ensuite comme un dépôt. */
function toMarkdown(fields: Record<string, unknown>, body: string): string {
	const text = (key: string) => (typeof fields[key] === 'string' ? (fields[key] as string).trim() : '');
	const data: Record<string, unknown> = { title: text('title'), publishAt: text('publishAt'), excerpt: text('excerpt') };
	if (fields.isPublish === false) data.isPublish = false;
	for (const key of ['tag', 'author', 'imageCredit']) if (text(key)) data[key] = text(key);
	return `---\n${stringifyYaml(data, { defaultStringType: 'QUOTE_DOUBLE', lineWidth: 0 })}---\n\n${body}\n`;
}

export const PUT: APIRoute = withErrors(async ({ params, request, locals }) => {
	const slug = String(params.slug ?? '');
	const availability = await canPublish();
	if (!availability.ok) return jsonError(availability.reason!, 503);
	if (isPublishing()) return jsonError('Une publication est déjà en cours, réessayez dans une minute.', 409);

	const payload = (await readJson(request)) ?? {};
	const fields = (payload.fields && typeof payload.fields === 'object' ? payload.fields : {}) as Record<string, unknown>;
	const body = typeof payload.body === 'string' ? payload.body.replace(/\r\n?/g, '\n').trim() : '';
	const markdown = toMarkdown(fields, body);
	if (Buffer.byteLength(markdown) > MARKDOWN_MAX_BYTES) return jsonError('Le texte est trop long (200 Ko max).');

	let coverChange: CoverChange = { action: 'keep' };
	const rawCover = payload.cover as { action?: unknown; type?: unknown; data?: unknown } | undefined;
	if (rawCover?.action === 'remove') coverChange = { action: 'remove' };
	if (rawCover?.action === 'replace') {
		if (!COVER_TYPES.includes(String(rawCover.type))) return jsonError('Photo : formats acceptés JPEG, PNG ou WebP.');
		const data = Buffer.from(String(rawCover.data ?? ''), 'base64');
		if (data.length === 0) return jsonError('La photo est vide.');
		if (data.length > COVER_MAX_BYTES) return jsonError('La photo est trop lourde (10 Mo max).');
		coverChange = { action: 'replace', data };
	}

	const { title, restore, purge, errors } = await updateNews(slug, markdown, coverChange);
	if (!restore || !purge) return jsonError(errors.join(' '), errors[0]?.includes('introuvable') ? 404 : 422);

	// Journalisé avant la publication, dont le résultat suit dans le journal.
	await logEvent({
		by: locals.user,
		action: 'actualite.modification',
		label: title,
		href: `/actualites/${slug}`,
		message: [coverChange.action !== 'keep' ? `photo : ${coverChange.action === 'remove' ? 'retirée' : 'remplacée'}` : '', fields.isPublish === false ? 'brouillon' : '']
			.filter(Boolean)
			.join(' · ') || undefined,
	});
	const started = await publish({
		label: `Modification : ${title}`,
		href: fields.isPublish === false ? undefined : `/actualites/${slug}`,
		by: locals.user!,
		onFailure: restore,
		onSuccess: purge,
	});
	if (!started.started) {
		await restore();
		await logEvent({ by: locals.user, action: 'publication', label: `Modification : ${title}`, outcome: 'echec', message: started.reason });
		return jsonError(started.reason!, 409);
	}
	return json({ ok: true, href: `/actualites/${slug}` }, 202);
});

export const DELETE: APIRoute = withErrors(async ({ params, request, locals }) => {
	const slug = String(params.slug ?? '');
	const availability = await canPublish();
	if (!availability.ok) return jsonError(availability.reason!, 503);
	if (isPublishing()) return jsonError('Une publication est déjà en cours, réessayez dans une minute.', 409);

	const body = await readJson(request);
	if (body?.confirm !== slug) return jsonError('Confirmation manquante.');

	const title = (await getEntry('news', slug))?.data.title ?? slug;
	const aside = await setAsideNews(slug);
	if (!aside) return jsonError('Actualité introuvable dans les sources (déjà supprimée ?).', 404);

	// Journalisé avant la publication, dont le résultat suit dans le journal.
	await logEvent({ by: locals.user, action: 'actualite.suppression', label: title, message: slug });
	const started = await publish({
		label: `Suppression : ${title}`,
		by: locals.user!,
		onFailure: aside.restore,
		onSuccess: aside.purge,
	});
	if (!started.started) {
		await aside.restore();
		await logEvent({ by: locals.user, action: 'publication', label: `Suppression : ${title}`, outcome: 'echec', message: started.reason });
		return jsonError(started.reason!, 409);
	}
	return json({ ok: true }, 202);
});
