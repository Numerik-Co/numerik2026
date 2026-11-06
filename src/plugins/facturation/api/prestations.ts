/** Prestations proposées dans la demande de devis publique (`GET`, table `Prestations` active). */
import type { APIRoute } from 'astro';
import { json } from '../../../lib/http';
import { listerPrestations } from '../lib/documents';
import { GristError } from '../lib/grist';

export const prerender = false;

export const GET: APIRoute = async () => {
	try {
		const prestations = (await listerPrestations()).map(({ id, libelle, description }) => ({ id, libelle, description }));
		return json({ prestations }, 200);
	} catch (err) {
		if (err instanceof GristError) {
			console.error('[api/facturation/prestations]', err);
			return json({ prestations: [] }, 200);
		}
		throw err;
	}
};
