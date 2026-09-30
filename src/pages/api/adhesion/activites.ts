import type { APIRoute } from 'astro';
import {
	COLS,
	currentSaisonId,
	GristError,
	listRecords,
	TABLES,
	TYPES_ACTIVITE_ADHESION,
} from '../../../lib/adhesion/grist';
import { toActiviteOption } from '../../../lib/adhesion/activite-option';
import { json } from '../../../lib/adhesion/http';
import type { ActiviteOption } from '../../../lib/adhesion/types';

export const prerender = false;

/**
 * Étape 3 : activités de type Séances/Modules, publiées (`Publiee = true`)
 * et de la saison en cours, + places restantes, pour le select. Les autres
 * types (ex. ateliers Conseiller Numérique) et les lignes non publiées se
 * gèrent hors de ce formulaire.
 */
export const GET: APIRoute = async () => {
	try {
		const saisonId = await currentSaisonId();
		const records = await listRecords(TABLES.activites, {
			[COLS.activite.saison]: [saisonId],
			[COLS.activite.publiee]: [true],
			[COLS.activite.type]: [...TYPES_ACTIVITE_ADHESION],
		});

		const options: ActiviteOption[] = records.map(toActiviteOption);

		return json(options);
	} catch (err) {
		const status = err instanceof GristError ? err.status : 500;
		console.error('[api/adhesion/activites]', err);
		return json({ error: 'Impossible de charger les activités.' }, status);
	}
};
