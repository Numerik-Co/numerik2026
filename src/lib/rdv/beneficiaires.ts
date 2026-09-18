/**
 * Rapprochement / création d'un bénéficiaire (table `Beneficiaires`), par
 * email — la seule clé stable dont on dispose côté public (pas de compte,
 * pas de lien Grist inter-documents avec `Membres`).
 */

import { normalize } from '../adhesion/http';
import { COLS, createRecord, dateToEpochSeconds, listRecords, TABLES, updateRecord } from './grist';
import type { BeneficiaireInfos } from './types';

export interface BeneficiaireIdentite extends BeneficiaireInfos {
	nom: string;
	prenom: string;
	email: string;
	telephone: string;
	consentement: boolean;
}

function champsRenseignes(infos: BeneficiaireIdentite): Record<string, unknown> {
	const c = COLS.beneficiaire;
	const champs: Record<string, unknown> = {
		[c.nom]: infos.nom,
		[c.prenom]: infos.prenom,
		[c.email]: infos.email,
		[c.telephone]: infos.telephone,
		[c.consentement]: infos.consentement,
	};
	if (infos.commune) champs[c.commune] = infos.commune;
	if (infos.codePostal) champs[c.codePostal] = infos.codePostal;
	if (infos.zoneGeographique) champs[c.zoneGeographique] = infos.zoneGeographique;
	if (infos.genre) champs[c.genre] = infos.genre;
	if (infos.trancheAge) champs[c.trancheAge] = infos.trancheAge;
	if (infos.statut) champs[c.statut] = infos.statut;
	return champs;
}

/**
 * Retrouve un bénéficiaire par email (comparaison insensible à la casse et
 * aux accents) ou en crée un nouveau. Met à jour les champs déclaratifs
 * (nom, coordonnées, infos démographiques) sur une fiche existante — la
 * dernière déclaration du bénéficiaire fait foi.
 */
export async function trouverOuCreerBeneficiaire(infos: BeneficiaireIdentite): Promise<number> {
	const emailNorm = normalize(infos.email);
	const existants = await listRecords(TABLES.beneficiaires);
	const trouve = existants.find((r) => normalize(String(r.fields[COLS.beneficiaire.email] ?? '')) === emailNorm);

	if (trouve) {
		await updateRecord(TABLES.beneficiaires, trouve.id, champsRenseignes(infos));
		return trouve.id;
	}

	return createRecord(TABLES.beneficiaires, {
		...champsRenseignes(infos),
		[COLS.beneficiaire.creeLe]: dateToEpochSeconds(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())),
	});
}
