/**
 * Fines enveloppes typées autour des routes /api/adhesion/*.
 * Côté navigateur : on ne parle jamais à Grist directement (cf. docs/api.md).
 */
import type {
	ActiviteOption,
	ActivitePayload,
	AdhesionResult,
	AdresseSuggestion,
	CoMembrePayload,
	CoMembreResult,
	ContactPayload,
	CotisationOption,
	CotisationPayload,
	DetacherMembrePayload,
	InscriptionResult,
	MembrePayload,
	MembreRecherche,
	MembreResult,
	RenouvellementPayload,
	RenouvPreferencesPayload,
} from '../../lib/adhesion/types';

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

async function get<T>(url: string): Promise<T> {
	const res = await fetch(url);
	const data = await res.json().catch(() => null);
	if (!res.ok) {
		throw new Error((data && data.error) || `Erreur ${res.status}`);
	}
	return data as T;
}

export const adhesionApi = {
	cotisations: () => get<CotisationOption[]>('/api/adhesion/cotisations'),
	activites: () => get<ActiviteOption[]>('/api/adhesion/activites'),

	creerMembre: (payload: MembrePayload) =>
		post<MembreResult>('/api/adhesion/membre', { mode: 'nouveau', ...payload }),

	retrouverMembre: (payload: RenouvellementPayload) =>
		post<MembreResult>('/api/adhesion/membre', { mode: 'renouvellement', ...payload }),

	majPreferences: (payload: RenouvPreferencesPayload) =>
		post<{ ok: true }>('/api/adhesion/preferences', payload),

	inscrireContact: (payload: ContactPayload) =>
		post<{ membreId: number }>('/api/adhesion/contact', payload),

	ajouterCoMembre: (payload: CoMembrePayload) =>
		post<CoMembreResult>('/api/adhesion/co-membre', payload),

	detacherMembre: (payload: DetacherMembrePayload) =>
		post<{ ok: true }>('/api/adhesion/detacher-membre', payload),

	rechercherMembres: (q: string) =>
		get<MembreRecherche[]>(`/api/adhesion/membres?q=${encodeURIComponent(q)}`),

	chercherAdresse: (q: string) =>
		get<AdresseSuggestion[]>(`/api/adhesion/adresse?q=${encodeURIComponent(q)}`),

	enregistrerCotisation: (payload: CotisationPayload) =>
		post<AdhesionResult>('/api/adhesion/cotisation', payload),

	enregistrerActivite: (payload: ActivitePayload) =>
		post<InscriptionResult>('/api/adhesion/inscription', payload),
};
