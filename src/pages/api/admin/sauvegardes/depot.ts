/**
 * Dépôt d'une archive de sauvegarde venue d'ailleurs (bureau) :
 *  - POST : corps = fichier ZIP brut, nom d'origine dans l'en-tête
 *           `X-Nom-Fichier` (encodé URI) → contrôlé puis rangé dans
 *           `<DATA_DIR>/sauvegardes/`. Rien n'est restauré ici.
 * Route statique : prioritaire sur `[nom].ts` (un nom d'archive finit par `.zip`).
 */
import type { APIRoute } from 'astro';
import { json, jsonError, withErrors } from '../../../../lib/auth/api';
import { dataDir } from '../../../../lib/data-dir';
import { logEvent } from '../../../../lib/journal';
import { deposerSauvegarde, TAILLE_MAX } from '../../../../../scripts/sauvegarde.mjs';

export const prerender = false;

export const POST: APIRoute = withErrors(async ({ request, locals }) => {
	if (Number(request.headers.get('content-length') ?? 0) > TAILLE_MAX) return jsonError('Archive trop volumineuse.', 413);
	const zip = new Uint8Array(await request.arrayBuffer());
	if (!zip.length) return jsonError('Fichier vide.');
	let nomPropose = '';
	try {
		nomPropose = decodeURIComponent(request.headers.get('x-nom-fichier') ?? '');
	} catch {
		/* nom illisible : nom horodaté */
	}
	let result;
	try {
		result = await deposerSauvegarde(zip, nomPropose, dataDir());
	} catch (err) {
		return jsonError((err as Error).message, 422);
	}
	await logEvent({ by: locals.user!, action: 'sauvegarde.depot', label: result.nom });
	return json({ ok: true, nom: result.nom });
});
