/**
 * Fines enveloppes typées autour des routes /api/presence/*.
 * La recherche de membre réutilise /api/adhesion/membres (déjà public).
 */
import type { PresencePayload, PresenceResult, SeanceCourante } from '../../lib/adhesion/types';

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

export const presenceApi = {
	seances: (membreId: number) =>
		get<SeanceCourante[]>(`/api/presence/seances?membreId=${membreId}`),
	inscrire: (payload: PresencePayload) => post<PresenceResult>('/api/presence/inscrire', payload),
};
