/**
 * Prise de RDV : revérifie la disponibilité du créneau (au cas où la liste
 * affichée serait périmée — même limite que `enregistrerPresence()`, pas
 * d'opération atomique côté API Grist), rapproche/crée le bénéficiaire,
 * puis crée la ligne `RDV`.
 */

import { beneficiaireCorrespond, trouverOuCreerBeneficiaire } from './beneficiaires';
import { creneauEstLibre, lieuPourDate } from './creneaux';
import { demarchesParIds } from './demarches';
import { COLS, createRecord, dateToEpochSeconds, refList, TABLES } from './grist';
import { STATUT_RDV } from './choices';
import type { PriseRdvPayload, PriseRdvResult } from './types';

export async function prendreRendezVous(payload: PriseRdvPayload): Promise<PriseRdvResult> {
	const demarches = await demarchesParIds(payload.demarcheIds);
	if (!demarches.length) return { status: 'demarches_invalides' };

	if (payload.beneficiaireId && !(await beneficiaireCorrespond(payload.beneficiaireId, payload.prenom, payload.nom))) {
		return { status: 'beneficiaire_inconnu' };
	}

	const libre = await creneauEstLibre(payload.date, payload.heure);
	if (!libre) return { status: 'complet' };

	// Parcours « déjà venu » : fiche existante laissée telle quelle.
	const beneficiaireId = payload.beneficiaireId ?? (await trouverOuCreerBeneficiaire({
		nom: payload.nom,
		prenom: payload.prenom,
		email: payload.email,
		telephone: payload.telephone,
		commune: payload.commune,
		codePostal: payload.codePostal,
		zoneGeographique: payload.zoneGeographique,
		genre: payload.genre,
		trancheAge: payload.trancheAge,
		statut: payload.statut,
		consentement: payload.consentement,
	}));

	const lieu = lieuPourDate(payload.date);
	const thematiques = [...new Set(demarches.map((d) => d.thematique))];
	const c = COLS.rdv;
	const rdvId = await createRecord(TABLES.rdv, {
		[c.beneficiaire]: beneficiaireId,
		[c.date]: dateToEpochSeconds(payload.date),
		[c.heure]: payload.heure,
		...(lieu ? { [c.lieu]: lieu } : {}),
		[c.demarche]: refList(...demarches.map((d) => d.id)),
		[c.thematiques]: refList(...thematiques),
		[c.commentaire]: payload.commentaire ?? '',
		[c.statut]: STATUT_RDV.confirme,
		[c.creeLe]: dateToEpochSeconds(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())),
	});

	return { status: 'ok', rdvId };
}
