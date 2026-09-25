/**
 * Rapprochement / création d'un bénéficiaire (table `Beneficiaires`).
 *
 * Deux parcours dans le formulaire (étape « Vous ») :
 * - « C'est mon premier RDV » : `trouverOuCreerBeneficiaire()`, qui rapproche
 *   quand même par email/téléphone (filet anti-doublon) avant de créer ;
 * - « J'ai déjà rencontré le·la conseiller·ère » : `rechercherBeneficiaires()` par
 *   prénom + nom exacts, puis `beneficiaireCorrespond()` à l'envoi.
 */

import { normalize } from '../adhesion/http';
import { normaliserTelephone } from './validation';
import { COLS, createRecord, dateToEpochSeconds, listRecords, TABLES, updateRecord } from './grist';
import type { BeneficiaireInfos, BeneficiaireRecherche } from './types';

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

/** Nom/prénom comparables : sans accents, casse, tirets ni espaces multiples. */
function cleNom(v: string): string {
	return normalize(v.replace(/[-'’]/g, ' '));
}

/** "jean.dupont@gmail.com" -> "j•••@gmail.com" */
function masquerEmail(email: string): string {
	const [local, domaine] = email.split('@');
	return domaine ? `${local.charAt(0)}•••@${domaine}` : '';
}

/** "0612345678" -> "06 •• •• •• 78" */
function masquerTelephone(tel: string): string {
	const t = normaliserTelephone(tel);
	return t.length >= 4 ? `${t.slice(0, 2)} •• •• •• ${t.slice(-2)}` : '';
}

/**
 * Fiches dont le prénom ET le nom correspondent exactement (hors accents,
 * casse, tirets) — pas de recherche partielle, pour ne pas permettre de
 * parcourir la liste des bénéficiaires depuis la page publique. Seul un
 * indice masqué (email/téléphone) est renvoyé, pour départager des homonymes.
 */
export async function rechercherBeneficiaires(prenom: string, nom: string): Promise<BeneficiaireRecherche[]> {
	const p = cleNom(prenom);
	const n = cleNom(nom);
	if (!p || !n) return [];
	const c = COLS.beneficiaire;
	const records = await listRecords(TABLES.beneficiaires);
	return records
		.filter((r) => cleNom(String(r.fields[c.prenom] ?? '')) === p && cleNom(String(r.fields[c.nom] ?? '')) === n)
		.slice(0, 5)
		.map((r) => {
			const email = masquerEmail(String(r.fields[c.email] ?? '').trim());
			const tel = masquerTelephone(String(r.fields[c.telephone] ?? '').trim());
			const commune = String(r.fields[c.commune] ?? '').trim();
			return { beneficiaireId: r.id, indice: [email, tel, commune].filter(Boolean).join(' · ') };
		});
}

/**
 * Revérifie à l'envoi que la fiche choisie porte bien ce prénom + nom : un id
 * seul (devinable) ne suffit pas à prendre RDV au nom de quelqu'un.
 */
export async function beneficiaireCorrespond(id: number, prenom: string, nom: string): Promise<boolean> {
	const resultats = await rechercherBeneficiaires(prenom, nom);
	return resultats.some((r) => r.beneficiaireId === id);
}
