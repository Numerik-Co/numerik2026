import type { APIRoute } from 'astro';
import { canAccess, isAdmin } from '../../../lib/auth/access';
import { json, jsonError, publicUser } from '../../../lib/auth/api';
import { getContentPages } from '../../../lib/content-pages';
import { readLot } from '../../../lib/publication-lot';

export const prerender = false;

/**
 * Personne connectée + pages réservées qui lui sont ouvertes (module
 * « Pages réservées »), et pour la rédaction et le bureau les modifications
 * en attente de publication : le bouton « À publier (N) » de la barre
 * s'affiche d'emblée, sans apparaître après coup. 401 si personne n'est
 * connecté — le middleware a alors effacé le cookie indicateur.
 */
export const GET: APIRoute = async ({ locals }) => {
	const user = locals.user;
	if (!user) return jsonError('Non connecté·e.', 401);
	const pages = (await getContentPages())
		.filter((p) => p.access !== null && canAccess(user, p.access))
		.map((p) => ({ title: p.title, url: p.url, description: p.description ?? null }));
	const seesLot = !user.mustChangePassword && (isAdmin(user) || user.groups.includes('redacteur'));
	return json({ user: publicUser(user), pages, lot: seesLot ? await readLot() : [] });
};
