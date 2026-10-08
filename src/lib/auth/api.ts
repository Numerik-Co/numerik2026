/**
 * Utilitaires des routes JSON de l'espace bénévoles (`/api/auth/*`,
 * `/api/admin/*`).
 *
 * `security.checkOrigin` d'Astro ne couvre que les envois de formulaires :
 * pour du JSON, on vérifie nous-mêmes que la requête vient du site
 * (`Sec-Fetch-Site`, à défaut `Origin`) — en plus du cookie `SameSite=Lax`.
 */

import type { APIContext, APIRoute } from 'astro';
import type { Account } from './accounts.ts';
import type { SessionUser } from './session.ts';

export function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
	});
}

export function jsonError(error: string, status = 400): Response {
	return json({ error }, status);
}

/** Requête émise par une page du site lui-même (pas par un site tiers). */
export function isSameOrigin({ request, url }: Pick<APIContext, 'request' | 'url'>): boolean {
	const fetchSite = request.headers.get('sec-fetch-site');
	if (fetchSite) return fetchSite === 'same-origin';
	const origin = request.headers.get('origin');
	return origin === url.origin;
}

/** Corps JSON (objet) de la requête, ou `null` s'il est absent / invalide. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
	try {
		const body = await request.json();
		return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
	} catch {
		return null;
	}
}

/** Vue publique d'une personne connectée, renvoyée au navigateur. */
export function publicUser(user: SessionUser | Account) {
	return {
		login: user.login,
		fullname: user.fullname,
		email: user.email ?? null,
		groups: user.groups,
		mustChangePassword: Boolean(user.mustChangePassword),
	};
}

/**
 * Enveloppe une route : une erreur inattendue renvoie un message JSON lisible
 * (affiché par le module) et est journalisée, au lieu d'un 500 muet.
 */
export function withErrors(handler: APIRoute): APIRoute {
	return async (context) => {
		try {
			return await handler(context);
		} catch (err) {
			console.error(`[${context.request.method} ${context.url.pathname}]`, err);
			return jsonError(`Erreur du serveur : ${(err as Error).message}`, 500);
		}
	};
}
