import type { APIRoute } from 'astro';
import {
	COLS,
	currentSaisonId,
	GristError,
	listRecords,
	TABLES,
} from '../../../lib/adhesion/grist';
import { json, toNumberOrNull } from '../../../lib/adhesion/http';
import type { ActiviteOption } from '../../../lib/adhesion/types';

export const prerender = false;

/** Étape 3 : activités de la saison en cours + places restantes, pour le select. */
export const GET: APIRoute = async () => {
	try {
		const saisonId = await currentSaisonId();
		const records = await listRecords(TABLES.activites, { [COLS.activite.saison]: [saisonId] });

		const options: ActiviteOption[] = records.map((r) => ({
			id: r.id,
			label: String(r.fields[COLS.activite.nom] ?? `Activité ${r.id}`),
			prix:
				r.fields[COLS.activite.payant] === false
					? 0
					: toNumberOrNull(r.fields[COLS.activite.prix]),
			placesRestantes: toNumberOrNull(r.fields[COLS.activite.placesRestantes]),
		}));

		return json(options);
	} catch (err) {
		const status = err instanceof GristError ? err.status : 500;
		console.error('[api/adhesion/activites]', err);
		return json({ error: 'Impossible de charger les activités.' }, status);
	}
};
