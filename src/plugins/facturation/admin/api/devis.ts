/**
 * Devis (`POST { action, id?, devis? }`) :
 *  - `enregistrer` : création ou modification (numéro donné à la première
 *    sortie du statut « Demande ») ;
 *  - `supprimer` : sauf accepté ou facturé ;
 *  - `facturer` : facture brouillon créée depuis le devis (→ « Accepté »).
 */
import type { APIRoute } from 'astro';
import { json, jsonError, readJson } from '../../../../lib/auth/api';
import { logEvent } from '../../../../lib/journal';
import { enregistrerDevis, facturerDevis, lireDevis, supprimerDevis } from '../../lib/documents';
import { traiter } from './erreurs';

export const prerender = false;

export const POST: APIRoute = ({ request, locals }) =>
	traiter('api/admin/facturation/devis', async () => {
		const b = (await readJson(request)) ?? {};
		const id = typeof b.id === 'number' && b.id > 0 ? b.id : null;
		const journal = (message: string) => logEvent({ by: locals.user!, action: 'facturation', label: `Devis ${id ?? ''}`.trim(), message });
		switch (b.action) {
			case 'enregistrer': {
				const devisId = await enregistrerDevis(id, lireDevis(b.devis));
				await journal(id ? 'devis modifié' : 'devis créé');
				return json({ ok: true, id: devisId });
			}
			case 'supprimer':
				if (!id) return jsonError('Devis manquant.');
				await supprimerDevis(id);
				await journal('devis supprimé');
				return json({ ok: true });
			case 'facturer': {
				if (!id) return jsonError('Devis manquant.');
				const factureId = await facturerDevis(id);
				await journal('facture brouillon créée depuis le devis');
				return json({ ok: true, factureId });
			}
			default:
				return jsonError('Action inconnue.');
		}
	});
