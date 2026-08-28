/** Petits utilitaires partagés par les routes API d'adhésion. */

export function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

/** Normalise pour comparaison : minuscules, sans accents, espaces compactés. */
export function normalize(value: string): string {
	return value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

export function isNonEmptyString(v: unknown): v is string {
	return typeof v === 'string' && v.trim() !== '';
}

export function toNumberOrNull(v: unknown): number | null {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
	return null;
}
