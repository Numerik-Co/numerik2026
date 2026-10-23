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
 * Icône Font Awesome (préfixe "fa-solid" ajouté à l'affichage) de chaque
 * thématique : boutons de catégorie du bloc 1, et repli pour une démarche
 * dont la colonne Grist `Icone` est vide.
 */
export const THEMATIQUE_ICONES: Record<(typeof THEMATIQUE_CHOICES)[number], string> = {
	'Diagnostic numérique': 'fa-stethoscope',
	'Prendre en main du matériel': 'fa-laptop',
	'Maintenance de matériel': 'fa-screwdriver-wrench',
	'Gérer ses contenus numériques': 'fa-folder-open',
	'Navigation sur internet': 'fa-globe',
	'E-mail': 'fa-envelope',
	Bureautique: 'fa-file-lines',
	'Réseaux sociaux communication': 'fa-comments',
	Santé: 'fa-heart-pulse',
	'Banque et achats en ligne': 'fa-credit-card',
	'Accompagner un professionnel': 'fa-briefcase',
	'Insertion professionnelle': 'fa-user-tie',
	'Prévention en sécurité numérique': 'fa-shield-halved',
	Parentalité: 'fa-children',
	'Scolarité et numérique': 'fa-graduation-cap',
	'Créer avec le numérique': 'fa-palette',
	'Culture numérique': 'fa-book-open',
	'Intelligence artificielle': 'fa-robot',
	'Aide aux démarches administratives': 'fa-landmark',
};

export const STATUT_RDV = {
	confirme: 'Confirmé',
	annule: 'Annulé',
	honore: 'Honoré',
	absent: 'Absent',
} as const;
