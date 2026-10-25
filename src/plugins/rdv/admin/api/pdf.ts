import type { APIRoute } from 'astro';
import { jsonError, withErrors } from '../../../../lib/auth/api';
import { GotenbergError, htmlToPdf, isGotenbergEnabled } from '../../../../lib/adhesion/bulletin';
import { GristError } from '../../lib/grist';
import { listerRdv } from '../gestion';
import { lundiDe, nomFichier, semaineHtml } from '../semaine-pdf';

export const prerender = false;

/** PDF de la semaine de `?semaine=<yyyy-mm-dd>` (n'importe quel jour de la semaine), via Gotenberg. */
export const GET: APIRoute = withErrors(async ({ url }) => {
	const semaine = url.searchParams.get('semaine') ?? '';
	if (!/^\d{4}-\d{2}-\d{2}$/.test(semaine) || Number.isNaN(Date.parse(semaine))) return jsonError('Semaine invalide.', 400);
	if (!isGotenbergEnabled()) return jsonError('Génération de PDF non configurée (GOTENBERG_URL absent du .env).', 503);
	const lundi = lundiDe(semaine);
	try {
		const { rdvs } = await listerRdv();
		const pdf = await htmlToPdf(semaineHtml(lundi, rdvs));
		return new Response(pdf, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${nomFichier(lundi)}"`,
				'Cache-Control': 'private, no-store',
			},
		});
	} catch (err) {
		if (err instanceof GristError) {
			console.error('[api/admin/rdv/pdf]', err);
			return jsonError('Grist injoignable : impossible de charger les rendez-vous.', err.status);
		}
		if (err instanceof GotenbergError) {
			console.error('[api/admin/rdv/pdf]', err);
			return jsonError('Serveur PDF (Gotenberg) injoignable ou en erreur : PDF non généré.', 502);
		}
		throw err;
	}
});
