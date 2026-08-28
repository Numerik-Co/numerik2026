import type { APIRoute } from 'astro';
import {
	COLS,
	createRecord,
	GristError,
	listRecords,
	parseRefList,
	refList,
	TABLES,
	updateRecord,
} from '../../../lib/adhesion/grist';
import { membreFieldsForGrist, validateMembrePayload } from '../../../lib/adhesion/membre-fields';
import { json } from '../../../lib/adhesion/http';

export const prerender = false;

/** Ajoute un id à une RefList si absent, puis renvoie le tableau. */
function withId(ids: number[], id: number): number[] {
	return ids.includes(id) ? ids : [...ids, id];
}

/**
 * Rattache un membre (nouveau OU existant) à une adhésion multiple.
 * - crée l'enregistrement Membres si `membreExistantId` absent
 * - l'ajoute à Adhesions.Membres et à Membres[responsable].Responsable_de
 */
export const POST: APIRoute = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return json({ error: 'Requête invalide.' }, 400);
	}
	const data = body as Record<string, unknown>;
	const { responsableId, adhesionId, membreExistantId } = data;
	if (typeof responsableId !== 'number' || typeof adhesionId !== 'number') {
		return json({ error: 'responsableId et adhesionId requis.' }, 400);
	}

	let nouveauId: number;
	let prenom: string;
	let nom: string;

	try {
		if (typeof membreExistantId === 'number') {
			if (membreExistantId === responsableId) {
				return json({ error: 'Ce membre est déjà le responsable de l’adhésion.' }, 400);
			}
			const fiches = await listRecords(TABLES.membres, { id: [membreExistantId] });
			if (!fiches[0]) return json({ error: 'Membre introuvable.' }, 400);
			nouveauId = membreExistantId;
			prenom = String(fiches[0].fields[COLS.membre.prenom] ?? '').trim();
			nom = String(fiches[0].fields[COLS.membre.nom] ?? '').trim();
		} else {
			const payload = validateMembrePayload(data);
			if (!payload) return json({ error: 'Champs manquants ou invalides.' }, 400);
			nouveauId = await createRecord(TABLES.membres, membreFieldsForGrist(payload));
			prenom = payload.prenom;
			nom = payload.nom;
		}

		const adhesions = await listRecords(TABLES.adhesions, { id: [adhesionId] });
		const membresActuels = parseRefList(adhesions[0]?.fields[COLS.adhesion.membres]);
		await updateRecord(TABLES.adhesions, adhesionId, {
			[COLS.adhesion.membres]: refList(...withId(membresActuels, nouveauId)),
		});

		const responsables = await listRecords(TABLES.membres, { id: [responsableId] });
		const rattachesActuels = parseRefList(responsables[0]?.fields[COLS.membre.responsableDe]);
		await updateRecord(TABLES.membres, responsableId, {
			[COLS.membre.responsableDe]: refList(...withId(rattachesActuels, nouveauId)),
		});

		return json({ membreId: nouveauId, prenom, nom });
	} catch (err) {
		const status = err instanceof GristError ? err.status : 500;
		console.error('[api/adhesion/co-membre]', err);
		return json({ error: "Échec de l'ajout du membre." }, status);
	}
};
