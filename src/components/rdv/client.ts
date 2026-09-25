/** Fines enveloppes typées autour des routes /api/rdv/*. */
import type { BeneficiaireRecherche, Creneau, CommuneSuggestion, Demarche, PriseRdvPayload, PriseRdvResult } from '../../lib/rdv/types';

async function get<T>(url: string): Promise<T> {
	const res = await fetch(url);
	const data = await res.json().catch(() => null);
	if (!res.ok) {
		throw new Error((data && data.error) || `Erreur ${res.status}`);
	}
	return data as T;
}

async function post<T>(url: string, body: unknown): Promise<T> {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	const data = await res.json().catch(() => null);
	if (!res.ok) {
		throw new Error((data && data.error) || `Erreur ${res.status}`);
	}
	return data as T;
}

export const rdvApi = {
	creneaux: () => get<Creneau[]>('/api/rdv/creneaux'),
	demarches: () => get<Demarche[]>('/api/rdv/demarches'),
	communes: (q: string) => get<CommuneSuggestion[]>(`/api/rdv/commune?q=${encodeURIComponent(q)}`),
	beneficiaires: (prenom: string, nom: string) =>
		get<BeneficiaireRecherche[]>(
			`/api/rdv/beneficiaires?prenom=${encodeURIComponent(prenom)}&nom=${encodeURIComponent(nom)}`,
		),
	prendre: (payload: PriseRdvPayload) => post<PriseRdvResult>('/api/rdv/prendre', payload),
};
