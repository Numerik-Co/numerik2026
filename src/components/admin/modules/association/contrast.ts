/**
 * Contraste du texte blanc sur une couleur du thème (WCAG 2.1) : boutons,
 * pied de page et bouton « Adhérer » écrivent en blanc sur `primary`,
 * `secondary` et `accent`.
 */

/** `#28c` → `#2288cc`. */
export function fullHex(hex: string): string {
	return hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
}

function luminance(hex: string): number {
	const n = parseInt(fullHex(hex).slice(1), 16);
	const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
		const c = v / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste du blanc sur `hex` (1 à 21). */
export function contrastWithWhite(hex: string): number {
	return 1.05 / (luminance(hex) + 0.05);
}

/** Niveau : `bon` (≥ 4,5 : tout texte), `moyen` (≥ 3 : gros texte seulement), `faible`. */
export function contrastLevel(ratio: number): 'bon' | 'moyen' | 'faible' {
	return ratio >= 4.5 ? 'bon' : ratio >= 3 ? 'moyen' : 'faible';
}
