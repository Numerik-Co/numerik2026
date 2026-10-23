import type { APIRoute } from 'astro';
import { rdvConfig, type ChampProfil } from '../lib/config';
import { fetchListes } from '../lib/listes';
import { estZoneConnue } from '../lib/zones';
import { estCreneauUrgence } from '../lib/creneaux';
import { GristError } from '../lib/grist';
import { prendreRendezVous } from '../lib/reservation';
import { isNonEmptyString, json } from '../../../lib/adhesion/http';
import type { PriseRdvPayload } from '../lib/types';

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
	const beneficiaireId = b.beneficiaireId;
	if (beneficiaireId !== undefined && !(typeof beneficiaireId === 'number' && Number.isInteger(beneficiaireId) && beneficiaireId > 0))
		return false;
	if (beneficiaireId === undefined && !email && !telephone) return false;

	if (!isNonEmptyString(b.date) || !DATE_RE.test(b.date)) return false;
	if (!isNonEmptyString(b.heure) || !HEURE_RE.test(b.heure)) return false;
	if (b.consentement !== true) return false;

	// Une seule démarche par RDV : le créneau est fixé à 30 minutes.
	if (!Array.isArray(b.demarcheIds) || b.demarcheIds.length !== 1) return false;
	if (!b.demarcheIds.every((id) => typeof id === 'number' && Number.isInteger(id) && id > 0)) return false;

	if (b.commune !== undefined && typeof b.commune !== 'string') return false;
	if (b.codePostal !== undefined && typeof b.codePostal !== 'string') return false;
	if (b.zoneGeographique !== undefined && !(typeof b.zoneGeographique === 'string' && estZoneConnue(b.zoneGeographique)))
		return false;
	// Valeurs revérifiées contre les listes Grist dans POST (`choixValides`).
	if (b.genre !== undefined && typeof b.genre !== 'string') return false;
	if (b.trancheAge !== undefined && typeof b.trancheAge !== 'string') return false;
	if (b.statut !== undefined && typeof b.statut !== 'string') return false;
	if (b.commentaire !== undefined && typeof b.commentaire !== 'string') return false;

	return true;
}

const profil = (champ: ChampProfil) => rdvConfig.profil.includes(champ);

/**
 * Champs du profil : ceux que l'association ne demande pas (`profil:` de
 * `rdv.yaml`) sont ignorés ; les autres doivent être un choix de la colonne Grist.
 */
async function choixValides(body: PriseRdvPayload): Promise<boolean> {
	if (!profil('genre')) body.genre = undefined;
	if (!profil('commune')) body.commune = body.codePostal = undefined;
	if (!profil('zone')) body.zoneGeographique = undefined;
	if (!profil('trancheAge')) body.trancheAge = undefined;
	if (!profil('statut')) body.statut = undefined;
	if (body.genre === undefined && body.trancheAge === undefined && body.statut === undefined) return true;
	const listes = await fetchListes();
	return (
		(body.genre === undefined || listes.genres.includes(body.genre)) &&
		(body.trancheAge === undefined || listes.tranchesAge.includes(body.trancheAge)) &&
		(body.statut === undefined || listes.statuts.includes(body.statut))
	);
}

/** Prise de RDV publique : rapproche/crée le bénéficiaire puis réserve le créneau. */
export const POST: APIRoute = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	if (!estValide(body)) {
		return json({ error: 'Requête invalide.' }, 400);
	}
	// Premier créneau de la permanence : urgences, réservées par un·e bénévole connecté·e.
	if (!locals.user && estCreneauUrgence(body.date, body.heure)) {
		return json({ error: 'Ce créneau est réservé aux urgences : contactez directement l’association.' }, 403);
	}

	try {
		if (!(await choixValides(body))) {
			return json({ error: 'Réponse inconnue dans le profil, merci de recharger la page.' }, 400);
		}
		const resultat = await prendreRendezVous(body);
		if (resultat.status === 'complet') {
			return json({ error: 'Ce créneau vient d’être pris, merci d’en choisir un autre.' }, 409);
		}
		if (resultat.status === 'beneficiaire_inconnu') {
			return json({ error: 'Nous ne retrouvons pas votre fiche, merci de refaire la recherche.' }, 400);
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
