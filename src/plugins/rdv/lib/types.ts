/**
 * Types partagés entre l'îlot Vue (front) et les routes API du plugin (`../api/`).
 * Aucun secret ici — uniquement les formes de données échangées.
 * Les valeurs des listes (genre, thématique…) viennent du document Grist
 * (`listes.ts`) : de simples chaînes ici.
 */

/** Libellé d'une zone de `zones:` (`src/content/rdv.yaml`) = choix Grist `Zone_geographique`. */
export type ZoneGeographique = string;

/**
 * Réglages de `rdv.yaml` passés en props à `RdvForm.vue` par la page
 * (`rdvFormProps()` de `config.ts`) : l'îlot ne lit jamais le YAML.
 */
export interface RdvFormReglages {
	/** Textes, `{duree}` / `{heure}` encore à remplir. */
	textes: { nom: string; intervenant: string; dejaVenu: string; urgence: string; consentement: string };
	/** Durée d'un créneau, en minutes. */
	duree: number;
	/** Champs demandés : `genre` (civilité), `commune`, `zone`, `trancheAge`, `statut`. */
	profil: string[];
	/** Libellé affiché pour une valeur Grist de `Genre` (« Masculin » → « M. ») ; vide = valeurs telles quelles. */
	civilite: Record<string, string>;
	/** Icône Font Awesome d'une thématique. */
	icones: Record<string, string>;
}

/** Listes de choix lues dans le document Grist (`/api/rdv/listes`). */
export interface ListesRdv {
	thematiques: string[];
	genres: string[];
	tranchesAge: string[];
	statuts: string[];
}

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
	thematique: string;
	icone: string; // classe Font Awesome, ex. "fa-id-card" (préfixe "fa-solid" ajouté à l'affichage)
	description: string;
	documents: string; // documents à apporter le jour du RDV, une ligne par document — vide si non renseigné
}

/** Un créneau (durée `creneaux.duree` de `rdv.yaml`) sur une permanence. */
export interface Creneau {
	date: string; // ISO yyyy-mm-dd
	jour: string; // "Lundi"…
	heure: string; // "09:00"
	lieu: string;
	disponible: boolean; // pas encore pris
	/** Premier créneau de la permanence, réservé aux urgences (cf. `creneaux.ts`). */
	urgence: boolean;
	/** Réservable par la personne qui consulte : libre, et hors urgence ou connecté·e. */
	reservable: boolean;
}

/** Informations facultatives sur le bénéficiaire (étape « profil », champs choisis dans `profil:` de `rdv.yaml`). */
export interface BeneficiaireInfos {
	commune?: string;
	codePostal?: string;
	zoneGeographique?: ZoneGeographique;
	genre?: string;
	trancheAge?: string;
	statut?: string;
}

/** Résultat de recherche du parcours « déjà venu·e » — jamais de coordonnées en clair. */
export interface BeneficiaireRecherche {
	beneficiaireId: number;
	/** Prénom et nom de la fiche, tels qu'enregistrés (déjà saisis à l'identique par la personne). */
	prenom: string;
	nom: string;
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
