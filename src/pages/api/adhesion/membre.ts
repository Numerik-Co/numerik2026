import type { APIRoute } from 'astro';
import { COLS, createRecord, GristError, listRecords, TABLES } from '../../../lib/adhesion/grist';
import { membreFieldsForGrist, readGenre, validateMembrePayload } from '../../../lib/adhesion/membre-fields';
import { isNonEmptyString, json, normalize } from '../../../lib/adhesion/http';
import type { MembreCandidat, MembreResult } from '../../../lib/adhesion/types';

export const prerender = false;

async function creerMembre(data: Record<string, unknown>): Promise<MembreResult | null> {
	const payload = validateMembrePayload(data);
	if (!payload) return null;
	const membreId = await createRecord(TABLES.membres, membreFieldsForGrist(payload));
	return { status: 'ok', membreId, prenom: payload.prenom, nom: payload.nom, genre: payload.genre };
}

async function retrouverMembre(nom: string, prenom: string): Promise<MembreResult> {
	const c = COLS.membre;
	const cibleNom = normalize(nom);
	const ciblePrenom = normalize(prenom);

	const records = await listRecords(TABLES.membres);
	const matches = records.filter(
		(r) =>
			normalize(String(r.fields[c.nom] ?? '')) === cibleNom &&
			normalize(String(r.fields[c.prenom] ?? '')) === ciblePrenom,
	);

	if (matches.length === 0) return { status: 'introuvable' };
	if (matches.length === 1) {
		const m = matches[0];
		return {
			status: 'ok',
			membreId: m.id,
			prenom: String(m.fields[c.prenom] ?? prenom),
			nom: String(m.fields[c.nom] ?? nom),
			genre: readGenre(m.fields[c.genre]),
		};
	}

	const candidats: MembreCandidat[] = matches.map((m) => {
		const ddn = Number(m.fields[c.dateNaissance]);
		const annee = Number.isFinite(ddn) ? new Date(ddn * 1000).getUTCFullYear() : null;
		const ville = String(m.fields[c.commune] ?? '').trim();
		const indice =
			[annee ? `né·e en ${String(annee).slice(0, 2)}••` : '', ville].filter(Boolean).join(' · ') ||
			'plusieurs fiches à ce nom';
		return {
			membreId: m.id,
			prenom: String(m.fields[c.prenom] ?? prenom),
			nom: String(m.fields[c.nom] ?? nom),
			genre: readGenre(m.fields[c.genre]),
			indice,
		};
	});
	return { status: 'ambigu', candidats };
}

/** Étape 1 — création (nouveau) ou rapprochement (renouvellement) du membre. */
export const POST: APIRoute = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return json({ error: 'Requête invalide.' }, 400);
	}
	const data = body as Record<string, unknown>;
	const mode = data.mode === 'renouvellement' ? 'renouvellement' : 'nouveau';

	try {
		if (mode === 'renouvellement') {
			if (!isNonEmptyString(data.nom) || !isNonEmptyString(data.prenom)) {
				return json({ error: 'Nom et prénom requis.' }, 400);
			}
			return json(await retrouverMembre(data.nom, data.prenom));
		}

		const res = await creerMembre(data);
		if (!res) return json({ error: 'Champs manquants ou invalides.' }, 400);
		return json(res);
	} catch (err) {
		const status = err instanceof GristError ? err.status : 500;
		console.error('[api/adhesion/membre]', err);
		return json({ error: "Échec de l'enregistrement du membre." }, status);
	}
};
