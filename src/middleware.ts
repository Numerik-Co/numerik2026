/**
 * Authentification : renseigne `Astro.locals.user` sur chaque requête rendue
 * à la demande et garde les routes de l'espace bénévoles :
 *  - `/api/auth/*`, `/api/admin/*` : requêtes du site lui-même uniquement ;
 *  - `/api/admin/*` : connexion obligatoire (401) ;
 *  - préfixes de `GUARDS` : groupe requis (403), `admin` / `superadmin`
 *    passent toujours, sauf garde `noAdmin` (journal : `superadmin` seul) ;
 *  - mot de passe provisoire (`mustChangePassword`) : seule
 *    `/api/admin/mot-de-passe` répond (403 ailleurs).
 * L'interface (modale de connexion, barre et modules) est un îlot Vue
 * (`src/components/admin/AdminRoot.vue`) ; les pages de contenu restreintes
 * par `access:` sont contrôlées par `src/pages/[...slug].astro`.
 * Les pages prérendues (statiques) ne passent pas ici à l'exécution.
 */

import { defineMiddleware } from 'astro:middleware';
import { isAdmin } from './lib/auth/access';
import type { AuthGroup } from './lib/auth/groups';
import { isSameOrigin, jsonError } from './lib/auth/api';
import { readSession } from './lib/auth/session';

/** Routes réservées à certains groupes (en plus de la connexion). Tenir aligné avec `ADMIN_MODULES`. */
const GUARDS: { prefix: string; groups: AuthGroup[]; message: string; noAdmin?: true }[] = [
	{ prefix: '/api/admin/journal', groups: ['superadmin'], message: 'Le journal est réservé au super admin.', noAdmin: true },
	{ prefix: '/api/admin/comptes', groups: ['admin'], message: 'La gestion des comptes est réservée au bureau.' },
	{ prefix: '/api/admin/version', groups: ['admin'], message: 'Réservé au bureau.' },
	{ prefix: '/api/admin/actualites', groups: ['redacteur'], message: 'La publication des actualités est réservée aux rédacteur·rice·s.' },
	{ prefix: '/api/admin/publication', groups: ['redacteur'], message: 'Réservé aux rédacteur·rice·s.' },
	{ prefix: '/api/admin/pages', groups: ['redacteur'], message: 'La gestion des pages est réservée aux rédacteur·rice·s.' },
	{ prefix: '/api/admin/ordre-menu', groups: ['redacteur'], message: 'La gestion du menu est réservée aux rédacteur·rice·s.' },
	{ prefix: '/api/admin/pages-du-site', groups: ['redacteur'], message: 'La gestion des pages est réservée aux rédacteur·rice·s.' },
	{ prefix: '/api/admin/menus-deroulants', groups: ['redacteur'], message: 'La gestion des menus déroulants est réservée aux rédacteur·rice·s.' },
];

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
		if (user.mustChangePassword && path !== '/api/admin/mot-de-passe') {
			return jsonError('Choisissez d’abord votre mot de passe personnel.', 403);
		}
		const guard = GUARDS.find((g) => startsWithSegment(path, g.prefix));
		if (guard && !(isAdmin(user) && !guard.noAdmin) && !guard.groups.some((g) => user.groups.includes(g))) {
			return jsonError(guard.message, 403);
		}
	}

	const response = await next();
	// Contenu personnalisé : jamais mis en cache par un proxy partagé.
	if (user) response.headers.set('Cache-Control', 'private, no-store');
	return response;
});
