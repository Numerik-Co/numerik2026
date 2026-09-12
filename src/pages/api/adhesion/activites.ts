import type { APIRoute } from 'astro';
import {
	COLS,
	currentSaisonId,
	GristError,
	listRecords,
	TABLES,
	TYPE_ACTIVITE_ATELIERS,
} from '../../../lib/adhesion/grist';
import { json, toNumberOrNull } from '../../../lib/adhesion/http';
import type { ActiviteOption } from '../../../lib/adhesion/types';

export const prerender = false;

/**
 * Étape 3 : activités de type « Ateliers » de la saison en cours + places
 * restantes, pour le select. Le formulaire d'inscription en ligne ne propose
 * que ce type d'activité (les autres types se gèrent hors ligne).
 */
export const GET: APIRoute = async () => {
	try {
		const saisonId = await currentSaisonId();
		const records = await listRecords(TABLES.activites, {
			[COLS.activite.saison]: [saisonId],
			[COLS.activite.type]: [TYPE_ACTIVITE_ATELIERS],
		});

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
