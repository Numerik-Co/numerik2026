/**
 * Petit texte Markdown → HTML nettoyé, pour les champs `markdown` des blocs
 * de page (`src/lib/blocs.ts`) : gras, italique, liens, listes. Même
 * nettoyage que le texte des actualités et des pages (`sanitize-news.ts`).
 *
 * Rendu au build (pages prérendues) ou à la demande (pages réservées).
 */

import type { Nodes, Text } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import { applyPageVariables } from './page-variables';
import { sanitizeNewsHtml } from './sanitize-news';

/** Apostrophes typographiques, comme le moteur Markdown du site pour le texte des pages. */
export function typographie(text: string): string {
	return text.replace(/'/g, '’');
}

export function renderMarkdownFragment(markdown: string): string {
	const tree = fromMarkdown(markdown.replace(/\r\n?/g, '\n'));
	visitText(tree, (node) => (node.value = typographie(node.value)));
	const hast = toHast(tree, { allowDangerousHtml: false });
	return applyPageVariables(sanitizeNewsHtml(toHtml(hast)));
}

function visitText(node: Nodes, fn: (node: Text) => void): void {
	if (node.type === 'text') fn(node);
	if ('children' in node) for (const child of node.children) visitText(child as Nodes, fn);
}
