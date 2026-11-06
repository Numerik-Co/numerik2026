/**
 * Demande de devis publique (`POST`) : client rapproché par email (ou créé),
 * devis « Demande » avec les prestations choisies, à traiter dans le module
 * « Facturation ». Champ piège `site` (robots) ; 5 demandes par quart
 * d'heure et par adresse IP au plus.
 */
import type { APIRoute } from 'astro';
import { json } from '../../../lib/http';
import { lockedMinutes, recordFailure } from '../../../lib/auth/rate-limit';
import { facturationConfig } from '../lib/config';
import { enregistrerDemande, ErreurSaisie } from '../lib/documents';
import { GristError } from '../lib/grist';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const texte = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const POST: APIRoute = async ({ request, clientAddress }) => {
	if (!facturationConfig.ouvert) return json({ error: 'Les demandes en ligne sont fermées.' }, 403);
	const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress;
	const cle = `devis:${ip}`;
	if (lockedMinutes(cle) > 0) return json({ error: 'Trop de demandes envoyées : réessayez dans un moment.' }, 429);

	const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
	if (texte(b.site, 200)) return json({ ok: true }, 200); // robot : réponse normale, rien d'enregistré
	const demande = {
		nom: texte(b.nom, 120),
		societe: texte(b.societe, 120),
		email: texte(b.email, 120),
		telephone: texte(b.telephone, 40),
		adresse: texte(b.adresse, 200),
		codePostal: texte(b.codePostal, 10),
		ville: texte(b.ville, 80),
		message: texte(b.message, 3000),
		prestationIds: Array.isArray(b.prestationIds) ? b.prestationIds.filter((x): x is number => Number.isInteger(x) && x > 0).slice(0, 20) : [],
	};
	if (!demande.nom || !EMAIL_RE.test(demande.email) || !demande.message || b.consentement !== true) {
		return json({ error: 'Nom, email valide, message et accord sont obligatoires.' }, 400);
	}
	recordFailure(cle);
	try {
		await enregistrerDemande(demande);
		return json({ ok: true }, 201);
	} catch (err) {
		if (err instanceof ErreurSaisie) return json({ error: err.message }, 400);
		if (err instanceof GristError) {
			console.error('[api/facturation/demande]', err);
			return json({ error: 'Le service est momentanément indisponible : réessayez plus tard ou contactez-nous directement.' }, 503);
		}
		throw err;
	}
};
