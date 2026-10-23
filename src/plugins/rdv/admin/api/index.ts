import type { APIRoute } from 'astro';
import { json, withErrors } from '../../../../lib/auth/api';
import { GristError } from '../../lib/grist';
import { fetchCreneauxDisponibles } from '../../lib/creneaux';
import { listerRdv } from '../gestion';

export const prerender = false;

/**
 * Module « Rendez-vous » (bureau et animateur·rice·s, garde dans
 * `src/middleware.ts`) : tous les RDV avec la fiche du bénéficiaire, les
 * démarches, les statuts, et les créneaux de la fenêtre de réservation
 * (urgences comprises) pour déplacer un RDV.
 */
export const GET: APIRoute = withErrors(async () => {
	try {
		const [liste, creneaux] = await Promise.all([listerRdv(), fetchCreneauxDisponibles(true)]);
		return json({ ...liste, creneaux });
	} catch (err) {
		if (err instanceof GristError) {
			console.error('[api/admin/rdv]', err);
			return json({ error: 'Grist injoignable : impossible de charger les rendez-vous.' }, err.status);
		}
		throw err;
	}
});
