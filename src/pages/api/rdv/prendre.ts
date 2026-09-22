import type { APIRoute } from 'astro';
import {
	GENRE_CHOICES,
	STATUT_BENEFICIAIRE_CHOICES,
	TRANCHE_AGE_CHOICES,
	ZONE_GEOGRAPHIQUE_CHOICES,
} from '../../../lib/rdv/choices';
import { GristError } from '../../../lib/rdv/grist';
import { prendreRendezVous } from '../../../lib/rdv/reservation';
import { isNonEmptyString, json } from '../../../lib/adhesion/http';
import type { PriseRdvPayload } from '../../../lib/rdv/types';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HEURE_RE = /^\d{2}:\d{2}$/;

function estValide(body: unknown): body is PriseRdvPayload {
	if (!body || typeof body !== 'object') return false;
	const b = body as Record<string, unknown>;

	if (!isNonEmptyString(b.nom) || !isNonEmptyString(b.prenom)) return false;

	// Ni l'un ni l'autre n'est individuellement obligatoire, mais il en faut
	// au moins un (cf. validation.ts côté client, revalidé ici).
	if (b.email !== undefined && typeof b.email !== 'string') return false;
	if (b.telephone !== undefined && typeof b.telephone !== 'string') return false;
	const email = typeof b.email === 'string' ? b.email.trim() : '';
	const telephone = typeof b.telephone === 'string' ? b.telephone.trim() : '';
	if (email && !EMAIL_RE.test(email)) return false;
	if (!email && !telephone) return false;

	if (!isNonEmptyString(b.date) || !DATE_RE.test(b.date)) return false;
	if (!isNonEmptyString(b.heure) || !HEURE_RE.test(b.heure)) return false;
	if (b.consentement !== true) return false;

	// Une seule démarche par RDV : le créneau est fixé à 30 minutes.
	if (!Array.isArray(b.demarcheIds) || b.demarcheIds.length !== 1) return false;
	if (!b.demarcheIds.every((id) => typeof id === 'number' && Number.isInteger(id) && id > 0)) return false;

	if (b.commune !== undefined && typeof b.commune !== 'string') return false;
	if (b.codePostal !== undefined && typeof b.codePostal !== 'string') return false;
	if (
		b.zoneGeographique !== undefined &&
		!(ZONE_GEOGRAPHIQUE_CHOICES as readonly string[]).includes(b.zoneGeographique as string)
	)
		return false;
	if (b.genre !== undefined && !(GENRE_CHOICES as readonly string[]).includes(b.genre as string)) return false;
	if (b.trancheAge !== undefined && !(TRANCHE_AGE_CHOICES as readonly string[]).includes(b.trancheAge as string))
		return false;
	if (b.statut !== undefined && !(STATUT_BENEFICIAIRE_CHOICES as readonly string[]).includes(b.statut as string))
		return false;
	if (b.commentaire !== undefined && typeof b.commentaire !== 'string') return false;

	return true;
}

/** Prise de RDV publique : rapproche/crée le bénéficiaire puis réserve le créneau. */
export const POST: APIRoute = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!estValide(body)) {
		return json({ error: 'Requête invalide.' }, 400);
	}

	try {
		const resultat = await prendreRendezVous(body);
		if (resultat.status === 'complet') {
			return json({ error: 'Ce créneau vient d’être pris, merci d’en choisir un autre.' }, 409);
		}
		if (resultat.status === 'demarches_invalides') {
			return json({ error: 'Démarche(s) inconnue(s), merci de recharger la page.' }, 400);
		}
		return json(resultat);
	} catch (err) {
		const status = err instanceof GristError ? err.status : 500;
		console.error('[api/rdv/prendre]', err);
		return json({ error: 'Impossible d’enregistrer votre demande de RDV.' }, status);
	}
};
