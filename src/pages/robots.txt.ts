/**
 * Consignes aux moteurs de recherche : tout le site public, sauf l'espace
 * bénévoles et les routes d'API ; adresse du plan du site (`sitemap.xml`).
 */
import type { APIRoute } from 'astro';
import { absoluteUrl } from '../lib/seo';

export const GET: APIRoute = ({ site }) =>
	new Response(
		['User-agent: *', 'Disallow: /espace-benevoles', 'Disallow: /api/', '', `Sitemap: ${absoluteUrl('/sitemap.xml', site)}`, ''].join('\n'),
		{ headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
	);
