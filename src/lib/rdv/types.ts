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

export interface PriseRdvPayload extends BeneficiaireInfos {
	nom: string;
	prenom: string;
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
	| { status: 'demarches_invalides' };
