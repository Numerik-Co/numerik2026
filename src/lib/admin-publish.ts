/**
 * Fin commune des routes d'administration qui modifient le contenu (pages,
 * menus, actualités…) : journalise la demande, lance la reconstruction du
 * site (`site-build.ts`) avec annulation (`restore`) si elle échoue ou ne
 * peut pas démarrer, validation (`purge`) une fois en ligne.
 *
 * « Enregistrer sans publier » (`?publier=non` sur la requête) : la
 * modification rejoint le lot en attente (`publication-lot.ts`), dont la
 * copie de secours est faite par `publishBlocked()` avant toute écriture ;
 * rien n'est reconstruit.
 *
 * Code serveur uniquement.
 */

import { json, jsonError } from './auth/api';
import type { SessionUser } from './auth/session';
import { logEvent, type JournalAction } from './journal';
import { addToLot, openLot } from './publication-lot';
import { canPublish, isPublishing, publish } from './site-build';

/** La requête demande-t-elle d'enregistrer sans publier (`?publier=non`) ? */
export function isDeferred(request: Request): boolean {
	return new URL(request.url).searchParams.get('publier') === 'non';
}

/**
 * Réponse d'erreur si la modification est impossible maintenant (serveur,
 * publication en cours — les sources ne changent pas pendant un build),
 * sinon `null`. Sans publication : ouvre le lot (copie de secours) avant
 * que la route n'écrive dans les sources.
 */
export async function publishBlocked(request: Request): Promise<Response | null> {
	const availability = await canPublish();
	if (!availability.ok) return jsonError(availability.reason!, 503);
	if (isPublishing()) return jsonError('Une publication est en cours, réessayez dans une minute.', 409);
	if (isDeferred(request)) await openLot();
	return null;
}

export async function publishChange(options: {
	request: Request;
	user: SessionUser;
	action: JournalAction;
	/** Objet de l'action (titre de la page, libellé du menu). */
	subject: string;
	/** Libellé de la publication (encadré du module, journal, lot en attente). */
	label: string;
	href?: string;
	message?: string;
	applied: { restore: () => Promise<void>; purge: () => Promise<void> };
}): Promise<Response> {
	const { request, user, action, subject, label, href, message, applied } = options;
	if (isDeferred(request)) {
		// La copie de secours du lot remplace la sauvegarde propre à cette modification.
		await applied.purge().catch(() => {});
		await logEvent({ by: user, action, label: subject, href, message: [message, 'enregistrée sans publier'].filter(Boolean).join(' · ') });
		await addToLot({ by: { login: user.login, fullname: user.fullname }, label, href });
		return json({ ok: true, href: href ?? null, deferred: true });
	}
	// Journalisé avant la publication, dont le résultat suit dans le journal.
	await logEvent({ by: user, action, label: subject, href, message });
	const started = await publish({ label, href, by: user, onFailure: applied.restore, onSuccess: applied.purge });
	if (!started.started) {
		await applied.restore();
		await logEvent({ by: user, action: 'publication', label, outcome: 'echec', message: started.reason });
		return jsonError(started.reason!, 409);
	}
	return json({ ok: true, href: href ?? null }, 202);
}
