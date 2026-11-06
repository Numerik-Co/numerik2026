/** PDF d'un devis ou d'une facture (`GET ?type=devis|facture&id=`), via Gotenberg. */
import type { APIRoute } from 'astro';
import { jsonError } from '../../../../lib/auth/api';
import { GotenbergError, htmlToPdf, isGotenbergEnabled } from '../../../../lib/gotenberg';
import { charger } from '../../lib/documents';
import { documentHtml, nomFichier, type DocumentPdf } from '../../lib/pdf';
import { traiter } from './erreurs';

export const prerender = false;

export const GET: APIRoute = ({ url }) =>
	traiter('api/admin/facturation/pdf', async () => {
		const type = url.searchParams.get('type');
		const id = Number(url.searchParams.get('id'));
		if ((type !== 'devis' && type !== 'facture') || !Number.isInteger(id) || id <= 0) return jsonError('Document invalide.', 400);
		if (!isGotenbergEnabled()) return jsonError('Génération de PDF non configurée (GOTENBERG_URL absent).', 503);
		const donnees = await charger();
		const devis = type === 'devis' ? donnees.devis.find((d) => d.id === id) : undefined;
		const facture = type === 'facture' ? donnees.factures.find((f) => f.id === id) : undefined;
		const d: DocumentPdf | null = devis ? { type: 'devis', doc: devis } : facture ? { type: 'facture', doc: facture } : null;
		if (!d) return jsonError('Document introuvable.', 404);
		const client = donnees.clients.find((c) => c.id === d.doc.clientId) ?? null;
		try {
			const pdf = await htmlToPdf(documentHtml(d, client));
			return new Response(pdf, {
				headers: {
					'Content-Type': 'application/pdf',
					'Content-Disposition': `attachment; filename="${nomFichier(d)}"`,
					'Cache-Control': 'private, no-store',
				},
			});
		} catch (err) {
			if (err instanceof GotenbergError) {
				console.error('[api/admin/facturation/pdf]', err);
				return jsonError('Serveur PDF (Gotenberg) injoignable ou en erreur : PDF non généré.', 502);
			}
			throw err;
		}
	});
