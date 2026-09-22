/**
 * Rapprochement / création d'un bénéficiaire (table `Beneficiaires`), par
 * email — la seule clé stable dont on dispose côté public (pas de compte,
 * pas de lien Grist inter-documents avec `Membres`).
 */

import { normalize } from '../adhesion/http';
import { normaliserTelephone } from './validation';
import { COLS, createRecord, dateToEpochSeconds, listRecords, TABLES, updateRecord } from './grist';
import type { BeneficiaireInfos } from './types';

export interface BeneficiaireIdentite extends BeneficiaireInfos {
	nom: string;
	prenom: string;
	// Au moins l'un des deux est renseigné — jamais aucun (cf. validation.ts).
	email: string;
	telephone: string;
	consentement: boolean;
}

function champsRenseignes(infos: BeneficiaireIdentite): Record<string, unknown> {
	const c = COLS.beneficiaire;
	const champs: Record<string, unknown> = {
		[c.nom]: infos.nom,
		[c.prenom]: infos.prenom,
		[c.consentement]: infos.consentement,
	};
	// Écrit seulement s'il est renseigné, pour ne jamais effacer une valeur
	// existante avec une chaîne vide sur une fiche mise à jour.
	if (infos.email) champs[c.email] = infos.email;
	if (infos.telephone) champs[c.telephone] = infos.telephone;
	if (infos.commune) champs[c.commune] = infos.commune;
	if (infos.codePostal) champs[c.codePostal] = infos.codePostal;
	if (infos.zoneGeographique) champs[c.zoneGeographique] = infos.zoneGeographique;
	if (infos.genre) champs[c.genre] = infos.genre;
	if (infos.trancheAge) champs[c.trancheAge] = infos.trancheAge;
	if (infos.statut) champs[c.statut] = infos.statut;
	return champs;
}

/**
 * Retrouve un bénéficiaire par email ou téléphone (comparaison insensible à
 * la casse/aux accents pour l'email, aux séparateurs pour le téléphone) ou
 * en crée un nouveau. Met à jour les champs déclaratifs (nom, coordonnées,
 * infos démographiques) sur une fiche existante — la dernière déclaration
 * du bénéficiaire fait foi. L'un des deux critères peut être absent (jamais
 * les deux, cf. validation.ts) : on ne compare alors que celui fourni, pour
 * ne jamais faire correspondre deux fiches sur un critère vide.
 */
export async function trouverOuCreerBeneficiaire(infos: BeneficiaireIdentite): Promise<number> {
	const emailNorm = infos.email ? normalize(infos.email) : '';
	const telNorm = infos.telephone ? normaliserTelephone(infos.telephone) : '';
	const existants = await listRecords(TABLES.beneficiaires);
	const trouve = existants.find((r) => {
		if (emailNorm && normalize(String(r.fields[COLS.beneficiaire.email] ?? '')) === emailNorm) return true;
		if (telNorm && normaliserTelephone(String(r.fields[COLS.beneficiaire.telephone] ?? '')) === telNorm) return true;
		return false;
	});

	if (trouve) {
		await updateRecord(TABLES.beneficiaires, trouve.id, champsRenseignes(infos));
		return trouve.id;
	}

	return createRecord(TABLES.beneficiaires, {
		...champsRenseignes(infos),
		[COLS.beneficiaire.creeLe]: dateToEpochSeconds(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())),
	});
}
