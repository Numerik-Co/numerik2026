/**
 * Valeurs exactes des listes de choix du document Grist « RDV Conseiller
 * Numérique », partagées client + serveur. Alignées sur le CRA officiel de
 * la Coop de la médiation numérique pour éviter une double saisie à la
 * conseillère (cf. mémoire de chantier `rdv-conseiller-numerique`).
 *
 * Module PUR : aucun import, aucune dépendance à `process.env` / `node:*` —
 * sûr à charger dans le bundle navigateur.
 */

export const GENRE_CHOICES = ['Masculin', 'Féminin', 'Non communiqué'] as const;

export const TRANCHE_AGE_CHOICES = [
	'Moins de 12 ans',
	'12-17 ans',
	'18-24 ans',
	'25-39 ans',
	'40-59 ans',
	'60-69 ans',
	'70 ans et plus',
	'Non communiqué',
] as const;

export const STATUT_BENEFICIAIRE_CHOICES = [
	'Retraité',
	'Sans emploi',
	'En emploi',
	'Scolarisé',
	'Non communiqué ou hétérogène',
] as const;

/**
 * Thématiques officielles du CRA Coop — ne sont plus choisies directement
 * par le bénéficiaire (cf. bloc 1 du formulaire, qui propose des
 * *démarches* concrètes, table Grist `Demarches`). Chaque démarche du
 * catalogue porte l'une de ces valeurs dans sa colonne `Thematique`, seul
 * usage restant de cette liste côté formulaire.
 */
export const THEMATIQUE_CHOICES = [
	'Diagnostic numérique',
	'Prendre en main du matériel',
	'Maintenance de matériel',
	'Gérer ses contenus numériques',
	'Navigation sur internet',
	'E-mail',
	'Bureautique',
	'Réseaux sociaux communication',
	'Santé',
	'Banque et achats en ligne',
	'Accompagner un professionnel',
	'Insertion professionnelle',
	'Prévention en sécurité numérique',
	'Parentalité',
	'Scolarité et numérique',
	'Créer avec le numérique',
	'Culture numérique',
	'Intelligence artificielle',
	'Aide aux démarches administratives',
] as const;

/**
 * Origine géographique du bénéficiaire, déduite de la commune (voir
 * `./geographie.ts`) mais modifiable — pas de contrainte système.
 */
export const ZONE_GEOGRAPHIQUE_CHOICES = [
	'Saint-Pierre-du-Mont',
	'Agglo du Marsan',
	"Commune proche de l'agglo",
	'Département',
] as const;

export const STATUT_RDV = {
	confirme: 'Confirmé',
	annule: 'Annulé',
	honore: 'Honoré',
	absent: 'Absent',
} as const;
