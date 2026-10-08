import type { APIRoute } from 'astro';
import { json, jsonError } from '../../../lib/auth/api';
import { dismissStatus, readStatus } from '../../../lib/site-build';

export const prerender = false;

/** État de la dernière publication (suivi depuis le module « Actualités »). */
export const GET: APIRoute = async () => json(await readStatus());

/** Ferme définitivement l'encadré du dernier résultat (le journal le garde). */
export const DELETE: APIRoute = async ({ locals }) => {
	if (!(await dismissStatus(locals.user!))) return jsonError('Une publication est en cours.', 409);
	return json({ ok: true });
};
