/**
 * Module « Site » (bureau, garde dans `src/middleware.ts`) : mode maintenance.
 *  - GET : état (`null` hors maintenance), restauration en cours ou
 *          maintenance manuelle (message, auteur·rice, début) ;
 *  - PUT : `{ actif: true, message? }` → maintenance manuelle (ou message
 *          modifié) ; `{ actif: false, forcer? }` → levée. Une maintenance de
 *          restauration n'est levée qu'avec `forcer` (le site déjà en ligne
 *          reste servi jusqu'à la fin de la reconstruction).
 * Logique : `scripts/maintenance.mjs`. Aucune reconstruction du site.
 */
import type { APIRoute } from 'astro';
import { json, jsonError, readJson, withErrors } from '../../../lib/auth/api';
import { dataDir } from '../../../lib/data-dir';
import { logEvent } from '../../../lib/journal';
import {
	MESSAGE_PAR_DEFAUT,
	fermerMaintenance,
	lireMaintenance,
	ouvrirMaintenanceManuelle,
} from '../../../../scripts/maintenance.mjs';

export const prerender = false;

function etat() {
	const m = lireMaintenance(dataDir());
	return {
		maintenance: m
			? {
					manuel: Boolean(m.manuel),
					message: m.message ?? '',
					par: m.par ?? '',
					debut: m.debut,
					motif: m.motif,
					etape: m.etape,
					progression: m.progression,
				}
			: null,
		messageParDefaut: MESSAGE_PAR_DEFAUT,
		dev: import.meta.env.DEV,
	};
}

export const GET: APIRoute = withErrors(async () => json(etat()));

export const PUT: APIRoute = withErrors(async ({ request, locals }) => {
	const body = (await readJson(request)) ?? {};
	const user = locals.user!;
	const actuelle = lireMaintenance(dataDir());
	if (body.actif === true) {
		if (actuelle && !actuelle.manuel) return jsonError('Une restauration est en cours : attendez sa fin.', 409);
		const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : '';
		ouvrirMaintenanceManuelle(dataDir(), { message, par: user.fullname || user.login, ...(actuelle ? { debut: actuelle.debut } : {}) });
		await logEvent({ by: user, action: actuelle ? 'maintenance.modification' : 'maintenance.activation', label: 'Site', message: message || undefined });
		return json(etat());
	}
	if (body.actif === false) {
		if (!actuelle) return json(etat());
		if (!actuelle.manuel && body.forcer !== true) return jsonError('Une restauration est en cours : la maintenance prendra fin avec elle.', 409);
		fermerMaintenance(dataDir());
		await logEvent({ by: user, action: 'maintenance.fin', label: 'Site', message: actuelle.manuel ? undefined : `levée pendant : ${actuelle.motif}` });
		return json(etat());
	}
	return jsonError('Requête invalide.', 400);
});
