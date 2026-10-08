/**
 * Fin commune des routes d'administration qui modifient le contenu (pages,
 * menus) : journalise la demande, lance la reconstruction du site
 * (`site-build.ts`) avec annulation (`restore`) si elle échoue ou ne peut
 * pas démarrer, validation (`purge`) une fois en ligne.
 *
 * Code serveur uniquement.
 */

import { json, jsonError } from './auth/api';
import type { SessionUser } from './auth/session';
import { logEvent, type JournalAction } from './journal';
import { canPublish, isPublishing, publish } from './site-build';

/** Réponse d'erreur si la publication est impossible maintenant (serveur, autre publication en cours), sinon `null`. */
export async function publishBlocked(): Promise<Response | null> {
	const availability = await canPublish();
	if (!availability.ok) return jsonError(availability.reason!, 503);
	if (isPublishing()) return jsonError('Une publication est déjà en cours, réessayez dans une minute.', 409);
	return null;
}

export async function publishChange(options: {
	user: SessionUser;
	action: JournalAction;
	/** Objet de l'action (titre de la page, libellé du menu). */
	subject: string;
	/** Libellé de la publication (encadré du module, journal). */
	label: string;
	href?: string;
	message?: string;
	applied: { restore: () => Promise<void>; purge: () => Promise<void> };
}): Promise<Response> {
	const { user, action, subject, label, href, message, applied } = options;
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
