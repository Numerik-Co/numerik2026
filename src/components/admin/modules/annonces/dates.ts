/** Dates des annonces (module « Annonces ») : jours `AAAA-MM-JJ` à l'heure locale du navigateur. */

export function isoDay(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** « 2026-08-20 » → « 20/08/2026 ». */
export function frenchDay(day: string): string {
	const [y, m, d] = day.split('-');
	return `${d}/${m}/${y}`;
}

export type AnnonceState = 'brouillon' | 'a-venir' | 'en-cours' | 'terminee';

/** Où en est l'annonce aujourd'hui (même règle que `AnnonceBanner.astro`). */
export function annonceState(a: { active: boolean; startDate: string; endDate: string }, today = isoDay(new Date())): AnnonceState {
	if (!a.active) return 'brouillon';
	if (today < a.startDate) return 'a-venir';
	if (today > a.endDate) return 'terminee';
	return 'en-cours';
}
