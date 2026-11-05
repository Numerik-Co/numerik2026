/**
 * Mise en forme Markdown « en ligne » pour les textes courts saisis dans
 * l'Espace Admin ou les fichiers YAML (accroche du bandeau, avantages des
 * partenaires…) : `**gras**` et `*italique*` seulement, tout le reste est
 * échappé. Résultat à rendre avec `set:html`.
 */

function escapeHtml(t: string): string {
	return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function inlineMarkdownHtml(text: string): string {
	return escapeHtml(text)
		.replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(?=\S)(.+?)(?<=\S)\*/g, '<em>$1</em>');
}
