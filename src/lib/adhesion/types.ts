/**
 * Types partagés entre l'îlot Vue (front) et les routes API (serveur).
 * Aucun secret ici — uniquement les formes de données échangées.
 */

/** Valeurs = celles de la liste de choix Grist `Membres.Genre`. */
export type Genre = 'Homme' | 'Femme' | 'Autre' | 'Association';
export type Mode = 'nouveau' | 'renouvellement';

/** Étape 1 — informations transmises à la table Membres. */
export interface MembrePayload {
	genre: Genre;
	nom: string;
	prenom: string;
	dateNaissance: string; // ISO yyyy-mm-dd ('' si genre = Association)
	email: string;
	adresse: string;
	codePostal: string;
	commune: string;
	telFixe: string;
	telMobile: string;
	newsletter: boolean;
	droitImage: boolean; // -> colonne Membres.Droit_image (Bool)
}

/** Étape 1 — renouvellement : on ne transmet que l'identité. */
export interface RenouvellementPayload {
	nom: string;
	prenom: string;
}

/** Inscription « actualités seules ». */
export interface ContactPayload {
	nom: string;
	prenom: string;
	email: string;
}

/** Membre supplémentaire d'une adhésion multiple (ex. Couple) : nouveau ou existant. */
export type CoMembrePayload =
	| ({ responsableId: number; adhesionId: number } & MembrePayload)
	| { responsableId: number; adhesionId: number; membreExistantId: number };

export interface CoMembreResult {
	membreId: number;
	prenom: string;
	nom: string;
}

export interface DetacherMembrePayload {
	responsableId: number;
	adhesionId: number;
	membreId: number;
}

export type MembreResult =
	| { status: 'ok'; membreId: number; prenom: string; nom: string; genre: Genre | null }
	| { status: 'ambigu'; candidats: MembreCandidat[] }
	| ({ status: 'rattache' } & MembreRattache)
	| { status: 'introuvable' };

export interface MembreCandidat {
	membreId: number;
	prenom: string;
	nom: string;
	genre: Genre | null;
	indice: string; // ex. "né·e en 19•• · ville"
}

/**
 * Renouvellement : la fiche saisie n'est pas responsable de son adhésion — elle
 * figure dans le `Responsable_de` d'un·e autre membre. Le parcours doit repartir
 * du·de la responsable (c'est lui/elle qui porte le bulletin et le groupe).
 */
export interface MembreRattache {
	membre: MembreCandidat; // la fiche saisie
	responsable: MembreCandidat; // le·la responsable de l'adhésion
}

/** Étape 2 — choix de la cotisation (crée un enregistrement dans Adhesions). */
export interface CotisationPayload {
	membreId: number;
	cotisationId: number;
}

/** Étape 3 — choix de l'activité (crée un enregistrement dans Inscription). */
export interface ActivitePayload {
	membreId: number;
	activiteId: number;
}

export interface GroupeMembre {
	membreId: number;
	label: string;
}

export interface AdhesionResult {
	adhesionId: number;
	groupe: GroupeMembre[]; // membres déjà rattachés (via Responsable_de), responsable en tête
	/** Jeton signé pour /api/adhesion/bulletin ; absent si la génération PDF n'est pas configurée. */
	bulletinToken?: string;
}

/** Résultat d'une recherche de membre (rattachement d'un membre existant). */
export interface MembreRecherche {
	membreId: number;
	prenom: string;
	nom: string;
	indice: string;
}

/** Suggestion de l'autocomplétion d'adresse (API Adresse / BAN). */
export interface AdresseSuggestion {
	label: string; // libellé complet affiché dans la liste
	adresse: string; // n° + voie
	codePostal: string;
	commune: string;
}

export interface InscriptionResult {
	inscriptionId: number;
	disponibilite: string; // "Inscrit" | "Liste d'attente"
}

/** Une inscription activité enregistrée pendant le parcours (affichage étape 3 + récap). */
export interface InscriptionLigne {
	membreId: number;
	membreLabel: string;
	activiteId: number;
	activiteLabel: string;
	prix: number | null;
	disponibilite: string; // "Inscrit" | "Liste d'attente"
}

/** Options de select, servies par les routes GET. */
export interface CotisationOption {
	id: number;
	label: string;
	prix: number | null;
	personneMorale: boolean;
	multiple: boolean;
}

export interface ActiviteOption {
	id: number;
	label: string;
	prix: number | null;
	placesRestantes: number | null; // null = non plafonnée / inconnu
}

export interface ApiError {
	error: string;
}
