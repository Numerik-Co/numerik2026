/**
 * Filtre des adresses saisies depuis l'espace bénévoles (liens Markdown des
 * actualités et des pages, champs « lien » des blocs).
 *
 * Module sans dépendance à Astro : aussi utilisé par `src/content.config.ts`.
 */

const SAFE_SCHEMES = ['http', 'https', 'mailto', 'tel'];

/**
 * URL acceptée : `http(s):`, `mailto:`, `tel:`, ou chemin du site / ancre.
 * Les blancs et caractères de contrôle sont retirés avant le test, comme le
 * font les navigateurs (`java\tscript:` = `javascript:`).
 */
export function isSafeUrl(url: string): boolean {
	const compact = url.replace(/[\u0000- \u007f]/g, '');
	const scheme = compact.match(/^([a-z][a-z0-9+.-]*):/i);
	if (scheme) return SAFE_SCHEMES.includes(scheme[1].toLowerCase());
	return !compact.startsWith('//') && !compact.startsWith('\\');
}
