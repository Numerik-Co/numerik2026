/**
 * Une archive de sauvegarde (bureau) :
 *  - GET    : téléchargement du fichier ZIP ;
 *  - DELETE : `{ confirm: <nom> }` → archive supprimée du serveur.
 */
import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { json, jsonError, readJson, withErrors } from '../../../../lib/auth/api';
import { dataDir } from '../../../../lib/data-dir';
import { logEvent } from '../../../../lib/journal';
import { cheminSauvegarde, supprimerSauvegarde } from '../../../../../scripts/sauvegarde.mjs';

export const prerender = false;

export const GET: APIRoute = withErrors(async ({ params }) => {
	const nom = String(params.nom ?? '');
	const chemin = cheminSauvegarde(nom, dataDir());
	if (!chemin) return jsonError('Sauvegarde introuvable.', 404);
	return new Response(new Uint8Array(await readFile(chemin)), {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="${nom}"`,
			'Cache-Control': 'private, no-store',
		},
	});
});

export const DELETE: APIRoute = withErrors(async ({ params, request, locals }) => {
	const nom = String(params.nom ?? '');
	const body = await readJson(request);
	if (body?.confirm !== nom) return jsonError('Confirmation manquante.');
	if (!(await supprimerSauvegarde(nom, dataDir()))) return jsonError('Sauvegarde introuvable (déjà supprimée ?).', 404);
	await logEvent({ by: locals.user!, action: 'sauvegarde.suppression', label: nom });
	return json({ ok: true });
});
