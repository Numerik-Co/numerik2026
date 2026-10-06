/**
 * Authentification : renseigne `Astro.locals.user` sur chaque requête rendue
 * à la demande et garde les routes de l'espace bénévoles :
 *  - `/api/auth/*`, `/api/admin/*` : requêtes du site lui-même uniquement ;
 *  - `/api/admin/*` : connexion obligatoire (401) ;
 *  - `/api/admin/comptes*` : groupe `admin` (403).
 * L'interface (modale de connexion, barre et modules) est un îlot Vue
 * (`src/components/admin/AdminRoot.vue`) ; les pages de contenu restreintes
 * par `access:` sont contrôlées par `src/pages/[...slug].astro`.
 * Les pages prérendues (statiques) ne passent pas ici à l'exécution.
 */

import { defineMiddleware } from 'astro:middleware';
import { isAdmin } from './lib/auth/access';
import { isSameOrigin, jsonError } from './lib/auth/api';
import { readSession } from './lib/auth/session';

function startsWithSegment(path: string, prefix: string): boolean {
	return path === prefix || path.startsWith(`${prefix}/`);
}

export const onRequest = defineMiddleware(async (context, next) => {
	if (context.isPrerendered) return next();

	const path = context.url.pathname.replace(/\/+$/, '') || '/';
	const isAuthApi = startsWithSegment(path, '/api/auth') || startsWithSegment(path, '/api/admin');
	if (isAuthApi && !isSameOrigin(context)) return jsonError('Requête refusée.', 403);

	const user = await readSession(context.cookies);
	context.locals.user = user;

	if (startsWithSegment(path, '/api/admin')) {
		if (!user) return jsonError('Session expirée : reconnectez-vous.', 401);
		if (startsWithSegment(path, '/api/admin/comptes') && !isAdmin(user)) {
			return jsonError('La gestion des comptes est réservée au bureau.', 403);
		}
	}

	const response = await next();
	// Contenu personnalisé : jamais mis en cache par un proxy partagé.
	if (user) response.headers.set('Cache-Control', 'private, no-store');
	return response;
});
