/** Création (`{ client }`) ou modification (`{ id, client }`) d'un client (`POST`). */
import type { APIRoute } from 'astro';
import { json, readJson } from '../../../../lib/auth/api';
import { logEvent } from '../../../../lib/journal';
import { enregistrerClient, lireClient } from '../../lib/documents';
import { traiter } from './erreurs';

export const prerender = false;

export const POST: APIRoute = ({ request, locals }) =>
	traiter('api/admin/facturation/clients', async () => {
		const b = (await readJson(request)) ?? {};
		const id = typeof b.id === 'number' && b.id > 0 ? b.id : null;
		const client = lireClient(b.client);
		const nouveau = await enregistrerClient(id, client);
		await logEvent({ by: locals.user!, action: 'facturation', label: client.nom, message: id ? 'client modifié' : 'client créé' });
		return json({ ok: true, id: nouveau });
	});
