/**
 * Types partagés entre l'îlot Vue (front) et les routes API `src/pages/api/rdv/*`.
 * Aucun secret ici — uniquement les formes de données échangées.
 */

import type {
	GENRE_CHOICES,
	STATUT_BENEFICIAIRE_CHOICES,
	THEMATIQUE_CHOICES,
	TRANCHE_AGE_CHOICES,
	ZONE_GEOGRAPHIQUE_CHOICES,
} from './choices';

export type Genre = (typeof GENRE_CHOICES)[number];
export type TrancheAge = (typeof TRANCHE_AGE_CHOICES)[number];
export type StatutBeneficiaire = (typeof STATUT_BENEFICIAIRE_CHOICES)[number];
export type Thematique = (typeof THEMATIQUE_CHOICES)[number];
export type ZoneGeographique = (typeof ZONE_GEOGRAPHIQUE_CHOICES)[number];

/** Suggestion de l'autocomplétion de commune (API Adresse, `type=municipality`). */
export interface CommuneSuggestion {
	commune: string;
	codePostal: string;
	label: string;
}

/** Une démarche du catalogue (table Grist `Demarches`), sélectionnable au bloc 1. */
export interface Demarche {
	id: number;
	nom: string;
	thematique: Thematique;
	icone: string; // classe Font Awesome, ex. "fa-id-card" (préfixe "fa-solid" ajouté à l'affichage)
	description: string;
	documents: string; // documents à apporter le jour du RDV, une ligne par document — vide si non renseigné
}

/** Un créneau de 30 min sur une permanence du Conseiller Numérique. */
export interface Creneau {
	date: string; // ISO yyyy-mm-dd
	jour: string; // "Lundi"…
	heure: string; // "09:00"
	lieu: string;
	disponible: boolean;
}

/** Informations facultatives sur le bénéficiaire, alignées sur le CRA Coop. */
export interface BeneficiaireInfos {
	commune?: string;
	codePostal?: string;
	zoneGeographique?: ZoneGeographique;
	genre?: Genre;
	trancheAge?: TrancheAge;
	statut?: StatutBeneficiaire;
}

/** Résultat de recherche « J'ai déjà rencontré le conseiller » — jamais de coordonnées en clair. */
export interface BeneficiaireRecherche {
	beneficiaireId: number;
	indice: string; // ex. "j•••@gmail.com · 06 •• •• •• 78 · Lannion"
}

export interface PriseRdvPayload extends BeneficiaireInfos {
	/** Fiche existante retrouvée (parcours « déjà venu ») — sinon fiche créée/rapprochée. */
	beneficiaireId?: number;
	nom: string;
	prenom: string;
	// Aucun des deux n'est individuellement obligatoire — mais au moins l'un
	// des deux doit être renseigné (validation.ts), pour pouvoir notifier le
	// bénéficiaire de son RDV. Ni l'un ni l'autre n'est demandé si
	// `beneficiaireId` est fourni (fiche déjà connue).
	email: string;
	telephone: string;
	date: string; // ISO yyyy-mm-dd
	heure: string; // "09:00"
	demarcheIds: number[];
	commentaire?: string;
	consentement: boolean;
}

export type PriseRdvResult =
	| { status: 'ok'; rdvId: number }
	| { status: 'complet' }
	| { status: 'demarches_invalides' }
	| { status: 'beneficiaire_inconnu' };
