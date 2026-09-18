/**
 * Validation côté client (messages inline). Le serveur revalide de toute
 * façon (voir `src/pages/api/rdv/prendre.ts`) — ceci ne sert qu'à guider la
 * saisie.
 */
import type { Errors } from '../adhesion/validation';
import type { PriseRdvPayload } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function telNormalise(v: string): string {
	return v.replace(/[\s.\-]/g, '');
}

export function validatePriseRdv(p: PriseRdvPayload): Errors<PriseRdvPayload> {
	const e: Errors<PriseRdvPayload> = {};

	if (!p.nom.trim()) e.nom = 'Le nom est obligatoire.';
	if (!p.prenom.trim()) e.prenom = 'Le prénom est obligatoire.';

	if (!p.email.trim()) e.email = 'Le courriel est obligatoire.';
	else if (!EMAIL_RE.test(p.email.trim())) e.email = 'Courriel invalide.';

	const tel = telNormalise(p.telephone);
	if (!tel) e.telephone = 'Le téléphone est obligatoire.';
	else if (!/^0\d{9}$/.test(tel)) e.telephone = 'Numéro à 10 chiffres attendu.';

	if (!p.date || !p.heure) e.heure = 'Choisissez un créneau.';

	if (!p.demarcheIds.length) e.demarcheIds = 'Sélectionnez une démarche.';
	else if (p.demarcheIds.length > 1) e.demarcheIds = 'Une seule démarche par rendez-vous (créneau de 30 minutes).';

	if (!p.consentement) e.consentement = 'Le consentement est obligatoire pour prendre RDV.';

	return e;
}

export function hasErrors(e: Record<string, string | undefined>): boolean {
	return Object.values(e).some(Boolean);
}
