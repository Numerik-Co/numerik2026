/**
 * Nettoyage du HTML des actualités (`src/content/news/`, contenu publiable
 * depuis l'espace bénévoles), appliqué à l'affichage par la page d'article
 * sur le HTML rendu par Astro (`entry.rendered.html`, cf. `renderNews()` dans
 * `src/lib/news.ts`). Aussi appliqué aux pages de contenu `.md` (publiables
 * depuis le module « Pages », cf. `pageParts()` dans `src/lib/content-pages.ts`)
 * et au texte de leurs blocs. Le moteur Markdown du site n'est pas modifié ;
 * les activités et les pages `.mdx` (code) sont rendues telles quelles.
 *
 * Le HTML est AUTORISÉ dans une actualité (tableaux, div, span, classes,
 * styles, images, détails/résumé…) : seul le code exécutable est retiré —
 * `<script>`, `<style>`, attributs `on…=`, liens `javascript:`… Sans cela, un
 * compte rédacteur pourrait faire exécuter du code chez les admins qui lisent
 * l'article (même site que l'espace bénévoles).
 *
 * Les `<iframe>` sont acceptées pour les sources de `IFRAME_HOSTS` seulement.
 */

import type { Element, Root } from 'hast';
import { fromHtml } from 'hast-util-from-html';
import { defaultSchema, sanitize, type Schema } from 'hast-util-sanitize';
import { toHtml } from 'hast-util-to-html';

/** Hôtes acceptés pour une `<iframe>` (vidéo, carte). Un sous-domaine compte (www.youtube.com). */
export const IFRAME_HOSTS = [
	'youtube.com',
	'youtube-nocookie.com',
	'player.vimeo.com',
	'framatube.org',
	'peertube.fr',
	'openstreetmap.org',
	'umap.openstreetmap.fr',
];

const common = ['className', 'style', 'id', 'title', 'lang', 'dir', 'align', 'role', 'ariaLabel', 'ariaHidden'];

const schema: Schema = {
	...defaultSchema,
	// Garder les `id` tels quels (ancres, sommaire) : pas de préfixe « user-content- ».
	clobberPrefix: '',
	clobber: [],
	// Balises supprimées AVEC leur contenu (sinon le code s'afficherait en texte).
	strip: ['script', 'style', 'noscript', 'template'],
	tagNames: [
		...(defaultSchema.tagNames ?? []),
		'div', 'span', 'section', 'figure', 'figcaption', 'mark', 'u', 'small', 'abbr', 'cite',
		'caption', 'colgroup', 'col', 'iframe', 'video', 'audio', 'source', 'picture',
	],
	attributes: {
		...defaultSchema.attributes,
		'*': [...(defaultSchema.attributes?.['*'] ?? []), ...common],
		a: [...(defaultSchema.attributes?.a ?? []), 'target', 'rel'],
		img: [...(defaultSchema.attributes?.img ?? []), 'loading', 'decoding'],
		iframe: ['src', 'width', 'height', 'allow', 'allowFullScreen', 'loading', 'referrerPolicy', 'frameBorder'],
		video: ['src', 'controls', 'poster', 'width', 'height', 'preload', 'muted', 'loop', 'playsInline'],
		audio: ['src', 'controls', 'preload', 'loop'],
		source: ['src', 'type', 'srcSet', 'media'],
		col: ['span', 'width'],
		colgroup: ['span'],
		td: [...(defaultSchema.attributes?.td ?? []), 'colSpan', 'rowSpan'],
		th: [...(defaultSchema.attributes?.th ?? []), 'colSpan', 'rowSpan', 'scope'],
	},
	protocols: {
		...defaultSchema.protocols,
		href: ['http', 'https', 'mailto', 'tel'],
		src: ['http', 'https'],
		poster: ['http', 'https'],
	},
};

function allowedIframe(src: unknown): boolean {
	try {
		const { protocol, hostname } = new URL(String(src));
		return protocol === 'https:' && IFRAME_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
	} catch {
		return false;
	}
}

/** Retire les `<iframe>` dont la source n'est pas dans `IFRAME_HOSTS`. */
function dropForeignIframes(node: Root | Element): void {
	node.children = node.children.filter(
		(child) => !(child.type === 'element' && child.tagName === 'iframe' && !allowedIframe(child.properties?.src)),
	) as typeof node.children;
	for (const child of node.children) if (child.type === 'element') dropForeignIframes(child);
}

/** HTML d'une actualité, débarrassé de tout code exécutable. */
export function sanitizeNewsHtml(html: string): string {
	const clean = sanitize(fromHtml(html, { fragment: true }), schema) as Root;
	dropForeignIframes(clean);
	return toHtml(clean);
}
