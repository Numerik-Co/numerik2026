import type { APIRoute } from 'astro';
import { json } from '../../../lib/adhesion/http';
import type { CommuneSuggestion } from '../../../lib/rdv/types';

export const prerender = false;

// API Adresse (Base Adresse Nationale) — service public, sans clé.
// `type=municipality` (contrairement à /api/adhesion/adresse, en `housenumber`
// pour une adresse postale complète) : ici on ne veut que la commune.
const BAN = 'https://api-adresse.data.gouv.fr/search/';

/** Autocomplétion de commune (nom ou code postal) : renvoie commune + code postal. */
export const GET: APIRoute = async ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').trim();
	if (q.length < 2) return json([]);

	try {
		const res = await fetch(`${BAN}?q=${encodeURIComponent(q)}&limit=8&type=municipality&autocomplete=1`);
		if (!res.ok) return json({ error: 'Service adresse indisponible.' }, 502);

		const data = (await res.json()) as {
			features: { properties: Record<string, unknown> }[];
		};
		const suggestions: CommuneSuggestion[] = (data.features ?? []).map((f) => {
			const p = f.properties;
			return {
				commune: String(p.city ?? p.name ?? ''),
				codePostal: String(p.postcode ?? ''),
				label: String(p.label ?? ''),
			};
		});
		return json(suggestions);
	} catch (err) {
		console.error('[api/rdv/commune]', err);
		return json({ error: 'Service adresse indisponible.' }, 502);
	}
};
