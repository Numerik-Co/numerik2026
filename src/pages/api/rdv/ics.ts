import type { APIRoute } from 'astro';
import { lieuPourDate } from '../../../lib/rdv/creneaux';
import { demarchesParIds } from '../../../lib/rdv/demarches';
import { evenementRdv, fichierIcs } from '../../../lib/rdv/ics';

export const prerender = false;

/**
 * Fichier .ics d'un RDV, pour le bouton « Ajouter à mon agenda » de
 * `RdvForm.vue`. Servi en `text/calendar` : iOS l'ouvre directement dans
 * Calendrier, Android le propose à l'appli agenda.
 *
 * Seuls `date`, `heure` et `demarche` (ids, répétable) sont acceptés : lieu et
 * documents sont recalculés côté serveur, pour qu'on ne puisse pas faire
 * servir par le site un événement au texte arbitraire.
 */
export const GET: APIRoute = async ({ url }) => {
	const date = url.searchParams.get('date') ?? '';
	const heure = url.searchParams.get('heure') ?? '';
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[03]0$/.test(heure)) {
		return new Response('Paramètres invalides.', { status: 400 });
	}

	const lieu = lieuPourDate(date);
	if (lieu === null) return new Response('Aucune permanence ce jour-là.', { status: 404 });

	const ids = url.searchParams
		.getAll('demarche')
		.map(Number)
		.filter((id) => Number.isInteger(id) && id > 0);

	// Grist injoignable : le fichier reste utile sans le nom de la démarche ni les documents.
	const demarches = ids.length
		? await demarchesParIds(ids).catch((err) => {
				console.error('[api/rdv/ics]', err);
				return [];
			})
		: [];

	return new Response(fichierIcs(evenementRdv(date, heure, lieu, demarches)), {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': 'inline; filename="rdv-conseiller-numerique.ics"',
			'Cache-Control': 'no-store',
		},
	});
};
