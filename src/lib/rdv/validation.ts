/**
 * Validation côté client (messages inline). Le serveur revalide de toute
 * façon (voir `src/pages/api/rdv/prendre.ts`) — ceci ne sert qu'à guider la
 * saisie.
 */
import type { Errors } from '../adhesion/validation';
import type { PriseRdvPayload } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Exporté : réutilisé par `beneficiaires.ts` pour rapprocher par téléphone. */
export function normaliserTelephone(v: string): string {
	return v.replace(/[\s.\-]/g, '');
}

export function validatePriseRdv(p: PriseRdvPayload): Errors<PriseRdvPayload> {
	const e: Errors<PriseRdvPayload> = {};

	if (!p.nom.trim()) e.nom = 'Le nom est obligatoire.';
	if (!p.prenom.trim()) e.prenom = 'Le prénom est obligatoire.';

	const email = p.email.trim();
	if (email && !EMAIL_RE.test(email)) e.email = 'Courriel invalide.';

	const tel = normaliserTelephone(p.telephone);
	if (tel && !/^0\d{9}$/.test(tel)) e.telephone = 'Numéro à 10 chiffres attendu.';

	// Ni l'un ni l'autre n'est individuellement obligatoire, mais il en faut
	// au moins un pour pouvoir notifier le bénéficiaire de son RDV.
	if (!p.beneficiaireId && !email && !tel && !e.email && !e.telephone) {
		const msg = 'Indiquez au moins un e-mail ou un téléphone pour être notifié·e de votre RDV.';
		e.email = msg;
		e.telephone = msg;
	}

	if (!p.date || !p.heure) e.heure = 'Choisissez un créneau.';

	if (!p.demarcheIds.length) e.demarcheIds = 'Sélectionnez une démarche.';
	else if (p.demarcheIds.length > 1) e.demarcheIds = 'Une seule démarche par rendez-vous (créneau de 30 minutes).';

	if (!p.consentement) e.consentement = 'Le consentement est obligatoire pour prendre RDV.';

	return e;
}

export function hasErrors(e: Record<string, string | undefined>): boolean {
	return Object.values(e).some(Boolean);
}
