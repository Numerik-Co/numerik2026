import type { APIRoute } from 'astro';
import { json, withErrors } from '../../../lib/auth/api';
import { journalYears, readJournal } from '../../../lib/journal';

export const prerender = false;

/**
 * Journal des modifications (groupe `superadmin` seul, garde dans
 * `src/middleware.ts`) : `?annee=AAAA` (défaut : la plus récente), du plus
 * récent au plus ancien.
 */
export const GET: APIRoute = withErrors(async ({ url }) => {
	const years = await journalYears();
	const asked = url.searchParams.get('annee') ?? '';
	const year = years.includes(asked) ? asked : (years[0] ?? String(new Date().getFullYear()));
	return json({ years, year, entries: await readJournal(year) });
});
