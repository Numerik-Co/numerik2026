/**
 * Factures (`POST { action, id?, facture?, paiement? }`) :
 *  - `enregistrer` : création ou modification d'un **brouillon** ;
 *  - `emettre` : numéro définitif, date du jour, échéance ; plus modifiable ;
 *  - `paiement` : payée (date, mode) ou non ;
 *  - `supprimer` : brouillon seulement.
 */
import type { APIRoute } from 'astro';
import { json, jsonError, readJson } from '../../../../lib/auth/api';
import { logEvent } from '../../../../lib/journal';
import { emettreFacture, enregistrerFacture, enregistrerPaiement, lireFacture, supprimerFacture } from '../../lib/documents';
import { traiter } from './erreurs';

export const prerender = false;

export const POST: APIRoute = ({ request, locals }) =>
	traiter('api/admin/facturation/factures', async () => {
		const b = (await readJson(request)) ?? {};
		const id = typeof b.id === 'number' && b.id > 0 ? b.id : null;
		const journal = (label: string, message: string) => logEvent({ by: locals.user!, action: 'facturation', label, message });
		switch (b.action) {
			case 'enregistrer': {
				const factureId = await enregistrerFacture(id, lireFacture(b.facture));
				await journal(`Facture brouillon ${factureId}`, id ? 'modifiée' : 'créée');
				return json({ ok: true, id: factureId });
			}
			case 'emettre': {
				if (!id) return jsonError('Facture manquante.');
				const numero = await emettreFacture(id);
				await journal(`Facture ${numero}`, 'émise');
				return json({ ok: true, numero });
			}
			case 'paiement':
				if (!id) return jsonError('Facture manquante.');
				await enregistrerPaiement(id, b.paiement);
				await journal(`Facture ${id}`, (b.paiement as { paye?: boolean })?.paye ? 'payée' : 'paiement retiré');
				return json({ ok: true });
			case 'supprimer':
				if (!id) return jsonError('Facture manquante.');
				await supprimerFacture(id);
				await journal(`Facture brouillon ${id}`, 'supprimée');
				return json({ ok: true });
			default:
				return jsonError('Action inconnue.');
		}
	});
