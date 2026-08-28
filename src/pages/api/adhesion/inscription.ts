import type { APIRoute } from 'astro';
import {
	COLS,
	createRecord,
	DISPO_ATTENTE,
	DISPO_INSCRIT,
	GristError,
	listRecords,
	TABLES,
} from '../../../lib/adhesion/grist';
import { json, toNumberOrNull } from '../../../lib/adhesion/http';
import type { InscriptionResult } from '../../../lib/adhesion/types';

export const prerender = false;

/**
 * Étape 3 — inscrit le membre à une activité (table Inscription).
 * `Saison` est une colonne formule → calculée par Grist. Si plus de place,
 * l'inscription est créée en « Liste d'attente ».
 */
export const POST: APIRoute = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return json({ error: 'Requête invalide.' }, 400);
	}
	const { membreId, activiteId } = body as Record<string, unknown>;
	if (typeof membreId !== 'number' || typeof activiteId !== 'number') {
		return json({ error: 'membreId et activiteId requis.' }, 400);
	}

	try {
		const activites = await listRecords(TABLES.activites, { id: [activiteId] });
		const activite = activites.find((a) => a.id === activiteId);
		if (!activite) {
			return json({ error: 'Activité inconnue.' }, 400);
		}

		const places = toNumberOrNull(activite.fields[COLS.activite.placesRestantes]);
		const disponibilite = places !== null && places <= 0 ? DISPO_ATTENTE : DISPO_INSCRIT;

		const payant = activite.fields[COLS.activite.payant] !== false;
		const montant = payant ? (toNumberOrNull(activite.fields[COLS.activite.prix]) ?? 0) : 0;

		const i = COLS.inscription;
		const inscriptionId = await createRecord(TABLES.inscriptions, {
			[i.membre]: membreId,
			[i.activite]: activiteId,
			[i.dateInscription]: Math.floor(Date.now() / 1000),
			[i.montantDu]: montant,
			[i.disponibilite]: disponibilite,
		});

		const result: InscriptionResult = { inscriptionId, disponibilite };
		return json(result);
	} catch (err) {
		const status = err instanceof GristError ? err.status : 500;
		console.error('[api/adhesion/inscription]', err);
		return json({ error: "Échec de l'inscription à l'activité." }, status);
	}
};
