/**
 * Fichier `.md` d'une actualité (navigateur) : téléchargé depuis le
 * formulaire en modification, puis rechargé pour le remplir (`EditFileBar`).
 * Mêmes clés que le dépôt d'une actualité (cf. docs/actualites.md,
 * src/lib/news-writer.ts) ; l'adresse et la photo restent dans le
 * formulaire. Le serveur revalide tout à l'enregistrement.
 */
import type { NewsFields } from '../../client';
import { buildMarkdownFile, keyWarnings, parseMarkdownFile, textField } from '../../markdown-file';

type NewsFile = NewsFields & { body: string };

const KNOWN = ['title', 'publishAt', 'excerpt', 'isPublish', 'tag', 'author', 'imageCredit'];
const IGNORED: Record<string, string | null> = { cover: "la photo se change dans l'onglet « Image »" };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function newsMarkdownFile(n: NewsFile): string {
	return buildMarkdownFile(
		{
			title: n.title,
			publishAt: n.publishAt,
			excerpt: n.excerpt,
			isPublish: n.isPublish,
			tag: n.tag,
			author: n.author,
			imageCredit: n.imageCredit,
		},
		n.body,
	);
}

/** Lit un fichier chargé ; date illisible = remarque, date du formulaire gardée (`publishAt` vide). */
export function parseNewsMarkdown(source: string): { fields?: NewsFile; warnings: string[]; error?: string } {
	const { data, body, error } = parseMarkdownFile(source);
	if (!data) return { warnings: [], error };
	const warnings = keyWarnings(data, KNOWN, IGNORED);
	const publishAt = textField(data.publishAt);
	if (!DATE.test(publishAt)) warnings.push('Date de publication absente ou illisible (attendu : AAAA-MM-JJ) : date actuelle gardée.');
	return {
		fields: {
			title: textField(data.title),
			publishAt: DATE.test(publishAt) ? publishAt : '',
			excerpt: textField(data.excerpt),
			isPublish: data.isPublish !== false,
			tag: textField(data.tag),
			author: textField(data.author),
			imageCredit: textField(data.imageCredit),
			body,
		},
		warnings,
	};
}
