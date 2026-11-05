/**
 * Restauration d'une sauvegarde (super admin seul, garde dans `src/middleware.ts`) :
 *  - POST : `{ nom, confirm: <nom> }` → `src/content/`, comptes et journal
 *           remplacés par l'archive (état courant sauvegardé d'abord :
 *           `…-avant-restauration.zip`), puis reconstruction du site ; si elle
 *           échoue, l'état précédent est remis.
 * Refusée pendant une publication ou avec des modifications en attente (lot).
 */
import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { json, jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { dataDir } from '../../../../lib/data-dir';
import { logEvent } from '../../../../lib/journal';
import { siteRoot } from '../../../../lib/news-writer';
import { restaurationBloquee } from '../../../../lib/sauvegardes';
import { publish } from '../../../../lib/site-build';
import { annulerRestauration, cheminSauvegarde, restaurerSauvegarde } from '../../../../../scripts/sauvegarde.mjs';

export const prerender = false;

export const POST: APIRoute = withErrors(async ({ request, locals }) => {
	const body = (await readJson(request)) ?? {};
	const nom = typeof body.nom === 'string' ? body.nom : '';
	if (body.confirm !== nom) return jsonError('Confirmation manquante.');
	const bloquee = await restaurationBloquee();
	if (bloquee) return jsonError(bloquee, 409);
	const chemin = cheminSauvegarde(nom, dataDir());
	if (!chemin) return jsonError('Sauvegarde introuvable.', 404);

	const user = locals.user!;
	const options = { root: siteRoot(), dataDir: dataDir() };
	let result;
	try {
		result = restaurerSauvegarde(await readFile(chemin), { ...options, par: user.fullname || user.login });
	} catch (err) {
		return jsonError((err as Error).message, 422);
	}
	// Journal restauré avec le reste : l'événement est écrit après.
	await logEvent({ by: user, action: 'sauvegarde.restauration', label: nom, message: `état précédent : ${result.securite}` });
	const label = `Restauration : ${nom}`;
	const started = await publish({
		label,
		by: user,
		onFailure: async () => annulerRestauration(result.securite, options),
		onSuccess: async () => {},
	});
	if (!started.started) {
		annulerRestauration(result.securite, options);
		await logEvent({ by: user, action: 'publication', label, outcome: 'echec', message: started.reason });
		return jsonError(started.reason!, 409);
	}
	return json({ ok: true, securite: result.securite }, 202);
});
